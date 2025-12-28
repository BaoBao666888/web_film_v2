import { useMemo, useState } from "react";
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
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, loading, error } = useFetch<InboxResponse>(
    isAuthenticated
      ? `/notifications?page=${page}&limit=${pageSize}`
      : null,
    [isAuthenticated, page]
  );

  const messages = useMemo(() => data?.items ?? [], [data?.items]);
  const unreadMessages = useMemo(
    () => messages.filter((message) => !message.readAt),
    [messages]
  );
  const readMessages = useMemo(
    () => messages.filter((message) => message.readAt),
    [messages]
  );
  const meta = data?.meta;
  const canPrev = page > 1;
  const canNext = meta?.totalPages ? page < meta.totalPages : false;

  const markAllRead = async () => {
    try {
      await api.notifications.markRead();
      window.dispatchEvent(new CustomEvent("inbox:read"));
    } catch {
      // ignore
    }
  };

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Tổng: {meta?.totalItems ?? messages.length} thông báo
          </p>
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:border-primary hover:text-primary"
          >
            Đánh dấu đã đọc
          </button>
        </div>
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
        <div className="mt-4 space-y-6">
          {unreadMessages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                Chưa đọc
              </p>
              {unreadMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {labelForSender(message)}
                      </span>
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Chưa đọc
                      </span>
                      {message.title && (
                        <span className="text-sm font-semibold text-white">
                          {message.title}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200 whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {readMessages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Đã đọc
              </p>
              {readMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200 opacity-80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {labelForSender(message)}
                      </span>
                      {message.title && (
                        <span className="text-sm font-semibold text-white">
                          {message.title}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && !error && (unreadMessages.length > 0 || readMessages.length > 0) && (
          <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
            <span>
              Trang {meta?.page || page} / {meta?.totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!canPrev}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:border-primary hover:text-primary disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={!canNext}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:border-primary hover:text-primary disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
