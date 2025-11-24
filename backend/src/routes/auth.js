import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  addUser,
  findUserByEmail,
  getUserById,
  listFavorites,
  listWatchHistory,
  updateUser,
} from "../db.js";
import { verifyToken } from "../middleware/auth.js";

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
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      role: newUser.role,
      created_at: newUser.created_at,
      favorite_moods: newUser.favorite_moods || [],
    },
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
      created_at: user.created_at,
      favorite_moods: user.favorite_moods || [],
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
    id: item.id,
    movieId: item.movie_id,
    title: item.movie?.title || "",
    thumbnail: item.movie?.thumbnail || "",
    lastWatchedAt: item.last_watched_at,
  }));

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    created_at: user.created_at,
    favorite_moods: user.favorite_moods || [],
  };

  res.json({ user: safeUser, favorites, history });
});

router.put("/profile/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { avatar, currentPassword, newPassword, favoriteMoods } = req.body;

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không thể chỉnh sửa hồ sơ này" });
  }

  const targetUser = await getUserById(id);
  if (!targetUser)
    return res.status(404).json({ message: "Không tìm thấy người dùng" });

  const updates = {};
  if (avatar !== undefined) {
    updates.avatar = avatar;
  }

  if (Array.isArray(favoriteMoods)) {
    updates.favorite_moods = favoriteMoods.filter(Boolean);
  }

  if (newPassword) {
    if (!currentPassword) {
      return res
        .status(400)
        .json({ message: "Cần nhập mật khẩu hiện tại để đổi mật khẩu" });
    }
    if (!bcrypt.compareSync(currentPassword, targetUser.password_hash)) {
      return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });
    }
    updates.password_hash = bcrypt.hashSync(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Không có dữ liệu cần cập nhật" });
  }

  const updatedUser = await updateUser(id, updates);
  if (!updatedUser) {
    return res.status(500).json({ message: "Không thể cập nhật người dùng" });
  }

  res.json({
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      created_at: updatedUser.created_at,
      favorite_moods: updatedUser.favorite_moods || [],
    },
  });
});

export default router;
