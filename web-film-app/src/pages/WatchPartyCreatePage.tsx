import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import type { MovieDetailResponse } from "../types/api";
import { watchPartyApi } from "../lib/watchPartyApi";

export function WatchPartyCreatePage() {
  const [searchParams] = useSearchParams();
  const movieId = searchParams.get("movieId");
  const ep = searchParams.get("ep");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isLoggedIn = Boolean(user?.id);

  const { data: detailData } = useFetch<MovieDetailResponse>(
    movieId ? `/movies/${movieId}` : null,
    [movieId]
  );

  const movie = detailData?.movie;

  const [title, setTitle] = useState(
    () => searchParams.get("title") || movie?.title || "Cùng xem phim này nhé"
  );
  const [autoStart, setAutoStart] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  const posterOptions = useMemo(() => {
    const list: string[] = [];
    if (movie?.poster) list.push(movie.poster);
    if (movie?.thumbnail && movie.thumbnail !== movie.poster) list.push(movie.thumbnail);
    if (detailData?.suggestions?.length) {
      for (const sug of detailData.suggestions.slice(0, 2)) {
        if (sug.thumbnail) list.push(sug.thumbnail);
      }
    }
    return Array.from(new Set(list)).slice(0, 3);
  }, [movie?.poster, movie?.thumbnail, detailData?.suggestions]);

  const [selectedPoster, setSelectedPoster] = useState<string | undefined>(posterOptions[0]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (posterOptions.length && !selectedPoster) {
      setSelectedPoster(posterOptions[0]);
    }
  }, [posterOptions, selectedPoster]);

  const handleCreate = async () => {
    if (!movieId || !movie || !user?.id) return;
    setCreating(true);
    setCreateError(null);
    try {
      const room = await watchPartyApi.create({
        movieId,
        episodeNumber: ep ? Number(ep) : undefined,
        title: title.trim() || `Cùng xem ${movie.title}`,
        hostId: user.id,
        hostName: user?.name ?? "Ẩn danh",
        poster: selectedPoster || movie.poster || movie.thumbnail,
        autoStart,
        isLive,
        isPrivate,
        currentPosition: 0,
        participant: { userId: user.id, name: user?.name ?? "Ẩn danh" },
      });
      navigate(`/watch-party/room/${room.roomId}`);
    } catch (error) {
      console.error(error);
      const status = (error as { status?: number } | null)?.status;
      if (status === 401) {
        setCreateError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setCreating(false);
        logout();
        navigate(`/login`, {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }
      setCreateError(
        error instanceof Error
          ? error.message
          : "Tạo phòng không thành công. Vui lòng thử lại."
      );
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
        {movie ? (
          <div className="space-y-4">
            <img
              src={selectedPoster || movie.poster}
              alt={movie.title}
              className="w-full rounded-2xl object-cover"
            />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Tạo phòng xem chung</p>
              <h1 className="text-2xl font-semibold text-white">{movie.title}</h1>
              <p className="text-sm text-slate-300 line-clamp-3">{movie.synopsis}</p>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  IMDb {movie.rating}
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  {movie.year}
                </span>
                {movie.tags?.slice(0, 3).map((tag, idx) => (
                  <span key={`${tag}-${idx}`} className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-300">Đang tải thông tin phim...</p>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/30">
          <p className="text-sm font-semibold text-white">1. Tên phòng</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-primary"
            placeholder="Cùng xem phim này nhé"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/30">
          <p className="text-sm font-semibold text-white">2. Chọn poster hiển thị</p>
          <div className="mt-4 flex gap-3">
            {posterOptions.map((p, idx) => (
              <button
                key={`${p}-${idx}`}
                type="button"
                onClick={() => setSelectedPoster(p)}
                className={`overflow-hidden rounded-xl border-2 transition ${
                  selectedPoster === p ? "border-primary shadow-[0_15px_40px_rgba(255,107,107,0.35)]" : "border-transparent"
                }`}
              >
                <img src={p} className="h-28 w-20 object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/30 space-y-4">
          <p className="text-sm font-semibold text-white">3. Cài đặt phòng</p>
          <label className="flex items-center justify-between gap-3 text-sm text-white">
            <div>
              <p>Tự động bắt đầu khi chủ phòng phát</p>
              <p className="text-xs text-slate-400">Bật lên để đồng bộ ngay từ đầu.</p>
            </div>
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-white">
            <div>
              <p>Bật chế độ Live</p>
              <p className="text-xs text-slate-400">Bật: tất cả theo host. Tắt: ai nấy xem riêng.</p>
            </div>
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-white">
            <div>
              <p>Bật chế độ riêng tư</p>
              <p className="text-xs text-slate-400">Chỉ ai có link mới xem được.</p>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!movieId || creating || !isLoggedIn}
            onClick={handleCreate}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-dark shadow-[0_15px_40px_rgba(255,107,107,0.35)] transition hover:bg-primary/90 disabled:opacity-60"
          >
            {creating ? "Đang tạo..." : "Tạo phòng"}
          </button>
          <Link
            to="/watch-party"
            className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-primary/60 hover:text-primary"
          >
            Xem phòng public
          </Link>
          <Link
            to={movieId ? `/watch/${movieId}` : "/"}
            className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-primary/60 hover:text-primary"
          >
            Quay lại xem phim
          </Link>
        </div>

        {createError && (
          <p className="text-xs text-red-400">
            {createError}
          </p>
        )}

        {!isLoggedIn && (
          <p className="text-xs text-red-400">
            Bạn cần đăng nhập để tạo phòng xem chung. Vui lòng đăng nhập trước khi tiếp tục.
          </p>
        )}
      </div>
    </div>
  );
}
