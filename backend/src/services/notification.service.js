import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { generateId } from "../utils/id.js";

const sanitizeText = (value, maxLength) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!maxLength) return trimmed;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

class NotificationService {
  async listForUser(userId, { page = 1, limit = 20 } = {}) {
    const sanitizedPage = Math.max(Number(page) || 1, 1);
    const sanitizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const [items, totalItems] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(sanitizedLimit)
        .lean(),
      Notification.countDocuments({ userId }),
    ]);

    return {
      items,
      meta: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalItems,
        totalPages: sanitizedLimit
          ? Math.max(1, Math.ceil(totalItems / sanitizedLimit))
          : 1,
      },
    };
  }

  async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, readAt: null });
  }

  async markAllRead(userId) {
    const now = new Date();
    await Notification.updateMany(
      { userId, readAt: null },
      { $set: { readAt: now } }
    );
    return { success: true, readAt: now };
  }

  async sendToUsers({
    userIds = [],
    title,
    content,
    senderType = "admin",
    senderId,
    senderName = "Admin",
  }) {
    const uniqueIds = Array.from(
      new Set(userIds.map((id) => String(id)).filter(Boolean))
    );
    if (!uniqueIds.length) {
      return { sent: 0, skipped: 0 };
    }

    const users = await User.find({ id: { $in: uniqueIds } }).lean();
    if (!users.length) {
      return { sent: 0, skipped: uniqueIds.length };
    }

    const now = new Date();
    const safeTitle = sanitizeText(title, 120);
    const safeContent = sanitizeText(content, 2000);
    const docs = users.map((user) => ({
      id: generateId("notif"),
      userId: user.id,
      title: safeTitle || undefined,
      content: safeContent,
      senderType,
      senderId,
      senderName,
      createdAt: now,
    }));

    await Notification.insertMany(docs);
    return {
      sent: docs.length,
      skipped: Math.max(uniqueIds.length - docs.length, 0),
    };
  }
}

export default new NotificationService();
