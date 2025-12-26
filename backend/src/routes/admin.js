import { Router } from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import adminController from "../controllers/admin.controller.js";

const router = Router();

/**
 * Helper to wrap async controller methods
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Get stats
router.get(
  "/stats",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.getStats(req, res))
);

// List users
router.get(
  "/users",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.listUsers(req, res))
);

// List movies
router.get(
  "/movies",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.listMovies(req, res))
);

// Send inbox notifications
router.post(
  "/notifications",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.sendNotifications(req, res))
);

// Toggle movie visibility
router.post(
  "/movies/:id/toggle-visibility",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.toggleMovieVisibility(req, res))
);

export default router;
