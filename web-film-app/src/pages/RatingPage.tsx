import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { featuredMovies } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import type { MovieListResponse } from "../types/api";
import { api } from "../lib/api";

export function RatingPage() {
  const { data } = useFetch<MovieListResponse>("/movies?limit=20");
  const movies = useMemo(
    () => data?.items ?? featuredMovies,
    [data?.items]
  );
  const [movieId, setMovieId] = useState("");
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [nextWish, setNextWish] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!movieId && movies.length) {
      setMovieId(movies[0].id);
    }
  }, [movies, movieId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!movieId) return;
    setSubmitting(true);
    setStatus(null);
    try {
      await api.ratings.submit({
        movieId,
        rating,
        comment,
        userId: "demo-user",
        moodWish: nextWish,
      });
      setStatus({
        type: "success",
        message: "Ghi nhận phản hồi thành công! Dữ liệu đã gửi tới AI dashboard.",
      });
      setComment("");
      setNextWish("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gửi thất bại",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Đánh giá & phản hồi"
        description="Giao diện ghi nhận rating, cảm xúc sau khi xem phim. Kết quả sẽ được gửi đến API /ratings và đồng bộ với dashboard thống kê."
      />

      <section className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25"
        >
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Chọn phim
            </label>
            <select
              value={movieId}
              onChange={(event) => setMovieId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-dark/70 px-4 py-3 text-sm text-white outline-none"
            >
              {movies.map((movie) => (
                <option key={movie.id} value={movie.id} className="bg-dark">
                  {movie.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Điểm số
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`h-12 w-12 rounded-2xl border text-sm font-semibold transition ${
                    value <= rating
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 bg-dark/60 text-slate-200"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Cảm xúc sau khi xem
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Viết ngắn gọn cảm xúc của bạn..."
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Ghi chú: Sentiment analysis sẽ được thực thi ở backend.
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Muốn xem gì tiếp theo?
            </label>
            <input
              type="text"
              value={nextWish}
              onChange={(event) => setNextWish(event.target.value)}
              placeholder="Ví dụ: phim hành động nhưng nhẹ nhàng, hoặc hoạt hình ấm áp..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Đang gửi..." : "Ghi nhận phản hồi"}
          </button>
          {status && (
            <p
              className={`text-xs ${
                status.type === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {status.message}
            </p>
          )}
        </form>

        <aside className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <p className="text-sm font-semibold text-white">
            Sơ đồ luồng dữ liệu rating
          </p>
          <ol className="space-y-3 text-xs text-slate-300">
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              1. Người dùng gửi điểm & cảm xúc.
            </li>
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              2. Backend lưu lịch sử, chạy sentiment analysis.
            </li>
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              3. Recommendation engine cập nhật lại playlist cá nhân.
            </li>
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              4. Dashboard quản trị hiển thị biểu đồ cảm xúc tổng hợp.
            </li>
          </ol>
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs text-slate-200">
            <p className="font-semibold text-white">Việc cần làm</p>
            <p className="mt-2">
              - Áp dụng sentiment model thật và đồng bộ dashboard admin.
            </p>
            <p className="mt-1">
              - Khi có auth, tự động gán userID thay vì mặc định demo-user.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
