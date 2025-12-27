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
    password_hash: String,
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
