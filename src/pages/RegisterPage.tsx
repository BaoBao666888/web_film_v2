import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

export function RegisterPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Đăng ký"
        description="Tạo tài khoản để lưu playlist, đồng bộ thiết bị và nhận gợi ý cá nhân hóa."
      />

      <form className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Họ tên
            </label>
            <input
              type="text"
              placeholder="Nguyễn Minh Anh"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Biệt danh (hiển thị)
            </label>
            <input
              type="text"
              placeholder="minhanh.07"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Email
          </label>
          <input
            type="email"
            placeholder="ban@domain.com"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Thể loại yêu thích
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {["Hành động", "Lãng mạn", "Sci-fi", "Drama", "Hoạt hình", "Hài hước"].map(
              (genre) => (
                <label
                  key={genre}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-slate-200"
                >
                  <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-dark/70" />
                  {genre}
                </label>
              )
            )}
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
        >
          Tạo tài khoản
        </button>

        <p className="text-xs text-slate-400">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-primary">
            Đăng nhập
          </Link>
        </p>
        <p className="text-[11px] text-slate-500">
          Ghi chú: Form đăng ký chưa kết nối API. Cần thêm validation client +
          gửi yêu cầu tới `/auth/register`.
        </p>
      </form>
    </div>
  );
}
