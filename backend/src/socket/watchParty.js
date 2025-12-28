import mongoose from "mongoose";
import { WatchParty } from "../models/WatchParty.js";

const STALE_MS = 15000;
const MAX_SAVE_RETRIES = 3;

const pruneParticipants = (party) => {
  const now = Date.now();
  const participants = party.participants || [];
  const alive = participants.filter((p) => now - (p.lastSeen || 0) < STALE_MS);
  if (alive.length !== participants.length) {
    party.participants = alive;
  }
  return party;
};

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
        room = null;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

export const registerWatchPartySocket = (io) => {
  const sockets = new Map(); // socketId -> { roomId, viewerId }

  io.on("connection", (socket) => {
    const cleanup = async () => {
      const info = sockets.get(socket.id);
      sockets.delete(socket.id);
      if (!info?.roomId || !info?.viewerId) return;
      const { roomId, viewerId } = info;
      const room = await savePartyWithRetry(roomId, async (party) => {
        party.participants = (party.participants || []).filter((p) => p.userId !== viewerId);
        party.lastActive = Date.now();
      });
      if (room) {
        io.to(roomId).emit("watch-party:participants", room.participants);
      }
    };

    socket.on("watch-party:join", async ({ roomId, viewerId, name }) => {
      if (!roomId || !viewerId) {
        socket.emit("watch-party:error", { message: "Thiếu roomId hoặc viewerId" });
        return;
      }

      // Remove any existing mapping of same viewer to keep counts correct
      for (const [sid, info] of sockets.entries()) {
        if (sid !== socket.id && info.viewerId === viewerId && info.roomId === roomId) {
          sockets.delete(sid);
          io.sockets.sockets.get(sid)?.leave?.(roomId);
        }
      }

      const now = Date.now();
      const room = await savePartyWithRetry(roomId, async (party) => {
        const existing = (party.participants || []).find((p) => p.userId === viewerId);
        if (existing) {
          existing.lastSeen = now;
          existing.name = name || existing.name;
        } else {
          party.participants.push({
            userId: viewerId,
            name: name || "Khách",
            joinedAt: now,
            lastSeen: now,
          });
        }
        party.lastActive = now;
      });

      if (!room) {
        socket.emit("watch-party:error", { message: "Phòng không tồn tại" });
        return;
      }

      sockets.set(socket.id, { roomId, viewerId });
      socket.join(roomId);
      socket.emit("watch-party:joined", room);
      io.to(roomId).emit("watch-party:participants", room.participants);
    });

    socket.on("watch-party:state", async (payload = {}) => {
      const { roomId, viewerId, position, isPlaying, playbackRate } = payload;
      if (!roomId || !viewerId) return;
      const now = Date.now();
      const room = await WatchParty.findOne({ roomId });
      if (!room) {
        socket.emit("watch-party:error", { message: "Phòng không tồn tại" });
        return;
      }
      const isHost = viewerId === room.hostId;
      if (room.isLive && !isHost) {
        socket.emit("watch-party:error", { message: "Phòng đang ở chế độ Live, chỉ host được điều khiển." });
        return;
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

      if (!updated) return;
      const state = updated.state || {};
      const targetPayload = { roomId, state };
      if (updated.isLive) {
        io.to(roomId).emit("watch-party:state", targetPayload);
      } else {
        // free mode: chỉ lưu trạng thái để khách tự kéo khi cần
        socket.emit("watch-party:state", targetPayload);
      }
    });

    socket.on("watch-party:sync-request", async ({ roomId }) => {
      if (!roomId) return;
      const room = await WatchParty.findOne({ roomId });
      if (!room) {
        socket.emit("watch-party:error", { message: "Phòng không tồn tại" });
        return;
      }
      pruneParticipants(room);
      socket.emit("watch-party:state", { roomId, state: room.state, isLive: room.isLive, hostId: room.hostId });
      socket.emit("watch-party:participants", room.participants);
    });

    socket.on("watch-party:heartbeat", async ({ roomId, viewerId }) => {
      if (!roomId || !viewerId) return;
      const room = await savePartyWithRetry(roomId, async (party) => {
        const target = (party.participants || []).find((p) => p.userId === viewerId);
        if (target) {
          target.lastSeen = Date.now();
        }
        party.lastActive = Date.now();
      });
      if (room) {
        io.to(roomId).emit("watch-party:participants", room.participants);
      }
    });

    socket.on("watch-party:live-toggle", async ({ roomId, viewerId, isLive }) => {
      if (!roomId || !viewerId) return;
      const room = await WatchParty.findOne({ roomId });
      if (!room) return;
      if (room.hostId !== viewerId) {
        socket.emit("watch-party:error", { message: "Chỉ host được bật chế độ Live." });
        return;
      }
      const updated = await savePartyWithRetry(
        roomId,
        async (party) => {
          party.isLive = Boolean(isLive);
          party.lastActive = Date.now();
        },
        room
      );
      if (updated) {
        io.to(roomId).emit("watch-party:live", { roomId, isLive: updated.isLive });
      }
    });

    socket.on(
      "watch-party:chat",
      async ({ roomId, viewerId, userName, content, position }) => {
      if (!roomId || !viewerId || !content) return;
      const now = Date.now();
      const room = await savePartyWithRetry(roomId, async (party) => {
        party.messages.push({
          userId: viewerId,
          userName: userName || "Ẩn danh",
          content: String(content).slice(0, 500),
          position: Number.isFinite(Number(position)) ? Number(position) : undefined,
          createdAt: now,
        });
        party.messages = party.messages.slice(-50);
        party.lastActive = now;
      });
      if (room) {
        io.to(roomId).emit("watch-party:messages", room.messages);
      }
    });

    socket.on("disconnect", () => {
      void cleanup();
    });
  });
};
