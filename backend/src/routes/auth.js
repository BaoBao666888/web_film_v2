import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  addUser,
  findUserByEmail,
  getUserById,
  listFavorites,
  listWatchHistory,
} from "../db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

//Đăng ký
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Thiếu thông tin đăng ký" });

  const existing = await findUserByEmail(email);
  if (existing) return res.status(409).json({ message: "Email đã tồn tại" });

  const newUser = await addUser({ name, email, password });

  const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: "7d" });

  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
  });
});

//Đăng nhập
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });

  const user = await findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Sai thông tin đăng nhập" });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    },
  });
});

//Lấy profile
router.get("/profile/:id", async (req, res) => {
  const { id } = req.params;
  const user = await getUserById(id);
  if (!user)
    return res.status(404).json({ message: "Không tìm thấy người dùng" });

  const favorites = await listFavorites(id, 6);
  const history = (await listWatchHistory(id)).slice(0, 6).map((item) => ({
    id: item.movie_id,
    title: item.movie?.title || "",
    thumbnail: item.movie?.thumbnail || "",
    lastWatchedAt: item.last_watched_at,
  }));

  res.json({ user, favorites, history });
});

export default router;
