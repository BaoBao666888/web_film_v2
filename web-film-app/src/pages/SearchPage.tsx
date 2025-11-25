import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { featuredMovies, moods } from "../data/movies";
import { useFetch } from "../hooks/useFetch";
import type { MovieListResponse, Movie } from "../types/api";

// ✅ API AI search (Flask) – chỉnh lại nếu bạn dùng port khác
const AI_SEARCH_URL = "http://127.0.0.1:5001/api/search";

const quickQueries = [
  "Phim hành động nhẹ nhàng",
  "Drama chuyển nghề cảm động",
  "Sci-fi mind-blowing",
  "Phim gia đình vui vẻ",
];

type AiSearchItem = {
  id: string;
  title: string;
  score: number;
  text: string;
  thumbnail?: string;
  poster?: string;

};

type AiSearchResponse = {
  query: string;
  count: number;
  results: AiSearchItem[];
};

/**
 * Heuristic:
 * - Câu dài / nhiều từ
 * - Có . ! ?
 * - Có từ khóa kiểu: phim, buồn, vui, tâm trạng, gia đình, kinh dị...
 * => xem như truy vấn tự nhiên → dùng AI search
 */
function looksLikeNaturalQuery(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (trimmed.length >= 40) return true;
  if (/[.!?]/.test(trimmed)) return true;

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 6) return true;

  if (
    /phim|buồn|vui|tâm trạng|mood|căng thẳng|kinh dị|hài|gia đình|lãng mạn|tình cảm/i.test(
      trimmed
    )
  ) {
    return true;
  }

  return false; // còn lại coi như tên phim
}

export function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [keyword, setKeyword] = useState("");

  // ✅ state cho AI mode
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState<Movie[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ✅ fetch search cũ theo tên phim
  const { data, loading, error } = useFetch<MovieListResponse>(
    keyword ? `/movies?q=${encodeURIComponent(keyword)}` : "/movies?limit=6",
    [keyword]
  );

  const normalResults = useMemo<Movie[]>(() => {
    if (data?.items?.length) {
      return data.items;
    }
    return featuredMovies.slice(0, 3);
  }, [data]);

  // ✅ chọn kết quả hiển thị
  const results = aiMode ? aiResults : normalResults;
  const isLoading = aiMode ? aiLoading : loading;
  const errorMessage = aiMode ? aiError : error;

  // ✅ gọi API Flask semantic search
  const runAiSearch = async (query: string) => {
    setAiMode(true);
    setAiLoading(true);
    setAiError(null);
    setAiResults([]);

    try {
      const res = await fetch(
        `${AI_SEARCH_URL}?q=${encodeURIComponent(query)}&top_k=10`
      );
      if (!res.ok) {
        const msg = `HTTP ${res.status}`;
        setAiError(msg);
        setAiLoading(false);
        return;
      }

      const json: AiSearchResponse = await res.json();

      // ✅ Map kết quả AI → Movie (đầy đủ field bắt buộc)
      const mapped: Movie[] = json.results.map((item) => {
        const synopsis = item.text || "";
        const tags: string[] = [];

        // ưu tiên dùng thumbnail/poster backend trả về
        const thumb =
          item.thumbnail && item.thumbnail.length > 0
            ? item.thumbnail
            : "/images/placeholder-thumb.jpg";

        const poster =
          item.poster && item.poster.length > 0 ? item.poster : thumb; // fallback dùng thumb

        return {
          // MovieSummary
          id: item.id,
          title: item.title,
          thumbnail: thumb,
          duration: undefined,
          tags,

          // Movie
          slug: item.id,
          synopsis,
          year: 0,
          rating: 0,
          poster,
          trailerUrl: undefined,
          videoUrl: undefined,
          videoType: undefined,
          videoHeaders: undefined,
          moods: [],
          cast: [],
         director: "",
      };
    });


      setAiResults(mapped);
    } catch (e: any) {
      setAiError(e?.message ?? "Lỗi kết nối AI search");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = inputValue.trim();
    if (!q) return;

    setKeyword(q);

    if (looksLikeNaturalQuery(q)) {
      // ✅ câu mô tả → AI
      void runAiSearch(q);
    } else {
      // ✅ tên phim → search cũ /movies
      setAiMode(false);
      setAiResults([]);
      setAiError(null);
    }
  };

  const handleQuickQuery = (value: string) => {
    setInputValue(value);
    setKeyword(value);
    void runAiSearch(value);
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Tìm kiếm thông minh"
        description={
          aiMode
            ? "AI đang được dùng cho các truy vấn mô tả tự nhiên (mood, nội dung, cảm xúc). Nếu chỉ gõ tên phim, hệ thống vẫn dùng search theo tiêu đề như cũ."
            : "Nhập từ khóa hoặc mô tả tự nhiên. Câu dài / phức tạp sẽ dùng AI semantic search, còn tên phim ngắn sẽ search trực tiếp trong danh sách phim."
        }
      />

      {/* FORM + INFO */}
      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <form onSubmit={handleSubmit}>
            <label htmlFor="query" className="text-sm text-slate-300">
              Câu truy vấn / từ khóa
            </label>
            <div className="mt-2 flex rounded-full border border-white/20 bg-dark/60 p-2 shadow-inner shadow-black/40">
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
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark transition hover:bg-primary/90"
              >
                Tìm kiếm
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              • Câu dài / mô tả mood → gọi AI tại{" "}
              <code>{AI_SEARCH_URL}</code>. <br />
              • Tên phim ngắn (vd: <code>Logan</code>,{" "}
              <code>Harry Potter</code>) → gọi <code>/movies?q=...</code> như
              cũ.
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
              {moods.map((m) => (
                <span
                  key={m}
                  onClick={() => handleQuickQuery(m)}
                  className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
                >
                  #{m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25">
          <p className="text-sm font-semibold text-white">
            Bản đồ dữ liệu tìm kiếm
          </p>
          <div className="rounded-2xl bg-dark/60 p-6 text-sm text-slate-300">
            <p>
              - Truy vấn là một câu tự nhiên → gửi đến service AI (Flask) để
              chuyển sang vector ngữ nghĩa và so khớp với mô tả phim.
            </p>
            <p className="mt-2">
              - Truy vấn giống tên phim → dùng API <code>/movies</code> để tìm
              trực tiếp theo tiêu đề, đảm bảo tốc độ và độ chính xác.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Nhớ chạy backend AI: <code>python api_search.py</code> (port
              5001).
            </p>
          </div>
        </aside>
      </section>

      {/* KẾT QUẢ */}
      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Kết quả tìm kiếm
          </h3>
          {keyword && (
            <p className="text-xs text-slate-400">
              Từ khóa: <span className="text-white">{keyword}</span>
              {aiMode && (
                <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                  AI semantic
                </span>
              )}
            </p>
          )}
        </div>

        {isLoading && (
          <p className="mt-3 text-sm text-slate-400">Đang tìm kiếm…</p>
        )}
        {errorMessage && (
          <p className="mt-3 text-sm text-red-400">Lỗi: {errorMessage}</p>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-3">
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
                {movie.moods && movie.moods.length > 0 && (
                  <p className="mt-1 text-xs text-slate-300">
                    {movie.moods.join(" • ")}
                  </p>
                )}
                <p className="mt-3 flex-1 text-sm text-slate-200">
                  {movie.synopsis}
                </p>
                <Link
                  to={`/movie/${movie.slug || movie.id}`}
                  className="mt-4 inline-flex items-center text-sm text-primary transition hover:text-primary/80"
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
