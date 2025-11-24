import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const response = await api.auth.login({ email, password });

      // Lưu thông tin đăng nhập vào localStorage
      localStorage.setItem("authToken", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      setStatus(`Đăng nhập thành công! Xin chào ${response.user.name}`);

      // Redirect về trang chủ và reload sau 1.5 giây
      setTimeout(() => {
        navigate("/", { replace: true });
        window.location.reload();
      }, 1500);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Đăng nhập thất bại, thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Đăng nhập"
        description="Truy cập nền tảng để đồng bộ playlist và trải nghiệm đầy đủ các tính năng AI."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30"
      >
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@domain.com"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Mật khẩu
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-dark/70"
            />
            Ghi nhớ đăng nhập
          </label>
          <Link to="#" className="text-primary">
            Quên mật khẩu?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
        <p className="text-xs text-slate-400">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="text-primary">
            Đăng ký ngay
          </Link>
        </p>
        {status && (
          <div
            className={`p-3 rounded-xl text-sm ${
              status.includes("thành công")
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
