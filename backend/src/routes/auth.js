import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import authController from "../controllers/auth.controller.js";

const router = Router();

/**
 * Helper to wrap async controller methods
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Register
router.post(
  "/register",
  asyncHandler((req, res) => authController.register(req, res))
);

// Login
router.post(
  "/login",
  asyncHandler((req, res) => authController.login(req, res))
);

// Get profile
router.get(
  "/profile/:id",
  asyncHandler((req, res) => authController.getProfile(req, res))
);

// Update profile
router.put(
  "/profile/:id",
  verifyToken,
  asyncHandler((req, res) => authController.updateProfile(req, res))
);

export default router;
