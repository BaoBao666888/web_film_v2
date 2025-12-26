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
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const mongoQuery = q
      ? {
          $or: [
            { title: new RegExp(q, "i") },
            { synopsis: new RegExp(q, "i") },
          ],
        }
      : {};

    // ✅ Admin can see ALL movies including hidden ones
    const [movies, totalItems] = await Promise.all([
      Movie.find(mongoQuery).skip(skip).limit(sanitizedLimit).lean(),
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

  /**
   * Toggle movie visibility (hide/unhide)
   */
  async toggleMovieVisibility(movieId, isHidden, unhideDate = null) {
    const movie = await Movie.findOne({ id: movieId });
    if (!movie) {
      throw new Error("Movie not found");
    }

    movie.isHidden = isHidden;
    movie.unhideDate = isHidden && unhideDate ? new Date(unhideDate) : null;
    await movie.save();

    return movie;
  }
}

export default new AdminService();
