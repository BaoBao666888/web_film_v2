import { Link } from "react-router-dom";
import { aiPlaylists, featuredMovies } from "../data/movies";
import { PageHeader } from "../components/PageHeader";

const roadmapItems = [
  {
    title: "Thu thập dữ liệu tương tác",
    detail:
      "Lưu lịch sử xem, rating và lượt bỏ qua để huấn luyện mô hình collaborative filtering.",
  },
  {
    title: "Xây embedding nội dung",
    detail:
      "Chuyển mô tả phim thành vector để hiểu chủ đề, mood và nhịp độ, kết hợp cùng lịch sử người dùng.",
  },
  {
    title: "Gợi ý theo thời điểm",
    detail:
      "Mở rộng logic gợi ý dựa trên thời gian trong ngày và thiết bị, tạo trải nghiệm cá nhân hóa hơn.",
  },
];

export function RecommendPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Gợi ý phim AI"
        description="Playlist demo hiển thị cách hệ thống sẽ phân nhóm film theo mood và hành vi người dùng. Ghi chú roadmap mô tả các bước hoàn thiện."
      />

      <section className="grid gap-6 md:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <h3 className="text-lg font-semibold text-white">
            Playlist hôm nay dành cho bạn
          </h3>
          <p className="text-sm text-slate-300">
            Dựa trên mood “cần phiêu lưu nhẹ nhàng” + lịch sử xem gần đây.
            Hệ thống sẽ cập nhật theo rating mới nhất của bạn.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {featuredMovies.map((movie) => (
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
                    {movie.genres.join(" • ")}
                  </p>
                  <p className="mt-3 flex-1 text-xs text-slate-400">
                    Ưu tiên do bạn thích {movie.moods[0]} và thường xem vào buổi
                    tối cuối tuần.
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

        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Mô tả luồng AI (Roadmap)
          </h4>
          <ul className="space-y-4 text-sm text-slate-200">
            {roadmapItems.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-white/10 bg-dark/60 p-4"
              >
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-xs text-slate-300">{item.detail}</p>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs text-slate-200">
            <p className="font-semibold text-white">Lưu ý triển khai</p>
            <p className="mt-2">
              - API gợi ý sẽ viêt bằng Python FastAPI, trả về danh sách id phim.
            </p>
            <p className="mt-1">
              - Front-end hiển thị skeleton trong lúc đợi response, fallback sang
              playlist chung nếu lỗi.
            </p>
          </div>
        </aside>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white">
          Mood playlist khác
        </h3>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {aiPlaylists.map((playlist) => (
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
                Sẽ tuỳ biến theo rating mới nhất sau khi đồng bộ backend.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
