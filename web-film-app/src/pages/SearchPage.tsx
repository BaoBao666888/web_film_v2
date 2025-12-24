import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { featuredMovies, moods } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import type { MovieListResponse, Movie } from "../types/api";

const quickQueries = [
  "Phim hành động nhẹ nhàng",
  "Drama chuyển nghề cảm động",
  "Sci-fi mind-blowing",
  "Phim gia đình vui vẻ",
];

export function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [keyword, setKeyword] = useState("");
  const { data, loading, error } = useFetch<MovieListResponse>(
    keyword
      ? `/movies?q=${encodeURIComponent(keyword)}`
      : "/movies?limit=6",
    [keyword]
  );

  const results = useMemo<Movie[]>(() => {
    if (data?.items?.length) {
      return data.items;
    }
    // Khi không nhập từ khóa: hiển thị gợi ý mặc định
    if (!keyword) {
      return featuredMovies.slice(0, 3);
    }
    // Khi có từ khóa nhưng không có kết quả: trả về rỗng để hiện thông báo "không có"
    return [];
  }, [data, keyword]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(inputValue.trim());
  };

  const handleQuickQuery = (value: string) => {
    setInputValue(value);
    setKeyword(value);
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Tìm kiếm thông minh"
        description="Nhập từ khóa hoặc mô tả tự nhiên để AI hiểu chính xác mood bạn muốn."
      />

      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/25 sm:p-6">
          <form onSubmit={handleSubmit}>
            <label htmlFor="query" className="text-sm text-slate-300">
              Câu truy vấn / từ khóa
            </label>
            <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-white/20 bg-dark/60 p-3 shadow-inner shadow-black/40 sm:flex-row sm:items-center sm:rounded-full sm:p-2">
              <input
                id="query"
                name="query"
                placeholder="Ví dụ: 'Tôi muốn xem phim trinh thám căng thẳng nhưng kết thúc lạc quan'"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-dark transition hover:bg-primary/90 sm:w-auto sm:rounded-full"
              >
                Tìm kiếm
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Khi chưa nhập gì, hệ thống hiển thị đề xuất nổi bật để bạn bắt đầu nhanh.
            </p>
          </form>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Gợi ý nhanh
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {quickQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => handleQuickQuery(query)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-primary hover:text-primary"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Tâm trạng hiện tại?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {moods.map((mood) => (
                <span
                  key={mood}
                  onClick={() => handleQuickQuery(mood)}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
                >
                  #{mood}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/25 sm:p-6">
          <p className="text-sm font-semibold text-white">Mẹo tìm kiếm nhanh</p>
          <div className="rounded-2xl bg-dark/60 p-6 text-sm text-slate-300">
            <p>- Nêu rõ mood (vui, căng thẳng, chill) và thể loại.</p>
            <p className="mt-2">
              - Thêm bối cảnh xem phim: một mình, gia đình, hoặc cuối tuần.
            </p>
            <p className="mt-2">
              - Nếu có phim mẫu, nhập tên để hệ thống gợi ý tương tự.
            </p>
          </div>
        </aside>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Kết quả tìm kiếm
          </h3>
          {keyword && (
            <p className="text-xs text-slate-400">
              Từ khóa: <span className="text-white">{keyword}</span>
            </p>
          )}
        </div>
        {loading && <p className="text-slate-400">Đang tìm kiếm…</p>}
        {error && <p className="text-red-400">Lỗi: {error}</p>}
        {results.length === 0 && !loading && !error ? (
          <p className="mt-4 text-sm text-slate-400">
            Không tìm thấy kết quả cho từ khóa của bạn. Thử cụm từ khác nhé.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {results.map((movie) => (
              <article
                key={movie.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-primary/80"
              >
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="h-40 w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-lg font-semibold text-white">
                    {movie.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {movie.moods?.join(" • ")}
                  </p>
                  <p className="mt-3 flex-1 text-sm text-slate-200">
                    {movie.synopsis}
                  </p>
                  <Link
                    to={`/movie/${movie.id}`}
                    className="mt-4 inline-flex items-center text-sm text-primary transition hover:text-primary/80"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
