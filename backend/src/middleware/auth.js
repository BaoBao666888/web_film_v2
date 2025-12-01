import jwt from "jsonwebtoken";
import { getUserById } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

//Kiểm tra token
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Thiếu token hoặc token không hợp lệ" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user)
      return res
        .status(401)
        .json({ message: "Token không hợp lệ (user không tồn tại)" });

    req.user = user; // lưu user vào request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// Không bắt buộc đăng nhập, nhưng nếu có token hợp lệ thì gắn user vào req
export const optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await getUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch {
      // bỏ qua token lỗi
    }
  }
  next();
};

// Chỉ admin mới được phép
export const requireAdmin = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Bạn chưa đăng nhập" });

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền truy cập" });
  }
  next();
};
