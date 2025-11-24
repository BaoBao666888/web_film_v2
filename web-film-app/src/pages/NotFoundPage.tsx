import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
        404
      </div>
      <h1 className="mt-6 text-3xl font-bold text-white">
        Trang bạn tìm không tồn tại
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Có thể tính năng đang trong quá trình phát triển. Vui lòng quay lại
        trang chủ hoặc chọn một mục khác.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-glow hover:bg-primary/90"
        >
          Về trang chủ
        </Link>
        <Link
          to="/recommend"
          className="rounded-full border border-white/20 px-5 py-2 text-sm text-white hover:border-primary hover:text-primary"
        >
          Gợi ý AI
        </Link>
      </div>
    </div>
  );
}
