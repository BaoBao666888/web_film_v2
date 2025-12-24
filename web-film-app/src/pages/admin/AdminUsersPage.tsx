import { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type { AdminUsersResponse } from "../../types/api";
import { api } from "../../lib/api";

export function AdminUsersPage() {
  const { data, loading, error } = useFetch<AdminUsersResponse>("/admin/users");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [senderType, setSenderType] = useState<"admin" | "bot">("admin");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const users = useMemo(() => {
    const list = data?.users ?? [];
    if (!search.trim()) return list;
    return list.filter(
      (user) =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [data?.users, search]);

  const allSelected = users.length > 0 && selectedIds.length === users.length;

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedIds(users.map((user) => user.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const sendNotification = async () => {
    if (!selectedIds.length) {
      setSendStatus({ type: "error", message: "Vui lòng chọn ít nhất một người nhận." });
      return;
    }
    if (!messageContent.trim()) {
      setSendStatus({ type: "error", message: "Nội dung thông báo không được trống." });
      return;
    }
    setSending(true);
    setSendStatus(null);
    try {
      const result = await api.admin.sendNotifications({
        userIds: selectedIds,
        title: messageTitle.trim() || undefined,
        content: messageContent.trim(),
        senderType,
      });
      setSendStatus({
        type: "success",
        message: `Đã gửi ${result.sent} thông báo.`,
      });
      setMessageTitle("");
      setMessageContent("");
      setSelectedIds([]);
    } catch (err) {
      setSendStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gửi thông báo thất bại.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Quản lý người dùng"
        description="Giám sát tài khoản, phân quyền và gửi thông báo nhanh."
      />

      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, email..."
              className="w-72 rounded-full border border-white/10 bg-dark/60 px-4 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button
              onClick={() => setSearch("")}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
            >
              Xoá lọc
            </button>
          </div>
          <button className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary">
            Xuất CSV
          </button>
        </div>

        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Gửi thông báo</p>
              <p className="text-xs text-slate-400">
                Chọn người nhận từ danh sách và gửi thông báo trong hộp thư.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Đã chọn:</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                {selectedIds.length}
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-primary hover:text-primary"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-primary hover:text-primary"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <div className="space-y-3">
              <input
                value={messageTitle}
                onChange={(event) => setMessageTitle(event.target.value)}
                placeholder="Tiêu đề (tuỳ chọn)"
                className="w-full rounded-xl border border-white/10 bg-dark/60 px-4 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <textarea
                value={messageContent}
                onChange={(event) => setMessageContent(event.target.value)}
                placeholder="Nội dung gửi tới người dùng..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-dark/60 px-4 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs text-slate-400">Nguồn gửi</p>
                <select
                  value={senderType}
                  onChange={(event) => setSenderType(event.target.value as "admin" | "bot")}
                  className="w-full rounded-xl border border-white/10 bg-dark/60 px-4 py-2 text-sm text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="bot">Bot</option>
                </select>
              </div>
              <button
                type="button"
                disabled={sending}
                onClick={sendNotification}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
              >
                {sending ? "Đang gửi..." : "Gửi thông báo"}
              </button>
              {sendStatus && (
                <p
                  className={`text-xs ${
                    sendStatus.type === "success" ? "text-emerald-300" : "text-red-400"
                  }`}
                >
                  {sendStatus.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => (event.target.checked ? selectAll() : clearSelection())}
                    className="h-4 w-4 accent-primary"
                  />
                </th>
                <th className="px-6 py-4">Tên</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Ngày tham gia</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-slate-400">
                    Đang tải người dùng…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-red-400">
                    {error}
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-white/10 transition hover:bg-white/5"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{user.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    Hoạt động
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("vi-VN")
                      : "..."}
                  </td>
                  <td className="px-6 py-4 text-right text-xs">
                    <button className="mr-2 rounded-full border border-white/20 px-3 py-1 text-slate-200 hover:border-primary hover:text-primary">
                      Đổi quyền
                    </button>
                    <button className="rounded-full border border-red-400/40 px-3 py-1 text-red-300 hover:bg-red-500/10">
                      Khoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Ghi chú: Khi khoá tài khoản sẽ yêu cầu xác nhận trước khi áp dụng.
        </p>
      </div>
    </div>
  );
}
