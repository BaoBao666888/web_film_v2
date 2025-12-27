import jwt from "jsonwebtoken";
import { getUserById, updateUser } from "../db.js";
import { UserLockLog } from "../models/UserLockLog.js";
import notificationService from "../services/notification.service.js";
import { generateId } from "../utils/id.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const DAY_MS = 24 * 60 * 60 * 1000;

const resolveLockDays = (user) => {
  const lockedAt = user?.locked_at ? new Date(user.locked_at).getTime() : null;
  const lockedUntil = user?.locked_until
    ? new Date(user.locked_until).getTime()
    : null;
  if (!lockedAt || !lockedUntil || lockedUntil <= lockedAt) return null;
  return Math.max(1, Math.ceil((lockedUntil - lockedAt) / DAY_MS));
};

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
    if (user.is_locked) {
      if (user.locked_until) {
        const lockedUntil = new Date(user.locked_until).getTime();
        if (!Number.isNaN(lockedUntil) && lockedUntil <= Date.now()) {
          const updatedUser = await updateUser(user.id, {
            is_locked: false,
            locked_reason: null,
            locked_at: null,
            locked_by: null,
            locked_until: null,
          });

          try {
            await UserLockLog.create({
              id: generateId("lock"),
              user_id: user.id,
              action: "unlock",
              reason: "Hết thời gian khóa",
              unlock_at: user.locked_until,
              created_by: "system",
              created_at: new Date(),
            });
          } catch (error) {
            console.warn("Auto unlock log failed:", error?.message || error);
          }

          try {
            await notificationService.sendToUsers({
              userIds: [user.id],
              title: "Tài khoản đã được mở khóa",
              content: "Tài khoản của bạn đã được mở khóa do hết thời gian khóa.",
              senderType: "bot",
              senderName: "Lumi Bot",
            });
          } catch (error) {
            console.warn(
              "Auto unlock notification failed:",
              error?.message || error
            );
          }

          req.user = updatedUser || user;
          return next();
        }
      }

      const lockDays = resolveLockDays(user);
      const dayLabel =
        Number.isFinite(lockDays) && lockDays > 0 ? `${lockDays} ngày` : "";
      const lockReason =
        user.locked_reason && String(user.locked_reason).trim()
          ? String(user.locked_reason).trim()
          : null;
      return res.status(403).json({
        message: `Tài khoản đã bị khóa${
          dayLabel ? ` trong ${dayLabel}` : ""
        }${lockReason ? `. Lý do: ${lockReason}` : ""}.`,
      });
    }

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
      if (user && !user.is_locked) {
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
