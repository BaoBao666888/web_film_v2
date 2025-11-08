import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  addUser,
  findUserByEmail,
  getUserById,
  listFavorites,
  listWatchHistory,
} from "../db.js";
import { generateId } from "../utils/id.js";

const router = Router();

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Thiếu thông tin đăng ký" });
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: "Email đã tồn tại" });
  }

  const newUser = addUser({ name, email, password });
  res.status(201).json({
    token: "mock-token-" + newUser.id,
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
  });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });
  }

  const user = findUserByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Sai thông tin đăng nhập" });
  }

  res.json({
    token: `mock-token-${user.id}`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    },
  });
});

router.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  const user = getUserById(id);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  const favorites = listFavorites(id, 6);
  const history = listWatchHistory(id)
    .slice(0, 6)
    .map((item) => ({
      id: item.movie_id,
      title: item.movie ? item.movie.title : "",
      thumbnail: item.movie ? item.movie.thumbnail : "",
      lastWatchedAt: item.last_watched_at,
    }));

  res.json({
    user,
    favorites,
    history,
  });
});

export default router;
