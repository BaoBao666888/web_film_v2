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
import notificationService from "./notification.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

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

    const user = await findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new Error("INVALID_CREDENTIALS");
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
    const historyRaw = await listWatchHistory(userId);
    const history = historyRaw.slice(0, 6).map((item) => ({
      id: item.id,
      movieId: item.movie_id,
      title: item.movie?.title || "",
      thumbnail: item.movie?.thumbnail || "",
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
    const { avatar, currentPassword, newPassword, favoriteMoods } = updates;

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
    };
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
