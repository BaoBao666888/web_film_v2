import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  listWatchHistory,
  addWatchHistory,
  removeWatchHistory,
  clearWatchHistory,
} from "../db.js";

const router = Router();

//Lấy lịch sử xem của user
router.get("/", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const items = await listWatchHistory(userId);
  res.json({ items });
});

//Ghi nhận khi user xem phim
router.post("/", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { movieId } = req.body;

  if (!movieId) return res.status(400).json({ message: "Thiếu movieId" });

  await addWatchHistory({ userId, movieId });
  res.status(201).json({ success: true });
});

//Xóa một mục lịch sử
router.delete("/:historyId", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { historyId } = req.params;

  if (!historyId) return res.status(400).json({ message: "Thiếu historyId" });

  await removeWatchHistory({ userId, historyId });
  res.json({ success: true });
});

//Xóa toàn bộ lịch sử
router.delete("/", verifyToken, async (req, res) => {
  const userId = req.user.id;
  await clearWatchHistory(userId);
  res.json({ success: true });
});

export default router;
