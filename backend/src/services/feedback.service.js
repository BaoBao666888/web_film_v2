import { getMovie, insertReview, listReviewsByMovie } from "../db.js";
import { generateId } from "../utils/id.js";

/**
 * Feedback Service - Business Logic Layer
 */
class FeedbackService {
  /**
   * Add rating/review for a movie
   */
  async addRating(userId, ratingData) {
    const { movieId, rating, comment = "", sentimentHint } = ratingData;

    if (!movieId) {
      throw new Error("MISSING_MOVIE_ID");
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating)) {
      throw new Error("INVALID_RATING");
    }

    if (numericRating < 0 || numericRating > 10) {
      throw new Error("RATING_OUT_OF_RANGE");
    }

    const movie = await getMovie(movieId);
    if (!movie) {
      throw new Error("MOVIE_NOT_FOUND");
    }

    const reviewId = generateId("rv");
    const sentiment =
      sentimentHint ??
      (numericRating >= 7
        ? "positive"
        : numericRating >= 4
        ? "neutral"
        : "negative");

    await insertReview({
      id: reviewId,
      user_id: userId,
      movie_id: movie.id,
      rating: numericRating,
      comment,
      sentiment,
    });

    return {
      id: reviewId,
      movieId,
      userId,
      rating: numericRating,
      comment,
      sentiment,
    };
  }

  /**
   * Get reviews for a movie
   */
  async getReviewsByMovie(movieId, limit = 20) {
    return await listReviewsByMovie(movieId, limit);
  }
}

export default new FeedbackService();
