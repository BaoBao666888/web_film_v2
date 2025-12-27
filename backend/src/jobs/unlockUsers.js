import { User } from "../models/User.js";
import { UserLockLog } from "../models/UserLockLog.js";
import notificationService from "../services/notification.service.js";
import { generateId } from "../utils/id.js";

/**
 * Scheduled job to automatically unlock users when lock period expires
 */
export async function checkAndUnlockUsers() {
  try {
    const now = new Date();
    const usersToUnlock = await User.find({
      is_locked: true,
      locked_until: { $ne: null, $lte: now },
    }).lean();

    if (!usersToUnlock.length) return;

    const userIds = usersToUnlock.map((user) => user.id);

    await User.updateMany(
      { id: { $in: userIds } },
      {
        $set: { is_locked: false },
        $unset: {
          locked_reason: "",
          locked_at: "",
          locked_by: "",
          locked_until: "",
        },
      }
    );

    const logDocs = usersToUnlock.map((user) => ({
      id: generateId("lock"),
      user_id: user.id,
      action: "unlock",
      reason: "Hết thời gian khóa",
      unlock_at: user.locked_until,
      created_by: "system",
      created_at: now,
    }));

    await UserLockLog.insertMany(logDocs);

    try {
      await notificationService.sendToUsers({
        userIds,
        title: "Tài khoản đã được mở khóa",
        content: "Tài khoản của bạn đã được mở khóa do hết thời gian khóa.",
        senderType: "bot",
        senderName: "Lumi Bot",
      });
    } catch (error) {
      console.warn(
        "[UnlockJob] Failed to send notifications:",
        error?.message || error
      );
    }

    console.log(
      `[UnlockJob] Automatically unlocked ${userIds.length} user(s) at ${now.toISOString()}`
    );
  } catch (error) {
    console.error("[UnlockJob] Error checking and unlocking users:", error);
  }
}

/**
 * Start the scheduled job (runs every hour)
 */
export function startUnlockUsersJob() {
  console.log("[UnlockJob] Starting scheduled job (runs every hour)");

  // Run immediately on startup
  checkAndUnlockUsers();

  // Then run every hour
  setInterval(checkAndUnlockUsers, 60 * 60 * 1000);
}
