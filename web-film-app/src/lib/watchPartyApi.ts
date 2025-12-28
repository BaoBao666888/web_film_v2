import { apiFetch } from "./api";
import type { WatchPartyRoom, WatchPartyMessage } from "../types/watchParty";

export const watchPartyApi = {
  create: (payload: {
    movieId: string;
    episodeNumber?: number;
    title: string;
    poster?: string;
    hostId?: string;
    hostName?: string;
    isLive?: boolean;
    isPrivate?: boolean;
    autoStart?: boolean;
    currentPosition?: number;
    participant?: { userId: string; name: string };
  }) => apiFetch<WatchPartyRoom>("/watch-party", { method: "POST", body: JSON.stringify(payload) }),
  listPublic: () => apiFetch<WatchPartyRoom[]>("/watch-party/public"),
  listPrivate: (viewerId: string) =>
    apiFetch<WatchPartyRoom[]>(`/watch-party/private?viewerId=${encodeURIComponent(viewerId)}`),
  get: (roomId: string) => apiFetch<WatchPartyRoom>(`/watch-party/${roomId}`),
  join: (roomId: string, viewerId: string, name?: string) =>
    apiFetch<WatchPartyRoom>(`/watch-party/${roomId}/join`, {
      method: "POST",
      body: JSON.stringify({ viewerId, name }),
    }),
  heartbeat: (roomId: string, viewerId: string) =>
    apiFetch<WatchPartyRoom>(`/watch-party/${roomId}/heartbeat`, {
      method: "POST",
      body: JSON.stringify({ viewerId }),
    }),
  updateState: (roomId: string, payload: { viewerId: string; position: number; isPlaying: boolean; playbackRate: number }) =>
    apiFetch(`/watch-party/${roomId}/state`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  chat: (
    roomId: string,
    payload: { viewerId: string; userName?: string; content: string; position?: number }
  ) =>
    apiFetch<WatchPartyMessage[]>(`/watch-party/${roomId}/chat`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSettings: (roomId: string, payload: { viewerId: string; isLive?: boolean }) =>
    apiFetch<WatchPartyRoom>(`/watch-party/${roomId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  delete: (roomId: string, viewerId: string) =>
    apiFetch(`/watch-party/${roomId}`, {
      method: "DELETE",
      body: JSON.stringify({ viewerId }),
    }),
};
