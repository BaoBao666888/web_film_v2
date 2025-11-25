import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { featuredMovies } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import type {
  CommunityHighlightsResponse,
  NewMoviesResponse,
  RecommendationResponse,
  TrendingMoviesResponse,
} from "../types/api";

const numberFormatter = new Intl.NumberFormat("vi-VN");

const fallbackTrending = featuredMovies.slice(0, 3).map((movie, index) => ({
  movie,
  views: 1200 - index * 150,
}));

const fallbackComments: CommunityHighlightsResponse["recentComments"] = [
  {
    id: "demo-comment-1",
    content: "Dữ liệu đang được cập nhật từ server, bạn thử lại sau nhé!",
    user: { id: "demo", name: "Ẩn danh" },
    movie: fallbackTrending[0]?.movie,
  },
];

const formatViews = (value?: number) =>
  value && value > 0
    ? `${numberFormatter.format(value)} lượt xem`
    : "Chưa có lượt xem";

const formatFavorites = (value?: number) =>
  value && value > 0
    ? `${numberFormatter.format(value)} lượt yêu thích`
    : "Chưa có dữ liệu";

export function HomePage() {
  const { data: trendingData, loading: trendingLoading } =
    useFetch<TrendingMoviesResponse>("/movies/trending?limit=6&days=7");
  const { data: newMoviesData } = useFetch<NewMoviesResponse>(
    "/movies/new?limit=6"
  );
  const { data: communityData } = useFetch<CommunityHighlightsResponse>(
    "/movies/community-highlights"
  );
  const { data: aiData } = useFetch<RecommendationResponse>(
    "/ai/recommendations"
  );

  const trendingItems = trendingData?.items?.length
    ? trendingData.items
    : fallbackTrending;
  const latestMovies = newMoviesData?.items?.length
    ? newMoviesData.items
    : featuredMovies.slice(0, 6);
  const community: CommunityHighlightsResponse = communityData ?? {
    mostActive: trendingItems.slice(0, 5),
    mostFavorited: trendingItems.slice(0, 5),
    recentComments: fallbackComments,
  };

  const heroMovies = trendingItems.slice(0, 2).map((item) => item.movie);
  const recommendationList = aiData?.items ?? latestMovies.slice(0, 3);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-secondary/60 to-dark p-10 shadow-xl shadow-black/30">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <StatusBadge label="Bản thử nghiệm có AI" tone="info" />
            <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
              Phim hot, playlist mới và gợi ý AI trong một trang
            </h2>
            <p className="mt-3 text-base text-slate-200">
              Theo dõi xu hướng thực tế dựa trên lượt xem tuần này, phim vừa
              cập bến và bảng xếp hạng sôi nổi nhất. AI vẫn túc trực để gợi ý
              đúng mood bạn cần.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/trending"
                className="rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
              >
                Khám phá xu hướng
              </Link>
              <Link
                to="/recommend"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
              >
                Gợi ý bằng AI
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-400">
              Dữ liệu lấy trực tiếp từ backend Express (cổng 4000). Khi API
              gián đoạn, giao diện tự động dùng dữ liệu demo để bạn không bị gián quãng.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-3xl" />
            <div className="relative space-y-4">
              {heroMovies.map((movie) => (
                <article
                  key={movie.id}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 backdrop-blur"
                >
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="h-28 w-20 flex-none rounded-xl object-cover"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      {movie.title}
                    </p>
                    <p className="text-xs text-slate-300">
                      {movie.moods?.join(" • ") || movie.duration}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {movie.moods?.map((mood) => (
                        <span
                          key={mood}
                          className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-200"
                        >
                          {mood}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Xu hướng tuần này
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              Top phim được xem nhiều nhất trong 7 ngày
            </h3>
            <p className="text-sm text-slate-400">
              Danh sách dựa trên Watch History thực tế, sắp xếp theo lượt xem cao nhất.
            </p>
          </div>
          <Link
            to="/trending"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
          >
            Xem thêm
          </Link>
        </div>
        {trendingLoading ? (
          <p className="mt-6 text-slate-400">Đang tải danh sách xu hướng…</p>
        ) : (
          <div className="mt-6 flex gap-6 overflow-x-auto pb-4">
            {trendingItems.map((item, index) => (
              <Link
                to={`/movie/${item.movie.id}`}
                key={item.movie.id}
                className="group min-w-[260px] max-w-sm flex-1 overflow-hidden rounded-3xl bg-gradient-to-b from-white/10 to-dark/60 shadow-lg shadow-black/30"
              >
                <div className="relative">
                  <img
                    src={item.movie.thumbnail}
                    alt={item.movie.title}
                    className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                    #{index + 1}
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <StatusBadge
                      label={`${item.movie.rating?.toFixed(1) ?? "4.0"} ★`}
                      tone="warning"
                    />
                    <span>{formatViews(item.views)}</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {item.movie.title}
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {item.movie.synopsis}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
              Phim mới
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              Vừa mới cập bến kho phim
            </h3>
          </div>
          <Link
            to="/trending?view=new"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
          >
            Xem thêm
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {latestMovies.map((movie) => (
            <Link
              to={`/movie/${movie.id}`}
              key={movie.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-dark/60 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-primary/70"
            >
              <img
                src={movie.thumbnail}
                alt={movie.title}
                className="h-48 w-full object-cover"
              />
              <div className="flex flex-1 flex-col space-y-2 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {movie.year} • {movie.duration || "Đang cập nhật"}
                </p>
                <p className="text-lg font-semibold text-white">
                  {movie.title}
                </p>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {movie.synopsis}
                </p>
                <div className="mt-auto text-xs text-slate-300">
                  {movie.moods?.slice(0, 3).join(" • ")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-dark/80 p-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-semibold text-white">🔥 Sôi nổi nhất</h4>
          </div>
          <ol className="mt-5 space-y-4">
            {community.mostActive.length ? (
              community.mostActive.slice(0, 5).map((item, index) => (
                <li
                  key={`active-${item.movie.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 p-3"
                >
                  <span className="text-lg font-bold text-primary">
                    {index + 1}.
                  </span>
                  <img
                    src={item.movie.thumbnail}
                    alt={item.movie.title}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-white line-clamp-1">
                      {item.movie.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatViews(item.views)}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
            )}
          </ol>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-dark/80 p-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-semibold text-white">💛 Yêu thích nhất</h4>
          </div>
          <ol className="mt-5 space-y-4">
            {community.mostFavorited.length ? (
              community.mostFavorited.slice(0, 5).map((item, index) => (
                <li
                  key={`favorite-${item.movie.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 p-3"
                >
                  <span className="text-lg font-bold text-amber-300">
                    {index + 1}.
                  </span>
                  <img
                    src={item.movie.thumbnail}
                    alt={item.movie.title}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-white line-clamp-1">
                      {item.movie.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatFavorites(item.favorites)}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
            )}
          </ol>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-dark/80 p-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-semibold text-white">⚡ Bình luận mới</h4>
          </div>
          <div className="mt-5 space-y-4">
            {community.recentComments.length ? (
              community.recentComments.slice(0, 5).map((comment) => (
                <Link
                  key={comment.id}
                  to={comment.movie?.id ? `/movie/${comment.movie.id}` : "/search"}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-primary/70"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {comment.user?.avatar ? (
                      <img
                        src={comment.user.avatar}
                        alt={comment.user.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      (comment.user?.name ?? "Ẩn danh").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {comment.user?.name ?? "Ẩn danh"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {comment.movie?.title ?? "Phim đang cập nhật"}
                    </p>
                    <p className="mt-2 text-sm text-slate-200 line-clamp-2">
                      {comment.content || "Người dùng chưa để lại lời nhắn."}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-400">Chưa có bình luận mới.</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold text-white">
            AI đề xuất riêng cho bạn
          </h3>
          <Link
            to="/recommend"
            className="text-sm text-slate-300 transition hover:text-primary"
          >
            Xem thêm
          </Link>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {recommendationList.map((movie) => (
            <div
              key={`rec-${movie.id}`}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/25"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Gợi ý dựa trên mood của bạn
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {movie.title}
              </p>
              <p className="mt-2 text-sm text-slate-300 line-clamp-3">
                {movie.synopsis}
              </p>
              <Link
                to={`/movie/${movie.id}`}
                className="mt-4 inline-flex items-center text-sm text-primary hover:text-primary/80"
              >
                Xem chi tiết →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
