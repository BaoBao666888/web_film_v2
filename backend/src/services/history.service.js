import {
  listWatchHistory,
  addWatchHistory,
  removeWatchHistory,
  clearWatchHistory,
} from "../db.js";

/**
 * History Service - Business Logic Layer
 */
class HistoryService {
  /**
   * Get watch history for a user
   */
  async getHistory(userId) {
    return await listWatchHistory(userId);
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
