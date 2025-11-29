import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CinemaPlayer } from "../components/player/CinemaPlayer";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { watchPartyApi } from "../lib/watchPartyApi";
import type { WatchResponse } from "../types/api";
import type { WatchPartyMessage, WatchPartyParticipant, WatchPartyRoom } from "../types/watchParty";
import { ensureViewerId } from "../lib/watchPartyStorage";

export function WatchPartyRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const joinedRef = useRef(false);
  const [room, setRoom] = useState<WatchPartyRoom | undefined>(undefined);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!roomId) return;
      try {
        const data = await watchPartyApi.get(roomId);
        setRoom(data);
      } catch (error) {
        const seed = new URLSearchParams(location.search).get("seed");
        if (seed) {
          try {
            const decoded = JSON.parse(atob(seed)) as { movieId: string; title: string };
            if (decoded?.movieId) {
              const created = await watchPartyApi.create({
                movieId: decoded.movieId,
                episodeNumber: decoded.episodeNumber,
                title: decoded.title ?? "Phòng xem chung",
                hostId: decoded.hostId ?? ensureViewerId(),
                hostName: decoded.hostName ?? "Host",
                poster: decoded.poster,
                autoStart: decoded.autoStart ?? true,
                allowViewerControl: decoded.allowViewerControl ?? false,
                allowDownload: decoded.allowDownload ?? false,
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
  }, [roomId, location.search]);

  const { data: watchData } = useFetch<WatchResponse>(
    room?.movieId ? `/movies/${room.movieId}/watch${room.episodeNumber ? `?ep=${room.episodeNumber}` : ""}` : null,
    [room?.movieId, room?.episodeNumber]
  );
  const viewerIdRef = useRef<string | null>(null);

  useEffect(() => {
    viewerIdRef.current = ensureViewerId();
  }, []);

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

  const isHost = (user?.id && user.id === room.hostId) || (!room.hostId && user?.name === room.hostName);
  const controlsEnabled = isHost || room.allowViewerControl;

  const sendMessage = () => {
    if (!viewerIdRef.current) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    watchPartyApi
      .chat(room.roomId, {
        viewerId: viewerIdRef.current,
        userName: user?.name ?? "Ẩn danh",
        content: trimmed,
      })
      .then((messages) => {
        setRoom((prev) => (prev ? { ...prev, messages } : prev));
        setMessage("");
      })
      .catch((err) => console.error(err));
  };

  const handleToggleAllowControl = () => {
    if (!isHost) return;
    watchPartyApi
      .updateSettings(room.roomId, {
        viewerId: viewerIdRef.current || "",
        allowViewerControl: !room.allowViewerControl,
      })
      .then((updated) => setRoom(updated))
      .catch((err) => console.error(err));
  };

  const handleToggleDownload = () => {
    if (!isHost) return;
    watchPartyApi
      .updateSettings(room.roomId, {
        viewerId: viewerIdRef.current || "",
        allowDownload: !room.allowDownload,
      })
      .then((updated) => setRoom(updated))
      .catch((err) => console.error(err));
  };

  const handleDeleteRoom = () => {
    if (!isHost) return;
    if (!viewerIdRef.current) return;
    watchPartyApi
      .delete(room.roomId, viewerIdRef.current)
      .then(() => navigate("/watch-party"))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (!roomId || !viewerIdRef.current) return;
    const joinAndPoll = async () => {
      try {
        const joined = await watchPartyApi.join(roomId, viewerIdRef.current!, user?.name ?? "Khách");
        setRoom(joined);
        joinedRef.current = true;
      } catch (err) {
        console.error(err);
      }
    };
    void joinAndPoll();
    const interval = setInterval(async () => {
      try {
        const updated = await watchPartyApi.heartbeat(roomId, viewerIdRef.current!);
        setRoom(updated);
      } catch (err) {
        console.error(err);
      }
    }, 5000);
    return () => {
      clearInterval(interval);
      joinedRef.current = false;
    };
  }, [roomId, user?.name]);

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
              LIVE
            </div>
            <CinemaPlayer
              stream={streamSource}
              title={room.title}
              poster={room.poster}
              controlsEnabled={controlsEnabled}
              lockMessage="Chủ phòng đang khóa điều khiển."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-white/5 bg-black/50 px-4 py-3 text-xs text-white/80">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Tự động bắt đầu: {room.autoStart ? "Có" : "Không"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Viewer control: {room.allowViewerControl ? "On" : "Off"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Cho tải: {room.allowDownload ? "On" : "Off"}
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
              <p>Cho phép người xem điều khiển</p>
              <p className="text-xs text-slate-400">Play/pause, tua, tốc độ</p>
            </div>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={room.allowViewerControl}
              onChange={handleToggleAllowControl}
              className="h-5 w-5 accent-primary disabled:opacity-50"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
            <div>
              <p>Cho tải video</p>
              <p className="text-xs text-slate-400">Hạn chế khi cần</p>
            </div>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={room.allowDownload}
              onChange={handleToggleDownload}
              className="h-5 w-5 accent-primary disabled:opacity-50"
            />
          </label>
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
