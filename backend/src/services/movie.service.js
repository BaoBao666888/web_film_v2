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
  MOVIE_STATUS_VALUES,
  parseDurationToSeconds,
} from "./movie.helpers.js";
import {
  promoteTempUploadUrl,
  removeFileIfExists,
} from "../utils/uploadFiles.js";
import { Movie } from "../models/Movie.js";
import { User } from "../models/User.js";
import { WalletLedger } from "../models/WalletLedger.js";
import { PreviewPurchase } from "../models/PreviewPurchase.js";
import { WatchParty } from "../models/WatchParty.js";
import { generateId } from "../utils/id.js";

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

const normalizeStatus = (value) =>
  MOVIE_STATUS_VALUES.includes(value) ? value : "public";

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePreview = (enabled, price) => {
  const previewEnabled = Boolean(enabled);
  const previewPrice = Math.max(0, Number(price) || 0);
  return {
    previewEnabled,
    previewPrice: previewEnabled ? previewPrice : 0,
  };
};

const buildPremiereRoomId = (movieId, episodeNumber) =>
  `premiere-${movieId}-${episodeNumber || 0}`;

const resolvePremiereWindow = (premiereAt, durationSeconds) => {
  if (!premiereAt) return null;
  const startAt = normalizeDate(premiereAt);
  if (!startAt) return null;
  const endAt =
    durationSeconds && durationSeconds > 0
      ? new Date(startAt.getTime() + durationSeconds * 1000)
      : null;
  const now = new Date();
  const state =
    now < startAt ? "upcoming" : endAt && now > endAt ? "ended" : "live";
  return { startAt, endAt, state };
};

const countActiveParticipants = (participants = []) => {
  const now = Date.now();
  return participants.filter((p) => now - (p.lastSeen || 0) < 15000).length;
};

const ensurePremiereRoom = async ({ movie, episode }) => {
  if (!movie?.id) return null;
  const roomId = buildPremiereRoomId(movie.id, episode?.number);
  const existing = await WatchParty.findOne({ roomId });
  if (existing) return existing.toObject();

  const created = await WatchParty.create({
    roomId,
    movieId: movie.id,
    episodeNumber: episode?.number,
    title: episode?.title
      ? `${movie.title} • ${episode.title}`
      : movie.title,
    poster: movie.poster || movie.thumbnail,
    hostId: "premiere-system",
    hostName: "Premiere",
    isLive: true,
    isPrivate: false,
    autoStart: true,
    currentPosition: 0,
    state: {
      position: 0,
      isPlaying: true,
      playbackRate: 1,
      updatedAt: Date.now(),
    },
    participants: [],
    messages: [],
    lastActive: Date.now(),
  });

  return created.toObject();
};

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
   * Get premiere movies (live or upcoming)
   */
  async listPremieres(params = {}) {
    const { state = "live", limit = 6 } = params;
    const targetState = state === "upcoming" ? "upcoming" : "live";
    const sanitizedLimit = Math.min(Math.max(Number(limit) || 6, 1), 30);

    const candidates = await Movie.find({
      isHidden: { $ne: true },
      status: { $ne: "hidden" },
      $or: [{ status: "premiere" }, { "episodes.status": "premiere" }],
    }).lean();

    const items = [];
    for (const movie of candidates) {
      const movieType = movie.type || "single";
      if (movieType === "series") {
        const episodes = sanitizeEpisodes(movie.episodes || [], movie.videoHeaders);
        const premiereEpisodes = episodes.filter(
          (episode) => episode.status === "premiere"
        );
        let hasActivePremiere = false;

        for (const episode of premiereEpisodes) {
          const premiereWindow = resolvePremiereWindow(
            episode.premiereAt,
            parseDurationToSeconds(episode.duration || movie.duration)
          );
          if (!premiereWindow) continue;
          if (premiereWindow.state === "ended") {
            await Movie.updateOne(
              { id: movie.id, "episodes.number": episode.number },
              {
                $set: {
                  "episodes.$.status": "public",
                  "episodes.$.releasedAt": new Date(),
                },
              }
            );
            continue;
          }
          hasActivePremiere = true;

          if (premiereWindow.state !== targetState) {
            continue;
          }

          const roomId =
            targetState === "live"
              ? buildPremiereRoomId(movie.id, episode.number)
              : null;
          let viewerCount = null;
          if (targetState === "live") {
            const room = await ensurePremiereRoom({ movie, episode });
            viewerCount = room?.participants
              ? countActiveParticipants(room.participants)
              : 0;
          }

          items.push({
            movieId: movie.id,
            episodeNumber: episode.number,
            title: movie.title,
            synopsis: movie.synopsis,
            poster: movie.poster,
            thumbnail: movie.thumbnail,
            duration: episode.duration || movie.duration,
            rating: movie.rating,
            type: movieType,
            premiereAt: premiereWindow.startAt,
            endsAt: premiereWindow.endAt,
            previewEnabled: Boolean(episode.previewEnabled),
            previewPrice: Number(episode.previewPrice) || 0,
            episodeTitle: episode.title,
            viewerCount,
            roomId,
          });
        }

        if (!hasActivePremiere && movie.status === "premiere") {
          await Movie.updateOne(
            { id: movie.id },
            {
              $set: {
                status: "public",
                releasedAt: movie.releasedAt || new Date(),
                isHidden: false,
              },
            }
          );
        }
      } else if (normalizeStatus(movie.status) === "premiere") {
        const premiereWindow = resolvePremiereWindow(
          movie.premiereAt,
          parseDurationToSeconds(movie.duration)
        );
        if (!premiereWindow) continue;
        if (premiereWindow.state === "ended") {
          await Movie.updateOne(
            { id: movie.id },
            {
              $set: {
                status: "public",
                releasedAt: movie.releasedAt || new Date(),
                isHidden: false,
              },
            }
          );
          continue;
        }
        if (premiereWindow.state !== targetState) continue;

        const roomId =
          targetState === "live"
            ? buildPremiereRoomId(movie.id, null)
            : null;
        let viewerCount = null;
        if (targetState === "live") {
          const room = await ensurePremiereRoom({ movie, episode: null });
          viewerCount = room?.participants
            ? countActiveParticipants(room.participants)
            : 0;
        }

        items.push({
          movieId: movie.id,
          episodeNumber: null,
          title: movie.title,
          synopsis: movie.synopsis,
          poster: movie.poster,
          thumbnail: movie.thumbnail,
          duration: movie.duration,
          rating: movie.rating,
          type: movieType,
          premiereAt: premiereWindow.startAt,
          endsAt: premiereWindow.endAt,
          previewEnabled: Boolean(movie.previewEnabled),
          previewPrice: Number(movie.previewPrice) || 0,
          episodeTitle: null,
          viewerCount,
          roomId,
        });
      }
    }

    const sorted = items.sort((a, b) => {
      const aTime = a.premiereAt ? new Date(a.premiereAt).getTime() : 0;
      const bTime = b.premiereAt ? new Date(b.premiereAt).getTime() : 0;
      return targetState === "upcoming" ? aTime - bTime : bTime - aTime;
    });

    return { items: sorted.slice(0, sanitizedLimit) };
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
  async getWatchData(movieId, episodeNumber, userId) {
    const movie = await Movie.findOne({
      $or: [{ id: movieId }, { slug: movieId }],
      isHidden: { $ne: true },
      status: { $ne: "hidden" },
    }).lean();
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
    const visibleEpisodes =
      movieType === "series"
        ? episodes.filter((ep) => ep.status !== "hidden")
        : [];

    const episodeQuery = Number(episodeNumber);
    const selectedEpisode =
      movieType === "series"
        ? visibleEpisodes.find((ep) => ep.number === episodeQuery) ||
          visibleEpisodes[0] ||
          null
        : null;
    if (movieType === "series" && !selectedEpisode) {
      throw new Error("EPISODE_NOT_FOUND");
    }

    const targetStatus =
      movieType === "series"
        ? normalizeStatus(selectedEpisode?.status)
        : normalizeStatus(movie.status);
    const targetPremiereAt =
      movieType === "series" ? selectedEpisode?.premiereAt : movie.premiereAt;
    const targetPreviewEnabled =
      movieType === "series"
        ? Boolean(selectedEpisode?.previewEnabled)
        : Boolean(movie.previewEnabled);
    const targetPreviewPrice =
      movieType === "series"
        ? Number(selectedEpisode?.previewPrice) || 0
        : Number(movie.previewPrice) || 0;
    const durationSeconds = parseDurationToSeconds(
      selectedEpisode?.duration || movie.duration
    );

    let premiereWindow =
      targetStatus === "premiere"
        ? resolvePremiereWindow(targetPremiereAt, durationSeconds)
        : null;

    if (targetStatus === "premiere" && premiereWindow?.state === "ended") {
      const now = new Date();
      if (movieType === "series" && selectedEpisode) {
        await Movie.updateOne(
          { id: movie.id, "episodes.number": selectedEpisode.number },
          {
            $set: {
              "episodes.$.status": "public",
              "episodes.$.releasedAt": now,
            },
          }
        );

        const remainingPremiere = episodes.some(
          (episode) =>
            episode.number !== selectedEpisode.number &&
            episode.status === "premiere"
        );
        if (!remainingPremiere && movie.status === "premiere") {
          await Movie.updateOne(
            { id: movie.id },
            {
              $set: {
                status: "public",
                releasedAt: movie.releasedAt || now,
                isHidden: false,
              },
            }
          );
        }
      } else if (movieType === "single") {
        await Movie.updateOne(
          { id: movie.id },
          {
            $set: {
              status: "public",
              releasedAt: movie.releasedAt || now,
              isHidden: false,
            },
          }
        );
      }
      premiereWindow = null;
    }

    let previewPurchased = false;
    if (userId && targetPreviewEnabled) {
      const previewEpisode =
        movieType === "series" ? selectedEpisode?.number || 0 : 0;
      if (previewEpisode >= 0) {
        const existingPurchase = await PreviewPurchase.findOne({
          user_id: userId,
          movie_id: movie.id,
          episode: previewEpisode,
        }).lean();
        previewPurchased = Boolean(existingPurchase);
      }
    }

    let canPlay = true;
    let requiresPreview = false;
    let lockReason = "";

    if (targetStatus === "hidden") {
      canPlay = false;
      lockReason = "HIDDEN";
    }

    if (targetStatus === "premiere" && premiereWindow?.state === "upcoming") {
      if (!targetPreviewEnabled) {
        canPlay = false;
        lockReason = "PREVIEW_DISABLED";
      } else if (!previewPurchased) {
        canPlay = false;
        requiresPreview = true;
        lockReason = "PREVIEW_REQUIRED";
      }
    }

    const streamSource = canPlay
      ? selectedEpisode?.videoUrl ?? movie.videoUrl ?? ""
      : "";
    const playbackType = streamSource
      ? detectVideoType(selectedEpisode?.videoType ?? movie.videoType, streamSource)
      : "mp4";
    const resolvedHeaders = streamSource
      ? resolveVideoHeaders(
          playbackType,
          selectedEpisode?.videoHeaders ?? movie.videoHeaders
        )
      : {};

    const nextUp =
      movieType === "series" && visibleEpisodes.length
        ? visibleEpisodes
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

    const views =
      targetStatus === "premiere" && premiereWindow
        ? null
        : await countMovieViews(movie.id);

    let premiereRoomId = null;
    let viewerCount = null;
    if (targetStatus === "premiere" && premiereWindow) {
      const room = await ensurePremiereRoom({
        movie,
        episode: selectedEpisode,
      });
      premiereRoomId = room?.roomId || null;
      if (premiereWindow.state === "live" && room?.participants) {
        viewerCount = countActiveParticipants(room.participants);
      } else {
        viewerCount = 0;
      }
    }

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
          ? visibleEpisodes.map((ep) => ({
              number: ep.number,
              title: ep.title,
              duration: ep.duration,
              status: ep.status,
              premiereAt: ep.premiereAt,
              previewEnabled: ep.previewEnabled,
              previewPrice: ep.previewPrice,
            }))
          : [],
      currentEpisode:
        movieType === "series" && selectedEpisode
          ? {
              number: selectedEpisode.number,
              title: selectedEpisode.title,
              duration: selectedEpisode.duration,
              status: selectedEpisode.status,
              premiereAt: selectedEpisode.premiereAt,
              previewEnabled: selectedEpisode.previewEnabled,
              previewPrice: selectedEpisode.previewPrice,
            }
          : null,
      type: movieType,
      views,
      viewsHidden: targetStatus === "premiere" && Boolean(premiereWindow),
      access: {
        canPlay,
        requiresPreview,
        previewEnabled: targetPreviewEnabled,
        previewPrice: targetPreviewPrice,
        previewPurchased,
        lockReason,
      },
      premiere: premiereWindow
        ? {
            status: premiereWindow.state,
            premiereAt: premiereWindow.startAt.toISOString(),
            endsAt: premiereWindow.endAt
              ? premiereWindow.endAt.toISOString()
              : null,
            roomId: premiereRoomId,
            viewerCount,
          }
        : null,
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
   * Purchase preview access for a premiere movie/episode
   */
  async purchasePreview(movieId, userId, episodeNumber) {
    const movie = await Movie.findOne({
      $or: [{ id: movieId }, { slug: movieId }],
      isHidden: { $ne: true },
      status: { $ne: "hidden" },
    });
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    const movieType = movie.type || "single";
    const episodes = sanitizeEpisodes(movie.episodes || [], movie.videoHeaders);
    const episodeQuery = Number(episodeNumber);
    const selectedEpisode =
      movieType === "series"
        ? episodes.find((ep) => ep.number === episodeQuery) || null
        : null;

    if (movieType === "series" && !selectedEpisode) {
      throw new Error("EPISODE_NOT_FOUND");
    }

    const previewEnabled =
      movieType === "series"
        ? Boolean(selectedEpisode?.previewEnabled)
        : Boolean(movie.previewEnabled);
    const previewPrice =
      movieType === "series"
        ? Number(selectedEpisode?.previewPrice) || 0
        : Number(movie.previewPrice) || 0;

    if (!previewEnabled || previewPrice <= 0) {
      throw new Error("PREVIEW_DISABLED");
    }

    const episodeKey =
      movieType === "series" ? selectedEpisode?.number || 0 : 0;
    const existing = await PreviewPurchase.findOne({
      user_id: userId,
      movie_id: movie.id,
      episode: episodeKey,
    });
    if (existing) {
      const refreshed = await User.findOne({ id: userId }).lean();
      return {
        purchased: true,
        alreadyPurchased: true,
        balance: refreshed?.balance ?? 0,
      };
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const currentBalance = Number(user.balance || 0);
    if (currentBalance < previewPrice) {
      throw new Error("BALANCE_INSUFFICIENT");
    }

    const purchaseId = generateId("preview");
    const now = new Date();
    user.balance = currentBalance - previewPrice;
    await user.save();

    await PreviewPurchase.create({
      id: purchaseId,
      user_id: userId,
      movie_id: movie.id,
      episode: episodeKey,
      amount: previewPrice,
      created_at: now,
    });

    await WalletLedger.create({
      id: generateId("ledger"),
      user_id: userId,
      amount: -Math.abs(previewPrice),
      type: "purchase",
      ref_id: purchaseId,
      note:
        movieType === "series" && selectedEpisode
          ? `Preview ${movie.title} - Tập ${selectedEpisode.number}`
          : `Preview ${movie.title}`,
      created_by: userId,
      created_at: now,
    });

    return {
      purchased: true,
      balance: user.balance ?? 0,
      purchaseId,
    };
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
      const status = normalizeStatus(normalized.status);
      const premiereAt = normalizeDate(normalized.premiereAt);
      const previewConfig = normalizePreview(
        normalized.previewEnabled,
        normalized.previewPrice
      );
      const releasedAt =
        normalizeDate(normalized.releasedAt) ||
        (status === "public" ? new Date() : null);

      if (previewConfig.previewEnabled && previewConfig.previewPrice <= 0) {
        throw new Error("PREVIEW_PRICE_REQUIRED");
      }

      if (type === "single" && status === "premiere" && !premiereAt) {
        throw new Error("PREMIERE_TIME_REQUIRED");
      }

      const sanitizedEpisodes =
        type === "series"
          ? sanitizeEpisodes(normalized.episodes, computedHeaders)
          : [];
      const fallbackEpisodes =
        type === "series" && normalized.videoUrl && sanitizedEpisodes.length === 0
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
          : sanitizedEpisodes;
      const defaultEpisodeStatus =
        status === "hidden"
          ? "hidden"
          : status === "premiere"
          ? "premiere"
          : "public";
      const episodesWithStatus =
        type === "series"
          ? fallbackEpisodes.map((episode) => {
              const episodeStatus = normalizeStatus(
                episode.status ?? defaultEpisodeStatus
              );
              const episodePremiereAt = normalizeDate(episode.premiereAt);
              const episodePreview = normalizePreview(
                episode.previewEnabled,
                episode.previewPrice
              );
              if (episodePreview.previewEnabled && episodePreview.previewPrice <= 0) {
                throw new Error("EPISODE_PREVIEW_PRICE_REQUIRED");
              }
              if (episodeStatus === "premiere" && !episodePremiereAt) {
                throw new Error("EPISODE_PREMIERE_TIME_REQUIRED");
              }
              return {
                ...episode,
                status: episodeStatus,
                premiereAt: episodePremiereAt,
                previewEnabled: episodePreview.previewEnabled,
                previewPrice: episodePreview.previewPrice,
                releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : null,
              };
            })
          : [];

      if (type === "series" && episodesWithStatus.length === 0) {
        throw new Error("SERIES_EPISODE_REQUIRED");
      }

      if (type === "series" && status === "hidden") {
        episodesWithStatus.forEach((episode) => {
          episode.status = "hidden";
          episode.previewEnabled = false;
          episode.previewPrice = 0;
        });
      }

      if (
        type === "series" &&
        status === "public" &&
        !episodesWithStatus.some((episode) => episode.status === "public")
      ) {
        throw new Error("SERIES_PUBLIC_REQUIRED");
      }

      if (
        type === "series" &&
        status === "premiere" &&
        !episodesWithStatus.some((episode) => episode.status === "premiere")
      ) {
        throw new Error("SERIES_PREMIERE_REQUIRED");
      }

      if (type === "series") {
        const premiereEpisodes = episodesWithStatus
          .filter((episode) => episode.status === "premiere")
          .sort((a, b) => a.number - b.number);
        for (let i = 1; i < premiereEpisodes.length; i += 1) {
          const prev = premiereEpisodes[i - 1];
          const current = premiereEpisodes[i];
          if (prev?.premiereAt && current?.premiereAt) {
            if (current.premiereAt <= prev.premiereAt) {
              throw new Error("EPISODE_PREMIERE_ORDER");
            }
          }
        }
      }

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
        episodes: episodesWithStatus,
        tags: sanitizeTags(orDefault(normalized.tags, [])),
        moods: orDefault(normalized.moods, []),
        cast: orDefault(normalized.cast, []),
        director: orDefault(normalized.director, ""),
        country: orDefault(normalized.country, ""),
        seriesStatus:
          type === "series" ? orDefault(normalized.seriesStatus, "") : "",
        embedding_synced: false,
        status,
        premiereAt,
        previewEnabled: previewConfig.previewEnabled,
        previewPrice: previewConfig.previewPrice,
        releasedAt,
        isHidden: status === "hidden",
        unhideDate: status === "hidden" ? normalizeDate(normalized.unhideDate) : null,
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
    const movieDoc = await Movie.findOne({
      $or: [{ id: movieId }, { slug: movieId }],
    });
    if (!movieDoc) {
      throw new Error("MOVIE_NOT_FOUND");
    }
    const movie = movieDoc.toObject();

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
      const currentStatus = normalizeStatus(movie.status);
      const nextStatus =
        normalized.status !== undefined
          ? normalizeStatus(normalized.status)
          : currentStatus;

      if (currentStatus === "public" && nextStatus === "premiere") {
        throw new Error("STATUS_TRANSITION_FORBIDDEN");
      }

      const premiereAt =
        normalized.premiereAt !== undefined
          ? normalizeDate(normalized.premiereAt)
          : normalizeDate(movie.premiereAt);

      const previewConfig = normalizePreview(
        normalized.previewEnabled !== undefined
          ? normalized.previewEnabled
          : movie.previewEnabled,
        normalized.previewPrice !== undefined
          ? normalized.previewPrice
          : movie.previewPrice
      );

      if (previewConfig.previewEnabled && previewConfig.previewPrice <= 0) {
        throw new Error("PREVIEW_PRICE_REQUIRED");
      }

      if (type === "single" && nextStatus === "premiere" && !premiereAt) {
        throw new Error("PREMIERE_TIME_REQUIRED");
      }

      const releasedAt =
        nextStatus === "public"
          ? normalizeDate(normalized.releasedAt) ||
            normalizeDate(movie.releasedAt) ||
            new Date()
          : normalizeDate(normalized.releasedAt) || normalizeDate(movie.releasedAt);

      merged.tags = sanitizeTags(merged.tags ?? []);
      const baseEpisodes =
        type === "series"
          ? sanitizeEpisodes(
              normalized.episodes ?? movie.episodes ?? [],
              merged.videoHeaders
            )
          : [];
      const defaultEpisodeStatus =
        nextStatus === "hidden"
          ? "hidden"
          : nextStatus === "premiere"
          ? "premiere"
          : "public";
      const episodesWithStatus =
        type === "series"
          ? baseEpisodes.map((episode) => {
              const episodeStatus = normalizeStatus(
                episode.status ?? defaultEpisodeStatus
              );
              const episodePremiereAt = normalizeDate(episode.premiereAt);
              const episodePreview = normalizePreview(
                episode.previewEnabled,
                episode.previewPrice
              );
              if (
                episodePreview.previewEnabled &&
                episodePreview.previewPrice <= 0
              ) {
                throw new Error("EPISODE_PREVIEW_PRICE_REQUIRED");
              }
              if (episodeStatus === "premiere" && !episodePremiereAt) {
                throw new Error("EPISODE_PREMIERE_TIME_REQUIRED");
              }
              return {
                ...episode,
                status: episodeStatus,
                premiereAt: episodePremiereAt,
                previewEnabled: episodePreview.previewEnabled,
                previewPrice: episodePreview.previewPrice,
                releasedAt: episode.releasedAt ? new Date(episode.releasedAt) : null,
              };
            })
          : [];

      if (type === "series" && episodesWithStatus.length === 0) {
        throw new Error("SERIES_EPISODE_REQUIRED");
      }

      if (type === "series" && nextStatus === "hidden") {
        episodesWithStatus.forEach((episode) => {
          episode.status = "hidden";
          episode.previewEnabled = false;
          episode.previewPrice = 0;
        });
      }

      if (
        type === "series" &&
        nextStatus === "public" &&
        !episodesWithStatus.some((episode) => episode.status === "public")
      ) {
        throw new Error("SERIES_PUBLIC_REQUIRED");
      }

      if (
        type === "series" &&
        nextStatus === "premiere" &&
        !episodesWithStatus.some((episode) => episode.status === "premiere")
      ) {
        throw new Error("SERIES_PREMIERE_REQUIRED");
      }

      if (type === "series") {
        const premiereEpisodes = episodesWithStatus
          .filter((episode) => episode.status === "premiere")
          .sort((a, b) => a.number - b.number);
        for (let i = 1; i < premiereEpisodes.length; i += 1) {
          const prev = premiereEpisodes[i - 1];
          const current = premiereEpisodes[i];
          if (prev?.premiereAt && current?.premiereAt) {
            if (current.premiereAt <= prev.premiereAt) {
              throw new Error("EPISODE_PREMIERE_ORDER");
            }
          }
        }
      }

      merged.episodes = episodesWithStatus;
      merged.country = orDefault(normalized.country, movie.country ?? "");
      merged.seriesStatus =
        type === "series"
          ? orDefault(normalized.seriesStatus, movie.seriesStatus ?? "")
          : "";
      merged.embedding_synced = false;
      merged.status = nextStatus;
      merged.premiereAt = premiereAt;
      merged.previewEnabled = previewConfig.previewEnabled;
      merged.previewPrice = previewConfig.previewPrice;
      merged.releasedAt = releasedAt;
      merged.isHidden = nextStatus === "hidden";
      merged.unhideDate =
        nextStatus === "hidden"
          ? normalizeDate(normalized.unhideDate ?? movie.unhideDate)
          : null;

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
