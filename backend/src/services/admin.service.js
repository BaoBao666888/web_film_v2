import mongoose from "mongoose";
import { getStats, listUsers, listMovies } from "../db.js";
import { Movie } from "../models/Movie.js";
import { User } from "../models/User.js";
import { WalletLedger } from "../models/WalletLedger.js";
import { generateId } from "../utils/id.js";

/**
 * Admin Service - Business Logic Layer
 */
class AdminService {
  /**
   * Get dashboard statistics
   */
  async getStats() {
    const stats = await getStats();
    const topMoods = Object.entries(stats.moods)
      .map(([mood, total]) => ({ mood, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      metrics: [
        { label: "Phim đang phát hành", value: stats.movies },
        { label: "Người dùng hoạt động", value: stats.users },
        { label: "Đánh giá đã ghi nhận", value: stats.reviews },
      ],
      topMoods,
    };
  }

  /**
   * List all users
   */
  async listUsers() {
    return await listUsers();
  }

  /**
   * List movies with pagination
   */
  async listMovies(params) {
    const { page = 1, limit = 20, q } = params;
    const sanitizedPage = Math.max(Number(page) || 1, 1);
    const sanitizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const mongoQuery = q
      ? {
          $or: [
            { title: new RegExp(q, "i") },
            { synopsis: new RegExp(q, "i") },
          ],
        }
      : {};

    // ✅ Admin can see ALL movies including hidden ones
    const [movies, totalItems] = await Promise.all([
      Movie.find(mongoQuery).skip(skip).limit(sanitizedLimit).lean(),
      Movie.countDocuments(mongoQuery),
    ]);

    return {
      movies,
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

  /**
   * Toggle movie visibility (hide/unhide)
   */
  async toggleMovieVisibility(movieId, isHidden, unhideDate = null) {
    const movie = await Movie.findOne({ id: movieId });
    if (!movie) {
      throw new Error("Movie not found");
    }

    movie.isHidden = isHidden;
    movie.unhideDate = isHidden && unhideDate ? new Date(unhideDate) : null;
    await movie.save();

    return movie;
  }

  /**
   * Adjust user balance with ledger entry (admin only)
   */
  async adjustUserBalance({ userId, amount, note, type, refId, adminId }) {
    const ledgerPayload = {
      id: generateId("ledger"),
      user_id: userId,
      amount,
      type,
      ref_id: refId || undefined,
      note,
      created_by: adminId,
      created_at: new Date(),
    };

    const runWithoutTransaction = async () => {
      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const ledgerEntry = await WalletLedger.create(ledgerPayload);
      user.balance = Number(user.balance || 0) + Number(amount);
      await user.save();

      return { user: user.toObject(), ledger: ledgerEntry.toObject() };
    };

    const session = await mongoose.startSession();
    let updatedUser;
    let ledgerEntry;

    try {
      await session.withTransaction(async () => {
        const user = await User.findOne({ id: userId }).session(session);
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        ledgerEntry = new WalletLedger(ledgerPayload);
        await ledgerEntry.save({ session });

        user.balance = Number(user.balance || 0) + Number(amount);
        await user.save({ session });

        updatedUser = user.toObject();
      });

      return {
        user: updatedUser,
        ledger: ledgerEntry?.toObject?.() || ledgerEntry,
      };
    } catch (error) {
      const message = error?.message || "";
      const isTxnUnsupported =
        error?.codeName === "IllegalOperation" ||
        message.includes("Transaction numbers are only allowed on a replica set");
      if (isTxnUnsupported) {
        return await runWithoutTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * List wallet ledger entries
   */
  async listWalletLedger(params = {}) {
    const { page = 1, limit = 30, userId } = params;
    const sanitizedPage = Math.max(Number(page) || 1, 1);
    const sanitizedLimit = Math.min(Math.max(Number(limit) || 30, 1), 200);
    const skip = (sanitizedPage - 1) * sanitizedLimit;
    const query = userId ? { user_id: String(userId) } : {};

    const [items, totalItems] = await Promise.all([
      WalletLedger.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(sanitizedLimit)
        .lean(),
      WalletLedger.countDocuments(query),
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

  /**
   * List ledger entries eligible for reversal
   */
  async listReversalCandidates(userId, limit = 50) {
    const referencedIds = await WalletLedger.distinct("ref_id", {
      user_id: String(userId),
      ref_id: { $exists: true, $ne: "" },
    });

    return WalletLedger.find({
      user_id: String(userId),
      type: { $ne: "reversal" },
      id: referencedIds.length ? { $nin: referencedIds } : { $exists: true },
    })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
      .lean();
  }

  /**
   * Get a single wallet ledger entry
   */
  async getWalletLedgerEntry(ledgerId) {
    return WalletLedger.findOne({ id: String(ledgerId) }).lean();
  }

  /**
   * Check if a ledger entry is already referenced
   */
  async isLedgerReferenced(ledgerId) {
    const count = await WalletLedger.countDocuments({
      ref_id: String(ledgerId),
    });
    return count > 0;
  }
}

export default new AdminService();
