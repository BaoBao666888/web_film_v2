import adminService from "../services/admin.service.js";

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
}

export default new AdminController();
