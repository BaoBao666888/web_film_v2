import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { featuredMovies } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import { api } from "../lib/api";
import type { ProfileResponse } from "../types/api";

export function ProfilePage() {
  const { user: authUser } = useAuth();
  const { data, loading, error, refetch } = useFetch<ProfileResponse>(
    authUser?.id ? `/auth/profile/${authUser.id}` : null
  );
  const [deletingHistory, setDeletingHistory] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);

  const handleDeleteHistory = async (historyId: string) => {
    if (!authUser) return;
    setDeletingHistory(historyId);
    try {
      await api.history.remove(historyId);
      refetch();
    } catch (error) {
      console.error("Không thể xóa lịch sử:", error);
    } finally {
      setDeletingHistory(null);
    }
  };

  const handleClearHistory = async () => {
    if (!authUser || !confirm("Bạn có chắc muốn xóa toàn bộ lịch sử xem?"))
      return;
    setClearingHistory(true);
    try {
      await api.history.clear();
      refetch();
    } catch (error) {
      console.error("Không thể xóa toàn bộ lịch sử:", error);
    } finally {
      setClearingHistory(false);
    }
  };

  const user = data?.user || authUser;
  const favorites = data?.favorites?.length ? data.favorites : featuredMovies;
  const history = data?.history ?? [];

  // Nếu chưa đăng nhập, redirect về login
  if (!authUser) {
    return (
      <div className="rounded-3xl border border-orange-400/30 bg-orange-500/10 p-10 text-center">
        <p className="text-orange-200 mb-4">Bạn cần đăng nhập để xem hồ sơ</p>
        <Link
          to="/login"
          className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p>Đang tải hồ sơ…</p>;
  }

  if (error) {
    return <p className="text-red-400">Không tải được hồ sơ: {error}</p>;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Hồ sơ của ${user?.name}`}
        description="Thông tin cá nhân, phim yêu thích và lịch sử xem từ API."
        actions={
          <Link
            to="/logout"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
          >
            Đăng xuất
          </Link>
        }
      />

      <section className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        {/* THÔNG TIN USER */}
        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl text-primary">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="grid gap-3 text-xs text-slate-300">
            <p>
              • Thành viên từ: <span className="text-white">03/2023</span>
            </p>
            <p>
              • Gói sử dụng: <span className="text-primary">Premium AI</span>
            </p>
            <p>• Mood yêu thích: Khoa học viễn tưởng, Lãng mạn</p>
          </div>
        </div>

        {/* PHIM YÊU THÍCH & LỊCH SỬ */}
        <div className="space-y-5">
          {/* FAVORITES */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <p className="text-sm font-semibold text-white">Phim yêu thích</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {favorites.map((movie) => {
                const posterSrc =
                  "poster" in movie &&
                  typeof (movie as { poster?: string }).poster === "string"
                    ? (movie as { poster?: string }).poster
                    : movie.thumbnail;

                return (
                  <Link
                    key={movie.id}
                    to={`/movie/${movie.id}`}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-dark/60 p-3 transition hover:border-primary/80"
                  >
                    <img
                      src={posterSrc}
                      alt={movie.title}
                      className="h-20 w-16 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {movie.title}
                      </p>
                      <p className="text-xs text-slate-300">
                        {movie.tags?.join(" • ")}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Rating gần nhất: 4.{Math.floor(Math.random() * 3 + 2)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* HISTORY */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Lịch sử xem gần đây
              </p>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  disabled={clearingHistory}
                  className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {clearingHistory ? "Đang xóa..." : "Xóa tất cả"}
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-300">
              {history.length === 0 && (
                <p className="text-slate-500">
                  Chưa có lịch sử. Xem phim để hệ thống ghi nhận nhé!
                </p>
              )}

              {history.map((item) => (
                <div
                  key={`history-${item.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-dark/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-white">
                        {item.title ?? "Không xác định"}
                      </span>
                      <span className="text-xs text-slate-500">
                        Đã xem:{" "}
                        {item.lastWatchedAt
                          ? new Date(item.lastWatchedAt).toLocaleDateString(
                              "vi-VN"
                            )
                          : "Gần đây"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/watch/${item.movieId}`}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-dark transition hover:bg-primary/90"
                    >
                      Xem lại
                    </Link>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      disabled={deletingHistory === item.id}
                      className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingHistory === item.id ? "Xóa..." : "×"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
