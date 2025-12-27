import mongoose from "mongoose";

const UserLockLogSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  user_id: { type: String, index: true },
  action: { type: String, enum: ["lock", "unlock"], required: true },
  reason: { type: String, required: true },
  unlock_at: Date,
  created_by: { type: String, index: true },
  created_at: { type: Date, default: Date.now },
});

export const UserLockLog = mongoose.model("UserLockLog", UserLockLogSchema);
