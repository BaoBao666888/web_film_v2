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
  async listForUser(userId, { limit = 50 } = {}) {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(normalizedLimit)
      .lean();
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
