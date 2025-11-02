import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { featuredMovies } from "../data/movies";

export function ProfilePage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Hồ sơ của Minh Anh"
        description="Thông tin cá nhân, phim yêu thích và lịch sử xem. Phần này sẽ đồng bộ với backend auth sau."
        actions={
          <Link
            to="/logout"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
          >
            Đăng xuất
          </Link>
        }
      />

      <section className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl text-primary">
              MA
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Minh Anh</p>
              <p className="text-xs text-slate-400">minhanh@example.com</p>
            </div>
          </div>
          <div className="grid gap-3 text-xs text-slate-300">
            <p>
              • Thành viên từ: <span className="text-white">03/2023</span>
            </p>
            <p>
              • Gói sử dụng: <span className="text-primary">Premium AI</span>
            </p>
            <p>• Mood yêu thích: Khoa học viễn tưởng, Lãng mạn</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs text-slate-200">
            <p className="font-semibold text-white">Ghi chú triển khai</p>
            <p className="mt-2">
              - Sẽ gọi API `/me` để lấy thông tin thực tế và hiển thị động.
            </p>
            <p className="mt-1">- Thêm khả năng chỉnh sửa avatar, mật khẩu.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <p className="text-sm font-semibold text-white">Phim yêu thích</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {featuredMovies.map((movie) => (
                <Link
                  key={movie.id}
                  to={`/movie/${movie.id}`}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-dark/60 p-3 transition hover:border-primary/80"
                >
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="h-20 w-16 rounded-xl object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {movie.title}
                    </p>
                    <p className="text-xs text-slate-300">
                      {movie.genres.join(" • ")}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Rating gần nhất: 4.{Math.floor(Math.random() * 3 + 2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <p className="text-sm font-semibold text-white">Lịch sử xem gần đây</p>
            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-300">
              {featuredMovies.map((movie) => (
                <p
                  key={`history-${movie.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-dark/50 px-4 py-3"
                >
                  <span>{movie.title}</span>
                  <span className="text-slate-500">
                    Đã xem: {new Date().toLocaleDateString("vi-VN")}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
