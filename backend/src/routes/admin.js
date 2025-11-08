import { Router } from "express";
import { getStats, listUsers, listMovies } from "../db.js";

const router = Router();

router.get("/stats", (req, res) => {
  const stats = getStats();
  const topMoods = Object.entries(stats.moods)
    .map(([mood, total]) => ({ mood, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  res.json({
    metrics: [
      { label: "Phim đang phát hành", value: stats.movies },
      { label: "Người dùng hoạt động", value: stats.users },
      { label: "Đánh giá đã ghi nhận", value: stats.reviews },
    ],
    topMoods,
  });
});

router.get("/users", (req, res) => {
  res.json({ users: listUsers() });
});

router.get("/movies", (req, res) => {
  res.json({ movies: listMovies({ limit: 50 }) });
});

export default router;
