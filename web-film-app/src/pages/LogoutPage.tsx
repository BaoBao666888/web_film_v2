import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LogoutPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    // Đăng xuất ngay lập tức
    logout();

    const timer = setTimeout(() => {
      navigate("/", { replace: true });
      window.location.reload();
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, logout]);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl shadow-black/30">
      <p className="text-lg font-semibold text-white">
        Đã đăng xuất thành công!
      </p>
      <p className="mt-3 text-sm text-slate-300">
        Bạn sẽ được chuyển về trang chủ trong vài giây. Cảm ơn bạn đã sử dụng
        Lumi AI Cinema!
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
