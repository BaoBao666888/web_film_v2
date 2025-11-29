import { Link, useParams, useSearchParams } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";
import type {
  CommentListResponse,
  MovieDetailResponse,
  WatchResponse,
} from "../types/api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import { CinemaPlayer } from "../components/player/CinemaPlayer";

// URL API lọc bình luận (Flask)
const COMMENT_FILTER_URL = "http://127.0.0.1:5002/api/moderate";

export function WatchPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const episodeParam = Number(searchParams.get("ep") ?? "1");
  const episodeNumber =
    Number.isFinite(episodeParam) && episodeParam > 0 ? episodeParam : 1;
  const { isAuthenticated } = useAuth();

  const {
    data: watchData,
    loading,
    error,
  } = useFetch<WatchResponse>(
    id ? `/movies/${id}/watch${episodeNumber ? `?ep=${episodeNumber}` : ""}` : null,
    [id, episodeNumber]
  );

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
  const [theaterMode, setTheaterMode] = useState(true);
  const viewerIdRef = useRef<string | null>(null);

  useEffect(() => {
    let viewerId = localStorage.getItem("viewerId");
    if (!viewerId) {
      viewerId =
        (crypto.randomUUID && crypto.randomUUID()) ||
        `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("viewerId", viewerId);
    }
    viewerIdRef.current = viewerId;
  }, []);

  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => {
      api.movies
        .addView(id, { viewerId: viewerIdRef.current || undefined, episode: episodeNumber })
        .catch((err) => console.error("Không thể ghi nhận lượt xem:", err));
    }, 1000);
    return () => clearTimeout(timer);
  }, [id, episodeNumber]);


  const streamSource = useMemo(() => {
    if (watchData?.stream?.url) return watchData.stream;

    if (watchData?.videoUrl) {
      const kind =
        watchData.playbackType ??
        (watchData.videoUrl.toLowerCase().includes(".m3u8") ? "hls" : "mp4");

      return {
        type: kind,
        url: watchData.videoUrl,
        headers: watchData.videoHeaders ?? {},
      };
    }
    return null;
  }, [watchData]);

  // ================================
  //  HANDLE COMMENT + FILTER TOXIC
  // ================================
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

    const trimmed = commentValue.trim();
    if (!trimmed) {
      setCommentStatus({
        type: "error",
        message: "Vui lòng nhập nội dung bình luận.",
      });
      return;
    }

    setSubmittingComment(true);
    setCommentStatus(null);

    // 1️⃣ Gọi API lọc comment
    try {
      const res = await fetch(COMMENT_FILTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const json = await res.json();
        const result = json.result ?? json;

        const isToxic = result.is_toxic === true;

        if (isToxic) {
          setSubmittingComment(false);
          setCommentStatus({
            type: "error",
            message:
              "Bình luận của bạn chứa nội dung không phù hợp, vui lòng chỉnh sửa.",
          });
          return;
        }
      } else {
        console.warn("Comment filter API error:", res.status);
      }
    } catch (e) {
      console.error("Không gọi được API lọc:", e);
    }

    // 2️⃣ Nếu sạch → Gửi comment lên server chính
    try {
      await api.movies.addComment(id, { content: trimmed });
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

  // ================================
  //  RENDER UI
  // ================================
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
  const viewFormatter = new Intl.NumberFormat("vi-VN");
  const isSeries = watchData.type === "series";
  const episodes = watchData.episodes ?? [];
  const currentEpisodeNumber =
    watchData.currentEpisode?.number ?? episodeNumber;
  const currentEpisodeTitle =
    watchData.currentEpisode?.title ?? `Tập ${currentEpisodeNumber}`;

  const backgroundPoster = detail?.poster ?? watchData.poster;

  const stats = [
    { label: "Năm", value: detail?.year ?? "—" },
    {
      label: isSeries ? "Tập đang phát" : "Thời lượng",
      value: isSeries
        ? `${currentEpisodeTitle}`
        : detail?.duration ?? watchData?.title,
    },
    {
      label: "Đánh giá",
      value: `${detail?.rating?.toFixed(1) ?? "0.0"}/10 IMDb • ${ratingStats.average.toFixed(
        1
      )}/10 người xem (${ratingStats.count})`,
    },
    {
      label: "Lượt xem",
      value: `${viewFormatter.format(watchData.views ?? 0)} lượt`,
    },
  ];

  return (
    <div className="space-y-10">
      {/* ======================= PLAYER ======================= */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900/70 to-dark shadow-2xl shadow-black/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 blur-[90px]"
          style={{
            backgroundImage: `url(${backgroundPoster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-6 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />

        <div className="relative space-y-6 p-6 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-primary/80">
                Rạp Lumi • {isSeries ? "Series" : "Movie"}
              </p>
              <h1 className="text-2xl font-semibold text-white md:text-3xl">
                {detail?.title ?? watchData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  {isSeries
                    ? `Tập ${currentEpisodeNumber}: ${currentEpisodeTitle}`
                    : detail?.duration ?? "Phim lẻ"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  {viewFormatter.format(watchData.views ?? 0)} lượt xem
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                  IMDb {detail?.rating?.toFixed(1) ?? "0.0"} • Người xem{" "}
                  {ratingStats.average.toFixed(1)} ({ratingStats.count})
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTheaterMode((mode) => !mode)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  theaterMode
                    ? "border-primary bg-primary/15 text-primary shadow-[0_10px_30px_rgba(255,107,107,0.25)]"
                    : "border-white/15 bg-white/10 text-white hover:border-primary/60 hover:text-primary"
                }`}
              >
                {theaterMode ? "Thu gọn bố cục" : "Chế độ rạp"}
              </button>
              <Link
                to={`/movie/${watchData.movieId ?? id}`}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-primary/60 hover:text-primary"
              >
                Trang phim
              </Link>
              <Link
                to={`/watch-party/create?movieId=${watchData.movieId ?? id}${currentEpisodeNumber ? `&ep=${currentEpisodeNumber}` : ""}&title=${encodeURIComponent(
                  detail?.title ?? watchData.title
                )}`}
                className="rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-xs font-semibold text-primary shadow-[0_10px_30px_rgba(255,107,107,0.25)] transition hover:bg-primary/25"
              >
                Xem chung
              </Link>
            </div>
          </div>

          <div
            className={`grid gap-6 ${
              theaterMode ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1.65fr)_0.9fr]"
            }`}
          >
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-black/60 p-2 shadow-[0_40px_90px_rgba(0,0,0,0.65)]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-35 blur-3xl"
                  style={{
                    backgroundImage: `url(${backgroundPoster})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/60" />
                <div className="relative">
                  <CinemaPlayer
                    stream={streamSource}
                    title={detail?.title ?? watchData.title}
                    poster={backgroundPoster}
                  />
                </div>
              </div>

              {isSeries && episodes.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Chọn tập ({episodes.length})
                      </p>
                      <p className="text-xs text-slate-400">
                        Đang xem: {currentEpisodeTitle}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-300">
                      Tập {Math.min(currentEpisodeNumber, episodes.length)} / {episodes.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {episodes.map((episode) => {
                      const isActive = episode.number === currentEpisodeNumber;
                      return (
                        <Link
                          key={`ep-${episode.number}`}
                          to={`/watch/${watchData.movieId}?ep=${episode.number}`}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                            isActive
                              ? "border-primary/70 bg-primary/15 text-white shadow-[0_10px_30px_rgba(255,107,107,0.25)]"
                              : "border-white/10 bg-white/5 text-slate-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-xs">▶</span>
                          <span className="line-clamp-1">
                            {episode.title || `Tập ${episode.number}`}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* INFO CARDS */}
              <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Chế độ phát
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {streamSource?.type === "hls"
                      ? "Adaptive HLS + proxy"
                      : "Direct MP4 playback"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Headers bảo vệ
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {Object.keys(streamSource?.headers ?? {}).length} custom
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Băng thông gợi ý
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {streamSource?.type === "hls" ? "≥ 10 Mbps" : "≥ 5 Mbps"}
                  </p>
                </div>
              </div>
            </div>

            {/* MOVIE INFO */}
            <aside className="space-y-5 rounded-[28px] border border-white/10 bg-black/60 p-6 backdrop-blur lg:sticky lg:top-24">
              <div className="flex gap-4">
                <img
                  src={detail?.poster ?? watchData.poster}
                  alt={detail?.title ?? watchData.title}
                  className="h-32 w-24 rounded-2xl object-cover shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                />
                <div className="space-y-3">
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
                    <span className="font-medium text-white">{item.value}</span>
                  </p>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                {detail?.moods?.map((m) => (
                  <StatusBadge key={m} label={m} tone="info" />
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ======================= COMMENTS ======================= */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
          <h3 className="text-lg font-semibold text-white">Bình luận</h3>

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
                className="p-4 rounded-2xl bg-dark/60 border border-white/10"
              >
                <p className="text-sm font-semibold text-white">
                  {comment.user?.name ?? "Ẩn danh"}
                </p>
                <p className="text-xs text-slate-500">
                  {comment.created_at
                    ? new Date(comment.created_at).toLocaleString("vi-VN")
                    : "Vừa xong"}
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            {isAuthenticated ? (
              <form className="space-y-3" onSubmit={handleSubmitComment}>
                <textarea
                  rows={3}
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                  placeholder="Bạn nghĩ gì về phim này?"
                  className="w-full px-4 py-3 text-sm text-white bg-dark/60 rounded-2xl border border-white/10 outline-none"
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
                    className="px-5 py-2 text-xs font-semibold bg-primary text-dark rounded-full shadow-glow hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submittingComment ? "Đang gửi" : "Gửi bình luận"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-400 bg-dark/60 p-4 rounded-2xl border border-white/10">
                <Link to="/login" className="text-primary">
                  Đăng nhập
                </Link>{" "}
                để bình luận.
              </p>
            )}
          </div>
        </div>

        {/* ================== Suggestions ================== */}
        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
          <h3 className="text-lg font-semibold text-white">Đề xuất tương tự</h3>
          <div className="space-y-3">
            {suggestions.map((movie) => (
              <Link
                key={movie.id}
                to={`/movie/${movie.id}`}
                className="flex gap-3 p-3 rounded-2xl bg-dark/60 border border-white/10 hover:border-primary transition"
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
