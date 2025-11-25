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
  addFavorite,
  removeFavorite,
  isFavorite,
} from "../db.js";
import { generateId } from "../utils/id.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { getDefaultHlsHeaders } from "../config/hlsDefaults.js";

const router = Router();

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const orDefault = (value, fallback) =>
  value === undefined || value === null ? fallback : value;

const parseHeadersPayload = (value, fallback = {}) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("Không thể parse videoHeaders:", error.message);
      return fallback;
    }
  }
  return fallback;
};

const detectVideoType = (explicitType, url) => {
  if (explicitType === "hls" || explicitType === "mp4") {
    return explicitType;
  }
  if (typeof url === "string" && url.toLowerCase().includes(".m3u8")) {
    return "hls";
  }
  return "mp4";
};

const resolveVideoHeaders = (videoType, headersValue) => {
  const parsed = parseHeadersPayload(headersValue, {});
  const sanitized = parsed && typeof parsed === "object" ? parsed : {};
  const hasCustomHeaders = Object.keys(sanitized).length > 0;
  if (videoType === "hls") {
    return hasCustomHeaders ? sanitized : getDefaultHlsHeaders();
  }
  return sanitized;
};

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

  const playbackType = detectVideoType(movie.videoType, movie.videoUrl);
  const resolvedHeaders = resolveVideoHeaders(
    playbackType,
    movie.videoHeaders
  );

  res.json({
    movieId: movie.id,
    title: movie.title,
    synopsis: movie.synopsis,
    videoUrl: movie.videoUrl,
    playbackType,
    stream: movie.videoUrl
      ? {
          type: playbackType,
          url: movie.videoUrl,
          headers: resolvedHeaders,
        }
      : null,
    poster: movie.poster,
    trailerUrl: movie.trailerUrl,
    tags: movie.tags || [],
    videoHeaders: resolvedHeaders,
    nextUp,
  });
});

router.get("/:id/favorite", verifyToken, async (req, res) => {
  const { id } = req.params;
  const movie = await getMovie(id);
  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }

  const favorite = await isFavorite({ userId: req.user.id, movieId: movie.id });
  res.json({ favorite });
});

router.post("/:id/favorite", verifyToken, async (req, res) => {
  const { id } = req.params;
  const movie = await getMovie(id);
  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }

  await addFavorite({ userId: req.user.id, movieId: movie.id });
  res.status(201).json({ message: "Đã lưu vào yêu thích", movieId: movie.id });
});

router.delete("/:id/favorite", verifyToken, async (req, res) => {
  const { id } = req.params;
  const movie = await getMovie(id);
  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }
  await removeFavorite({ userId: req.user.id, movieId: movie.id });
  res.status(200).json({ message: "Đã xoá khỏi yêu thích", movieId: movie.id });
});

// Thêm phim (ADMIN)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const payload = req.body;

  if (!payload.title) return res.status(400).json({ message: "Thiếu tiêu đề" });

  const id = orDefault(payload.id, slugify(payload.title));

  const computedVideoType = detectVideoType(payload.videoType, payload.videoUrl);
  const computedHeaders = resolveVideoHeaders(
    computedVideoType,
    payload.videoHeaders
  );

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
    videoType: computedVideoType,
    videoHeaders: computedHeaders,
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
  const computedVideoType = detectVideoType(
    req.body.videoType ?? movie.videoType,
    payload.videoUrl
  );
  payload.videoType = computedVideoType;
  payload.videoHeaders = resolveVideoHeaders(
    computedVideoType,
    req.body.videoHeaders !== undefined
      ? req.body.videoHeaders
      : movie.videoHeaders
  );
  const updated = await updateMovie(id, payload);

  res.json({ movie: updated });
});

// Xóa phim (ADMIN)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  await deleteMovie(req.params.id);
  res.status(204).send();
});

export default router;
