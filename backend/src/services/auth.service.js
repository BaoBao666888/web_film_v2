import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  addUser,
  findUserByEmail,
  getUserById,
  listFavorites,
  listWatchHistory,
  updateUser,
  incrementUserBalance,
} from "../db.js";
import notificationService from "./notification.service.js";
import { UserLockLog } from "../models/UserLockLog.js";
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

const autoUnlockIfExpired = async (user) => {
  if (!user?.is_locked || !user?.locked_until) return { user, unlocked: false };
  const lockedUntil = new Date(user.locked_until).getTime();
  if (Number.isNaN(lockedUntil) || lockedUntil > Date.now()) {
    return { user, unlocked: false };
  }

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
    console.warn("Auto unlock notification failed:", error?.message || error);
  }

  return { user: updatedUser || user, unlocked: true };
};

/**
 * Auth Service - Business Logic Layer
 */
class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password } = userData;

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }

    // Create new user
    const newUser = await addUser({ name, email, password });

    // Generate token
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: "7d" });

    const sanitizedUser = this.sanitizeUser(newUser);
    try {
      await notificationService.sendToUsers({
        userIds: [newUser.id],
        title: "Chào mừng đến Lumi AI Cinema",
        content:
          `Xin chào ${sanitizedUser.name || "bạn"}! Cảm ơn bạn đã đăng ký. ` +
          "Hãy khám phá phim mới, tạo phòng xem chung và lưu lại danh sách yêu thích. " +
          "Nếu cần hỗ trợ, cứ nhắn cho tụi mình nhé.",
        senderType: "bot",
        senderName: "Lumi Bot",
      });
    } catch (error) {
      console.warn("Send welcome notification failed:", error?.message || error);
    }

    return {
      token,
      user: sanitizedUser,
    };
  }

  /**
   * Login user
   */
  async login(credentials) {
    const { email, password } = credentials;

    let user = await findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new Error("INVALID_CREDENTIALS");
    }
  if (user.is_locked) {
      const unlockResult = await autoUnlockIfExpired(user);
      if (unlockResult.unlocked) {
        user = unlockResult.user;
      } else {
        const error = new Error("USER_LOCKED");
        error.lockDays = resolveLockDays(user);
        error.lockReason = user.locked_reason || null;
        throw error;
      }
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    const sanitizedUser = this.sanitizeUser(user);
    try {
      await notificationService.sendToUsers({
        userIds: [user.id],
        title: "Chào mừng bạn quay lại",
        content:
          `Rất vui được gặp lại ${sanitizedUser.name || "bạn"}. ` +
          "Hôm nay có nhiều phim mới và gợi ý AI phù hợp với bạn. " +
          "Chúc bạn xem phim vui vẻ!",
        senderType: "bot",
        senderName: "Lumi Bot",
      });
    } catch (error) {
      console.warn("Send login notification failed:", error?.message || error);
    }

    return {
      token,
      user: sanitizedUser,
    };
  }

  /**
   * Get user profile with favorites and history
   */
  async getProfile(userId) {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const favorites = await listFavorites(userId, 6);
    const { items: historyRaw } = await listWatchHistory(userId, { limit: 3 });
    const history = historyRaw.map((item) => ({
      id: item.id,
      movieId: item.movie?.id || item.movie_id,
      title: item.movie?.title || "",
      thumbnail: item.movie?.thumbnail || "",
      episode: item.episode,
      position: item.last_position ?? 0,
      lastWatchedAt: item.last_watched_at,
    }));

    return {
      user: this.sanitizeUser(user),
      favorites,
      history,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, requesterId, requesterRole, updates) {
    const {
      avatar,
      currentPassword,
      newPassword,
      favoriteMoods,
      themePreference,
    } = updates;

    // Check authorization
    if (requesterId !== userId && requesterRole !== "admin") {
      throw new Error("FORBIDDEN");
    }

    const targetUser = await getUserById(userId);
    if (!targetUser) {
      throw new Error("USER_NOT_FOUND");
    }

    const userUpdates = {};

    if (avatar !== undefined) {
      userUpdates.avatar = avatar;
    }

    if (Array.isArray(favoriteMoods)) {
      userUpdates.favorite_moods = favoriteMoods.filter(Boolean);
    }

    if (themePreference) {
      const normalized = String(themePreference).toLowerCase();
      if (!["system", "light", "dark"].includes(normalized)) {
        throw new Error("INVALID_THEME");
      }
      userUpdates.theme_preference = normalized;
    }

    if (newPassword) {
      if (!currentPassword) {
        throw new Error("CURRENT_PASSWORD_REQUIRED");
      }
      if (!bcrypt.compareSync(currentPassword, targetUser.password_hash)) {
        throw new Error("INVALID_CURRENT_PASSWORD");
      }
      userUpdates.password_hash = bcrypt.hashSync(newPassword, 10);
    }

    if (Object.keys(userUpdates).length === 0) {
      throw new Error("NO_UPDATES");
    }

    const updatedUser = await updateUser(userId, userUpdates);
    if (!updatedUser) {
      throw new Error("UPDATE_FAILED");
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Sanitize user object (remove sensitive data)
   */
  sanitizeUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      created_at: user.created_at,
      favorite_moods: user.favorite_moods || [],
      theme_preference: user.theme_preference || "system",
      balance: typeof user.balance === "number" ? user.balance : 0,
    };
  }

  /**
   * Top up balance (VND)
   */
  async topUpBalance(userId, amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error("INVALID_AMOUNT");
    }

    const rounded = Math.floor(numericAmount);
    const updatedUser = await incrementUserBalance(userId, rounded);
    if (!updatedUser) {
      throw new Error("USER_NOT_FOUND");
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error("INVALID_TOKEN");
    }
  }
}

export default new AuthService();
