import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { aiPlaylists, featuredMovies } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import type { RecommendationResponse } from "../types/api";

export function RecommendPage() {
  // LẤY USER ĐANG ĐĂNG NHẬP (tùy bạn lưu ở đâu – ví dụ localStorage)
  const storedUser = localStorage.getItem("user"); // đổi key nếu bạn dùng key khác
  let userId = "guest";

  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      // Ưu tiên _id (Mongo), nếu không có thì thử id
      userId = parsed?._id ?? parsed?.id ?? "guest";
    } catch {
      userId = "guest";
    }
  }

  // Gọi API gợi ý với user_id
  const { data, loading, error } = useFetch<RecommendationResponse>(
    `http://localhost:5003/ai/recommendations?user_id=${encodeURIComponent(
      userId
    )}`,
    [userId]
  );


  const movies = data?.items ?? featuredMovies;
  const playlists = data?.playlists ?? aiPlaylists;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Gợi ý phim AI"
        description="Playlist được cá nhân hoá dựa trên lịch sử xem và sở thích của bạn."
      />

      <section className="space-y-6">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <h3 className="text-lg font-semibold text-white">
            Playlist hôm nay dành cho bạn
          </h3>
          <p className="text-sm text-slate-300">
            Dựa trên mood “cần phiêu lưu nhẹ nhàng” + lịch sử xem gần đây. Hệ
            thống sẽ cập nhật theo rating mới nhất của bạn.
          </p>

          {loading && (
            <p className="text-slate-400">Đang tính toán playlist…</p>
          )}
          {error && <p className="text-red-400">Lỗi: {error}</p>}

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-dark/60 backdrop-blur transition hover:border-primary/80"
              >
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-sm font-semibold text-white">
                    {movie.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {movie.moods?.join(" • ")}
                  </p>
                  <p className="mt-3 flex-1 text-xs text-slate-400">
                    Ưu tiên do bạn thích {movie.moods?.[0] ?? "mood bất kỳ"} và
                    xem nhiều vào cuối tuần.
                  </p>
                  <Link
                    to={`/movie/${movie.id}`}
                    className="mt-4 inline-flex items-center text-sm text-primary transition hover:text-primary/80"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white">Mood playlist khác</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className={`rounded-3xl border border-white/10 bg-gradient-to-br ${playlist.gradient} p-6 shadow-lg shadow-black/25`}
            >
              <p className="text-3xl">{playlist.icon}</p>
              <p className="mt-4 text-lg font-semibold text-white">
                {playlist.title}
              </p>
              <p className="mt-2 text-sm text-slate-100">
                {playlist.description}
              </p>
              <p className="mt-4 text-xs text-slate-100/80">
                Sẽ tuỳ biến theo rating mới nhất của bạn.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
