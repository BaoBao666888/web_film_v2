import historyService from "../services/history.service.js";

/**
 * History Controller - HTTP Request/Response Handler
 */
class HistoryController {
  /**
   * Get watch history
   * GET /history
   */
  async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query || {};
      const result = await historyService.getHistory(userId, { page, limit });
      res.json(result);
    } catch (error) {
      console.error("Error getting history:", error);
      res.status(500).json({ message: "Lỗi khi lấy lịch sử xem" });
    }
  }

  /**
   * Add watch history
   * POST /history
   */
  async addHistory(req, res) {
    try {
      const userId = req.user.id;
      const { movieId } = req.body;

      const result = await historyService.addHistory(userId, movieId);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === "MISSING_MOVIE_ID") {
        return res.status(400).json({ message: "Thiếu movieId" });
      }
      console.error("Error adding history:", error);
      res.status(500).json({ message: "Lỗi khi thêm lịch sử xem" });
    }
  }

  /**
   * Update history with resume position
   * POST /history/update
   */
  async updateHistory(req, res) {
    try {
      const userId = req.user.id;
      const { movieId, episode, position } = req.body || {};

      const result = await historyService.updateHistory(userId, {
        movieId,
        episode,
        position,
      });
      res.status(201).json(result);
    } catch (error) {
      if (error.message === "MISSING_MOVIE_ID") {
        return res.status(400).json({ message: "Thiếu movieId" });
      }
      console.error("Error updating history:", error);
      res.status(500).json({ message: "Lỗi khi cập nhật lịch sử xem" });
    }
  }

  /**
   * Get resume info for a movie
   * GET /history/resume?movieId=xxx
   */
  async getResume(req, res) {
    try {
      const userId = req.user.id;
      const { movieId } = req.query || {};
      const result = await historyService.getResume(userId, movieId);
      res.json({ item: result });
    } catch (error) {
      if (error.message === "MISSING_MOVIE_ID") {
        return res.status(400).json({ message: "Thiếu movieId" });
      }
      console.error("Error getting resume:", error);
      res.status(500).json({ message: "Lỗi khi lấy lịch sử xem" });
    }
  }

  /**
   * Remove history record
   * DELETE /history/:historyId
   */
  async removeHistory(req, res) {
    try {
      const userId = req.user.id;
      const { historyId } = req.params;

      const result = await historyService.removeHistory(userId, historyId);
      res.json(result);
    } catch (error) {
      if (error.message === "MISSING_HISTORY_ID") {
        return res.status(400).json({ message: "Thiếu historyId" });
      }
      console.error("Error removing history:", error);
      res.status(500).json({ message: "Lỗi khi xóa lịch sử xem" });
    }
  }

  /**
   * Clear all history
   * DELETE /history
   */
  async clearHistory(req, res) {
    try {
      const userId = req.user.id;
      const result = await historyService.clearHistory(userId);
      res.json(result);
    } catch (error) {
      console.error("Error clearing history:", error);
      res.status(500).json({ message: "Lỗi khi xóa toàn bộ lịch sử xem" });
    }
  }
}

export default new HistoryController();
