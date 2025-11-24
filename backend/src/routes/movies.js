import { Router } from "express";
import {
  listMovies,
  getMovie,
  getRandomMovies,
  insertMovie,
  updateMovie,
  deleteMovie,
  listReviewsByMovie,
  insertReview,
} from "../db.js";
import { generateId } from "../utils/id.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const orDefault = (value, fallback) =>
  value === undefined || value === null ? fallback : value;

//Lấy danh sách phim
router.get("/", async (req, res) => {
  const { q, mood, tag, limit = 12 } = req.query;
  const items = await listMovies({
    q,
    mood,
    tag,
    limit: Number(limit) || 12,
  });
  res.json({ items });
});

//Chi tiết phim
router.get("/:id", async (req, res) => {
  const movie = await getMovie(req.params.id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

  const reviews = await listReviewsByMovie(movie.id, 5);
  const suggestions = await getRandomMovies({ excludeId: movie.id, limit: 4 });

  res.json({ movie, reviews, suggestions });
});

//XEM PHIM
router.get("/:id/watch", async (req, res) => {
  const { id } = req.params;

  const movie = await getMovie(id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

  const nextUp = (
    await getRandomMovies({
      excludeId: movie.id,
      limit: 3,
    })
  ).map((item) => ({
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

// Thêm phim (ADMIN)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const payload = req.body;

  if (!payload.title) return res.status(400).json({ message: "Thiếu tiêu đề" });

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

  const result = await insertMovie(newMovie);
  res.status(201).json({ movie: result });
});

// Sửa phim (ADMIN)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const movie = await getMovie(id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

  const payload = { ...movie, ...req.body };
  const updated = await updateMovie(id, payload);

  res.json({ movie: updated });
});

// Xóa phim (ADMIN)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  await deleteMovie(req.params.id);
  res.status(204).send();
});

export default router;
