import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import feedbackController from "../controllers/feedback.controller.js";

const router = Router();

/**
 * Helper to wrap async controller methods
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Add rating
router.post(
  "/ratings",
  verifyToken,
  asyncHandler((req, res) => feedbackController.addRating(req, res))
);

// Get reviews by movie
router.get(
  "/reviews/:movieId",
  asyncHandler((req, res) => feedbackController.getReviewsByMovie(req, res))
);

export default router;
