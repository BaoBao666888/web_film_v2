import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";

export function AdminAddMoviePage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Thêm phim mới"
        description="Form nhập liệu chi tiết để đẩy phim lên hệ thống. Hiện tại dùng để mô phỏng luồng thao tác."
        actions={
          <Link
            to="/admin/manage"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
          >
            Quay lại quản lý
          </Link>
        }
      />

      <form className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Tên phim
            </label>
            <input
              type="text"
              placeholder="Tên phim..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Đạo diễn
            </label>
            <input
              type="text"
              placeholder="Tên đạo diễn"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Năm sản xuất
            </label>
            <input
              type="number"
              placeholder="2025"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Thời lượng
            </label>
            <input
              type="text"
              placeholder="1h 55m"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Rating IMDb
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="4.5"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Thể loại
          </label>
          <input
            type="text"
            placeholder="Hành động, Khoa học viễn tưởng..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Mô tả
          </label>
          <textarea
            rows={4}
            placeholder="Tóm tắt nội dung..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Link poster
            </label>
            <input
              type="url"
              placeholder="https://..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Link trailer
            </label>
            <input
              type="url"
              placeholder="https://youtube.com/..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <button
          type="button"
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
        >
          Lưu phim
        </button>
        <p className="text-xs text-slate-500">
          Ghi chú: Form sẽ gửi dữ liệu tới API `/admin/movies` (method POST) và
          hiển thị thông báo thành công. Hiện mới mô phỏng UI.
        </p>
      </form>
    </div>
  );
}
