import { Router } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { WatchParty } from "../models/WatchParty.js";
import { optionalAuth, verifyToken } from "../middleware/auth.js";

const router = Router();
const STALE_MS = 15000;
const MAX_SAVE_RETRIES = 3;

const makeId = (len = 10) =>
  crypto
    .randomBytes(len)
    .toString("hex")
    .slice(0, len);

const pruneParticipants = (party) => {
  const now = Date.now();
  const participants = party.participants || [];
  const alive = participants.filter((p) => now - (p.lastSeen || 0) < STALE_MS);
  if (alive.length !== participants.length) {
    party.participants = alive;
  }
  return party;
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Retry saves when optimistic concurrency detects conflicts
const savePartyWithRetry = async (roomId, mutator, initialRoom) => {
  let attempts = 0;
  let lastError = null;
  let room = initialRoom;

  while (attempts < MAX_SAVE_RETRIES) {
    const currentRoom = room || (await WatchParty.findOne({ roomId }));
    if (!currentRoom) return null;

    pruneParticipants(currentRoom);
    await mutator(currentRoom);

    try {
      await currentRoom.save();
      return currentRoom;
    } catch (err) {
      if (err instanceof mongoose.Error.VersionError) {
        attempts += 1;
        lastError = err;
        room = null; // fetch fresh version on next attempt
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

// Attach user info when token is present (used for stable viewerId)
router.use(optionalAuth);

router.post(
  "/",
  verifyToken,
  asyncHandler(async (req, res) => {
    const {
      movieId,
      episodeNumber,
      title,
      poster,
      isLive = false,
      isPrivate = false,
      autoStart = true,
      currentPosition = 0,
      participant,
    } = req.body || {};

    if (!movieId || !title) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc." });
    }

    const hostId = req.user?.id;
    const hostName = req.user?.name || "Ẩn danh";
    if (!hostId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để tạo phòng" });
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
      : [
          {
            userId: hostId,
            name: hostName,
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          },
        ];

    const created = await WatchParty.create({
      roomId,
      movieId,
      episodeNumber,
      title,
      poster,
      hostId,
      hostName,
      allowViewerControl: false,
      allowDownload: false, // legacy field, kept false
      isLive,
      isPrivate,
      autoStart,
      currentPosition,
      state: {
        position: Number(currentPosition) || 0,
        isPlaying: Boolean(autoStart),
        playbackRate: 1,
        updatedAt: Date.now(),
      },
      participants,
      lastActive: Date.now(),
    });

    res.json(created);
  })
);

router.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const rooms = await WatchParty.find({ isPrivate: false }).sort({ lastActive: -1 }).limit(100);
    rooms.forEach(pruneParticipants);
    res.json(rooms);
  })
);

router.get(
  "/private",
  asyncHandler(async (req, res) => {
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
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const room = await savePartyWithRetry(req.params.id, async () => {});
    if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
    res.json(room);
  })
);

router.post(
  "/:id/join",
  asyncHandler(async (req, res) => {
    const viewerId = req.body?.viewerId || req.user?.id;
    const { name } = req.body || {};
    if (!viewerId) return res.status(400).json({ message: "Thiếu viewerId" });
    const now = Date.now();

    const room = await savePartyWithRetry(req.params.id, async (party) => {
      const existing = party.participants.find((p) => p.userId === viewerId);
      if (existing) {
        existing.lastSeen = now;
        existing.name = name || req.user?.name || existing.name;
      } else {
        party.participants.push({
          userId: viewerId,
          name: name || req.user?.name || "Khách",
          joinedAt: now,
          lastSeen: now,
        });
      }
      party.lastActive = now;
    });

    if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
    res.json(room);
  })
);

router.post(
  "/:id/heartbeat",
  asyncHandler(async (req, res) => {
    const viewerId = req.body?.viewerId || req.user?.id;
    if (!viewerId) return res.status(400).json({ message: "Thiếu viewerId" });
    const now = Date.now();

    const room = await savePartyWithRetry(req.params.id, async (party) => {
      const target = party.participants.find((p) => p.userId === viewerId);
      if (target) target.lastSeen = now;
      party.lastActive = now;
    });

    if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
    res.json(room);
  })
);

router.post(
  "/:id/state",
  asyncHandler(async (req, res) => {
    const { position, isPlaying, playbackRate } = req.body || {};
    const viewerId = req.body?.viewerId || req.user?.id;
    const roomId = req.params.id;
    const now = Date.now();
    const room = await WatchParty.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
    if (!viewerId) return res.status(400).json({ message: "Thiếu viewerId" });

    const isHost = viewerId === room.hostId;
    if (room.isLive && !isHost) {
      return res.status(403).json({ message: "Phòng đang ở chế độ Live, chỉ host được chỉnh." });
    }
    if (isHost && req.user?.id !== room.hostId) {
      return res.status(403).json({ message: "Bạn cần đăng nhập bằng tài khoản host" });
    }

    const updated = await savePartyWithRetry(
      roomId,
      async (party) => {
        party.state = {
          position: Number(position) || 0,
          isPlaying: Boolean(isPlaying),
          playbackRate: Number(playbackRate) || 1,
          updatedAt: now,
        };
        party.lastActive = now;
      },
      room
    );

    if (!updated) return res.status(404).json({ message: "Phòng không tồn tại" });
    res.json(updated.state);
  })
);

router.patch(
  "/:id/settings",
  asyncHandler(async (req, res) => {
    const { isLive } = req.body || {};
    const roomId = req.params.id;
    const now = Date.now();
    const room = await WatchParty.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
    if (!req.user || req.user.id !== room.hostId) {
      return res.status(403).json({ message: "Chỉ host (đã đăng nhập) được chỉnh cài đặt" });
    }

    const updated = await savePartyWithRetry(
      roomId,
      async (party) => {
        if (typeof isLive === "boolean") {
          party.isLive = isLive;
        }
        party.lastActive = now;
      },
      room
    );

    if (!updated) return res.status(404).json({ message: "Phòng không tồn tại" });
    res.json(updated);
  })
);

router.post(
  "/:id/chat",
  asyncHandler(async (req, res) => {
    const { userName, content } = req.body || {};
    const viewerId = req.body?.viewerId || req.user?.id;
    if (!viewerId || !content) return res.status(400).json({ message: "Thiếu viewerId hoặc nội dung" });
    const now = Date.now();

    const room = await savePartyWithRetry(req.params.id, async (party) => {
      party.messages.push({
        userId: viewerId,
        userName: userName || req.user?.name || "Ẩn danh",
        content: String(content).slice(0, 500),
        createdAt: now,
      });
      party.messages = party.messages.slice(-50);
      party.lastActive = now;
    });

    if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
    res.json(room.messages);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const room = await WatchParty.findOne({ roomId: req.params.id });
    if (!room) return res.status(404).json({ message: "Phòng không tồn tại" });
    if (!req.user || req.user.id !== room.hostId) {
      return res.status(403).json({ message: "Chỉ host (đã đăng nhập) được xóa phòng" });
    }
    await WatchParty.deleteOne({ roomId: req.params.id });
    try {
      const { clearHlsCache } = await import("./hls.js");
      clearHlsCache?.();
    } catch (err) {
      console.warn("Không thể xóa cache HLS khi xóa phòng:", err?.message || err);
    }
    res.json({ message: "Đã xóa phòng" });
  })
);

router.use((err, _req, res, _next) => {
  console.error("Watch party error:", err);
  res.status(500).json({ message: "Đã có lỗi xảy ra khi xử lý phòng xem chung" });
});

export default router;
