import { Router } from "express";
import { getMovie, insertReview, listReviewsByMovie } from "../db.js";
import { generateId } from "../utils/id.js";

const router = Router();

router.post("/ratings", (req, res) => {
  const { movieId, rating, comment = "", userId = "demo-user", sentimentHint } = req.body;

  if (!movieId || !rating) {
    return res.status(400).json({ message: "Thiếu movieId hoặc rating" });
  }

  const movie = getMovie(movieId);

  if (!movie) {
    return res.status(404).json({ message: "Không tìm thấy phim" });
  }

  const reviewId = generateId("rv");
  const sentiment =
    sentimentHint !== undefined && sentimentHint !== null
      ? sentimentHint
      : rating >= 4
      ? "positive"
      : rating >= 3
      ? "neutral"
      : "negative";

  insertReview({
    id: reviewId,
    user_id: userId,
    movie_id: movie.id,
    rating,
    comment,
    sentiment,
  });

  res.status(201).json({
    id: reviewId,
    movieId: movie.id,
    rating,
    comment,
    sentiment,
    createdAt: new Date().toISOString(),
  });
});

router.get("/reviews/:movieId", (req, res) => {
  const { movieId } = req.params;
  res.json({
    items: listReviewsByMovie(movieId, 20),
  });
});

export default router;
