import feedbackService from "../services/feedback.service.js";

/**
 * Feedback Controller - HTTP Request/Response Handler
 */
class FeedbackController {
  /**
   * Add rating/review for a movie
   * POST /feedback/ratings
   */
  async addRating(req, res) {
    try {
      const userId = req.user.id;
      const { movieId, rating, comment, sentimentHint } = req.body;

      const result = await feedbackService.addRating(userId, {
        movieId,
        rating,
        comment,
        sentimentHint,
      });

      res.status(201).json(result);
    } catch (error) {
      if (error.message === "MISSING_MOVIE_ID") {
        return res.status(400).json({ message: "Thiếu movieId" });
      }
      if (error.message === "INVALID_RATING") {
        return res.status(400).json({ message: "Điểm đánh giá không hợp lệ" });
      }
      if (error.message === "RATING_OUT_OF_RANGE") {
        return res.status(400).json({
          message: "Điểm hợp lệ nằm trong khoảng 0 - 10",
        });
      }
      if (error.message === "MOVIE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy phim" });
      }
      console.error("Error adding rating:", error);
      res.status(500).json({ message: "Lỗi khi thêm đánh giá" });
    }
  }

  /**
   * Get reviews for a movie
   * GET /feedback/reviews/:movieId
   */
  async getReviewsByMovie(req, res) {
    try {
      const { movieId } = req.params;
      const items = await feedbackService.getReviewsByMovie(movieId, 20);
      res.json({ items });
    } catch (error) {
      console.error("Error getting reviews:", error);
      res.status(500).json({ message: "Lỗi khi lấy đánh giá" });
    }
  }
}

export default new FeedbackController();
