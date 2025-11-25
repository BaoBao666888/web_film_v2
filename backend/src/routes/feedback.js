// src/routes/feedback.js

import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { getMovie, insertReview, listReviewsByMovie } from "../db.js";
import { generateId } from "../utils/id.js";

const router = Router();

// Chỉ USER đăng nhập mới được đánh giá
router.post("/ratings", verifyToken, async (req, res) => {
  const userId = req.user.id; // user ID lấy từ token
  const { movieId, rating, comment = "", sentimentHint } = req.body;

  if (!movieId)
    return res.status(400).json({ message: "Thiếu movieId" });

  const numericRating = Number(rating);
  if (Number.isNaN(numericRating)) {
    return res.status(400).json({ message: "Điểm đánh giá không hợp lệ" });
  }

  if (numericRating < 0 || numericRating > 10) {
    return res
      .status(400)
      .json({ message: "Điểm hợp lệ nằm trong khoảng 0 - 10" });
  }

  const movie = await getMovie(movieId);
  if (!movie) return res.status(404).json({ message: "Không tìm thấy phim" });

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

  res.status(201).json({
    id: reviewId,
    movieId,
    userId,
    rating: numericRating,
    comment,
    sentiment,
  });
});

// ⭐ Lấy danh sách review theo phim
router.get("/reviews/:movieId", async (req, res) => {
  const { movieId } = req.params;
  const items = await listReviewsByMovie(movieId, 20);
  res.json({ items });
});

export default router;
