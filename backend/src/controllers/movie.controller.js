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
   * Get premiere movies
   * GET /movies/premieres
   */
  async getPremieres(req, res) {
    try {
      const { state = "live", limit = 6 } = req.query;
      const payload = await movieService.listPremieres({ state, limit });
      res.json(payload);
    } catch (error) {
      console.error("Error getting premieres:", error);
      res.status(500).json({ message: "Không thể lấy danh sách công chiếu" });
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
      const data = await movieService.getWatchData(
        req.params.id,
        episodeQuery,
        req.user?.id
      );
      res.json(data);
    } catch (error) {
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      if (error.message === "EPISODE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy tập phim" });
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
   * Purchase preview access
   * POST /movies/:id/preview/purchase
   */
  async purchasePreview(req, res) {
    try {
      const episode = req.body?.episode;
      const payload = await movieService.purchasePreview(
        req.params.id,
        req.user.id,
        episode
      );
      res.status(201).json(payload);
    } catch (error) {
      const message = error.message || "";
      if (message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      if (message === "EPISODE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy tập phim" });
      }
      if (message === "PREVIEW_DISABLED") {
        return res.status(400).json({ message: "Phim chưa bật xem trước" });
      }
      if (message === "BALANCE_INSUFFICIENT") {
        return res.status(400).json({ message: "Số dư không đủ để xem trước" });
      }
      console.error("Error purchasing preview:", error);
      res.status(500).json({ message: "Lỗi khi thanh toán xem trước" });
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
      if (error.message === "PREVIEW_PRICE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Cần nhập giá xem trước hợp lệ" });
      }
      if (error.message === "PREMIERE_TIME_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Cần chọn thời gian công chiếu" });
      }
      if (error.message === "SERIES_EPISODE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Phim bộ cần ít nhất 1 tập" });
      }
      if (error.message === "SERIES_PUBLIC_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Phim bộ public cần ít nhất 1 tập public" });
      }
      if (error.message === "SERIES_PREMIERE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Phim bộ công chiếu cần ít nhất 1 tập công chiếu" });
      }
      if (error.message === "EPISODE_PREVIEW_PRICE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Tập phim xem trước cần giá hợp lệ" });
      }
      if (error.message === "EPISODE_PREMIERE_TIME_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Tập công chiếu cần thời gian công chiếu" });
      }
      if (error.message === "EPISODE_PREMIERE_ORDER") {
        return res.status(400).json({
          message: "Thời gian công chiếu tập sau phải sau tập trước",
        });
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
      if (error.message === "STATUS_TRANSITION_FORBIDDEN") {
        return res.status(400).json({
          message: "Phim public không được chuyển sang công chiếu",
        });
      }
      if (error.message === "PREVIEW_PRICE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Cần nhập giá xem trước hợp lệ" });
      }
      if (error.message === "PREMIERE_TIME_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Cần chọn thời gian công chiếu" });
      }
      if (error.message === "SERIES_EPISODE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Phim bộ cần ít nhất 1 tập" });
      }
      if (error.message === "SERIES_PUBLIC_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Phim bộ public cần ít nhất 1 tập public" });
      }
      if (error.message === "SERIES_PREMIERE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Phim bộ công chiếu cần ít nhất 1 tập công chiếu" });
      }
      if (error.message === "EPISODE_PREVIEW_PRICE_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Tập phim xem trước cần giá hợp lệ" });
      }
      if (error.message === "EPISODE_PREMIERE_TIME_REQUIRED") {
        return res
          .status(400)
          .json({ message: "Tập công chiếu cần thời gian công chiếu" });
      }
      if (error.message === "EPISODE_PREMIERE_ORDER") {
        return res.status(400).json({
          message: "Thời gian công chiếu tập sau phải sau tập trước",
        });
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
