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
  getTrendingMovies,
  listNewestMovies,
  getCommunityHighlights,
  getMovieRatingStats,
  listCommentsByMovie,
  insertComment,
  getUserById,
  addWatchHistory,
  countMovieViews,
} from "../db.js";
import { generateId } from "../utils/id.js";
import { verifyToken, requireAdmin, optionalAuth } from "../middleware/auth.js";
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

const sanitizeEpisodes = (episodes = [], fallbackHeaders = {}) => {
  if (!Array.isArray(episodes)) return [];
  return episodes
    .map((episode, index) => {
      const number = Number(episode.number ?? index + 1);
      const videoUrl = episode.videoUrl || "";
      if (!videoUrl) return null;
      const videoType = detectVideoType(episode.videoType, videoUrl);
      return {
        number,
        title: episode.title || `Tập ${number}`,
        videoUrl,
        videoType,
        videoHeaders: resolveVideoHeaders(
          videoType,
          episode.videoHeaders ?? fallbackHeaders
        ),
        duration: episode.duration || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
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

router.get("/trending", async (req, res) => {
  try {
    const { days = 7, page = 1, limit = 12 } = req.query;
    const payload = await getTrendingMovies({
      days: Number(days) || 7,
      page: Number(page) || 1,
      limit: Number(limit) || 12,
    });
    res.json(payload);
  } catch (error) {
    console.error("Lỗi lấy danh sách xu hướng", error);
    res.status(500).json({ message: "Không thể lấy danh sách xu hướng" });
  }
});

router.get("/new", async (req, res) => {
  try {
    const { page = 1, limit = 6 } = req.query;
    const payload = await listNewestMovies({
      page: Number(page) || 1,
      limit: Number(limit) || 6,
    });
    res.json(payload);
  } catch (error) {
    console.error("Lỗi lấy danh sách phim mới", error);
    res.status(500).json({ message: "Không thể lấy danh sách phim mới" });
  }
});

router.get("/community-highlights", async (_req, res) => {
  try {
    const data = await getCommunityHighlights();
    res.json(data);
  } catch (error) {
    console.error("Lỗi lấy dữ liệu community", error);
    res
      .status(500)
      .json({ message: "Không thể lấy dữ liệu cộng đồng", error: error.message });
  }
});

//Chi tiết phim
router.get("/:id", async (req, res) => {
  const movie = await getMovie(req.params.id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

  const [reviews, suggestions, ratingStats] = await Promise.all([
    listReviewsByMovie(movie.id, 5),
    getRandomMovies({ excludeId: movie.id, limit: 4 }),
    getMovieRatingStats(movie.id),
  ]);

  res.json({ movie, reviews, suggestions, ratingStats });
});

router.get("/:id/comments", async (req, res) => {
  const movie = await getMovie(req.params.id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });
  const { limit = 30 } = req.query;
  const items = await listCommentsByMovie(movie.id, Number(limit) || 30);
  res.json({ items });
});

router.post("/:id/comments", verifyToken, async (req, res) => {
  const movie = await getMovie(req.params.id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });
  const content = (req.body?.content || "").trim();
  if (!content) {
    return res
      .status(400)
      .json({ message: "Nội dung bình luận không được để trống" });
  }

  const saved = await insertComment({
    userId: req.user.id,
    movieId: movie.id,
    content,
  });
  const user = await getUserById(req.user.id);
  res.status(201).json({
    comment: {
      ...saved,
      user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
    },
  });
});

//XEM PHIM
router.get("/:id/watch", async (req, res) => {
  const { id } = req.params;
  const episodeQuery = Number(req.query.ep);

  const movie = await getMovie(id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

  const movieType = movie.type || "single";
  const existingEpisodes = sanitizeEpisodes(
    movie.episodes || [],
    movie.videoHeaders
  );
  const episodes =
    movieType === "series" && existingEpisodes.length === 0 && movie.videoUrl
      ? sanitizeEpisodes(
          [
            {
              number: 1,
              title: "Tập 1",
              videoUrl: movie.videoUrl,
              videoType: movie.videoType,
            },
          ],
          movie.videoHeaders
        )
      : existingEpisodes;

  const selectedEpisode =
    movieType === "series"
      ? episodes.find((ep) => ep.number === episodeQuery) ||
        episodes[0] ||
        null
      : null;

  const streamSource = selectedEpisode?.videoUrl ?? movie.videoUrl ?? "";
  const playbackType = detectVideoType(
    selectedEpisode?.videoType ?? movie.videoType,
    streamSource
  );
  const resolvedHeaders = resolveVideoHeaders(
    playbackType,
    selectedEpisode?.videoHeaders ?? movie.videoHeaders
  );

  const nextUp =
    movieType === "series" && episodes.length
      ? episodes
          .filter(
            (ep) =>
              selectedEpisode &&
              typeof selectedEpisode.number === "number" &&
              ep.number > selectedEpisode.number
          )
          .slice(0, 12)
          .map((ep) => ({
            id: movie.id,
            movieId: movie.id,
            episodeNumber: ep.number,
            title: ep.title,
            duration: ep.duration || `Tập ${ep.number}`,
            thumbnail: movie.thumbnail,
          }))
      : (
          await getRandomMovies({
            excludeId: movie.id,
            limit: 3,
          })
        ).map((item) => ({
          id: item.id,
          movieId: item.id,
          title: item.title,
          duration: item.duration,
          thumbnail: item.thumbnail,
        }));

  const views = await countMovieViews(movie.id);

  res.json({
    movieId: movie.id,
    title: movie.title,
    synopsis: movie.synopsis,
    videoUrl: streamSource,
    playbackType,
    stream: streamSource
      ? {
          type: playbackType,
          url: streamSource,
          headers: resolvedHeaders,
        }
      : null,
    poster: movie.poster,
    trailerUrl: movie.trailerUrl,
    tags: movie.tags || [],
    videoHeaders: resolvedHeaders,
    episodes:
      movieType === "series"
        ? episodes.map((ep) => ({
            number: ep.number,
            title: ep.title,
            duration: ep.duration,
          }))
        : [],
    currentEpisode:
      movieType === "series" && selectedEpisode
        ? {
            number: selectedEpisode.number,
            title: selectedEpisode.title,
            duration: selectedEpisode.duration,
          }
        : null,
    type: movieType,
    views,
    nextUp,
  });
});

router.post("/:id/view", optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { viewerId, episode } = req.body || {};
  const movie = await getMovie(id);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

  const episodeNumber = Number(episode);
  await addWatchHistory({
    userId: req.user?.id,
    viewerId: viewerId || null,
    movieId: movie.id,
    episode:
      Number.isFinite(episodeNumber) && episodeNumber > 0
        ? episodeNumber
        : undefined,
  });

  res.status(201).json({ success: true });
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

  const type = payload.type === "series" ? "series" : "single";
  const computedVideoType = detectVideoType(payload.videoType, payload.videoUrl);
  const computedHeaders = resolveVideoHeaders(
    computedVideoType,
    payload.videoHeaders
  );
  const sanitizedEpisodes =
    type === "series"
      ? sanitizeEpisodes(payload.episodes, computedHeaders)
      : [];

  const newMovie = {
    id,
    slug: slugify(orDefault(payload.slug, payload.title)),
    type,
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
    episodes:
      type === "series" && sanitizedEpisodes.length
        ? sanitizedEpisodes
        : type === "series" && payload.videoUrl
        ? sanitizeEpisodes(
            [
              {
                number: 1,
                title: "Tập 1",
                videoUrl: payload.videoUrl,
                videoType: computedVideoType,
              },
            ],
            computedHeaders
          )
        : [],
    tags: orDefault(payload.tags, []),
    moods: orDefault(payload.moods, []),
    cast: orDefault(payload.cast, []),
    director: orDefault(payload.director, ""),
    country: orDefault(payload.country, ""),
    seriesStatus: type === "series" ? orDefault(payload.seriesStatus, "") : "",
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
  const type = payload.type === "series" ? "series" : "single";
  payload.type = type;
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
  payload.episodes =
    type === "series"
      ? sanitizeEpisodes(
          req.body.episodes ?? movie.episodes ?? [],
          payload.videoHeaders
        )
      : [];
  payload.country = orDefault(req.body.country, movie.country ?? "");
  payload.seriesStatus =
    type === "series"
      ? orDefault(req.body.seriesStatus, movie.seriesStatus ?? "")
      : "";

  const updated = await updateMovie(id, payload);

  res.json({ movie: updated });
});

// Xóa phim (ADMIN)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  await deleteMovie(req.params.id);
  res.status(204).send();
});

export default router;
