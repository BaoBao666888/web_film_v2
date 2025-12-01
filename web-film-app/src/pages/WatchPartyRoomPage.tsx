import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { CinemaPlayer } from "../components/player/CinemaPlayer";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { watchPartyApi } from "../lib/watchPartyApi";
import { API_BASE_URL } from "../lib/api";
import type { WatchResponse } from "../types/api";
import type { WatchPartyMessage, WatchPartyRoom } from "../types/watchParty";
// no-op import removed

type WatchPartySeed = Partial<
  Pick<
    WatchPartyRoom,
    | "episodeNumber"
    | "title"
    | "poster"
    | "autoStart"
    | "isLive"
    | "isPrivate"
  >
> & { movieId: string };

type SyncedState = {
  position: number;
  isPlaying: boolean;
  playbackRate: number;
  updatedAt: number;
};

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const normalizeState = (state?: Partial<SyncedState> | null): SyncedState | null => {
  if (!state) return null;
  return {
    position: Number(state.position) || 0,
    isPlaying: Boolean(state.isPlaying),
    playbackRate: Number(state.playbackRate) || 1,
    updatedAt: Number(state.updatedAt) || Date.now(),
  };
};

export function WatchPartyRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [room, setRoom] = useState<WatchPartyRoom | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [appliedState, setAppliedState] = useState<SyncedState | null>(null);
  const [hostInitialState, setHostInitialState] = useState<SyncedState | null>(null);
  const [miniChatOpen, setMiniChatOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const latestHostStateRef = useRef<SyncedState | null>(null);
  const roomRef = useRef<WatchPartyRoom | undefined>(undefined);
  const lastMsgIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!roomId) return;
      try {
        const data = await watchPartyApi.get(roomId);
        setRoom(data);
      } catch (error) {
        const seed = new URLSearchParams(location.search).get("seed");
        if (seed && user?.id) {
          try {
            const decoded = JSON.parse(atob(seed)) as WatchPartySeed;
            if (decoded?.movieId) {
              const created = await watchPartyApi.create({
                movieId: decoded.movieId,
                episodeNumber: decoded.episodeNumber,
                title: decoded.title ?? "Phòng xem chung",
                poster: decoded.poster,
                autoStart: decoded.autoStart ?? true,
                isLive: decoded.isLive ?? false,
                isPrivate: decoded.isPrivate ?? false,
                currentPosition: 0,
              });
              setRoom(created);
              return;
            }
          } catch (e) {
            console.error("Invalid seed", e);
          }
        }
        setRoom(undefined);
      }
    };
    void load();
  }, [roomId, location.search, user?.id, user?.name]);

  const { data: watchData } = useFetch<WatchResponse>(
    room?.movieId ? `/movies/${room.movieId}/watch${room.episodeNumber ? `?ep=${room.episodeNumber}` : ""}` : null,
    [room?.movieId, room?.episodeNumber]
  );
  const viewerIdRef = useRef<string | null>(null);

  const resolveViewerId = (userId?: string | null) => {
    if (userId) {
      localStorage.setItem("viewerId", userId);
      return userId;
    }
    const stored = localStorage.getItem("viewerId") || "";
    if (!stored || stored.startsWith("user")) {
      const fresh = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("viewerId", fresh);
      return fresh;
    }
    return stored;
  };

  const playMentionSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    viewerIdRef.current = resolveViewerId(user?.id);
  }, [user?.id]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const streamSource = useMemo(() => {
    if (watchData?.stream?.url) return watchData.stream;
    if (watchData?.videoUrl) {
      const kind =
        watchData.playbackType ??
        (watchData.videoUrl.toLowerCase().includes(".m3u8") ? "hls" : "mp4");

      return {
        type: kind,
        url: watchData.videoUrl,
        headers: watchData.videoHeaders ?? {},
      };
    }
    return null;
  }, [watchData]);

  useEffect(() => {
    if (!roomId || !viewerIdRef.current) return;
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    const joinPayload = { roomId, viewerId: viewerIdRef.current, name: user?.name ?? "Khách" };

    socket.on("connect", () => {
      socket.emit("watch-party:join", joinPayload);
      socket.emit("watch-party:sync-request", { roomId });
    });

    socket.on("watch-party:joined", (data: WatchPartyRoom) => {
      setRoom(data);
      const normalized = normalizeState(data.state as SyncedState | undefined);
      if (normalized) {
        latestHostStateRef.current = normalized;
        if (viewerIdRef.current === data.hostId) {
          setHostInitialState(normalized);
        } else if (data.isLive || !data.state?.isPlaying) {
          // nếu host đang pause, áp state ngay để khách không auto play
          setAppliedState(normalized);
        }
      }
    });

    socket.on("watch-party:participants", (participants) => {
      setRoom((prev) => (prev ? { ...prev, participants } : prev));
    });

    socket.on("watch-party:state", ({ state }) => {
      const normalized = normalizeState(state as SyncedState | undefined);
      if (!normalized) return;
      latestHostStateRef.current = normalized;
      const currentRoom = roomRef.current;
      const shouldFollow = currentRoom?.isLive && viewerIdRef.current !== currentRoom?.hostId;
      if (shouldFollow) {
        setAppliedState(normalized);
      }
    });

    socket.on("watch-party:live", ({ isLive }) => {
      setRoom((prev) => (prev ? { ...prev, isLive } : prev));
    });

    socket.on("watch-party:messages", (messages) => {
      setRoom((prev) => (prev ? { ...prev, messages } : prev));
      const latest = messages[messages.length - 1];
      if (latest && latest.createdAt !== lastMsgIdRef.current && latest.userId !== viewerIdRef.current) {
        const mentionTarget = user?.name?.trim()?.toLowerCase();
        const content = (latest.content || "").toLowerCase();
        if ((mentionTarget && content.includes(`@${mentionTarget}`)) || content.includes("@all")) {
          playMentionSound();
        }
        lastMsgIdRef.current = latest.createdAt;
      }
    });

    socket.on("watch-party:error", (err) => {
      console.error("Watch party socket error", err);
    });

    const hb = setInterval(() => {
      if (!roomId || !viewerIdRef.current) return;
      socket.emit("watch-party:heartbeat", { roomId, viewerId: viewerIdRef.current });
    }, 8000);

    return () => {
      clearInterval(hb);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, user?.name, user?.id]);

  const isHost = room ? viewerIdRef.current === room.hostId : false;
  const controlsEnabled = !room?.isLive || isHost;

  const sendMessage = () => {
    if (!viewerIdRef.current) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    socketRef.current?.emit("watch-party:chat", {
      roomId,
      viewerId: viewerIdRef.current,
      userName: user?.name ?? "Ẩn danh",
      content: trimmed,
    });
    setMessage("");
  };

  const handleToggleLive = () => {
    if (!isHost || !roomId || !room) return;
    const next = !room.isLive;
    setRoom((prev) => (prev ? { ...prev, isLive: next } : prev));
    socketRef.current?.emit("watch-party:live-toggle", {
      roomId,
      viewerId: viewerIdRef.current,
      isLive: next,
    });
  };

  const handleDeleteRoom = () => {
    if (!isHost || !room) return;
    if (!viewerIdRef.current) return;
    watchPartyApi
      .delete(room.roomId, viewerIdRef.current)
      .then(() => navigate("/watch-party"))
      .catch((err) => console.error(err));
  };

  const handleSyncNow = () => {
    if (!roomId || !room) return;
    const state = normalizeState(latestHostStateRef.current || (room.state as SyncedState | undefined));
    if (state) {
      setAppliedState(state);
    }
    socketRef.current?.emit("watch-party:sync-request", { roomId });
  };

  const pushState = (state: SyncedState) => {
    if (!isHost || !roomId || !viewerIdRef.current || !room) return;
    const normalized = normalizeState(state);
    if (!normalized) return;
    socketRef.current?.emit("watch-party:state", {
      ...normalized,
      roomId,
      viewerId: viewerIdRef.current,
    });
    latestHostStateRef.current = normalized;
  };

  useEffect(() => {
    if (room?.isLive && !isHost) {
      handleSyncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.isLive, isHost]);

  useEffect(() => {
    if (isHost && hostInitialState) {
      const timer = setTimeout(() => setHostInitialState(null), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isHost, hostInitialState]);

  const liveBadge = room?.isLive ? "LIVE" : "FREE";
  const externalState = room ? (isHost ? hostInitialState : appliedState) : null;

  const chatMessages = room?.messages || [];
  const chatOverlay = (
    <div className="text-sm text-white">
      <button
        type="button"
        onClick={() => setMiniChatOpen((v) => !v)}
        className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-black/40 hover:bg-black/80"
      >
        {miniChatOpen ? "Ẩn chat" : "Chat"}
      </button>
      {miniChatOpen && (
        <div className="mt-2 w-80 max-w-[80vw] rounded-2xl border border-white/15 bg-black/70 p-3 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/70">
            <span>Chat phòng</span>
            <span>{chatMessages.length} tin</span>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {chatMessages.length === 0 && <p className="text-xs text-slate-400">Chưa có tin nhắn.</p>}
            {chatMessages.slice(-30).map((msg) => (
              <div
                key={`${msg.userId}-${msg.createdAt}-overlay`}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-white"
              >
                <p className="font-semibold text-primary">{msg.userName}</p>
                <p className="text-white/85">
                  {msg.content.split(/(\s+)/).map((part, idx) =>
                    part.startsWith("@") ? (
                      <span key={idx} className="text-amber-300 font-semibold">
                        {part}
                      </span>
                    ) : (
                      <span key={idx}>{part}</span>
                    )
                  )}
                </p>
              </div>
            ))}
          </div>
          {user?.id ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhắn tin..."
                className="flex-1 rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none"
                maxLength={200}
              />
              <button
                type="button"
                onClick={sendMessage}
                className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-dark hover:bg-primary/90"
              >
                Gửi
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-slate-400">Đăng nhập để chat.</p>
          )}
        </div>
      )}
    </div>
  );

  if (!room) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
        Phòng này không tồn tại hoặc đã bị xóa.{" "}
        <Link to="/watch-party" className="text-primary">
          Quay lại danh sách phòng
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Live room</p>
            <h1 className="text-xl font-semibold text-white line-clamp-2">{room.title}</h1>
            <p className="text-xs text-slate-400">
              Chủ phòng: {room.hostName} • Người xem: {room.participants.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white transition hover:border-primary/60 hover:text-primary"
              onClick={() => navigate(-1)}
            >
              Quay lại
            </button>
            <Link
              to="/watch-party"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white transition hover:border-primary/60 hover:text-primary"
            >
              Danh sách phòng
            </Link>
            {isHost && (
              <button
                type="button"
                onClick={handleDeleteRoom}
                className="rounded-full border border-red-400/50 bg-red-500/10 px-3 py-1 text-white transition hover:bg-red-500/20"
              >
                Xóa phòng
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/60 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <div className="relative p-3">
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-[11px] font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
              {liveBadge}
            </div>
            <CinemaPlayer
              stream={streamSource}
              title={room.title}
              poster={room.poster}
              controlsEnabled={controlsEnabled}
              externalState={externalState}
              onStatePush={pushState}
              chatSlot={chatOverlay}
              lockMessage="Chủ phòng đang khóa điều khiển."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/5 bg-black/50 px-4 py-3 text-xs text-white/80">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Tự động bắt đầu: {room.autoStart ? "Có" : "Không"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Chế độ Live: {room.isLive ? "On (đồng bộ theo host)" : "Off (tự do)"}
            </span>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Tùy chỉnh</h3>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white/70">
            {isHost ? "Bạn là host" : "Chế độ khách"}
          </span>
        </div>
        <div className="space-y-3 text-sm text-white">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
            <div>
              <p>Chế độ Live</p>
              <p className="text-xs text-slate-400">
                Bật: mọi người theo host. Tắt: ai nấy xem riêng, không ảnh hưởng nhau.
              </p>
            </div>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={room.isLive}
              onChange={handleToggleLive}
              className="h-5 w-5 accent-primary disabled:opacity-50"
            />
          </label>
          {!isHost && (
            <button
              type="button"
              onClick={handleSyncNow}
              className="w-full rounded-xl border border-primary/60 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
            >
              Đồng bộ với host
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Chat</h3>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
          {room.messages.length === 0 && (
            <p className="text-xs text-slate-400">Chưa có tin nhắn nào.</p>
          )}
          {room.messages.map((msg: WatchPartyMessage) => (
            <div
              key={`${msg.userId}-${msg.createdAt}`}
              className="rounded-xl border border-white/5 bg-white/5 p-2 text-xs text-white"
            >
              <p className="font-semibold text-primary">{msg.userName}</p>
              <p className="text-white/80">{msg.content}</p>
            </div>
          ))}
        </div>

        {user?.id ? (
          <div className="flex items-center gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Chat gì đó"
              className="flex-1 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              maxLength={200}
            />
            <button
              type="button"
              onClick={sendMessage}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark transition hover:bg-primary/90"
            >
              Gửi
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Bạn cần đăng nhập để chat. Người chưa đăng ký vẫn xem được phòng.
          </p>
        )}
      </aside>
    </div>
  );
}
