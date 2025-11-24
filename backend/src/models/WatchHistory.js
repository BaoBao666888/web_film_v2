import mongoose from "mongoose";

const WatchHistorySchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    user_id: String,
    movie_id: String,
    last_watched_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const WatchHistory = mongoose.model("WatchHistory", WatchHistorySchema);
