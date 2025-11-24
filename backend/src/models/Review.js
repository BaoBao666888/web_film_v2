import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    user_id: String, // có thể chuyển sang ObjectId sau
    movie_id: String,
    rating: Number,
    comment: String,
    sentiment: String,
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const Review = mongoose.model("Review", ReviewSchema);
