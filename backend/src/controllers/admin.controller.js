import adminService from "../services/admin.service.js";
import notificationService from "../services/notification.service.js";

/**
 * Admin Controller - HTTP Request/Response Handler
 */
class AdminController {
  /**
   * Get dashboard statistics
   * GET /admin/stats
   */
  async getStats(req, res) {
    try {
      const stats = await adminService.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ message: "Lỗi khi lấy thống kê" });
    }
  }

  /**
   * List all users
   * GET /admin/users
   */
  async listUsers(req, res) {
    try {
      const users = await adminService.listUsers();
      res.json({ users });
    } catch (error) {
      console.error("Error listing users:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng" });
    }
  }

  /**
   * List movies with pagination
   * GET /admin/movies
   */
  async listMovies(req, res) {
    try {
      const { page, limit, q } = req.query;
      const result = await adminService.listMovies({ page, limit, q });
      res.json(result);
    } catch (error) {
      console.error("Error listing movies:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách phim" });
    }
  }

  /**
   * Send inbox message to users
   * POST /admin/notifications
   */
  async sendNotifications(req, res) {
    try {
      const { userIds, title, content, senderType } = req.body || {};
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res
          .status(400)
          .json({ message: "Cần chọn ít nhất 1 người nhận" });
      }
      if (!content || !String(content).trim()) {
        return res
          .status(400)
          .json({ message: "Nội dung thông báo không được trống" });
      }

      const normalizedSenderType = senderType === "admin" ? "admin" : "bot";

      const result = await notificationService.sendToUsers({
        userIds,
        title,
        content,
        senderType: normalizedSenderType,
        senderId: req.user?.id,
        senderName: req.user?.name || "Admin",
      });

      res.json(result);
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ message: "Lỗi khi gửi thông báo" });
    }
  }

  /**
   * Adjust user balance with ledger
   * POST /admin/users/:id/adjust-balance
   */
  async adjustUserBalance(req, res) {
    try {
      const { id } = req.params;
      const { amount, note, type, refId } = req.body || {};

      if (!note || !String(note).trim()) {
        return res
          .status(400)
          .json({ message: "Cần nhập lý do điều chỉnh" });
      }

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount === 0) {
        return res.status(400).json({ message: "Số tiền không hợp lệ" });
      }

      const entryType = type === "reversal" ? "reversal" : "admin_adjust";
      if (entryType === "reversal" && !refId) {
        return res
          .status(400)
          .json({ message: "Cần refId cho giao dịch đảo" });
      }

      const normalizedAmount =
        entryType === "reversal"
          ? -Math.abs(Math.trunc(numericAmount))
          : Math.trunc(numericAmount);

      const result = await adminService.adjustUserBalance({
        userId: id,
        amount: normalizedAmount,
        note: String(note).trim(),
        type: entryType,
        refId: refId ? String(refId) : undefined,
        adminId: req.user?.id,
      });

      res.json(result);
    } catch (error) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      console.error("Error adjusting balance:", error);
      res.status(500).json({ message: "Lỗi khi điều chỉnh số dư" });
    }
  }

  /**
   * Toggle movie visibility
   * POST /admin/movies/:id/toggle-visibility
   */
  async toggleMovieVisibility(req, res) {
    try {
      const { id } = req.params;
      const { isHidden, unhideDate } = req.body;

      const movie = await adminService.toggleMovieVisibility(
        id,
        isHidden,
        unhideDate
      );

      res.json({
        message: isHidden ? "Đã ẩn phim" : "Đã hiện phim",
        movie: {
          id: movie.id,
          title: movie.title,
          isHidden: movie.isHidden,
          unhideDate: movie.unhideDate,
        },
      });
    } catch (error) {
      console.error("Error toggling movie visibility:", error);
      if (error.message === "Movie not found") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      res.status(500).json({ message: "Lỗi khi thay đổi trạng thái phim" });
    }
  }
}

export default new AdminController();
