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
      const items = await historyService.getHistory(userId);
      res.json({ items });
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
