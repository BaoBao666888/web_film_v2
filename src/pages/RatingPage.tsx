import { PageHeader } from "../components/PageHeader";
import { featuredMovies } from "../data/movies";

export function RatingPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Đánh giá & phản hồi"
        description="Giao diện ghi nhận rating, cảm xúc sau khi xem phim. Dữ liệu này đẩy về service AI để cải thiện gợi ý."
      />

      <section className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <form className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Chọn phim
            </label>
            <select className="mt-2 w-full rounded-xl border border-white/10 bg-dark/70 px-4 py-3 text-sm text-white outline-none">
              {featuredMovies.map((movie) => (
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
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className="h-12 w-12 rounded-2xl border border-white/10 bg-dark/60 text-sm font-semibold text-slate-200 transition hover:border-primary hover:text-primary"
                >
                  {score}
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
              placeholder="Ví dụ: phim hành động nhưng nhẹ nhàng, hoặc hoạt hình ấm áp..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
          >
            Ghi nhận phản hồi
          </button>
          <p className="text-xs text-slate-500">
            Dữ liệu sẽ xuất hiện trong dashboard thống kê cảm xúc và cập nhật
            playlist gợi ý.
          </p>
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
              - Kết nối API `POST /ratings` khi backend sẵn sàng.
            </p>
            <p className="mt-1">- Thêm loading state & thông báo thành công.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
