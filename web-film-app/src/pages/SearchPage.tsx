import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { featuredMovies, moods } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import type { MovieListResponse } from "../types/api";

/* =========================
   TYPE RIÊNG CHO SEARCH
========================= */
type SearchCardMovie = {
  id: string;
  title: string;
  thumbnail: string;
  synopsis: string;
  moods?: string[];
};

type AiSearchResponse = {
  query: string;
  count: number;
  results: {
    id: string;
    title: string;
    text: string;
    thumbnail?: string;
    poster?: string;
  }[];
};
/* ========================= */

const AI_SEARCH_URL = "http://localhost:5001/api/search";

const quickQueries = [
  "Phim hành động nhẹ nhàng",
  "Drama cảm động",
  "Anime cho gia đình",
  "Phim kinh dị nhưng không quá máu me",
];

export function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [keyword, setKeyword] = useState("");

  /* =========================
     FETCH DATA
  ========================= */
  const { data, loading, error } = useFetch<
    MovieListResponse | AiSearchResponse
  >(
    keyword
      ? `${AI_SEARCH_URL}?q=${encodeURIComponent(keyword)}&top_k=5`
      : "/movies?limit=6",
    [keyword]
  );

  /* =========================
     MAP DATA → UI MODEL
  ========================= */
  const results = useMemo<SearchCardMovie[]>(() => {
    // 1️⃣ Chưa nhập → phim gợi ý
    if (!keyword) {
      return featuredMovies.slice(0, 3).map((m: any) => ({
        id: m.id,
        title: m.title,
        thumbnail: m.thumbnail || m.poster || "",
        synopsis: m.synopsis || "",
        moods: m.moods || [],
      }));
    }

    // 2️⃣ AI SEARCH
    if (data && "results" in data) {
      return data.results.map((r) => ({
        id: r.id,
        title: r.title,
        thumbnail: r.thumbnail || r.poster || "",
        synopsis: r.text || "",
        moods: [],
      }));
    }

    // 3️⃣ fallback /movies
    if (data && "items" in data && data.items?.length) {
      return data.items.map((m: any) => ({
        id: m.id,
        title: m.title,
        thumbnail: m.thumbnail || m.poster || "",
        synopsis: m.synopsis || "",
        moods: m.moods || [],
      }));
    }

    return [];
  }, [data, keyword]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        description="Nhập câu tự nhiên, AI tự hiểu bạn muốn xem gì."
      />

      {/* SEARCH BOX */}
      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <form onSubmit={handleSubmit}>
            <label className="text-sm text-slate-300">
              Câu truy vấn / từ khóa
            </label>
            <div className="mt-2 flex gap-3 rounded-full border border-white/20 bg-dark/60 p-2">
              <input
                placeholder="VD: tôi muốn xem phim hoạt hình cho gia đình"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white outline-none"
              />
              <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark">
                Tìm kiếm
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-3">
            {quickQueries.map((q) => (
              <button
                key={q}
                onClick={() => handleQuickQuery(q)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:text-primary"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section>
        <h3 className="text-lg font-semibold text-white">
          Kết quả tìm kiếm
        </h3>

        {loading && <p className="text-slate-400">Đang tìm kiếm…</p>}
        {error && <p className="text-red-400">Lỗi: {error}</p>}

        {!loading && keyword && results.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Không tìm thấy kết quả phù hợp.
          </p>
        )}

        <div className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {results.map((movie) => (
            <article
              key={movie.id}
              className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden"
            >
              <img
                src={movie.thumbnail}
                className="h-40 w-full object-cover"
              />
              <div className="p-5">
                <p className="text-lg font-semibold text-white">
                  {movie.title}
                </p>
                <p className="mt-3 text-sm text-slate-200">
                  {movie.synopsis}
                </p>
                <Link
                  to={`/movie/${movie.id}`}
                  className="mt-4 inline-block text-primary"
                >
                  Xem chi tiết →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
