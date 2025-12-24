import {
  listWatchHistory,
  addWatchHistory,
  removeWatchHistory,
  clearWatchHistory,
  getWatchHistoryByMovie,
} from "../db.js";

/**
 * History Service - Business Logic Layer
 */
class HistoryService {
  /**
   * Get watch history for a user
   */
  async getHistory(userId, params) {
    const result = await listWatchHistory(userId, params);
    return {
      items: result.items.map((item) => ({
        id: item.id,
        movieId: item.movie?.id || item.movie_id,
        title: item.movie?.title || "",
        thumbnail: item.movie?.thumbnail || "",
        movieType: item.movie?.type,
        episode: item.episode,
        position: item.last_position ?? 0,
        lastWatchedAt: item.last_watched_at,
      })),
      meta: result.meta,
    };
  }

  /**
   * Add watch history record
   */
  async addHistory(userId, movieId) {
    if (!movieId) {
      throw new Error("MISSING_MOVIE_ID");
    }

    await addWatchHistory({ userId, movieId });
    return { success: true };
  }

  /**
   * Update history with resume position
   */
  async updateHistory(userId, payload) {
    const { movieId, episode, position } = payload || {};
    if (!movieId) {
      throw new Error("MISSING_MOVIE_ID");
    }

    await addWatchHistory({
      userId,
      movieId,
      episode,
      position,
    });
    return { success: true };
  }

  /**
   * Get resume info for a movie
   */
  async getResume(userId, movieId) {
    if (!movieId) {
      throw new Error("MISSING_MOVIE_ID");
    }
    const item = await getWatchHistoryByMovie({ userId, movieId });
    if (!item) return null;
    return {
      id: item.id,
      movieId: item.movie_id,
      episode: item.episode,
      position: item.last_position ?? 0,
      lastWatchedAt: item.last_watched_at,
    };
  }

  /**
   * Remove a history record
   */
  async removeHistory(userId, historyId) {
    if (!historyId) {
      throw new Error("MISSING_HISTORY_ID");
    }

    await removeWatchHistory({ userId, historyId });
    return { success: true };
  }

  /**
   * Clear all history for a user
   */
  async clearHistory(userId) {
    await clearWatchHistory(userId);
    return { success: true };
  }
}

export default new HistoryService();
