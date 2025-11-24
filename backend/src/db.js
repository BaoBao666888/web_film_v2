import bcrypt from "bcryptjs";
import { generateId } from "./utils/id.js";
import { Movie } from "./models/Movie.js";
import { User } from "./models/User.js";
import { Review } from "./models/Review.js";
import { Favorite } from "./models/Favorite.js";
import { WatchHistory } from "./models/WatchHistory.js";

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

export const listUsers = async () => {
  const users = await User.find().lean();
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
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
