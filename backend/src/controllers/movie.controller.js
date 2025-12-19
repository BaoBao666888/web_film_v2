import movieService from "../services/movie.service.js";

/**
 * Movie Controller - HTTP Request/Response Handler
 */
class MovieController {
  /**
   * List movies with filters
   * GET /movies
   */
  async listMovies(req, res) {
    try {
      const { q, mood, tag, limit = 12 } = req.query;
      const items = await movieService.listMovies({ q, mood, tag, limit });
      res.json({ items });
    } catch (error) {
      console.error("Error listing movies:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách phim" });
    }
  }

  /**
   * Get trending movies
   * GET /movies/trending
   */
  async getTrendingMovies(req, res) {
    try {
      const { days = 7, page = 1, limit = 12 } = req.query;
      const payload = await movieService.getTrendingMovies({
        days,
        page,
        limit,
      });
      res.json(payload);
    } catch (error) {
      console.error("Error getting trending movies:", error);
      res.status(500).json({ message: "Không thể lấy danh sách xu hướng" });
    }
  }

  /**
   * Get newest movies
   * GET /movies/new
   */
  async getNewestMovies(req, res) {
    try {
      const { page = 1, limit = 6 } = req.query;
      const payload = await movieService.getNewestMovies({ page, limit });
      res.json(payload);
    } catch (error) {
      console.error("Error getting newest movies:", error);
      res.status(500).json({ message: "Không thể lấy danh sách phim mới" });
    }
  }

  /**
   * Get community highlights
   * GET /movies/community-highlights
   */
  async getCommunityHighlights(req, res) {
    try {
      const data = await movieService.getCommunityHighlights();
      res.json(data);
    } catch (error) {
      console.error("Error getting community highlights:", error);
      res.status(500).json({
        message: "Không thể lấy dữ liệu cộng đồng",
        error: error.message,
      });
    }
  }

  /**
   * Get movie details
   * GET /movies/:id
   */
  async getMovieDetails(req, res) {
    try {
      const result = await movieService.getMovieDetails(req.params.id);
      res.json(result);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error getting movie details:", error);
      res.status(500).json({ message: "Lỗi khi lấy thông tin phim" });
    }
  }

  /**
   * Get movie comments
   * GET /movies/:id/comments
   */
  async getComments(req, res) {
    try {
      const { limit = 30 } = req.query;
      const items = await movieService.getComments(req.params.id, limit);
      res.json({ items });
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error getting comments:", error);
      res.status(500).json({ message: "Lỗi khi lấy bình luận" });
    }
  }

  /**
   * Add comment to movie
   * POST /movies/:id/comments
   */
  async addComment(req, res) {
    try {
      const content = req.body?.content;
      const result = await movieService.addComment(
        req.params.id,
        req.user.id,
        content
      );
      res.status(201).json(result);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      if (error.message === "EMPTY_CONTENT") {
        return res.status(400).json({
          message: "Nội dung bình luận không được để trống",
        });
      }
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Lỗi khi thêm bình luận" });
    }
  }

  /**
   * Get watch data
   * GET /movies/:id/watch
   */
  async getWatchData(req, res) {
    try {
      const episodeQuery = req.query.ep;
      const data = await movieService.getWatchData(req.params.id, episodeQuery);
      res.json(data);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error getting watch data:", error);
      res.status(500).json({ message: "Lỗi khi lấy dữ liệu xem phim" });
    }
  }

  /**
   * Record view
   * POST /movies/:id/view
   */
  async recordView(req, res) {
    try {
      const { viewerId, episode } = req.body || {};
      const result = await movieService.recordView(
        req.params.id,
        req.user?.id,
        viewerId,
        episode
      );
      res.status(201).json(result);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error recording view:", error);
      res.status(500).json({ message: "Lỗi khi ghi nhận lượt xem" });
    }
  }

  /**
   * Check if movie is favorited
   * GET /movies/:id/favorite
   */
  async checkFavorite(req, res) {
    try {
      const result = await movieService.checkFavorite(
        req.params.id,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Lỗi khi kiểm tra yêu thích" });
    }
  }

  /**
   * Add to favorites
   * POST /movies/:id/favorite
   */
  async addToFavorites(req, res) {
    try {
      const result = await movieService.addToFavorites(
        req.params.id,
        req.user.id
      );
      res.status(201).json(result);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error adding to favorites:", error);
      res.status(500).json({ message: "Lỗi khi thêm vào yêu thích" });
    }
  }

  /**
   * Remove from favorites
   * DELETE /movies/:id/favorite
   */
  async removeFromFavorites(req, res) {
    try {
      const result = await movieService.removeFromFavorites(
        req.params.id,
        req.user.id
      );
      res.status(200).json(result);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error removing from favorites:", error);
      res.status(500).json({ message: "Lỗi khi xóa khỏi yêu thích" });
    }
  }

  /**
   * Create movie (Admin)
   * POST /movies
   */
  async createMovie(req, res) {
    try {
      const result = await movieService.createMovie(req.body);
      res.status(201).json({ movie: result });
    } catch (error) {
      if (error.message === "MISSING_TITLE") {
        return res.status(400).json({ message: "Thiếu tiêu đề" });
      }
      console.error("Error creating movie:", error);
      res.status(500).json({ message: "Lỗi khi tạo phim" });
    }
  }

  /**
   * Update movie (Admin)
   * PUT /movies/:id
   */
  async updateMovie(req, res) {
    try {
      const updated = await movieService.updateMovie(req.params.id, req.body);
      res.json({ movie: updated });
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error updating movie:", error);
      res.status(500).json({ message: "Lỗi khi cập nhật phim" });
    }
  }

  /**
   * Delete movie (Admin)
   * DELETE /movies/:id
   */
  async deleteMovie(req, res) {
    try {
      await movieService.deleteMovie(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting movie:", error);
      res.status(500).json({ message: "Lỗi khi xóa phim" });
    }
  }
}

export default new MovieController();
