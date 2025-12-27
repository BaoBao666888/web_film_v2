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

// Adjust user balance (ledger)
router.post(
  "/users/:id/adjust-balance",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.adjustUserBalance(req, res))
);

// Lock/unlock user accounts
router.post(
  "/users/:id/lock",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.lockUser(req, res))
);

router.post(
  "/users/:id/unlock",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.unlockUser(req, res))
);

// Toggle movie visibility
router.post(
  "/movies/:id/toggle-visibility",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.toggleMovieVisibility(req, res))
);

// Wallet ledger (read-only)
router.get(
  "/wallet-ledger",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.listWalletLedger(req, res))
);

router.get(
  "/wallet-ledger/eligible",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.listReversalCandidates(req, res))
);

// User lock logs (read-only)
router.get(
  "/user-lock-logs",
  verifyToken,
  requireAdmin,
  asyncHandler((req, res) => adminController.listUserLockLogs(req, res))
);

export default router;
