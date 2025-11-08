import { Router } from "express";
import {
  listMovies,
  getMovie,
  getRandomMovies,
  insertMovie,
  updateMovie as updateMovieRecord,
  deleteMovie as deleteMovieRecord,
  listReviewsByMovie,
  insertReview,
} from "../db.js";
import { generateId } from "../utils/id.js";

const router = Router();

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const orDefault = (value, fallback) =>
  value === undefined || value === null ? fallback : value;

router.get("/", (req, res) => {
  const { q, mood, tag, limit = 12 } = req.query;
  const items = listMovies({
    q,
    mood,
    tag,
    limit: Number(limit) || 12,
  });
  res.json({
    items,
    meta: {
      total: items.length,
      query: orDefault(q, ""),
    },
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  const movie = getMovie(id);

  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }

  const reviews = listReviewsByMovie(movie.id, 5);
  const suggestions = getRandomMovies({ excludeId: movie.id, limit: 4 });

  res.json({
    movie,
    reviews,
    suggestions,
  });
});

router.get("/:id/watch", (req, res) => {
  const { id } = req.params;
  const movie = getMovie(id);

  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }

  const nextUp = getRandomMovies({ excludeId: movie.id, limit: 3 }).map((item) => ({
    id: item.id,
    title: item.title,
    duration: item.duration,
    thumbnail: item.thumbnail,
  }));

  res.json({
    movieId: movie.id,
    title: movie.title,
    synopsis: movie.synopsis,
    videoUrl: movie.videoUrl,
    poster: movie.poster,
    trailerUrl: movie.trailerUrl,
    tags: movie.tags || [],
    nextUp,
  });
});

router.post("/:id/reviews", (req, res) => {
  const { id } = req.params;
  const { rating, comment, userId = "demo-user" } = req.body;

  if (!rating) {
    return res.status(400).json({ message: "Thiếu rating" });
  }

  const movie = getMovie(id);

  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }

  const reviewId = generateId("rv");
  const sentiment =
    rating >= 4 ? "positive" : rating >= 3 ? "neutral" : "negative";

  insertReview({
    id: reviewId,
    user_id: userId,
    movie_id: movie.id,
    rating,
    comment,
    sentiment,
  });

  res.status(201).json({
    id: reviewId,
    rating,
    comment,
    sentiment,
  });
});

router.post("/", (req, res) => {
  const payload = req.body;
  if (!payload.title) {
    return res.status(400).json({ message: "Thiếu tiêu đề" });
  }

  const id = orDefault(payload.id, slugify(payload.title));
  const newMovie = {
    id,
    slug: slugify(orDefault(payload.slug, payload.title)),
    title: payload.title,
    synopsis: orDefault(payload.synopsis, ""),
    year: orDefault(payload.year, new Date().getFullYear()),
    duration: orDefault(payload.duration, ""),
    rating: orDefault(payload.rating, 0),
    thumbnail: orDefault(payload.thumbnail, ""),
    poster: orDefault(payload.poster, ""),
    trailerUrl: orDefault(payload.trailerUrl, ""),
    videoUrl: orDefault(payload.videoUrl, ""),
    tags: orDefault(payload.tags, []),
    moods: orDefault(payload.moods, []),
    cast: orDefault(payload.cast, []),
    director: orDefault(payload.director, ""),
  };

  insertMovie(newMovie);

  res.status(201).json({ movie: newMovie });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const movie = getMovie(id);
  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }

  const payload = {
    ...movie,
    ...req.body,
    trailerUrl: orDefault(req.body.trailerUrl, movie.trailerUrl),
    videoUrl: orDefault(req.body.videoUrl, movie.videoUrl),
    tags: orDefault(req.body.tags, movie.tags),
    moods: orDefault(req.body.moods, movie.moods),
    cast: orDefault(req.body.cast, movie.cast),
  };

  const updated = updateMovieRecord(id, payload);
  res.json({ movie: updated });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  deleteMovieRecord(id);
  res.status(204).send();
});

export default router;
