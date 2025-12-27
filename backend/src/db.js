import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { generateId } from "./utils/id.js";
import { Movie } from "./models/Movie.js";
import { User } from "./models/User.js";
import { Review } from "./models/Review.js";
import { Favorite } from "./models/Favorite.js";
import { WatchHistory } from "./models/WatchHistory.js";
import { Comment } from "./models/Comment.js";

const clampNumber = (value, fallback, { min = 1, max = 50 } = {}) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const hydrateMovies = async (stats) => {
  const movieIds = stats.map((entry) => entry._id);
  if (movieIds.length === 0) return [];

  const movies = await Movie.find({ id: { $in: movieIds } }).lean();
  const movieMap = Object.fromEntries(movies.map((movie) => [movie.id, movie]));

  return stats
    .map((entry) => {
      const movie = movieMap[entry._id];
      if (!movie) return null;
      return {
        movie,
        views: entry.views || 0,
        lastWatchedAt: entry.lastWatchedAt,
        favorites: entry.favorites || 0,
        lastFavoriteAt: entry.lastFavoriteAt,
      };
    })
    .filter(Boolean);
};

// Movies

export const listMovies = async ({
  q,
  mood,
  tag,
  limit = 12,
  page = 1,
} = {}) => {
  const query = { isHidden: { $ne: true } };

  if (q) {
    query.$or = [
      { title: new RegExp(q, "i") },
      { synopsis: new RegExp(q, "i") },
    ];
  }

  if (mood) {
    query.moods = mood;
  }

  if (tag) {
    query.tags = tag;
  }

  const sanitizedLimit = Math.min(limit, 50);
  const sanitizedPage = Math.max(Number(page) || 1, 1);
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  return Movie.find(query).skip(skip).limit(sanitizedLimit).lean();
};

export const getMovie = async (idOrSlug) => {
  return Movie.findOne({
    $or: [{ id: idOrSlug }, { slug: idOrSlug }],
    isHidden: { $ne: true },
  }).lean();
};

export const getRandomMovies = async ({ excludeId, limit = 4 } = {}) => {
  const match = excludeId
    ? { id: { $ne: excludeId }, isHidden: { $ne: true } }
    : { isHidden: { $ne: true } };
  const count = await Movie.countDocuments(match);
  const skip = Math.max(
    0,
    Math.floor(Math.random() * Math.max(count - limit, 0))
  );

  return Movie.find(match).skip(skip).limit(limit).lean();
};

export const insertMovie = async (payload) => {
  const movie = new Movie(payload);
  await movie.save();
  return movie.toObject();
};

export const updateMovie = async (idOrSlug, updates) => {
  const movie = await Movie.findOneAndUpdate(
    { $or: [{ id: idOrSlug }, { slug: idOrSlug }] },
    { $set: updates },
    { new: true }
  );
  return movie ? movie.toObject() : null;
};

// export const deleteMovie = async (idOrSlug) => {
//   const res = await Movie.deleteOne({
//     $or: [{ id: idOrSlug }, { slug: idOrSlug }],
//   });
//   return res.deletedCount > 0;
// };
export const deleteMovie = async (idOrSlug) => {
  // Tìm movie trước (lấy đúng movie.id)
  const movie = await Movie.findOne({
    $or: [{ id: idOrSlug }, { slug: idOrSlug }],
  });

  if (!movie) return false;

  const movieId = movie.id;

  // 1) XÓA YÊU THÍCH
  await Favorite.deleteMany({ movie_id: movieId });

  // 2) XÓA LỊCH SỬ XEM
  await WatchHistory.deleteMany({ movie_id: movieId });

  // 3) XÓA REVIEW
  await Review.deleteMany({ movie_id: movieId });

  // 4) XÓA COMMENT
  await Comment.deleteMany({ movie_id: movieId });

  // 5) CUỐI CÙNG XOÁ PHIM
  const res = await Movie.deleteOne({ id: movieId });

  return res.deletedCount > 0;
};

// ⭐ Reviews

export const insertReview = async (review) => {
  const doc = new Review({
    ...review,
    created_at: new Date(),
  });
  await doc.save();
  return doc.toObject();
};

export const listReviewsByMovie = async (movieId, limit = 5) => {
  const reviews = await Review.find({ movie_id: movieId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  const users = await User.find({ id: { $in: userIds } }).lean();
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return reviews.map((review) => ({
    ...review,
    user: (() => {
      const u = userMap[review.user_id] || {};
      return { id: u.id, name: u.name, avatar: u.avatar };
    })(),
  }));
};

//  Users

export const addUser = async ({ name, email, password }) => {
  const id = generateId("user");
  const newUser = new User({
    id,
    name,
    email,
    role: "user",
    favorite_moods: [],
    theme_preference: "system",
    balance: 0,
    is_locked: false,
    locked_reason: null,
    locked_at: null,
    locked_by: null,
    locked_until: null,
    password_hash: bcrypt.hashSync(password, 10),
    created_at: new Date(),
  });
  await newUser.save();
  return newUser.toObject();
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email }).lean();
};

export const getUserById = async (id) => {
  return User.findOne({ id }).lean();
};

// Comments

export const insertComment = async ({ userId, movieId, content }) => {
  const doc = new Comment({
    id: generateId("cmt"),
    user_id: userId,
    movie_id: movieId,
    content,
    created_at: new Date(),
  });
  await doc.save();
  return doc.toObject();
};

export const listCommentsByMovie = async (movieId, limit = 30) => {
  const comments = await Comment.find({ movie_id: movieId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  const userIds = [...new Set(comments.map((comment) => comment.user_id))];
  const users = await User.find({ id: { $in: userIds } }).lean();
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return comments.map((comment) => ({
    ...comment,
    user: (() => {
      const u = userMap[comment.user_id] || {};
      return { id: u.id, name: u.name, avatar: u.avatar };
    })(),
  }));
};

export const updateUser = async (id, updates = {}) => {
  const user = await User.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true }
  );
  return user ? user.toObject() : null;
};

export const incrementUserBalance = async (id, amount) => {
  const user = await User.findOneAndUpdate(
    { id },
    { $inc: { balance: amount } },
    { new: true }
  );
  return user ? user.toObject() : null;
};

export const listUsers = async () => {
  const users = await User.find().lean();
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    favorite_moods: user.favorite_moods || [],
    balance: user.balance ?? 0,
    is_locked: Boolean(user.is_locked),
    locked_reason: user.locked_reason || null,
    locked_at: user.locked_at || null,
    locked_by: user.locked_by || null,
    locked_until: user.locked_until || null,
  }));
};

// Stats

export const getStats = async () => {
  const [movies, users, reviews] = await Promise.all([
    Movie.countDocuments(),
    User.countDocuments(),
    Review.countDocuments(),
  ]);

  const allMovies = await Movie.find({}, { moods: 1 }).lean();
  const moods = allMovies
    .flatMap((m) => m.moods || [])
    .reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

  const watch_history = await WatchHistory.countDocuments();

  return {
    movies,
    users,
    reviews,
    watch_history,
    moods,
  };
};

// Watch history

export const listWatchHistory = async (
  userId,
  { page = 1, limit = 20 } = {}
) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const items = await WatchHistory.find({
    user_id: userId,
    last_watched_at: { $gte: cutoff },
  })
    .sort({ last_watched_at: -1 })
    .lean();

  const seenMovies = new Set();
  const uniqueItems = [];
  for (const item of items) {
    if (seenMovies.has(item.movie_id)) continue;
    seenMovies.add(item.movie_id);
    uniqueItems.push(item);
  }

  const sanitizedLimit = clampNumber(limit, 20, { min: 1, max: 50 });
  const sanitizedPage = Math.max(Number(page) || 1, 1);
  const startIndex = (sanitizedPage - 1) * sanitizedLimit;
  const pagedItems = uniqueItems.slice(startIndex, startIndex + sanitizedLimit);

  const movieIds = [
    ...new Set(pagedItems.map((i) => i.movie_id).filter(Boolean)),
  ];
  const objectIds = movieIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const movieQuery = [{ id: { $in: movieIds } }, { slug: { $in: movieIds } }];
  if (objectIds.length > 0) {
    movieQuery.push({ _id: { $in: objectIds } });
  }
  const movies = movieIds.length
    ? await Movie.find({ $or: movieQuery }).lean()
    : [];
  const movieMap = Object.fromEntries(
    movies.flatMap((movie) => {
      const entries = [];
      if (movie.id) entries.push([movie.id, movie]);
      if (movie.slug) entries.push([movie.slug, movie]);
      if (movie._id) entries.push([String(movie._id), movie]);
      return entries;
    })
  );

  return {
    items: pagedItems.map((item) => ({
      ...item,
      movie: movieMap[item.movie_id] || null,
    })),
    meta: {
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalItems: uniqueItems.length,
      totalPages: sanitizedLimit
        ? Math.max(1, Math.ceil(uniqueItems.length / sanitizedLimit))
        : 1,
    },
  };
};

export const addWatchHistory = async ({
  userId,
  movieId,
  viewerId,
  episode,
  position,
}) => {
  const now = new Date();
  if (!movieId) return;

  if (!userId) {
    const positionNumber = Number(position);
    const doc = new WatchHistory({
      id: generateId("history"),
      user_id: null,
      viewer_id: viewerId,
      movie_id: movieId,
      episode,
      last_position: Number.isFinite(positionNumber) ? positionNumber : 0,
      last_watched_at: now,
    });
    await doc.save();
    return;
  }

  const update = { last_watched_at: now };
  if (viewerId !== undefined) {
    update.viewer_id = viewerId;
  }
  const episodeNumber = Number(episode);
  if (Number.isFinite(episodeNumber) && episodeNumber > 0) {
    update.episode = episodeNumber;
  }
  const positionNumber = Number(position);
  if (Number.isFinite(positionNumber) && positionNumber >= 0) {
    update.last_position = positionNumber;
  }

  const updated = await WatchHistory.findOneAndUpdate(
    { user_id: userId, movie_id: movieId },
    {
      $set: update,
      $setOnInsert: {
        id: generateId("history"),
        user_id: userId,
        movie_id: movieId,
      },
    },
    { upsert: true, new: true }
  );

  if (updated?._id) {
    await WatchHistory.deleteMany({
      user_id: userId,
      movie_id: movieId,
      _id: { $ne: updated._id },
    });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await WatchHistory.deleteMany({
    user_id: userId,
    last_watched_at: { $lt: cutoff },
  });
};

export const getWatchHistoryByMovie = async ({ userId, movieId }) => {
  if (!userId || !movieId) return null;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const movie = await Movie.findOne({
    $or: [{ id: movieId }, { slug: movieId }],
  }).lean();
  const candidates = new Set([movieId]);
  if (movie?.id) candidates.add(movie.id);
  if (movie?.slug) candidates.add(movie.slug);
  if (movie?._id) candidates.add(String(movie._id));
  return WatchHistory.findOne({
    user_id: userId,
    movie_id: { $in: Array.from(candidates) },
    last_watched_at: { $gte: cutoff },
  })
    .sort({ last_watched_at: -1 })
    .lean();
};

export const removeWatchHistory = async ({ userId, historyId }) => {
  await WatchHistory.updateOne(
    { id: historyId, user_id: userId },
    { $set: { user_id: null } }
  );
};

export const clearWatchHistory = async (userId) => {
  await WatchHistory.updateMany(
    { user_id: userId },
    { $set: { user_id: null } }
  );
};

// Favorites

export const addFavorite = async ({ userId, movieId }) => {
  const exists = await Favorite.findOne({ user_id: userId, movie_id: movieId });
  if (!exists) {
    const doc = new Favorite({
      id: generateId("fav"),
      user_id: userId,
      movie_id: movieId,
      created_at: new Date(),
    });
    await doc.save();
  }
};

export const listFavorites = async (userId, limit = 6) => {
  const favs = await Favorite.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  const movieIds = favs.map((f) => f.movie_id);
  const movies = await Movie.find({ id: { $in: movieIds } }).lean();
  const movieMap = Object.fromEntries(movies.map((m) => [m.id, m]));

  return favs.map((fav) => movieMap[fav.movie_id]).filter(Boolean);
};

export const removeFavorite = async ({ userId, movieId }) => {
  await Favorite.deleteOne({ user_id: userId, movie_id: movieId });
};

export const isFavorite = async ({ userId, movieId }) => {
  if (!userId) return false;
  const exists = await Favorite.findOne({ user_id: userId, movie_id: movieId });
  return Boolean(exists);
};

const buildWatchAggregation = ({ since }) => {
  const pipeline = [];
  if (since) {
    pipeline.push({ $match: { last_watched_at: { $gte: since } } });
  }
  pipeline.push(
    {
      $group: {
        _id: "$movie_id",
        views: { $sum: 1 },
        lastWatchedAt: { $max: "$last_watched_at" },
      },
    },
    { $sort: { views: -1, lastWatchedAt: -1 } }
  );
  return pipeline;
};

export const countMovieViews = async (movieId) => {
  return WatchHistory.countDocuments({ movie_id: movieId });
};

export const getTrendingMovies = async ({
  days = 7,
  page = 1,
  limit = 6,
} = {}) => {
  const sanitizedDays = Math.max(Number(days) || 7, 1);
  const sanitizedPage = Math.max(Number(page) || 1, 1);
  const sanitizedLimit = clampNumber(limit, 6, { min: 1, max: 30 });
  const since = new Date(Date.now() - sanitizedDays * 24 * 60 * 60 * 1000);
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  const [result] = await WatchHistory.aggregate([
    ...buildWatchAggregation({ since }),
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: sanitizedLimit }],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const rawItems = result?.items ?? [];
  const totalItems = result?.total?.[0]?.count ?? 0;
  const items = await hydrateMovies(rawItems);

  return {
    items,
    meta: {
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalItems,
      totalPages: sanitizedLimit
        ? Math.max(1, Math.ceil(totalItems / sanitizedLimit))
        : 1,
      days: sanitizedDays,
    },
  };
};

export const listNewestMovies = async ({ limit = 6, page = 1 } = {}) => {
  const sanitizedLimit = clampNumber(limit, 6, { min: 1, max: 30 });
  const sanitizedPage = Math.max(Number(page) || 1, 1);
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  const [items, totalItems] = await Promise.all([
    Movie.find({ isHidden: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(sanitizedLimit)
      .lean(),
    Movie.countDocuments({ isHidden: { $ne: true } }),
  ]);

  return {
    items,
    meta: {
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalItems,
      totalPages: sanitizedLimit
        ? Math.max(1, Math.ceil(totalItems / sanitizedLimit))
        : 1,
    },
  };
};

export const getTopWatchedMovies = async ({ days = 30, limit = 5 } = {}) => {
  const sanitizedDays = Math.max(Number(days) || 30, 1);
  const sanitizedLimit = clampNumber(limit, 5, { min: 1, max: 10 });
  const since = new Date(Date.now() - sanitizedDays * 24 * 60 * 60 * 1000);
  const stats = await WatchHistory.aggregate([
    ...buildWatchAggregation({ since }),
    { $limit: sanitizedLimit },
  ]);

  return hydrateMovies(stats);
};

export const getTopFavoritedMovies = async ({ limit = 5 } = {}) => {
  const sanitizedLimit = clampNumber(limit, 5, { min: 1, max: 10 });
  const stats = await Favorite.aggregate([
    {
      $group: {
        _id: "$movie_id",
        favorites: { $sum: 1 },
        lastFavoriteAt: { $max: "$created_at" },
      },
    },
    { $sort: { favorites: -1, lastFavoriteAt: -1 } },
    { $limit: sanitizedLimit },
  ]);

  return hydrateMovies(stats);
};

export const listRecentComments = async (limit = 5) => {
  const sanitizedLimit = clampNumber(limit, 5, { min: 1, max: 20 });
  const comments = await Comment.find()
    .sort({ created_at: -1 })
    .limit(sanitizedLimit)
    .lean();

  const userIds = [...new Set(comments.map((comment) => comment.user_id))];
  const movieIds = [...new Set(comments.map((comment) => comment.movie_id))];

  const [users, movies] = await Promise.all([
    User.find({ id: { $in: userIds } }).lean(),
    Movie.find({ id: { $in: movieIds } })
      .select({ id: 1, title: 1, thumbnail: 1 })
      .lean(),
  ]);

  const userMap = Object.fromEntries(users.map((user) => [user.id, user]));
  const movieMap = Object.fromEntries(movies.map((movie) => [movie.id, movie]));

  return comments.map((comment) => ({
    ...comment,
    user: (() => {
      const user = userMap[comment.user_id];
      if (!user) return null;
      return { id: user.id, name: user.name, avatar: user.avatar };
    })(),
    movie: movieMap[comment.movie_id] || null,
  }));
};

export const getCommunityHighlights = async () => {
  const [mostActive, mostFavorited, recentComments] = await Promise.all([
    getTopWatchedMovies({ limit: 5, days: 30 }),
    getTopFavoritedMovies({ limit: 5 }),
    listRecentComments(5),
  ]);

  return {
    mostActive,
    mostFavorited,
    recentComments,
  };
};

export const getMovieRatingStats = async (movieId) => {
  if (!movieId) {
    return { average: 0, count: 0 };
  }

  const [stat] = await Review.aggregate([
    { $match: { movie_id: movieId } },
    {
      $group: {
        _id: "$movie_id",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!stat) {
    return { average: 0, count: 0 };
  }

  const averageValue =
    typeof stat.average === "number" && !Number.isNaN(stat.average)
      ? Number(stat.average.toFixed(1))
      : 0;

  return {
    average: averageValue,
    count: stat.count ?? 0,
  };
};
