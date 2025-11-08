import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl shadow-black/30">
      <p className="text-lg font-semibold text-white">
        Đang chuẩn bị đăng xuất...
      </p>
      <p className="mt-3 text-sm text-slate-300">
        Khi backend có session thật, trang này sẽ gọi API đăng xuất và xoá token
        trước khi chuyển về trang chủ.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-glow hover:bg-primary/90"
      >
        Về trang chủ ngay
      </Link>
    </div>
  );
}
