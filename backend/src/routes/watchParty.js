import { Router } from "express";
import { optionalAuth, verifyToken } from "../middleware/auth.js";
import watchPartyController from "../controllers/watchParty.controller.js";

const router = Router();

/**
 * Helper to wrap async controller methods
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Attach user info when token is present (used for stable viewerId)
router.use(optionalAuth);

// Create new room
router.post(
  "/",
  verifyToken,
  asyncHandler((req, res) => watchPartyController.createRoom(req, res))
);

// Get public rooms
router.get(
  "/public",
  asyncHandler((req, res) => watchPartyController.getPublicRooms(req, res))
);

// Get private rooms
router.get(
  "/private",
  asyncHandler((req, res) => watchPartyController.getPrivateRooms(req, res))
);

// Get room by ID
router.get(
  "/:id",
  asyncHandler((req, res) => watchPartyController.getRoomById(req, res))
);

// Join room
router.post(
  "/:id/join",
  asyncHandler((req, res) => watchPartyController.joinRoom(req, res))
);

// Send heartbeat
router.post(
  "/:id/heartbeat",
  asyncHandler((req, res) => watchPartyController.heartbeat(req, res))
);

// Update playback state
router.post(
  "/:id/state",
  asyncHandler((req, res) => watchPartyController.updateState(req, res))
);

// Update settings
router.patch(
  "/:id/settings",
  asyncHandler((req, res) => watchPartyController.updateSettings(req, res))
);

// Send chat message
router.post(
  "/:id/chat",
  asyncHandler((req, res) => watchPartyController.sendMessage(req, res))
);

// Delete room
router.delete(
  "/:id",
  asyncHandler((req, res) => watchPartyController.deleteRoom(req, res))
);

// Error handler
router.use((err, _req, res, _next) => {
  console.error("Watch party error:", err);
  res
    .status(500)
    .json({ message: "Đã có lỗi xảy ra khi xử lý phòng xem chung" });
});

export default router;
