import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: String,
    email: { type: String, unique: true, index: true },
    avatar: String,
    role: { type: String, default: "user" },
    favorite_moods: { type: [String], default: [] },
    theme_preference: { type: String, default: "system" },
    balance: { type: Number, default: 0 },
    is_locked: { type: Boolean, default: false },
    locked_reason: String,
    locked_at: Date,
    locked_by: String,
    locked_until: Date,
    password_hash: String,
    
    // ===== RESET PASSWORD =====
    reset_code_hash: { type: String, default: null },
    reset_code_expires_at: { type: Date, default: null },
    reset_code_attempts: { type: Number, default: 0 },

    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
