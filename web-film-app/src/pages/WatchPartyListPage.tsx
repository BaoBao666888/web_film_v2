import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ensureViewerId } from "../lib/watchPartyStorage";
import { watchPartyApi } from "../lib/watchPartyApi";
import type { WatchPartyRoom } from "../types/watchParty";

export function WatchPartyListPage() {
  const [rooms, setRooms] = useState<WatchPartyRoom[]>([]);
  const [privateRooms, setPrivateRooms] = useState<WatchPartyRoom[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const viewerId = ensureViewerId();

  const refresh = async () => {
    try {
      setRooms(await watchPartyApi.listPublic());
    } catch (error) {
      console.error(error);
    }
  };
  const refreshPrivate = () => {
    watchPartyApi
      .listPrivate(viewerId)
      .then(setPrivateRooms)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    refresh();
    refreshPrivate();
    const timer = setInterval(() => {
      refresh();
      refreshPrivate();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Phòng xem chung</p>
          <h1 className="text-2xl font-semibold text-white">Phòng public đang mở</h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-[0_15px_40px_rgba(255,107,107,0.35)] transition hover:bg-primary/90"
          >
            Tạo phòng mới
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary/60 hover:text-primary"
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Link
            key={room.roomId}
            to={`/watch-party/room/${room.roomId}`}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-primary/50"
          >
            <div className="relative h-44 w-full overflow-hidden">
              <img src={room.poster} alt={room.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
              <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Public • {room.participants.length} người xem
              </div>
            </div>
            <div className="space-y-1 p-4">
              <p className="text-sm font-semibold text-white line-clamp-2">{room.title}</p>
              <p className="text-xs text-slate-400">Chủ phòng: {room.hostName}</p>
              <div className="flex flex-wrap gap-2 text-[11px] text-white/80">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Auto start: {room.autoStart ? "On" : "Off"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Live: {room.isLive ? "On" : "Off"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!rooms.length && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          Chưa có phòng public. Hãy là người đầu tiên tạo phòng mới!
        </div>
      )}

      {privateRooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Phòng riêng của bạn</h2>
            <p className="text-xs text-slate-400">Chỉ hiển thị trên thiết bị này</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {privateRooms.map((room) => (
              <Link
                key={`private-${room.roomId}`}
                to={`/watch-party/room/${room.roomId}`}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-1 hover:border-primary/60"
              >
                <img src={room.poster} alt={room.title} className="h-16 w-16 rounded-xl object-cover" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white line-clamp-2">{room.title}</p>
                  <p className="text-[11px] text-slate-400">
                    Chủ phòng: {room.hostName} • Người xem: {room.participants.length}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-3xl space-y-6 rounded-2xl border border-white/10 bg-dark p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Tạo phòng xem chung</h2>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-white hover:border-primary hover:text-primary"
              >
                Đóng
              </button>
            </div>
            <ol className="space-y-3 text-sm text-slate-200">
              <li className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-semibold text-primary">Bước 1:</span> Tìm phim tại trang tìm kiếm hoặc vào trang phim bạn muốn xem chung.
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-semibold text-primary">Bước 2:</span> Nhấn nút <b>Xem chung</b> dưới trình phát để mở form tạo phòng, chọn poster và cài đặt quyền điều khiển/tải.
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-semibold text-primary">Bước 3:</span> Tùy chọn bật private nếu chỉ muốn chia sẻ qua link (phòng private không hiện ở danh sách này).
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-semibold text-primary">Bước 4:</span> Tạo phòng và chia link cho bạn bè. Người không đăng ký vẫn xem được nhưng phải đăng nhập để chat.
              </li>
            </ol>
            <div className="flex gap-3">
              <Link
                to="/search"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-[0_15px_40px_rgba(255,107,107,0.35)] transition hover:bg-primary/90"
              >
                Tới trang tìm kiếm
              </Link>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:border-primary/60 hover:text-primary"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
