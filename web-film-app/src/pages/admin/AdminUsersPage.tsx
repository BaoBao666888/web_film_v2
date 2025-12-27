import { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type {
  AdminUsersResponse,
  AdminWalletLedgerResponse,
  WalletLedgerEntry,
} from "../../types/api";
import { api } from "../../lib/api";

const formatVnd = (value?: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value ?? 0)} VNĐ`;

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN");
};

export function AdminUsersPage() {
  const { data, loading, error, refetch } =
    useFetch<AdminUsersResponse>("/admin/users");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [balanceUser, setBalanceUser] =
    useState<AdminUsersResponse["users"][number] | null>(null);
  const [balanceMode, setBalanceMode] = useState<"add" | "reversal">("add");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");
  const [balanceRefId, setBalanceRefId] = useState("");
  const [reversalOptions, setReversalOptions] = useState<WalletLedgerEntry[]>([]);
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [balanceSubmitting, setBalanceSubmitting] = useState(false);
  const [balanceStatus, setBalanceStatus] =
    useState<{ type: "success" | "error"; message: string } | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);

  const {
    data: ledgerData,
    loading: ledgerLoading,
    error: ledgerError,
    refetch: refetchLedger,
  } = useFetch<AdminWalletLedgerResponse>(
    ledgerOpen ? `/admin/wallet-ledger?page=${ledgerPage}&limit=50` : null,
    [ledgerOpen, ledgerPage]
  );

  const users = useMemo(() => {
    const list = data?.users ?? [];
    if (!search.trim()) return list;
    return list.filter(
      (user) =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [data?.users, search]);

  const userMap = useMemo(
    () => new Map((data?.users ?? []).map((user) => [user.id, user])),
    [data?.users]
  );

  const ledgerItems = ledgerData?.items ?? [];
  const ledgerMeta = ledgerData?.meta;
  const canPrevLedger = ledgerPage > 1;
  const canNextLedger =
    ledgerMeta?.totalPages ? ledgerPage < ledgerMeta.totalPages : false;

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
        senderType: "admin",
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

  const openBalanceDialog = (user: AdminUsersResponse["users"][number]) => {
    setBalanceUser(user);
    setBalanceMode("add");
    setBalanceAmount("");
    setBalanceNote("");
    setBalanceStatus(null);
    setBalanceRefId("");
    setReversalOptions([]);
    setReversalLoading(false);
    setReversalError(null);
  };

  const loadReversalOptions = async (userId: string) => {
    setReversalLoading(true);
    setReversalError(null);
    try {
      const result = await api.admin.walletLedgerEligible(userId, 50);
      const items = result.items ?? [];
      setReversalOptions(items);
      const first = items[0];
      setBalanceRefId(first?.id || "");
      if (first) {
        setBalanceAmount(String(Math.abs(first.amount)));
      }
    } catch (err) {
      setReversalError(
        err instanceof Error ? err.message : "Không thể tải giao dịch."
      );
      setReversalOptions([]);
      setBalanceRefId("");
      setBalanceAmount("");
    } finally {
      setReversalLoading(false);
    }
  };

  const submitBalanceAdjust = async () => {
    if (!balanceUser) return;
    const amountValue = Number(balanceAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setBalanceStatus({ type: "error", message: "Số tiền không hợp lệ." });
      return;
    }
    if (!balanceNote.trim()) {
      setBalanceStatus({ type: "error", message: "Cần nhập lý do điều chỉnh." });
      return;
    }
    if (balanceMode === "reversal" && !balanceRefId) {
      setBalanceStatus({ type: "error", message: "Vui lòng chọn refId." });
      return;
    }
    const selectedRef = reversalOptions.find((entry) => entry.id === balanceRefId);
    if (balanceMode === "reversal" && !selectedRef) {
      setBalanceStatus({ type: "error", message: "Không tìm thấy ref hợp lệ." });
      return;
    }
    if (
      balanceMode === "reversal" &&
      selectedRef &&
      Math.abs(amountValue) > Math.abs(selectedRef.amount)
    ) {
      setBalanceStatus({
        type: "error",
        message: "Số tiền đảo không được lớn hơn giao dịch gốc.",
      });
      return;
    }
    const normalizedAmount = Math.trunc(amountValue);
    const displayAmount =
      balanceMode === "reversal" ? -Math.abs(normalizedAmount) : normalizedAmount;
    const payloadAmount =
      balanceMode === "reversal" ? Math.abs(normalizedAmount) : normalizedAmount;

    const confirmMessage = [
      "Xác nhận điều chỉnh số dư:",
      `User: ${balanceUser.name} (${balanceUser.email})`,
      `Hiện tại: ${formatVnd(balanceUser.balance)}`,
      `Thay đổi: ${formatVnd(displayAmount)}`,
      `Lý do: ${balanceNote.trim()}`,
    ].join("\n");

    if (!confirm(confirmMessage)) return;

    setBalanceSubmitting(true);
    setBalanceStatus(null);
    try {
      await api.admin.adjustUserBalance(balanceUser.id, {
        amount: payloadAmount,
        note: balanceNote.trim(),
        type: balanceMode === "reversal" ? "reversal" : "admin_adjust",
        refId: balanceMode === "reversal" ? balanceRefId : undefined,
      });
      setBalanceStatus({
        type: "success",
        message: "Đã điều chỉnh số dư.",
      });
      refetch();
      setBalanceUser(null);
    } catch (err) {
      setBalanceStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Không thể điều chỉnh số dư.",
      });
    } finally {
      setBalanceSubmitting(false);
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
          <button
            onClick={() => {
              setLedgerOpen(true);
              setLedgerPage(1);
            }}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
          >
            Xem sổ cái
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
              <div className="rounded-xl border border-white/10 bg-dark/60 px-3 py-3 text-xs text-slate-300">
                Nguồn gửi: <span className="font-semibold text-white">Admin</span>
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
                <th className="px-6 py-4">Số dư</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Ngày tham gia</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-slate-400">
                    Đang tải người dùng…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-red-400">
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
                    {formatVnd(user.balance)}
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
                    <button
                      onClick={() => openBalanceDialog(user)}
                      className="mr-2 rounded-full border border-white/20 px-3 py-1 text-slate-200 hover:border-primary hover:text-primary"
                    >
                      Thay đổi số dư
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

      {balanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-dark/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  Điều chỉnh số dư
                </p>
                <p className="text-xs text-slate-400">
                  {balanceUser.name} • {balanceUser.email}
                </p>
              </div>
              <button
                onClick={() => setBalanceUser(null)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-primary hover:text-primary"
              >
                Đóng
              </button>
            </div>

                <div className="mt-4 space-y-4 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-dark/70 px-4 py-3">
                Số dư hiện tại:{" "}
                <span className="font-semibold text-white">
                  {formatVnd(balanceUser.balance)}
                </span>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Hình thức
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {[
                    { value: "add", label: "Cộng tiền" },
                    { value: "reversal", label: "Đảo giao dịch" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const nextMode = option.value as "add" | "reversal";
                        setBalanceMode(nextMode);
                        if (nextMode === "reversal" && balanceUser) {
                          void loadReversalOptions(balanceUser.id);
                        }
                      }}
                      className={`rounded-2xl border px-3 py-2 text-xs transition ${
                        balanceMode === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/10 bg-dark/70 text-white hover:border-primary/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

                {balanceMode === "reversal" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-wide text-slate-400">
                        Ref ID (giao dịch gốc)
                      </label>
                      <select
                        value={balanceRefId}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          setBalanceRefId(nextId);
                          const entry = reversalOptions.find(
                            (item) => item.id === nextId
                          );
                          if (entry) {
                            setBalanceAmount(String(Math.abs(entry.amount)));
                          }
                        }}
                        disabled={reversalLoading}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-2 text-sm text-white outline-none disabled:opacity-50"
                      >
                        {reversalOptions.length === 0 && (
                          <option value="">
                            {reversalLoading ? "Đang tải..." : "Không có giao dịch phù hợp"}
                          </option>
                        )}
                        {reversalOptions.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.id}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {reversalLoading && "Đang tải giao dịch..."}
                        {reversalError && reversalError}
                        {!reversalLoading &&
                          !reversalError &&
                          balanceRefId &&
                          (() => {
                            const entry = reversalOptions.find(
                              (item) => item.id === balanceRefId
                            );
                            return entry
                              ? `Số tiền cộng: ${formatVnd(entry.amount)}`
                              : "";
                          })()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-slate-400">
                        Số tiền đảo (VNĐ)
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={balanceAmount}
                        onChange={(event) => setBalanceAmount(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-2 text-sm text-white outline-none"
                      />
                      <p className="mt-2 text-[11px] text-slate-500">
                        Không được lớn hơn số tiền giao dịch gốc.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-400">
                      Số tiền (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={balanceAmount}
                      onChange={(event) => setBalanceAmount(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-2 text-sm text-white outline-none"
                    />
                  </div>
                )}

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Lý do điều chỉnh
                </label>
                <textarea
                  value={balanceNote}
                  onChange={(event) => setBalanceNote(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-2 text-sm text-white outline-none"
                />
              </div>

              {balanceStatus && (
                <p
                  className={`text-xs ${
                    balanceStatus.type === "success"
                      ? "text-emerald-300"
                      : "text-red-400"
                  }`}
                >
                  {balanceStatus.message}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setBalanceUser(null)}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:border-primary hover:text-primary"
                >
                  Hủy
                </button>
                <button
                  onClick={submitBalanceAdjust}
                  disabled={balanceSubmitting}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {balanceSubmitting ? "Đang lưu..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ledgerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-dark/95 p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Sổ cái ví</p>
                <p className="text-xs text-slate-400">
                  Chỉ xem, không chỉnh sửa.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetchLedger()}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-primary hover:text-primary"
                >
                  Tải lại
                </button>
                <button
                  onClick={() => setLedgerOpen(false)}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-primary hover:text-primary"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-xs text-slate-200">
                <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Lý do</th>
                    <th className="px-4 py-3">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-slate-400">
                        Đang tải sổ cái...
                      </td>
                    </tr>
                  )}
                  {ledgerError && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-red-400">
                        {ledgerError}
                      </td>
                    </tr>
                  )}
                  {!ledgerLoading && !ledgerError && ledgerItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-slate-400">
                        Chưa có giao dịch nào.
                      </td>
                    </tr>
                  )}
                  {ledgerItems.map((entry) => {
                    const userInfo = userMap.get(entry.user_id);
                    const adminInfo = entry.created_by
                      ? userMap.get(entry.created_by)
                      : null;
                    const isNegative = entry.amount < 0;
                    return (
                      <tr
                        key={entry.id}
                        className="border-t border-white/10"
                      >
                        <td className="px-4 py-3 text-slate-300">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white">
                            {userInfo?.name || "Người dùng"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {entry.user_id}
                          </div>
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            isNegative ? "text-red-300" : "text-emerald-300"
                          }`}
                        >
                          {formatVnd(entry.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.type}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {entry.id || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {entry.ref_id || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.note || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {adminInfo?.name || entry.created_by || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>
                Trang {ledgerMeta?.page || ledgerPage} /{" "}
                {ledgerMeta?.totalPages || 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canPrevLedger}
                  onClick={() =>
                    setLedgerPage((prev) => Math.max(1, prev - 1))
                  }
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  disabled={!canNextLedger}
                  onClick={() =>
                    setLedgerPage((prev) => prev + 1)
                  }
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
