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

      const entryType = type === "reversal" ? "reversal" : "admin_adjust";
      let normalizedAmount;
      let resolvedRefId;

      if (entryType === "reversal") {
        if (!refId) {
          return res
            .status(400)
            .json({ message: "Cần refId cho giao dịch đảo" });
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          return res.status(400).json({ message: "Số tiền không hợp lệ" });
        }

        const refEntry = await adminService.getWalletLedgerEntry(refId);
        if (!refEntry) {
          return res
            .status(404)
            .json({ message: "Không tìm thấy giao dịch gốc" });
        }
        if (String(refEntry.user_id) !== String(id)) {
          return res
            .status(400)
            .json({ message: "Giao dịch không thuộc người dùng này" });
        }
        if (refEntry.type === "reversal") {
          return res
            .status(400)
            .json({ message: "Không thể đảo giao dịch đảo" });
        }
        const isReferenced = await adminService.isLedgerReferenced(refId);
        if (isReferenced) {
          return res
            .status(400)
            .json({ message: "Giao dịch đã được đảo trước đó" });
        }

        const refAmount = Number(refEntry.amount);
        if (!Number.isFinite(refAmount) || refAmount === 0) {
          return res
            .status(400)
            .json({ message: "Số tiền giao dịch gốc không hợp lệ" });
        }
        if (Math.abs(numericAmount) > Math.abs(refAmount)) {
          return res.status(400).json({
            message: "Số tiền đảo không được lớn hơn giao dịch gốc",
          });
        }
        resolvedRefId = String(refId);
        normalizedAmount = -Math.abs(Math.trunc(numericAmount));
      } else {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount === 0) {
          return res.status(400).json({ message: "Số tiền không hợp lệ" });
        }
        normalizedAmount = Math.trunc(numericAmount);
      }

      const result = await adminService.adjustUserBalance({
        userId: id,
        amount: normalizedAmount,
        note: String(note).trim(),
        type: entryType,
        refId: resolvedRefId,
        adminId: req.user?.id,
      });

      try {
        const formatVnd = (value) =>
          new Intl.NumberFormat("vi-VN").format(value || 0);
        const formatAbsVnd = (value) =>
          new Intl.NumberFormat("vi-VN").format(Math.abs(value || 0));
        const actionLabel =
          entryType === "reversal"
            ? "Đảo giao dịch"
            : normalizedAmount >= 0
            ? "Cộng tiền"
            : "Trừ tiền";
        const refLabel =
          entryType === "reversal" && resolvedRefId
            ? ` (ref ${resolvedRefId})`
            : "";
        const content = `${actionLabel}${refLabel}: ${formatAbsVnd(
          normalizedAmount
        )} VNĐ. Lý do: ${String(note).trim()}. Số dư mới: ${formatVnd(
          result.user?.balance
        )} VNĐ.`;

        await notificationService.sendToUsers({
          userIds: [id],
          title: "Cập nhật số dư",
          content,
          senderType: "bot",
          senderName: "Lumi Bot",
          senderId: req.user?.id,
        });
      } catch (notifyError) {
        console.warn(
          "Failed to send balance notification:",
          notifyError?.message || notifyError
        );
      }

      res.json(result);
    } catch (error) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      if (error.message === "SELF_ADJUST_FORBIDDEN") {
        return res
          .status(400)
          .json({ message: "Không thể điều chỉnh số dư của chính mình" });
      }
      if (error.message === "TARGET_NOT_USER") {
        return res
          .status(400)
          .json({ message: "Chỉ được điều chỉnh số dư cho user thường" });
      }
      if (error.message === "ADMIN_BALANCE_INSUFFICIENT") {
        return res
          .status(400)
          .json({ message: "Số dư admin không đủ để thực hiện giao dịch" });
      }
      if (error.message === "ADMIN_REQUIRED" || error.message === "ADMIN_NOT_FOUND") {
        return res.status(403).json({ message: "Không xác định admin" });
      }
      if (error.message === "TRANSACTION_REQUIRED") {
        return res.status(500).json({
          message:
            "Hệ thống cần MongoDB replica set để đảm bảo giao dịch an toàn.",
        });
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

  /**
   * List wallet ledger entries
   * GET /admin/wallet-ledger
   */
  async listWalletLedger(req, res) {
    try {
      const { page, limit, userId } = req.query;
      const result = await adminService.listWalletLedger({
        page,
        limit,
        userId,
      });
      res.json(result);
    } catch (error) {
      console.error("Error listing wallet ledger:", error);
      res.status(500).json({ message: "Lỗi khi lấy sổ cái" });
    }
  }

  /**
   * List ledger entries eligible for reversal
   * GET /admin/wallet-ledger/eligible
   */
  async listReversalCandidates(req, res) {
    try {
      const { userId, limit } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "Thiếu userId" });
      }
      const items = await adminService.listReversalCandidates(
        userId,
        limit
      );
      res.json({ items });
    } catch (error) {
      console.error("Error listing reversal candidates:", error);
      res.status(500).json({ message: "Lỗi khi lấy giao dịch hợp lệ" });
    }
  }

  /**
   * Lock user account
   * POST /admin/users/:id/lock
   */
  async lockUser(req, res) {
    try {
      const { id } = req.params;
      const { reason, lockDays } = req.body || {};
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ message: "Cần nhập lý do khóa" });
      }
      const numericDays = Number(lockDays);
      if (!Number.isFinite(numericDays) || numericDays <= 0) {
        return res.status(400).json({ message: "Cần chọn thời gian mở khóa" });
      }

      const result = await adminService.updateUserLockStatus({
        userId: id,
        adminId: req.user?.id,
        action: "lock",
        reason: String(reason).trim(),
        lockDays: numericDays,
      });

      res.json({
        message: "Đã khóa tài khoản",
        user: result.user,
      });
    } catch (error) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      if (error.message === "SELF_LOCK_FORBIDDEN") {
        return res
          .status(400)
          .json({ message: "Không thể tự khóa tài khoản của mình" });
      }
      if (error.message === "TARGET_NOT_USER") {
        return res
          .status(400)
          .json({ message: "Chỉ được khóa tài khoản người dùng thường" });
      }
      if (error.message === "LOCK_DAYS_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Cần chọn thời gian mở khóa" });
      }
      if (error.message === "ALREADY_LOCKED") {
        return res.status(400).json({ message: "Tài khoản đã bị khóa" });
      }
      console.error("Error locking user:", error);
      res.status(500).json({ message: "Lỗi khi khóa tài khoản" });
    }
  }

  /**
   * Unlock user account
   * POST /admin/users/:id/unlock
   */
  async unlockUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ message: "Cần nhập lý do mở khóa" });
      }

      const result = await adminService.updateUserLockStatus({
        userId: id,
        adminId: req.user?.id,
        action: "unlock",
        reason: String(reason).trim(),
      });

      res.json({
        message: "Đã mở khóa tài khoản",
        user: result.user,
      });
    } catch (error) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      if (error.message === "SELF_LOCK_FORBIDDEN") {
        return res
          .status(400)
          .json({ message: "Không thể tự khóa tài khoản của mình" });
      }
      if (error.message === "TARGET_NOT_USER") {
        return res
          .status(400)
          .json({ message: "Chỉ được mở khóa tài khoản người dùng thường" });
      }
      if (error.message === "ALREADY_UNLOCKED") {
        return res.status(400).json({ message: "Tài khoản đang hoạt động" });
      }
      console.error("Error unlocking user:", error);
      res.status(500).json({ message: "Lỗi khi mở khóa tài khoản" });
    }
  }

  /**
   * List user lock/unlock history
   * GET /admin/user-lock-logs
   */
  async listUserLockLogs(req, res) {
    try {
      const { page, limit, userId } = req.query;
      const result = await adminService.listUserLockLogs({
        page,
        limit,
        userId,
      });
      res.json(result);
    } catch (error) {
      console.error("Error listing user lock logs:", error);
      res.status(500).json({ message: "Lỗi khi lấy lịch sử khóa" });
    }
  }
}

export default new AdminController();
