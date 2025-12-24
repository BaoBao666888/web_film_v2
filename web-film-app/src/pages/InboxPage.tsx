import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import type { InboxResponse, InboxMessage } from "../types/api";
import { api } from "../lib/api";

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN");
};

const labelForSender = (message: InboxMessage) => {
  if (message.senderType === "bot") return "Bot Lumi";
  return message.senderName || "Admin";
};

export function InboxPage() {
  const { isAuthenticated } = useAuth();
  const { data, loading, error } = useFetch<InboxResponse>(
    isAuthenticated ? "/notifications" : null,
    [isAuthenticated]
  );

  const messages = useMemo(() => data?.items ?? [], [data?.items]);
  const markedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !messages.length || markedRef.current) return;
    markedRef.current = true;
    api.notifications
      .markRead()
      .then(() => {
        window.dispatchEvent(new CustomEvent("inbox:read"));
      })
      .catch(() => {
        markedRef.current = false;
      });
  }, [isAuthenticated, messages.length]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
        Bạn cần đăng nhập để xem hộp thư.
        <div className="mt-4">
          <Link
            to="/login"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
          Hộp thư
        </p>
        <h1 className="text-2xl font-semibold text-white">
          Thông báo từ Admin & Bot
        </h1>
        <p className="text-sm text-slate-400">
          Tất cả thông điệp quản trị và cập nhật hệ thống cho tài khoản của bạn.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
        {loading && (
          <div className="text-sm text-slate-400">Đang tải hộp thư...</div>
        )}
        {error && (
          <div className="text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="text-sm text-slate-400">
            Chưa có thông báo nào.
          </div>
        )}
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {labelForSender(message)}
                  </span>
                  {message.title && (
                    <span className="text-sm font-semibold text-white">
                      {message.title}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-200 whitespace-pre-line">
                {message.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
