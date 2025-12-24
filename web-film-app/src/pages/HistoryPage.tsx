import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import type { HistoryResponse, HistoryItem } from "../types/api";

const formatPosition = (value?: number) => {
  if (!Number.isFinite(value)) return "00:00";
  const totalSeconds = Math.max(0, Math.floor(value || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export function HistoryPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = 10;

  const { data, loading, error, refetch } = useFetch<HistoryResponse>(
    isAuthenticated ? `/history?page=${page}&limit=${limit}` : null,
    [isAuthenticated, page]
  );
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const meta = data?.meta;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleDelete = async (historyId: string) => {
    setDeletingId(historyId);
    try {
      await api.history.remove(historyId);
      refetch();
    } catch (err) {
      console.error("Không thể xóa lịch sử:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClear = async () => {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ lịch sử xem?")) return;
    setClearing(true);
    try {
      await api.history.clear();
      refetch();
    } catch (err) {
      console.error("Không thể xóa toàn bộ lịch sử:", err);
    } finally {
      setClearing(false);
    }
  };

  const goPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    setSearchParams(params);
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-orange-400/30 bg-orange-500/10 p-10 text-center">
        <p className="text-orange-200 mb-4">Bạn cần đăng nhập để xem lịch sử</p>
        <Link
          to="/login"
          className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Lịch sử xem"
        description="Theo dõi các phim bạn đã xem trong 30 ngày gần nhất."
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
            >
              Quay lại hồ sơ
            </Link>
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing || items.length === 0}
              className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {clearing ? "Đang xóa..." : "Xóa tất cả"}
            </button>
          </div>
        }
      />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
        {loading && <p className="text-slate-400">Đang tải lịch sử…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-slate-500">
            Chưa có lịch sử. Xem phim để hệ thống ghi nhận nhé!
          </p>
        )}

        <div className="space-y-3">
          {items.map((item: HistoryItem) => {
            const isSingleMovie = item.movieType === "single";
            const episodeLabel = isSingleMovie
              ? "Movie"
              : item.episode
              ? `Tập ${item.episode}`
              : null;
            const watchLink =
              !isSingleMovie && item.episode
                ? `/watch/${item.movieId}?ep=${item.episode}`
                : `/watch/${item.movieId}`;

            return (
              <div
                key={`history-${item.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-dark/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <span
                      className="block text-sm font-semibold text-white truncate"
                      title={item.title ?? ""}
                    >
                      {item.title ?? "Không xác định"}
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                      {episodeLabel ? (
                        <span className="rounded-full border border-white/10 px-2 py-0.5">
                          {episodeLabel}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/10 px-2 py-0.5">
                        Xem gần nhất:{" "}
                        {item.lastWatchedAt
                          ? new Date(item.lastWatchedAt).toLocaleDateString(
                              "vi-VN"
                            )
                          : "Gần đây"}
                      </span>
                      {Number.isFinite(item.position) && item.position ? (
                        <span className="rounded-full border border-white/10 px-2 py-0.5">
                          Tiếp tục từ {formatPosition(item.position)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={watchLink}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-dark transition hover:bg-primary/90"
                  >
                    Xem lại
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Xóa..." : "Xóa"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-xs text-slate-300">
            <span>
              Trang {meta.page} / {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-full border border-white/15 px-3 py-1 text-white transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() =>
                  goPage(Math.min(meta.totalPages, page + 1))
                }
                disabled={page >= meta.totalPages}
                className="rounded-full border border-white/15 px-3 py-1 text-white transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
