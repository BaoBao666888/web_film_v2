import mongoose from "mongoose";

const FavoriteSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    user_id: String,
    movie_id: String,
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Favorite = mongoose.model("Favorite", FavoriteSchema);
