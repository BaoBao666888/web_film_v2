import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import notificationController from "../controllers/notification.controller.js";

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  "/",
  verifyToken,
  asyncHandler((req, res) => notificationController.list(req, res))
);

router.get(
  "/unread-count",
  verifyToken,
  asyncHandler((req, res) => notificationController.unreadCount(req, res))
);

router.post(
  "/mark-read",
  verifyToken,
  asyncHandler((req, res) => notificationController.markRead(req, res))
);

export default router;
