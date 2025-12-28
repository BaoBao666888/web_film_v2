import mongoose from "mongoose";

const PreviewPurchaseSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  user_id: { type: String, index: true, required: true },
  movie_id: { type: String, index: true, required: true },
  episode: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

PreviewPurchaseSchema.index(
  { user_id: 1, movie_id: 1, episode: 1 },
  { unique: true }
);

export const PreviewPurchase = mongoose.model(
  "PreviewPurchase",
  PreviewPurchaseSchema
);
