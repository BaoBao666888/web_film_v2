import { Link, useParams } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";
import type {
  CommentListResponse,
  MovieDetailResponse,
  WatchResponse,
} from "../types/api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import { CinemaPlayer } from "../components/player/CinemaPlayer";

export function WatchPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const {
    data: watchData,
    loading,
    error,
  } = useFetch<WatchResponse>(id ? `/movies/${id}/watch` : null, [id]);
  const { data: detailData } = useFetch<MovieDetailResponse>(
    id ? `/movies/${id}` : null,
    [id]
  );
  const {
    data: commentData,
    loading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useFetch<CommentListResponse>(id ? `/movies/${id}/comments` : null, [id]);
  const [commentValue, setCommentValue] = useState("");
  const [commentStatus, setCommentStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Thêm vào lịch sử xem khi người dùng vào trang xem phim
  useEffect(() => {
    if (id && user) {
      // Gọi API để thêm vào lịch sử sau 3 giây (đảm bảo user đã thực sự xem)
      const timer = setTimeout(() => {
        api.history.add(id).catch((err) => {
          console.error("Không thể thêm vào lịch sử:", err);
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [id, user]);

  const streamSource = useMemo(() => {
    if (watchData?.stream?.url) {
      return watchData.stream;
    }
    if (watchData?.videoUrl) {
      const kind =
        watchData?.playbackType ??
        (watchData?.videoUrl.toLowerCase().includes(".m3u8")
          ? "hls"
          : "mp4");
      return {
        type: kind,
        url: watchData?.videoUrl,
        headers: watchData?.videoHeaders ?? {},
      };
    }
    return null;
  }, [watchData]);

  const handleSubmitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    if (!isAuthenticated) {
      setCommentStatus({
        type: "error",
        message: "Bạn cần đăng nhập để bình luận.",
      });
      return;
    }
    if (!commentValue.trim()) {
      setCommentStatus({
        type: "error",
        message: "Vui lòng nhập nội dung bình luận.",
      });
      return;
    }
    setSubmittingComment(true);
    setCommentStatus(null);
    try {
      await api.movies.addComment(id, { content: commentValue.trim() });
      setCommentValue("");
      setCommentStatus({ type: "success", message: "Đã gửi bình luận." });
      refetchComments();
    } catch (err) {
      setCommentStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Không thể gửi bình luận, vui lòng thử lại.",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

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
  const suggestions = detailData?.suggestions ?? [];
  const comments = commentData?.items ?? [];
  const ratingStats = detailData?.ratingStats ?? { average: 0, count: 0 };

  const backgroundPoster = detail?.poster ?? watchData.poster;
  const stats = [
    { label: "Năm", value: detail?.year ?? "—" },
    { label: "Thời lượng", value: detail?.duration ?? watchData?.title },
    {
      label: "Đánh giá",
      value: `${detail?.rating?.toFixed(1) ?? "0.0"}/10 IMDb • ${ratingStats.average.toFixed(
        1
      )}/10 người xem (${ratingStats.count})`,
    },
  ];

  const experienceHighlights = [
    {
      label: "Chế độ",
      value:
        streamSource?.type === "hls"
          ? "Adaptive HLS"
          : "Direct MP4 playback",
      hint:
        streamSource?.type === "hls"
          ? "Tự động cân bằng bitrate theo băng thông"
          : "Thích hợp khi cần tải nhanh",
    },
    {
      label: "Headers bảo vệ",
      value: `${Object.keys(streamSource?.headers ?? {}).length} custom`,
      hint: "Referer/Origin giúp bảo mật tốt hơn",
    },
    {
      label: "Mức kết nối đề xuất",
      value: streamSource?.type === "hls" ? "≥ 10 Mbps" : "≥ 5 Mbps",
      hint: "Đảm bảo buffer ổn định cho bản phim này",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900/70 to-dark shadow-2xl shadow-black/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 blur-3xl"
          style={{
            backgroundImage: `url(${backgroundPoster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative grid gap-8 p-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            <CinemaPlayer
              stream={streamSource}
              title={detail?.title ?? watchData.title}
              poster={backgroundPoster}
            />
            <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-3">
              {experienceHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-5 rounded-[28px] border border-white/10 bg-black/60 p-6 backdrop-blur">
            <div className="flex gap-4">
              <img
                src={detail?.poster ?? watchData.poster}
                alt={detail?.title ?? watchData.title}
                className="h-32 w-24 rounded-2xl object-cover"
              />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                    ĐANG PHÁT
                  </span>
                  <span className="text-xs text-slate-400">
                    {streamSource?.type === "hls"
                      ? "HLS bảo vệ referer"
                      : "Nguồn MP4 chuẩn"}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-white">
                  {detail?.title ?? watchData.title}
                </h2>
                <p className="text-xs text-slate-300 line-clamp-5">
                  {detail?.synopsis ?? watchData.synopsis}
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-xs text-slate-300">
              {stats.map((item) => (
                <p key={item.label}>
                  {item.label}:{" "}
                  <span className="text-white font-medium">{item.value}</span>
                </p>
              ))}
              <p className="text-xs text-slate-400">
                Dàn diễn viên: {detail?.cast?.join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/80">
              {watchData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px]"
                >
                  #{tag}
                </span>
              ))}
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
            <div className="flex flex-wrap gap-2">
              {detail?.moods?.map((mood) => (
                <StatusBadge key={mood} label={mood} tone="info" />
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Danh sách tiếp theo
            </h3>
            <p className="text-xs text-slate-400">
              Gợi ý dựa trên mood + độ căng tuyến tính của phim hiện tại
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {watchData.nextUp.map((item) => (
            <Link
              key={item.id}
              to={`/watch/${item.id}`}
              className="group flex items-center gap-4 rounded-[22px] border border-white/10 bg-dark/50 p-3 transition hover:-translate-y-1 hover:border-primary/60"
            >
              <div className="relative">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-24 w-24 rounded-2xl object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                  {item.duration}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-primary">
                  {item.title}
                </p>
                <p className="text-xs text-slate-400">Nhấp để chuyển ngay</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Bình luận</h3>
            <Link
              to={`/movie/${watchData.movieId}`}
              className="text-xs text-primary hover:text-primary/80"
            >
              Trang chi tiết
            </Link>
          </div>
          {commentsLoading && (
            <p className="text-sm text-slate-400">Đang tải bình luận...</p>
          )}
          {commentsError && (
            <p className="text-sm text-red-400">{commentsError}</p>
          )}
          {!commentsLoading && !comments.length && (
            <p className="text-sm text-slate-400">
              Chưa có bình luận nào cho phim này. Hãy là người đầu tiên!
            </p>
          )}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-white/10 bg-dark/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {comment.user?.name ?? "Ẩn danh"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {comment.created_at
                        ? new Date(comment.created_at).toLocaleString("vi-VN")
                        : "Vừa xong"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-white/10 pt-4">
            {isAuthenticated ? (
              <form className="space-y-3" onSubmit={handleSubmitComment}>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Thêm bình luận
                </label>
                <textarea
                  rows={3}
                  value={commentValue}
                  onChange={(event) => setCommentValue(event.target.value)}
                  placeholder="Bạn nghĩ gì về phim này?"
                  className="w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <div className="flex items-center justify-end gap-3">
                  {commentStatus && (
                    <p
                      className={`text-xs ${
                        commentStatus.type === "success"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {commentStatus.message}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submittingComment ? "Đang gửi" : "Gửi bình luận"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-dark/60 p-4 text-xs text-slate-400">
                <Link to="/login" className="text-primary">
                  Đăng nhập
                </Link>{" "}
                để tham gia bình luận.
              </p>
            )}
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
                  <p className="text-sm font-semibold text-white">
                    {movie.title}
                  </p>
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
