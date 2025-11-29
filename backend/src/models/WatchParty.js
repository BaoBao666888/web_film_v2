import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, default: "Khách" },
    joinedAt: { type: Number, default: () => Date.now() },
    lastSeen: { type: Number, default: () => Date.now() },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "Ẩn danh" },
    content: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() },
  },
  { _id: false }
);

const WatchPartySchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true, required: true },
    movieId: { type: String, required: true },
    episodeNumber: { type: Number },
    title: { type: String, required: true },
    poster: { type: String },
    hostId: { type: String, required: true },
    hostName: { type: String, required: true },
    allowViewerControl: { type: Boolean, default: false },
    allowDownload: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    autoStart: { type: Boolean, default: true },
    currentPosition: { type: Number, default: 0 },
    state: {
      position: { type: Number, default: 0 },
      isPlaying: { type: Boolean, default: false },
      playbackRate: { type: Number, default: 1 },
      updatedAt: { type: Number, default: () => Date.now() },
    },
    participants: { type: [ParticipantSchema], default: [] },
    messages: { type: [MessageSchema], default: [] },
    lastActive: { type: Number, default: () => Date.now() },
  },
  { timestamps: true }
);

export const WatchParty = mongoose.model("WatchParty", WatchPartySchema);
