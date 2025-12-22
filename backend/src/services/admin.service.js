import { getStats, listUsers, listMovies } from "../db.js";
import { Movie } from "../models/Movie.js";

/**
 * Admin Service - Business Logic Layer
 */
class AdminService {
  /**
   * Get dashboard statistics
   */
  async getStats() {
    const stats = await getStats();
    const topMoods = Object.entries(stats.moods)
      .map(([mood, total]) => ({ mood, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      metrics: [
        { label: "Phim đang phát hành", value: stats.movies },
        { label: "Người dùng hoạt động", value: stats.users },
        { label: "Đánh giá đã ghi nhận", value: stats.reviews },
      ],
      topMoods,
    };
  }

  /**
   * List all users
   */
  async listUsers() {
    return await listUsers();
  }

  /**
   * List movies with pagination
   */
  async listMovies(params) {
    const { page = 1, limit = 20, q } = params;
    const sanitizedPage = Math.max(Number(page) || 1, 1);
    const sanitizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const query = { page: sanitizedPage, limit: sanitizedLimit, q };

    const mongoQuery = q
      ? {
          $or: [
            { title: new RegExp(q, "i") },
            { synopsis: new RegExp(q, "i") },
          ],
        }
      : {};

    const [movies, totalItems] = await Promise.all([
      listMovies(query),
      Movie.countDocuments(mongoQuery),
    ]);

    return {
      movies,
      meta: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalItems,
        totalPages: sanitizedLimit
          ? Math.max(1, Math.ceil(totalItems / sanitizedLimit))
          : 1,
      },
    };
  }
}

export default new AdminService();
