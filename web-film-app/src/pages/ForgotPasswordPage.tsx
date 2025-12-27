import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await api.auth.requestPasswordReset({ email });
      setStatus("Đã gửi mã xác thực về email (nếu email tồn tại trong hệ thống).");
      setStep(2);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Gửi mã thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await api.auth.resetPasswordWithCode({ email, code, newPassword });
      setStatus("Đổi mật khẩu thành công! Đang quay về đăng nhập...");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Đổi mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Quên mật khẩu"
        description="Nhập email để nhận mã xác thực và tạo mật khẩu mới."
      />

      {step === 1 ? (
        <form onSubmit={sendCode} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="ban@domain.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Đang gửi..." : "Gửi mã xác thực"}
          </button>

          {status && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">{status}</div>}
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Mã xác thực (6 số)</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
              placeholder="123456"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              placeholder="••••••••"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-1/3 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
          </div>

          {status && <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">{status}</div>}
        </form>
      )}
    </div>
  );
}
