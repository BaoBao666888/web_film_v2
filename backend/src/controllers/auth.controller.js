import authService from "../services/auth.service.js";

/**
 * Auth Controller - HTTP Request/Response Handler
 */
class AuthController {
  /**
   * Register a new user
   * POST /auth/register
   */
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Thiếu thông tin đăng ký" });
      }

      const result = await authService.register({ name, email, password });
      res.status(201).json(result);
    } catch (error) {
      if (error.message === "EMAIL_EXISTS") {
        return res.status(409).json({ message: "Email đã tồn tại" });
      }
      console.error("Error in register:", error);
      res.status(500).json({ message: "Lỗi khi đăng ký tài khoản" });
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });
      }

      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error) {
      if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({ message: "Sai thông tin đăng nhập" });
      }
      if (error.message === "USER_LOCKED") {
        const lockDays = Number(error.lockDays);
        const lockReason =
          typeof error.lockReason === "string" && error.lockReason.trim()
            ? error.lockReason.trim()
            : null;
        const dayLabel =
          Number.isFinite(lockDays) && lockDays > 0 ? `${lockDays} ngày` : "";
        return res.status(403).json({
          message: `Tài khoản đã bị khóa${
            dayLabel ? ` trong ${dayLabel}` : ""
          }${lockReason ? `. Lý do: ${lockReason}` : ""}.`,
        });
      }
      console.error("Error in login:", error);
      res.status(500).json({ message: "Lỗi khi đăng nhập" });
    }
  }

  // ===== FORGOT PASSWORD =====
  async requestPasswordReset(req, res) {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    return res.json(result);
  }
  async resetPasswordWithCode(req, res) {
    const { email, code, newPassword } = req.body;
    const result = await authService.resetPasswordWithCode({
      email,
      code,
      newPassword,
    });
    return res.json(result);
  }

  /**
   * Get user profile
   * GET /auth/profile/:id
   */
  async getProfile(req, res) {
    try {
      const { id } = req.params;
      const result = await authService.getProfile(id);
      res.json(result);
    } catch (error) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      console.error("Error in getProfile:", error);
      res.status(500).json({ message: "Lỗi khi lấy thông tin người dùng" });
    }
  }

  /**
   * Update user profile
   * PUT /auth/profile/:id
   */
  async updateProfile(req, res) {
    try {
      const { id } = req.params;
      const {
        avatar,
        currentPassword,
        newPassword,
        favoriteMoods,
        themePreference,
      } = req.body;

      const updatedUser = await authService.updateProfile(
        id,
        req.user.id,
        req.user.role,
        { avatar, currentPassword, newPassword, favoriteMoods, themePreference }
      );

      res.json({ user: updatedUser });
    } catch (error) {
      if (error.message === "FORBIDDEN") {
        return res
          .status(403)
          .json({ message: "Bạn không thể chỉnh sửa hồ sơ này" });
      }
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      if (error.message === "CURRENT_PASSWORD_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Cần nhập mật khẩu hiện tại để đổi mật khẩu" });
      }
      if (error.message === "INVALID_CURRENT_PASSWORD") {
        return res
          .status(401)
          .json({ message: "Mật khẩu hiện tại không đúng" });
      }
      if (error.message === "NO_UPDATES") {
        return res
          .status(400)
          .json({ message: "Không có dữ liệu cần cập nhật" });
      }
      if (error.message === "INVALID_THEME") {
        return res
          .status(400)
          .json({ message: "Giao diện không hợp lệ" });
      }
      if (error.message === "UPDATE_FAILED") {
        return res
          .status(500)
          .json({ message: "Không thể cập nhật người dùng" });
      }
      console.error("Error in updateProfile:", error);
      res.status(500).json({ message: "Lỗi khi cập nhật hồ sơ" });
    }
  }

  /**
   * Top up balance
   * POST /auth/topup
   */
  async topUp(req, res) {
    try {
      const { amount } = req.body || {};
      const updatedUser = await authService.topUpBalance(req.user.id, amount);
      res.json({ user: updatedUser });
    } catch (error) {
      if (error.message === "INVALID_AMOUNT") {
        return res.status(400).json({ message: "Số tiền không hợp lệ" });
      }
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }
      console.error("Error in topUp:", error);
      res.status(500).json({ message: "Lỗi khi nạp tiền" });
    }
  }
}

export default new AuthController();
