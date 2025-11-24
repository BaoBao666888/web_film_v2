import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { useFetch } from "../hooks/useFetch";
import type { MovieDetailResponse } from "../types/api";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

export function MovieDetailPage() {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const { data, loading, error } = useFetch<MovieDetailResponse>(
    id ? `/movies/${id}` : null,
    [id]
  );
  const [favoriteStatus, setFavoriteStatus] = useState<string | null>(null);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const movie = data?.movie;
  const reviews = data?.reviews ?? [];
  const suggestions = data?.suggestions ?? [];
  const trailerUrl = movie?.trailerUrl ?? "";
  const movieId = movie?.id ?? "";

  useEffect(() => {
    const checkFavorite = async () => {
      if (!authUser || !movieId) {
        setIsFavorite(false);
        return;
      }
      try {
        const response = await api.movies.favoriteStatus(movieId);
        setIsFavorite(response.favorite);
      } catch {
        setIsFavorite(false);
      }
    };
    checkFavorite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, movieId]);

  const handleSaveFavorite = async () => {
    if (!authUser) {
      setFavoriteStatus("Bạn cần đăng nhập để lưu phim vào yêu thích.");
      return;
    }
    setSavingFavorite(true);
    setFavoriteStatus(null);
    try {
      if (isFavorite) {
        await api.movies.unfavorite(movieId);
        setFavoriteStatus("Đã xoá phim khỏi danh sách yêu thích.");
        setIsFavorite(false);
      } else {
        await api.movies.favorite(movieId);
        setFavoriteStatus("✔ Đã lưu phim vào danh sách yêu thích.");
        setIsFavorite(true);
      }
    } catch (err) {
      setFavoriteStatus(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái yêu thích."
      );
    } finally {
      setSavingFavorite(false);
    }
  };

  if (loading) {
    return <p>Đang tải thông tin phim…</p>;
  }

  if (error) {
    return <p className="text-red-400">Không thể tải phim: {error}</p>;
  }

  if (!movie) {
    return <p>Không tìm thấy phim.</p>;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={movie.title}
        description={movie.synopsis}
        actions={
          <div className="flex flex-wrap gap-3">
            <a
              href={movie.trailerUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
            >
              Trailer
            </a>
            <Link
              to={`/watch/${movie.id}`}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark shadow-glow hover:bg-primary/90"
            >
              Xem ngay
            </Link>
          </div>
        }
      />
      {favoriteStatus && (
        <p
          className={`text-sm ${
            favoriteStatus.startsWith("✔") ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {favoriteStatus}
        </p>
      )}

      <section className="relative grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30 md:grid-cols-[1fr_1.3fr]">
        <button
          type="button"
          onClick={handleSaveFavorite}
          disabled={savingFavorite}
          aria-label="Lưu vào yêu thích"
          className={`absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border text-2xl transition disabled:opacity-60 ${
            isFavorite
              ? "border-primary bg-primary/20 text-primary"
              : "border-white/20 bg-dark/50 text-white"
          } hover:border-primary hover:text-primary`}
        >
          {savingFavorite ? "…" : isFavorite ? "❤️" : "🤍"}
        </button>
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <img
              src={movie.poster}
              alt={movie.title}
              className="h-full w-full object-cover"
            />
          </div>
          {trailerUrl && (
            <a
              href={trailerUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-primary hover:text-primary"
            >
              ▶ Xem trailer
            </a>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={`${movie.year}`} tone="info" />
            <StatusBadge label={movie.duration ?? "Không rõ"} tone="success" />
            <StatusBadge
              label={`${movie.rating?.toFixed(1) ?? "4.0"} ★`}
              tone="warning"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {movie.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Diễn viên
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {movie.cast?.map((actor) => (
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

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
        <h3 className="text-lg font-semibold text-white">Đánh giá gần đây</h3>
        {!reviews.length && (
          <p className="mt-3 text-sm text-slate-400">
            Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận!
          </p>
        )}
        <div className="mt-4 space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-white/10 bg-dark/60 p-4"
            >
              <div className="flex items-center gap-3">
                <img
                  src={
                    review.user?.avatar ||
                    "https://placehold.co/48x48?text=AI"
                  }
                  alt={review.user?.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {review.user?.name ?? "Ẩn danh"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {review.sentiment ?? "Chưa phân tích"}
                  </p>
                </div>
                <StatusBadge
                  label={`${review.rating.toFixed(1)} ★`}
                  tone="warning"
                />
              </div>
              {review.comment && (
                <p className="mt-3 text-sm text-slate-200">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white">Phim tương tự</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {suggestions.map((item) => (
            <Link
              key={item.id}
              to={`/movie/${item.id}`}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-primary/80"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="h-40 w-full rounded-2xl object-cover"
              />
              <p className="mt-4 text-sm font-semibold text-white">
                {item.title}
              </p>
              <p className="text-xs text-slate-400">{item.moods?.join(" • ")}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
