import { Router } from "express";
import { verifyToken, requireAdmin, optionalAuth } from "../middleware/auth.js";
import movieController from "../controllers/movie.controller.js";

const router = Router();

/**
 * Helper to wrap async controller methods
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// List movies
router.get(
  "/",
  asyncHandler((req, res) => movieController.listMovies(req, res))
);

// Trending movies
router.get(
  "/trending",
  asyncHandler((req, res) => movieController.getTrendingMovies(req, res))
);

// Newest movies
router.get(
  "/new",
  asyncHandler((req, res) => movieController.getNewestMovies(req, res))
);

// Community highlights
router.get(
  "/community-highlights",
  asyncHandler((req, res) => movieController.getCommunityHighlights(req, res))
);

// Movie details
router.get(
  "/:id",
  asyncHandler((req, res) => movieController.getMovieDetails(req, res))
);

// Get comments
router.get(
  "/:id/comments",
  asyncHandler((req, res) => movieController.getComments(req, res))
);

// Add comment
router.post(
  "/:id/comments",
  verifyToken,
  asyncHandler((req, res) => movieController.addComment(req, res))
);

// Get watch data
router.get(
  "/:id/watch",
  asyncHandler((req, res) => movieController.getWatchData(req, res))
);

// Record view
router.post(
  "/:id/view",
  optionalAuth,
  asyncHandler((req, res) => movieController.recordView(req, res))
);

// Check favorite
router.get(
  "/:id/favorite",
  verifyToken,
  asyncHandler((req, res) => movieController.checkFavorite(req, res))
);

// Add to favorites
router.post(
  "/:id/favorite",
  verifyToken,
  asyncHandler((req, res) => movieController.addToFavorites(req, res))
);

// Remove from favorites
router.delete(
  "/:id/favorite",
  verifyToken,
  asyncHandler((req, res) => movieController.removeFromFavorites(req, res))
);

// Create movie (Admin)
router.post(
  "/",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => movieController.createMovie(req, res))
);

// Update movie (Admin)
router.put(
  "/:id",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => movieController.updateMovie(req, res))
);

// Delete movie (Admin)
router.delete(
  "/:id",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => movieController.deleteMovie(req, res))
);

export default router;
