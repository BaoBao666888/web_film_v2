import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import historyController from "../controllers/history.controller.js";

const router = Router();

/**
 * Helper to wrap async controller methods
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Get history
router.get(
  "/",
  verifyToken,
  asyncHandler((req, res) => historyController.getHistory(req, res))
);

// Add history
router.post(
  "/",
  verifyToken,
  asyncHandler((req, res) => historyController.addHistory(req, res))
);

// Remove history item
router.delete(
  "/:historyId",
  verifyToken,
  asyncHandler((req, res) => historyController.removeHistory(req, res))
);

// Clear all history
router.delete(
  "/",
  verifyToken,
  asyncHandler((req, res) => historyController.clearHistory(req, res))
);

export default router;
