import {
  listMovies,
  getMovie,
  getRandomMovies,
  insertMovie,
  updateMovie,
  deleteMovie,
  listReviewsByMovie,
  getTrendingMovies,
  listNewestMovies,
  getCommunityHighlights,
  getMovieRatingStats,
  listCommentsByMovie,
  insertComment,
  getUserById,
  addFavorite,
  removeFavorite,
  isFavorite,
  addWatchHistory,
  countMovieViews,
} from "../db.js";
import {
  slugify,
  orDefault,
  sanitizeTags,
  detectVideoType,
  resolveVideoHeaders,
  sanitizeEpisodes,
} from "./movie.helpers.js";
import {
  promoteTempUploadUrl,
  removeFileIfExists,
} from "../utils/uploadFiles.js";

async function promotePayloadUploads(payload) {
  if (!payload || typeof payload !== "object") {
    return { payload, movedFiles: [] };
  }

  const movedFiles = [];
  const next = { ...payload };

  if (typeof payload.poster === "string") {
    const result = await promoteTempUploadUrl(payload.poster);
    if (result.promotedPath) movedFiles.push(result.promotedPath);
    next.poster = result.url;
  }

  if (typeof payload.thumbnail === "string") {
    const result = await promoteTempUploadUrl(payload.thumbnail);
    if (result.promotedPath) movedFiles.push(result.promotedPath);
    next.thumbnail = result.url;
  }

  if (typeof payload.videoUrl === "string") {
    const result = await promoteTempUploadUrl(payload.videoUrl);
    if (result.promotedPath) movedFiles.push(result.promotedPath);
    next.videoUrl = result.url;
  }

  if (Array.isArray(payload.episodes)) {
    const episodes = [];
    for (const episode of payload.episodes) {
      const nextEpisode = { ...episode };
      if (typeof episode.videoUrl === "string") {
        const result = await promoteTempUploadUrl(episode.videoUrl);
        if (result.promotedPath) movedFiles.push(result.promotedPath);
        nextEpisode.videoUrl = result.url;
      }
      episodes.push(nextEpisode);
    }
    next.episodes = episodes;
  }

  return { payload: next, movedFiles };
}

/**
 * Movie Service - Business Logic Layer
 */
class MovieService {
  /**
   * List movies with filters
   */
  async listMovies(filters) {
    const { q, mood, tag, limit = 12 } = filters;
    return await listMovies({
      q,
      mood,
      tag,
      limit: Number(limit) || 12,
    });
  }

  /**
   * Get trending movies
   */
  async getTrendingMovies(params) {
    const { days = 7, page = 1, limit = 12 } = params;
    return await getTrendingMovies({
      days: Number(days) || 7,
      page: Number(page) || 1,
      limit: Number(limit) || 12,
    });
  }

  /**
   * Get newest movies
   */
  async getNewestMovies(params) {
    const { page = 1, limit = 6 } = params;
    return await listNewestMovies({
      page: Number(page) || 1,
      limit: Number(limit) || 6,
    });
  }

  /**
   * Get community highlights
   */
  async getCommunityHighlights() {
    return await getCommunityHighlights();
  }

  /**
   * Get movie details with reviews and suggestions
   */
  async getMovieDetails(movieId) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    const [reviews, suggestions, ratingStats] = await Promise.all([
      listReviewsByMovie(movie.id, 5),
      getRandomMovies({ excludeId: movie.id, limit: 4 }),
      getMovieRatingStats(movie.id),
    ]);

    return { movie, reviews, suggestions, ratingStats };
  }

  /**
   * Get movie comments
   */
  async getComments(movieId, limit = 30) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }
    return await listCommentsByMovie(movie.id, Number(limit) || 30);
  }

  /**
   * Add comment to movie
   */
  async addComment(movieId, userId, content) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    const trimmed = (content || "").trim();
    if (!trimmed) {
      throw new Error("EMPTY_CONTENT");
    }

    const saved = await insertComment({
      userId,
      movieId: movie.id,
      content: trimmed,
    });

    const user = await getUserById(userId);
    return {
      comment: {
        ...saved,
        user: user
          ? { id: user.id, name: user.name, avatar: user.avatar }
          : null,
      },
    };
  }

  /**
   * Get watch data for a movie
   */
  async getWatchData(movieId, episodeNumber) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

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

    const episodeQuery = Number(episodeNumber);
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

    return {
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
    };
  }

  /**
   * Record movie view
   */
  async recordView(movieId, userId, viewerId, episode) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    const episodeNumber = Number(episode);
    await addWatchHistory({
      userId,
      viewerId: viewerId || null,
      movieId: movie.id,
      episode:
        Number.isFinite(episodeNumber) && episodeNumber > 0
          ? episodeNumber
          : undefined,
    });

    return { success: true };
  }

  /**
   * Check if movie is favorited by user
   */
  async checkFavorite(movieId, userId) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    const favorite = await isFavorite({ userId, movieId: movie.id });
    return { favorite };
  }

  /**
   * Add movie to favorites
   */
  async addToFavorites(movieId, userId) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    await addFavorite({ userId, movieId: movie.id });
    return { message: "Đã lưu vào yêu thích", movieId: movie.id };
  }

  /**
   * Remove movie from favorites
   */
  async removeFromFavorites(movieId, userId) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    await removeFavorite({ userId, movieId: movie.id });
    return { message: "Đã xoá khỏi yêu thích", movieId: movie.id };
  }

  /**
   * Create new movie (Admin)
   */
  async createMovie(payload) {
    if (!payload.title) {
      throw new Error("MISSING_TITLE");
    }

    const { payload: normalized, movedFiles } =
      await promotePayloadUploads(payload);

    try {
      const id = orDefault(normalized.id, slugify(normalized.title));
      const type = normalized.type === "series" ? "series" : "single";
      const computedVideoType = detectVideoType(
        normalized.videoType,
        normalized.videoUrl
      );
      const computedHeaders = resolveVideoHeaders(
        computedVideoType,
        normalized.videoHeaders
      );
      const sanitizedEpisodes =
        type === "series"
          ? sanitizeEpisodes(normalized.episodes, computedHeaders)
          : [];

      const newMovie = {
        id,
        slug: slugify(orDefault(normalized.slug, normalized.title)),
        type,
        title: normalized.title,
        synopsis: orDefault(normalized.synopsis, ""),
        year: orDefault(normalized.year, new Date().getFullYear()),
        duration: orDefault(normalized.duration, ""),
        rating: orDefault(normalized.rating, 0),
        thumbnail: orDefault(normalized.thumbnail, ""),
        poster: orDefault(normalized.poster, ""),
        trailerUrl: orDefault(normalized.trailerUrl, ""),
        videoUrl: orDefault(normalized.videoUrl, ""),
        videoType: computedVideoType,
        videoHeaders: computedHeaders,
        episodes:
          type === "series" && sanitizedEpisodes.length
            ? sanitizedEpisodes
            : type === "series" && normalized.videoUrl
            ? sanitizeEpisodes(
                [
                  {
                    number: 1,
                    title: "Tập 1",
                    videoUrl: normalized.videoUrl,
                    videoType: computedVideoType,
                  },
                ],
                computedHeaders
              )
            : [],
        tags: sanitizeTags(orDefault(normalized.tags, [])),
        moods: orDefault(normalized.moods, []),
        cast: orDefault(normalized.cast, []),
        director: orDefault(normalized.director, ""),
        country: orDefault(normalized.country, ""),
        seriesStatus:
          type === "series" ? orDefault(normalized.seriesStatus, "") : "",
        embedding_synced: false,
      };

      // Handle duplicate ID with auto-increment
      let finalMovie = newMovie;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        try {
          return await insertMovie(finalMovie);
        } catch (error) {
          if (error.code === 11000 && attempts < maxAttempts - 1) {
            // Duplicate key error, try with incremented ID
            attempts++;
            finalMovie = {
              ...newMovie,
              id: `${id}-${attempts + 1}`,
              slug: `${newMovie.slug}-${attempts + 1}`,
            };
            console.log(
              `Duplicate ID detected, retrying with: ${finalMovie.id}`
            );
          } else {
            throw error;
          }
        }
      }

      throw new Error("Failed to create movie after multiple attempts");
    } catch (error) {
      await Promise.all(
        movedFiles.map((filePath) => removeFileIfExists(filePath))
      );
      throw error;
    }
  }

  /**
   * Update movie (Admin)
   */
  async updateMovie(movieId, payload) {
    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    const { payload: normalized, movedFiles } =
      await promotePayloadUploads(payload);

    try {
      const merged = { ...movie, ...normalized };
      const type = merged.type === "series" ? "series" : "single";
      merged.type = type;

      const computedVideoType = detectVideoType(
        normalized.videoType ?? movie.videoType,
        merged.videoUrl
      );
      merged.videoType = computedVideoType;
      merged.videoHeaders = resolveVideoHeaders(
        computedVideoType,
        normalized.videoHeaders !== undefined
          ? normalized.videoHeaders
          : movie.videoHeaders
      );
      merged.tags = sanitizeTags(merged.tags ?? []);
      merged.episodes =
        type === "series"
          ? sanitizeEpisodes(
              normalized.episodes ?? movie.episodes ?? [],
              merged.videoHeaders
            )
          : [];
      merged.country = orDefault(normalized.country, movie.country ?? "");
      merged.seriesStatus =
        type === "series"
          ? orDefault(normalized.seriesStatus, movie.seriesStatus ?? "")
          : "";
      merged.embedding_synced = false;

      return await updateMovie(movieId, merged);
    } catch (error) {
      await Promise.all(
        movedFiles.map((filePath) => removeFileIfExists(filePath))
      );
      throw error;
    }
  }

  /**
   * Delete movie (Admin)
   */
  async deleteMovie(movieId) {
    await deleteMovie(movieId);
  }
}

export default new MovieService();
