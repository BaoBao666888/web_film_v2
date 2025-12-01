import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useFetch } from "../hooks/useFetch";
import type {
  NewMoviesResponse,
  TrendingMoviesResponse,
} from "../types/api";

const PAGE_SIZE = 12;
const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatViews = (value?: number) =>
  value && value > 0
    ? `${numberFormatter.format(value)} lượt xem tuần này`
    : undefined;

type ExploreMovie = {
  id: string;
  title: string;
  synopsis: string;
  thumbnail: string;
  duration?: string;
  rating?: number;
  year?: number;
  moods?: string[];
  views?: number;
};

export function TrendingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") === "new" ? "new" : "trending";
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [currentView]);

  const trendingPath =
    currentView === "trending"
      ? `/movies/trending?page=${page}&limit=${PAGE_SIZE}`
      : null;
  const latestPath =
    currentView === "new"
      ? `/movies/new?page=${page}&limit=${PAGE_SIZE}`
      : null;

  const trendingFetch = useFetch<TrendingMoviesResponse>(trendingPath, [
    currentView,
    page,
  ]);
  const latestFetch = useFetch<NewMoviesResponse>(latestPath, [
    currentView,
    page,
  ]);

  const isTrendingView = currentView === "trending";
  const activeData = isTrendingView ? trendingFetch.data : latestFetch.data;
  const loading = isTrendingView ? trendingFetch.loading : latestFetch.loading;
  const error = isTrendingView ? trendingFetch.error : latestFetch.error;

  const movies = useMemo<ExploreMovie[]>(() => {
    if (!activeData) return [];
    if (isTrendingView) {
      const payload = activeData as TrendingMoviesResponse;
      return payload.items.map((item) => ({
        ...item.movie,
        views: item.views,
      }));
    }
    const payload = activeData as NewMoviesResponse;
    return payload.items;
  }, [activeData, isTrendingView]);

  const meta = isTrendingView
    ? (activeData as TrendingMoviesResponse | undefined)?.meta
    : (activeData as NewMoviesResponse | undefined)?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  const handleTabChange = (view: "trending" | "new") => {
    if (view === "new") {
      setSearchParams({ view: "new" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handlePrev = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Khám phá xu hướng và phim mới"
        description="Bảng dữ liệu nền tối ưu để bạn xem thêm nhiều phim hơn. Lượt xem của tuần này được phân trang mượt mà, kéo đến đâu tải dữ liệu đến đó."
        actions={
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <button
              onClick={() => handleTabChange("trending")}
              className={`w-full rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
                isTrendingView
                  ? "bg-primary text-dark shadow-glow"
                  : "border border-white/20 text-white hover:border-primary hover:text-primary"
              }`}
            >
              Xu hướng tuần này
            </button>
            <button
              onClick={() => handleTabChange("new")}
              className={`w-full rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
                !isTrendingView
                  ? "bg-primary text-dark shadow-glow"
                  : "border border-white/20 text-white hover:border-primary hover:text-primary"
              }`}
            >
              Phim mới thêm gần đây
            </button>
          </div>
        }
      />

      {loading && <p className="text-slate-400">Đang tải dữ liệu...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !movies.length && (
        <p className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
          Chưa có dữ liệu cho mục này, hãy quay lại sau nhé!
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {movies.map((movie) => (
          <Link
            key={movie.id}
            to={`/movie/${movie.id}`}
            className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/25 transition hover:-translate-y-1 hover:border-primary/70"
          >
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="h-56 w-full object-cover"
            />
            <div className="flex flex-1 flex-col space-y-2 p-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <StatusBadge
                  label={`${movie.rating?.toFixed(1) ?? "4.0"} ★`}
                  tone="warning"
                />
                {movie.year && <span>{movie.year}</span>}
                {isTrendingView && formatViews(movie.views) && (
                  <span className="text-primary">{formatViews(movie.views)}</span>
                )}
              </div>
              <p className="text-lg font-semibold text-white">{movie.title}</p>
              <p className="text-sm text-slate-300 line-clamp-3">
                {movie.synopsis}
              </p>
              <div className="mt-auto text-xs text-slate-400">
                {movie.duration || movie.moods?.slice(0, 2).join(" • ")}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {movies.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white md:flex-row">
          <button
            onClick={handlePrev}
            disabled={page === 1}
            className="rounded-full border border-white/20 px-4 py-2 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
          >
            ← Trang trước
          </button>
          <p>
            Trang {page}/{totalPages}
          </p>
          <button
            onClick={handleNext}
            disabled={page >= totalPages}
            className="rounded-full border border-white/20 px-4 py-2 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
          >
            Trang tiếp →
          </button>
        </div>
      )}
    </div>
  );
}
