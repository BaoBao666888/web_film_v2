import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    user_id: String,
    movie_id: String,
    content: String,
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", CommentSchema);
