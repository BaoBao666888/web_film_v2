import mongoose from "mongoose";

const WatchHistorySchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    user_id: String,
    viewer_id: String,
    episode: Number,
    movie_id: String,
    last_position: { type: Number, default: 0 },
    last_watched_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const WatchHistory = mongoose.model("WatchHistory", WatchHistorySchema);
