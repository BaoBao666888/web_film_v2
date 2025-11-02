import { Link, useParams } from "react-router-dom";
import { featuredMovies } from "../data/movies";
import { StatusBadge } from "../components/StatusBadge";

export function MovieDetailPage() {
  const { id } = useParams();
  const movie = featuredMovies.find((item) => item.id === id) ?? featuredMovies[0];

  return (
    <div className="space-y-10">
      <section className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="h-full w-full object-cover"
            />
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90">
            ▶ Xem trailer
          </button>
          <p className="text-xs text-slate-400">
            Ghi chú: Nút trailer sẽ được nối với YouTube hoặc player nội bộ sau
            khi backend hoàn chỉnh.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={`${movie.year}`} tone="info" />
            <StatusBadge label={movie.duration} tone="success" />
            <StatusBadge label={`${movie.rating.toFixed(1)} ★`} tone="warning" />
          </div>
          <h1 className="text-4xl font-bold text-white">{movie.title}</h1>
          <p className="text-sm text-slate-200">{movie.description}</p>

          <div className="flex flex-wrap gap-2">
            {movie.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
              >
                #{genre}
              </span>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Diễn viên
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {movie.cast.map((actor) => (
                  <li key={actor}>• {actor}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Thông tin sản xuất
              </p>
              <p className="mt-2 text-sm text-slate-200">
                Đạo diễn: <span className="text-white">{movie.director}</span>
              </p>
              <p className="mt-1 text-sm text-slate-200">Phân phối: Lumi Studio</p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
            <p className="text-sm font-semibold text-white">
              AI gợi ý tiếp theo
            </p>
            <p className="mt-2 text-xs text-slate-200">
              Sau khi bạn xem phim này xong, hệ thống sẽ phân tích đánh giá để
              điều chỉnh playlist trong mục{" "}
              <Link to="/recommend" className="text-primary">
                Gợi ý AI
              </Link>
              . Tạm thời hiển thị ghi chú để mô tả luồng dữ liệu.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/rating"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
            >
              Đánh giá phim này
            </Link>
            <Link
              to="/chat"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
            >
              Hỏi chatbot về phim tương tự
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
