import { Router } from "express";
import { listMovies, getStats } from "../db.js";

const router = Router();

const moodPlaylists = [
  {
    id: "cozy-sci",
    title: "Khoa học viễn tưởng nhẹ nhàng",
    description: "Khi bạn muốn phiêu lưu nhưng vẫn chill tối chủ nhật.",
    gradient: "from-primary/80 to-secondary/80",
    icon: "🚀",
  },
  {
    id: "feel-good",
    title: "Nâng mood liền tay",
    description: "Hài hước - feel good giúp hồi phục năng lượng.",
    gradient: "from-orange-400/80 to-pink-500/80",
    icon: "🌈",
  },
  {
    id: "nocturnal-thrill",
    title: "Căng thẳng tối muộn",
    description: "Chọn lọc thriller gay cấn kèm twist khó đoán.",
    gradient: "from-emerald-500/80 to-cyan-500/80",
    icon: "🌌",
  },
];

router.get("/recommendations", (req, res) => {
  const { userId = "demo-user", mood } = req.query;
  let rows = listMovies({ mood, limit: 6 });
  if (!rows.length) {
    rows = listMovies({ limit: 6 });
  }

  res.json({
    userId,
    strategy: "hybrid-demo",
    playlists: moodPlaylists,
    items: rows,
  });
});

router.get("/playlists", (req, res) => {
  res.json({ items: moodPlaylists });
});

router.post("/chat", (req, res) => {
  const { message = "", userId = "demo-user" } = req.body;
  const sanitized = message.trim().toLowerCase();

  let mood = "Hành động";
  if (sanitized.includes("lãng mạn")) mood = "Lãng mạn";
  if (sanitized.includes("kinh dị")) mood = "Kinh dị";
  if (sanitized.includes("hài")) mood = "Hài hước";

  const suggestions = listMovies({ mood, limit: 3 }).map((movie) => ({
    id: movie.id,
    title: movie.title,
    synopsis: movie.synopsis,
    thumbnail: movie.thumbnail,
  }));

  res.json({
    userId,
    reply: `Mình nghĩ bạn sẽ thích nhóm phim mang mood "${mood}". Dưới đây là vài gợi ý nè!`,
    suggestions,
  });
});

router.get("/dashboard", (req, res) => {
  const stats = getStats();
  const avgMoodScore = Math.min(100, 60 + stats.reviews * 2);

  res.json({
    watchCount: stats.watch_history || 0,
    reviewCount: stats.reviews,
    avgMoodScore,
  });
});

export default router;
