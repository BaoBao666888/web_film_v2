import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setStatus("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const response = await api.auth.register({ name, email, password });

      // Lưu thông tin đăng nhập vào localStorage
      localStorage.setItem("authToken", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      setStatus(`Tạo tài khoản thành công! Xin chào ${response.user.name}`);

      // Redirect về trang chủ và reload sau 1.5 giây
      setTimeout(() => {
        navigate("/", { replace: true });
        window.location.reload();
      }, 1500);
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Không thể đăng ký, vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Đăng ký"
        description="Tạo tài khoản để lưu playlist, đồng bộ thiết bị và nhận gợi ý cá nhân hóa."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Họ tên
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {[
              "Hành động",
              "Lãng mạn",
              "Sci-fi",
              "Drama",
              "Hoạt hình",
              "Hài hước",
            ].map((genre) => (
              <label
                key={genre}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-dark/70"
                />
                {genre}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Đang tạo..." : "Tạo tài khoản"}
        </button>

        <p className="text-xs text-slate-400">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-primary">
            Đăng nhập
          </Link>
        </p>
        {status && <p className="text-[11px] text-emerald-400">{status}</p>}
      </form>
    </div>
  );
}
