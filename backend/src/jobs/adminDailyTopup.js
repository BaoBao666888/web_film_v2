import mongoose from "mongoose";
import { User } from "../models/User.js";
import { WalletLedger } from "../models/WalletLedger.js";
import { generateId } from "../utils/id.js";

const DAILY_ADMIN_BALANCE = 500_000;
const TOPUP_TYPE = "admin_daily";
const TOPUP_NOTE = "Cộng bù hạn mức admin/ngày";

const buildDayRange = (base = new Date()) => {
  const startOfDay = new Date(base);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  return { startOfDay, endOfDay };
};

/**
 * Scheduled job to top up admin balances to a daily minimum
 */
export async function checkAndTopupAdmins() {
  try {
    const now = new Date();
    const { startOfDay, endOfDay } = buildDayRange(now);

    const admins = await User.find({
      role: "admin",
      balance: { $lt: DAILY_ADMIN_BALANCE },
    }).lean();

    if (!admins.length) return;

    const alreadyToppedIds = await WalletLedger.distinct("user_id", {
      type: TOPUP_TYPE,
      created_at: { $gte: startOfDay, $lt: endOfDay },
    });
    const toppedSet = new Set(alreadyToppedIds.map((id) => String(id)));

    let updatedCount = 0;

    for (const admin of admins) {
      if (toppedSet.has(String(admin.id))) continue;
      const currentBalance = Number(admin.balance || 0);
      const topupAmount = DAILY_ADMIN_BALANCE - currentBalance;
      if (topupAmount <= 0) continue;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await User.updateOne(
            { id: admin.id },
            { $inc: { balance: topupAmount } }
          ).session(session);

          const ledgerEntry = new WalletLedger({
            id: generateId("ledger"),
            user_id: admin.id,
            amount: topupAmount,
            type: TOPUP_TYPE,
            note: TOPUP_NOTE,
            created_by: "system",
            created_at: now,
          });
          await ledgerEntry.save({ session });
        });
        updatedCount += 1;
      } catch (error) {
        const message = error?.message || "";
        const isTxnUnsupported =
          error?.codeName === "IllegalOperation" ||
          message.includes(
            "Transaction numbers are only allowed on a replica set"
          );
        if (isTxnUnsupported) {
          await User.updateOne(
            { id: admin.id },
            { $inc: { balance: topupAmount } }
          );
          await WalletLedger.create({
            id: generateId("ledger"),
            user_id: admin.id,
            amount: topupAmount,
            type: TOPUP_TYPE,
            note: TOPUP_NOTE,
            created_by: "system",
            created_at: now,
          });
          updatedCount += 1;
        } else {
          throw error;
        }
      } finally {
        session.endSession();
      }
    }

    if (updatedCount > 0) {
      console.log(
        `[AdminTopupJob] Topped up ${updatedCount} admin(s) at ${now.toISOString()}`
      );
    }
  } catch (error) {
    console.error("[AdminTopupJob] Error topping up admins:", error);
  }
}

/**
 * Start the scheduled job (runs every hour)
 */
export function startAdminDailyTopupJob() {
  console.log("[AdminTopupJob] Starting scheduled job (runs every hour)");

  // Run immediately on startup
  checkAndTopupAdmins();

  // Then run every hour
  setInterval(checkAndTopupAdmins, 60 * 60 * 1000);
}
