import { Router } from "express";
import crypto from "crypto";
import { WatchParty } from "../models/WatchParty.js";

const router = Router();
const STALE_MS = 15000;

const makeId = (len = 10) =>
  crypto
    .randomBytes(len)
    .toString("hex")
    .slice(0, len);

const pruneParticipants = (party) => {
  const now = Date.now();
  const alive = (party.participants || []).filter((p) => now - (p.lastSeen || 0) < STALE_MS);
  let hostId = party.hostId;
  let hostName = party.hostName;
  if (!alive.find((p) => p.userId === hostId) && alive.length) {
    const next = [...alive].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    hostId = next.userId;
    hostName = next.name;
  }
  party.participants = alive;
  party.hostId = hostId;
  party.hostName = hostName;
  return party;
};

router.post("/", async (req, res) => {
  const {
    movieId,
    episodeNumber,
    title,
    poster,
    hostId,
    hostName,
    allowViewerControl = false,
    allowDownload = false,
    isPrivate = false,
    autoStart = true,
    currentPosition = 0,
    participant,
  } = req.body || {};

  if (!movieId || !title || !hostId || !hostName) {
    return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc." });
  }

  const roomId = makeId(10);
  const participants = participant
    ? [
        {
          userId: participant.userId || hostId,
          name: participant.name || hostName,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        },
      ]
    : [];

  const created = await WatchParty.create({
    roomId,
    movieId,
    episodeNumber,
    title,
    poster,
    hostId,
    hostName,
    allowViewerControl,
    allowDownload,
    isPrivate,
    autoStart,
    currentPosition,
    participants,
    lastActive: Date.now(),
  });

  return res.json(created);
});

router.get("/public", async (_req, res) => {
  const rooms = await WatchParty.find({ isPrivate: false }).sort({ lastActive: -1 }).limit(100);
  rooms.forEach(pruneParticipants);
  res.json(rooms);
});

router.get("/private", async (req, res) => {
  const viewerId = req.query.viewerId;
  if (!viewerId) return res.status(400).json({ message: "Thiếu viewerId" });
  const rooms = await WatchParty.find({
    isPrivate: true,
    $or: [{ hostId: viewerId }, { "participants.userId": viewerId }],
  })
    .sort({ lastActive: -1 })
    .limit(50);
  rooms.forEach(pruneParticipants);
  res.json(rooms);
});

router.get("/:id", async (req, res) => {
  const room = await WatchParty.findOne({ roomId: req.params.id });
  if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
  pruneParticipants(room);
  await room.save();
  res.json(room);
});

router.post("/:id/join", async (req, res) => {
  const { viewerId, name } = req.body || {};
  if (!viewerId) return res.status(400).json({ message: "Thiếu viewerId" });
  const room = await WatchParty.findOne({ roomId: req.params.id });
  if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });

  pruneParticipants(room);
  const existing = room.participants.find((p) => p.userId === viewerId);
  if (existing) {
    existing.lastSeen = Date.now();
    existing.name = name || existing.name;
  } else {
    room.participants.push({
      userId: viewerId,
      name: name || "Khách",
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    });
  }
  room.lastActive = Date.now();
  await room.save();
  res.json(room);
});

router.post("/:id/heartbeat", async (req, res) => {
  const { viewerId } = req.body || {};
  const room = await WatchParty.findOne({ roomId: req.params.id });
  if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
  pruneParticipants(room);
  const target = room.participants.find((p) => p.userId === viewerId);
  if (target) target.lastSeen = Date.now();
  room.lastActive = Date.now();
  await room.save();
  res.json(room);
});

router.post("/:id/state", async (req, res) => {
  const { viewerId, position, isPlaying, playbackRate } = req.body || {};
  const room = await WatchParty.findOne({ roomId: req.params.id });
  if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
  const isHost = viewerId && viewerId === room.hostId;
  if (!isHost && !room.allowViewerControl) {
    return res.status(403).json({ message: "Chỉ host được chỉnh." });
  }
  room.state = {
    position: Number(position) || 0,
    isPlaying: Boolean(isPlaying),
    playbackRate: Number(playbackRate) || 1,
    updatedAt: Date.now(),
  };
  room.lastActive = Date.now();
  await room.save();
  res.json(room.state);
});

router.patch("/:id/settings", async (req, res) => {
  const { viewerId, allowViewerControl, allowDownload } = req.body || {};
  const room = await WatchParty.findOne({ roomId: req.params.id });
  if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
  if (!viewerId || viewerId !== room.hostId) {
    return res.status(403).json({ message: "Chỉ host được chỉnh cài đặt" });
  }
  if (typeof allowViewerControl === "boolean") room.allowViewerControl = allowViewerControl;
  if (typeof allowDownload === "boolean") room.allowDownload = allowDownload;
  room.lastActive = Date.now();
  await room.save();
  res.json(room);
});

router.post("/:id/chat", async (req, res) => {
  const { viewerId, userName, content } = req.body || {};
  if (!viewerId || !content) return res.status(400).json({ message: "Thiếu viewerId hoặc nội dung" });
  const room = await WatchParty.findOne({ roomId: req.params.id });
  if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
  room.messages.push({
    userId: viewerId,
    userName: userName || "Ẩn danh",
    content: String(content).slice(0, 500),
    createdAt: Date.now(),
  });
  room.messages = room.messages.slice(-50);
  room.lastActive = Date.now();
  await room.save();
  res.json(room.messages);
});

router.delete("/:id", async (req, res) => {
  const { viewerId } = req.body || {};
  const room = await WatchParty.findOne({ roomId: req.params.id });
  if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
  if (!viewerId || viewerId !== room.hostId) {
    return res.status(403).json({ message: "Chỉ host được xóa phòng" });
  }
  await WatchParty.deleteOne({ roomId: req.params.id });
  res.json({ message: "Đã xóa phòng" });
});

export default router;
