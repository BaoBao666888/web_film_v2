import { Link } from "react-router-dom";
import { aiPlaylists, featuredMovies } from "../data/movies";
import { StatusBadge } from "../components/StatusBadge";

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-secondary/60 to-dark p-10 shadow-xl shadow-black/30">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <StatusBadge label="Bản thử nghiệm có AI" tone="info" />
            <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
              Xem phim theo mood, gợi ý tức thì bằng AI
            </h2>
            <p className="mt-3 text-base text-slate-200">
              Khám phá bộ sưu tập được cá nhân hóa dựa trên lịch sử xem, đánh
              giá và cảm xúc của bạn. Chatbot hiểu tiếng Việt tự nhiên, gợi ý
              chuẩn vibe bạn cần.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/recommend"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
              >
                Bắt đầu gợi ý AI
              </Link>
              <Link
                to="/chat"
                className="rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
              >
                Trải nghiệm chatbot
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-400">
              Ghi chú: Dữ liệu demo để mô phỏng luồng trải nghiệm. Backend sẽ
              kết nối sau khi hoàn tất giao diện.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-3xl" />
            <div className="relative space-y-4">
              {featuredMovies.slice(0, 2).map((movie) => (
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
                      {movie.genres.join(" • ")} · {movie.duration}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {movie.moods.map((mood) => (
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

      <section>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold text-white">
            Xu hướng tuần này
          </h3>
          <Link
            to="/search"
            className="text-sm text-slate-300 transition hover:text-primary"
          >
            Khám phá thêm
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredMovies.map((movie) => (
            <Link
              to={`/movie/${movie.id}`}
              key={movie.id}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-primary/80"
            >
              <img
                src={movie.thumbnail}
                alt={movie.title}
                className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="space-y-2 p-5">
                <div className="flex items-center gap-2">
                  {movie.isTrending && (
                    <StatusBadge label="Hot" tone="warning" />
                  )}
                  {movie.isNew && <StatusBadge label="Mới" tone="success" />}
                </div>
                <p className="text-lg font-semibold text-white">
                  {movie.title}
                </p>
                <p className="text-xs text-slate-300">
                  {movie.genres.join(" • ")}
                </p>
                <p className="text-sm text-slate-200 line-clamp-2">
                  {movie.description}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{movie.year}</span>
                  <span>{movie.rating.toFixed(1)} ★ IMDb</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold text-white">AI Mood Playlist</h3>
          <Link
            to="/recommend"
            className="text-sm text-slate-300 transition hover:text-primary"
          >
            Xem tất cả playlist
          </Link>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {aiPlaylists.map((playlist) => (
            <div
              key={playlist.id}
              className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${playlist.gradient} p-6 shadow-lg shadow-black/20`}
            >
              <div className="text-4xl">{playlist.icon}</div>
              <p className="mt-4 text-lg font-semibold text-white">
                {playlist.title}
              </p>
              <p className="mt-2 text-sm text-slate-100">
                {playlist.description}
              </p>
              <Link
                to="/recommend"
                className="mt-5 inline-flex items-center text-sm font-medium text-white transition hover:text-dark/80"
              >
                Mở playlist →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
