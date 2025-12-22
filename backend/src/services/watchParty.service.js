import crypto from "crypto";
import mongoose from "mongoose";
import { WatchParty } from "../models/WatchParty.js";

const STALE_MS = 15000;
const MAX_SAVE_RETRIES = 3;

/**
 * Generate random ID
 */
const makeId = (len = 10) =>
  crypto.randomBytes(len).toString("hex").slice(0, len);

/**
 * Remove stale participants (haven't sent heartbeat recently)
 */
const pruneParticipants = (party) => {
  const now = Date.now();
  const participants = party.participants || [];
  const alive = participants.filter((p) => now - (p.lastSeen || 0) < STALE_MS);
  if (alive.length !== participants.length) {
    party.participants = alive;
  }
  return party;
};

/**
 * Retry saves when optimistic concurrency detects conflicts
 */
const savePartyWithRetry = async (roomId, mutator, initialRoom = null) => {
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

/**
 * WatchParty Service - Business Logic Layer
 */
class WatchPartyService {
  /**
   * Create a new watch party room
   */
  async createRoom(data) {
    const {
      movieId,
      episodeNumber,
      title,
      poster,
      hostId,
      hostName,
      isLive = false,
      isPrivate = false,
      autoStart = true,
      currentPosition = 0,
      participant,
    } = data;

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
      allowDownload: false,
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

    return created;
  }

  /**
   * Get public rooms
   */
  async getPublicRooms(limit = 100) {
    const rooms = await WatchParty.find({ isPrivate: false })
      .sort({ lastActive: -1 })
      .limit(limit);
    rooms.forEach(pruneParticipants);
    return rooms;
  }

  /**
   * Get private rooms for a specific viewer
   */
  async getPrivateRooms(viewerId, limit = 50) {
    const rooms = await WatchParty.find({
      isPrivate: true,
      $or: [{ hostId: viewerId }, { "participants.userId": viewerId }],
    })
      .sort({ lastActive: -1 })
      .limit(limit);
    rooms.forEach(pruneParticipants);
    return rooms;
  }

  /**
   * Get room by ID
   */
  async getRoomById(roomId) {
    const room = await savePartyWithRetry(roomId, async () => {});
    return room;
  }

  /**
   * Join a room
   */
  async joinRoom(roomId, viewerId, name) {
    const now = Date.now();

    const room = await savePartyWithRetry(roomId, async (party) => {
      const existing = party.participants.find((p) => p.userId === viewerId);
      if (existing) {
        existing.lastSeen = now;
        if (name) existing.name = name;
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

    return room;
  }

  /**
   * Send heartbeat to keep participant active
   */
  async heartbeat(roomId, viewerId) {
    const now = Date.now();

    const room = await savePartyWithRetry(roomId, async (party) => {
      const target = party.participants.find((p) => p.userId === viewerId);
      if (target) target.lastSeen = now;
      party.lastActive = now;
    });

    return room;
  }

  /**
   * Update playback state
   */
  async updateState(roomId, viewerId, stateData) {
    const { position, isPlaying, playbackRate } = stateData;
    const now = Date.now();
    const room = await WatchParty.findOne({ roomId });
    if (!room) return null;

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

    return updated;
  }

  /**
   * Update room settings (isLive, etc)
   */
  async updateSettings(roomId, settings) {
    const { isLive } = settings;
    const now = Date.now();
    const room = await WatchParty.findOne({ roomId });
    if (!room) return null;

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

    return updated;
  }

  /**
   * Send chat message
   */
  async sendMessage(roomId, viewerId, userName, content) {
    const now = Date.now();

    const room = await savePartyWithRetry(roomId, async (party) => {
      party.messages.push({
        userId: viewerId,
        userName: userName || "Ẩn danh",
        content: String(content).slice(0, 500),
        createdAt: now,
      });
      party.messages = party.messages.slice(-50);
      party.lastActive = now;
    });

    return room;
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId) {
    const room = await WatchParty.findOne({ roomId });
    if (!room) return null;

    await WatchParty.deleteOne({ roomId });

    // Clear HLS cache if available
    try {
      const { clearHlsCache } = await import("../routes/hls.js");
      clearHlsCache?.();
    } catch (err) {
      console.warn(
        "Không thể xóa cache HLS khi xóa phòng:",
        err?.message || err
      );
    }

    return room;
  }

  /**
   * Check if viewer is host
   */
  isHost(room, viewerId) {
    return room && viewerId === room.hostId;
  }

  /**
   * Check authorization for state updates
   */
  canUpdateState(room, viewerId, isAuthenticated = false) {
    if (!room) return false;
    const isHost = this.isHost(room, viewerId);

    // If room is in live mode, only host can update
    if (room.isLive && !isHost) {
      return false;
    }

    // Host must be authenticated to update
    if (isHost && !isAuthenticated) {
      return false;
    }

    return true;
  }

  /**
   * Check authorization for settings updates
   */
  canUpdateSettings(room, userId) {
    return room && userId && userId === room.hostId;
  }

  /**
   * Check authorization for room deletion
   */
  canDeleteRoom(room, userId) {
    return room && userId && userId === room.hostId;
  }
}

export default new WatchPartyService();
