import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    userId: { type: String, index: true, required: true },
    title: { type: String },
    content: { type: String, required: true },
    senderType: { type: String, default: "admin" },
    senderId: { type: String },
    senderName: { type: String, default: "Admin" },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Notification = mongoose.model(
  "Notification",
  NotificationSchema
);
