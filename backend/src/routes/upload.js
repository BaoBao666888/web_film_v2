import { Router } from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import uploadController from "../controllers/upload.controller.js";

const router = Router();

/**
 * Upload a single file
 * POST /upload/single
 * Requires admin authentication
 */
router.post(
  "/single",
  verifyToken,
  requireAdmin,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "File too large. Maximum size is 2GB.",
          });
        }
        return res.status(400).json({
          message: err.message || "File upload failed",
        });
      }
      next();
    });
  },
  (req, res) => uploadController.uploadSingle(req, res)
);

export default router;
