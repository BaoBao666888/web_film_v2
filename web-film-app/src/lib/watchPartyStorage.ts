import type { WatchPartyMessage, WatchPartyParticipant, WatchPartyRoom } from "../types/watchParty";

const STORAGE_KEY = "watchparty.rooms";

const makeId = (len = 10) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((v) => (v % 36).toString(36))
    .join("");

export const ensureViewerId = () => {
  let viewerId = localStorage.getItem("viewerId");
  if (!viewerId) {
    viewerId =
      (crypto.randomUUID && crypto.randomUUID()) ||
      `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("viewerId", viewerId);
  }
  return viewerId;
};

const pruneParticipants = (rooms: WatchPartyRoom[]): WatchPartyRoom[] => {
  const now = Date.now();
  return rooms.map((room) => {
    const alive = room.participants.filter((p) => now - p.lastSeen < 15000);
    let hostId = room.hostId;
    let hostName = room.hostName;
    if (!alive.find((p) => p.id === hostId) && alive.length) {
      const nextHost = [...alive].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      hostId = nextHost.id;
      hostName = nextHost.name;
    }
    return { ...room, participants: alive, hostId, hostName };
  });
};

const loadRooms = (): WatchPartyRoom[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchPartyRoom[];
    return Array.isArray(parsed) ? pruneParticipants(parsed) : [];
  } catch {
    return [];
  }
};

const saveRooms = (rooms: WatchPartyRoom[]) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
};

export const watchPartyStorage = {
  listAll(): WatchPartyRoom[] {
    return loadRooms().sort((a, b) => b.lastActive - a.lastActive);
  },
  listPublic(): WatchPartyRoom[] {
    return loadRooms()
      .filter((room) => !room.isPrivate)
      .sort((a, b) => b.lastActive - a.lastActive);
  },
  getRoom(id: string): WatchPartyRoom | undefined {
    return loadRooms().find((room) => room.id === id);
  },
  createRoom(input: Omit<WatchPartyRoom, "id" | "createdAt" | "lastActive" | "messages" | "participants" | "currentPosition"> & { participants?: WatchPartyParticipant[]; currentPosition?: number }): WatchPartyRoom {
    const rooms = loadRooms();
    const room: WatchPartyRoom = {
      ...input,
      id: makeId(10),
      createdAt: Date.now(),
      lastActive: Date.now(),
      currentPosition: input.currentPosition ?? 0,
      participants: input.participants ?? [],
      messages: [],
    };
    rooms.push(room);
    saveRooms(rooms);
    return room;
  },
  updateRoom(id: string, data: Partial<WatchPartyRoom>): WatchPartyRoom | undefined {
    const rooms = loadRooms();
    const index = rooms.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    rooms[index] = { ...rooms[index], ...data, lastActive: Date.now() };
    saveRooms(rooms);
    return rooms[index];
  },
  addMessage(id: string, message: Omit<WatchPartyMessage, "id" | "createdAt">): WatchPartyRoom | undefined {
    const rooms = loadRooms();
    const index = rooms.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    const fullMessage: WatchPartyMessage = { ...message, id: makeId(8), createdAt: Date.now() };
    rooms[index].messages = [...rooms[index].messages, fullMessage].slice(-50);
    rooms[index].lastActive = Date.now();
    saveRooms(rooms);
    return rooms[index];
  },
  joinRoom(id: string, participant: WatchPartyParticipant): WatchPartyRoom | undefined {
    const rooms = loadRooms();
    const index = rooms.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    const existing = rooms[index].participants.find((p) => p.id === participant.id);
    const participants = existing
      ? rooms[index].participants.map((p) => (p.id === participant.id ? { ...p, ...participant } : p))
      : [...rooms[index].participants, participant];
    rooms[index] = { ...rooms[index], participants, lastActive: Date.now() };
    saveRooms(rooms);
    return rooms[index];
  },
  heartbeat(id: string, participantId: string): WatchPartyRoom | undefined {
    const rooms = loadRooms();
    const index = rooms.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    const participants = rooms[index].participants.map((p) =>
      p.id === participantId ? { ...p, lastSeen: Date.now() } : p
    );
    rooms[index] = { ...rooms[index], participants, lastActive: Date.now() };
    saveRooms(rooms);
    return rooms[index];
  },
  leaveRoom(id: string, participantId: string): WatchPartyRoom | undefined {
    const rooms = loadRooms();
    const index = rooms.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    const updatedParticipants = rooms[index].participants.filter((p) => p.id !== participantId);
    let hostId = rooms[index].hostId;
    let hostName = rooms[index].hostName;
    if (participantId === hostId && updatedParticipants.length) {
      const nextHost = [...updatedParticipants].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      hostId = nextHost.id;
      hostName = nextHost.name;
    }
    rooms[index] = {
      ...rooms[index],
      participants: updatedParticipants,
      hostId,
      hostName,
      lastActive: Date.now(),
    };
    saveRooms(rooms);
    return rooms[index];
  },
  deleteRoom(id: string) {
    const rooms = loadRooms().filter((r) => r.id !== id);
    saveRooms(rooms);
  },
  touch(id: string): WatchPartyRoom | undefined {
    return this.updateRoom(id, { lastActive: Date.now() });
  },
};
