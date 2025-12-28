import notificationService from "../services/notification.service.js";

class NotificationController {
  async list(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
      }
      const { limit, page } = req.query;
      const result = await notificationService.listForUser(userId, {
        limit,
        page,
      });
      res.json(result);
    } catch (error) {
      console.error("Error listing notifications:", error);
      res.status(500).json({ message: "Lỗi khi lấy hộp thư" });
    }
  }

  async unreadCount(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
      }
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error counting notifications:", error);
      res.status(500).json({ message: "Lỗi khi lấy số thông báo" });
    }
  }

  async markRead(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
      }
      const result = await notificationService.markAllRead(userId);
      res.json(result);
    } catch (error) {
      console.error("Error marking notifications read:", error);
      res.status(500).json({ message: "Lỗi khi cập nhật hộp thư" });
    }
  }
}

export default new NotificationController();
