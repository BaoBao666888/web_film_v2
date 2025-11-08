import { Link, useParams } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";
import type { MovieDetailResponse, WatchResponse } from "../types/api";
import { StatusBadge } from "../components/StatusBadge";

export function WatchPage() {
  const { id } = useParams();
  const { data: watchData, loading, error } = useFetch<WatchResponse>(
    id ? `/movies/${id}/watch` : null,
    [id]
  );
  const { data: detailData } = useFetch<MovieDetailResponse>(
    id ? `/movies/${id}` : null,
    [id]
  );

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-300">
        Đang thiết lập trình phát...
      </div>
    );
  }

  if (error || !watchData) {
    return (
      <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-10 text-center text-sm text-red-200">
        Không tải được nội dung phát. {error}
      </div>
    );
  }

  const detail = detailData?.movie;
  const reviews = detailData?.reviews ?? [];
  const suggestions = detailData?.suggestions ?? [];

  const backgroundPoster = detail?.poster ?? watchData.poster;
  const stats = [
    { label: "Năm", value: detail?.year ?? "—" },
    { label: "Thời lượng", value: detail?.duration ?? watchData?.title },
    { label: "Đánh giá", value: `${detail?.rating?.toFixed(1) ?? "4.0"} ★` },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-2xl shadow-black/40">
        <div
          className="absolute inset-0 opacity-30 blur-3xl"
          style={{
            backgroundImage: `url(${backgroundPoster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-white/5 bg-black/60 shadow-2xl shadow-black/50">
              <div className="relative">
                <video
                  key={watchData.videoUrl}
                  className="h-full w-full rounded-3xl"
                  controls
                  poster={watchData.poster}
                >
                  <source src={watchData.videoUrl} type="video/mp4" />
                  Trình duyệt không hỗ trợ video.
                </video>
                <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white">
                  ĐANG PHÁT
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-300">
              {stats.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1"
                >
                  {item.label}: <span className="text-white">{item.value}</span>
                </span>
              ))}
              {watchData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-white"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <aside className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
            <div className="flex gap-4">
              <img
                src={detail?.poster ?? watchData.poster}
                alt={detail?.title ?? watchData.title}
                className="h-36 w-28 rounded-2xl object-cover"
              />
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white">
                  {detail?.title ?? watchData.title}
                </h2>
                <p className="text-xs text-slate-300 line-clamp-4">
                  {detail?.synopsis ?? watchData.synopsis}
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail?.moods?.map((mood) => (
                    <StatusBadge key={mood} label={mood} tone="info" />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-300">
              <p>
                Đạo diễn: <span className="text-white">{detail?.director}</span>
              </p>
              <p className="text-xs text-slate-400">
                Dàn diễn viên: {detail?.cast?.join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/movie/${watchData.movieId}`}
                className="flex-1 rounded-full border border-white/20 px-4 py-2 text-center text-sm text-white transition hover:border-primary hover:text-primary"
              >
                Chi tiết phim
              </Link>
              {(detail?.trailerUrl || watchData.trailerUrl) && (
                <a
                  href={detail?.trailerUrl ?? watchData.trailerUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
                >
                  Trailer
                </a>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Danh sách tiếp theo</h3>
          <p className="text-xs text-slate-400">
            Hệ thống chọn ngẫu nhiên theo mood bạn đang xem
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {watchData.nextUp.map((item) => (
            <Link
              key={item.id}
              to={`/watch/${item.id}`}
              className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-1 hover:border-primary/80"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-400">{item.duration}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Cảm nhận người xem
            </h3>
            <Link
              to={`/movie/${watchData.movieId}`}
              className="text-xs text-primary hover:text-primary/80"
            >
              Xem thêm
            </Link>
          </div>
          {reviews.length === 0 && (
            <p className="text-sm text-slate-400">
              Chưa có đánh giá nào cho phim này.
            </p>
          )}
          <div className="space-y-4">
            {reviews.slice(0, 3).map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-white/10 bg-dark/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {review.user?.name ?? "Ẩn danh"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {review.sentiment ?? "—"}
                    </p>
                  </div>
                  <StatusBadge
                    label={`${review.rating.toFixed(1)} ★`}
                    tone="warning"
                  />
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm text-slate-200">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
          <h3 className="text-lg font-semibold text-white">Đề xuất tương tự</h3>
          <div className="space-y-3">
            {suggestions.map((movie) => (
              <Link
                key={movie.id}
                to={`/movie/${movie.id}`}
                className="flex gap-3 rounded-2xl border border-white/10 bg-dark/60 p-3 transition hover:border-primary"
              >
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{movie.title}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {movie.synopsis}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
