import bcrypt from "bcryptjs";
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

export const listMovies = async ({ q, mood, tag, limit = 12 } = {}) => {
  const query = {};

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

  return Movie.find(query).limit(Math.min(limit, 50)).lean();
};

export const getMovie = async (idOrSlug) => {
  return Movie.findOne({
    $or: [{ id: idOrSlug }, { slug: idOrSlug }],
  }).lean();
};

export const getRandomMovies = async ({ excludeId, limit = 4 } = {}) => {
  const match = excludeId ? { id: { $ne: excludeId } } : {};
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

export const deleteMovie = async (idOrSlug) => {
  const res = await Movie.deleteOne({
    $or: [{ id: idOrSlug }, { slug: idOrSlug }],
  });
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

export const listUsers = async () => {
  const users = await User.find().lean();
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    favorite_moods: user.favorite_moods || [],
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

export const listWatchHistory = async (userId) => {
  const items = await WatchHistory.find({ user_id: userId })
    .sort({ last_watched_at: -1 })
    .lean();

  const movieIds = [...new Set(items.map((i) => i.movie_id))];
  const movies = await Movie.find({ id: { $in: movieIds } }).lean();
  const movieMap = Object.fromEntries(movies.map((m) => [m.id, m]));

  return items.map((item) => ({
    ...item,
    movie: movieMap[item.movie_id] || null,
  }));
};

export const addWatchHistory = async ({ userId, movieId }) => {
  const doc = new WatchHistory({
    id: generateId("history"),
    user_id: userId,
    movie_id: movieId,
    last_watched_at: new Date(),
  });
  await doc.save();
};

export const removeWatchHistory = async ({ userId, historyId }) => {
  await WatchHistory.deleteOne({ id: historyId, user_id: userId });
};

export const clearWatchHistory = async (userId) => {
  await WatchHistory.deleteMany({ user_id: userId });
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
    Movie.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(sanitizedLimit)
      .lean(),
    Movie.countDocuments(),
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
