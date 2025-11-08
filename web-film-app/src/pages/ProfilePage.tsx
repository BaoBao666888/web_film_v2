import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { featuredMovies } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import type { ProfileResponse } from "../types/api";

const DEFAULT_USER_ID = "demo-user";

export function ProfilePage() {
  const { data, loading, error } = useFetch<ProfileResponse>(
    `/auth/profile/${DEFAULT_USER_ID}`
  );
  const user = data?.user;
  const favorites = data?.favorites?.length ? data.favorites : featuredMovies;
  const history = data?.history ?? [];

  if (loading) {
    return <p>Đang tải hồ sơ…</p>;
  }

  if (error) {
    return <p className="text-red-400">Không tải được hồ sơ: {error}</p>;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Hồ sơ của ${user?.name ?? "Minh Anh"}`}
        description="Thông tin cá nhân, phim yêu thích và lịch sử xem lấy từ API auth."
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
                {user?.name?.slice(0, 2).toUpperCase() ?? "MA"}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-white">
                {user?.name ?? "Minh Anh"}
              </p>
              <p className="text-xs text-slate-400">
                {user?.email ?? "minhanh@example.com"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 text-xs text-slate-300">
            <p>
              • Thành viên từ:{" "}
              <span className="text-white">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("vi-VN")
                  : "03/2023"}
              </span>
            </p>
            <p>
              • Gói sử dụng: <span className="text-primary">Premium AI</span>
            </p>
            <p>• Mood yêu thích: Khoa học viễn tưởng, Lãng mạn</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs text-slate-200">
            <p className="font-semibold text-white">Ghi chú triển khai</p>
            <p className="mt-2">
              - Khi hoàn tất auth, token sẽ lấy từ context thay vì default user.
            </p>
            <p className="mt-1">- Thêm khả năng chỉnh sửa avatar, mật khẩu.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <p className="text-sm font-semibold text-white">Phim yêu thích</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {favorites.map((movie) => {
                const posterSrc =
                  "poster" in movie && typeof (movie as { poster?: string }).poster === "string"
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

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <p className="text-sm font-semibold text-white">Lịch sử xem gần đây</p>
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
                  <span>{item.title}</span>
                  <span className="text-slate-500">
                    Đã xem:{" "}
                    {item.lastWatchedAt
                      ? new Date(item.lastWatchedAt).toLocaleDateString("vi-VN")
                      : "Gần đây"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
