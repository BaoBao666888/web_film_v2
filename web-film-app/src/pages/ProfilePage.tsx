import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import type { ProfileResponse } from "../types/api";
import { api } from "../lib/api";

export function ProfilePage() {
  const { user: authUser, checkAuthStatus } = useAuth();
  const { data, loading, error, refetch } = useFetch<ProfileResponse>(
    authUser?.id ? `/auth/profile/${authUser.id}` : null
  );

  const user = data?.user || authUser;
  const favorites = data?.favorites ?? [];
  const history = data?.history ?? [];

  // --- state từ tuan_dev (history) ---
  const [deletingHistory, setDeletingHistory] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);

  // --- state từ main (profile, avatar, password, mood) ---
  const [isEditing, setIsEditing] = useState(false);
  const [moodInput, setMoodInput] = useState(user?.favorite_moods?.join(", ") ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarCandidate, setAvatarCandidate] = useState(user?.avatar ?? "");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    setAvatarCandidate(user?.avatar ?? "");
  }, [user?.avatar]);

  useEffect(() => {
    setMoodInput(user?.favorite_moods?.join(", ") ?? "");
  }, [user?.favorite_moods?.join(",")]);

  // --- hàm xóa lịch sử từng item (từ tuan_dev) ---
  const handleDeleteHistory = async (historyId: string) => {
    if (!authUser) return;
    setDeletingHistory(historyId);
    try {
      await api.history.remove(historyId);
      refetch();
    } catch (error) {
      console.error("Không thể xóa lịch sử:", error);
    } finally {
      setDeletingHistory(null);
    }
  };

  // --- hàm clear toàn bộ lịch sử (từ tuan_dev) ---
  const handleClearHistory = async () => {
    if (!authUser || !confirm("Bạn có chắc muốn xóa toàn bộ lịch sử xem?")) return;
    setClearingHistory(true);
    try {
      await api.history.clear();
      refetch();
    } catch (error) {
      console.error("Không thể xóa toàn bộ lịch sử:", error);
    } finally {
      setClearingHistory(false);
    }
  };

  // --- hàm xử lý avatar (từ main) ---
  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAvatarCandidate(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = async () => {
    if (!authUser) return;
    const trimmed = avatarCandidate.trim();
    if (!trimmed) {
      setAvatarStatus({
        type: "error",
        message: "Vui lòng nhập link ảnh hoặc tải ảnh lên.",
      });
      return;
    }

    setAvatarSaving(true);
    setAvatarStatus(null);
    try {
      const response = await api.auth.updateProfile(authUser.id, {
        avatar: trimmed,
      });
      localStorage.setItem("user", JSON.stringify(response.user));
      checkAuthStatus();
      refetch();
      setAvatarStatus({
        type: "success",
        message: "Cập nhật avatar thành công.",
      });
      setShowAvatarModal(false);
    } catch (err) {
      setAvatarStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Không thể cập nhật avatar.",
      });
    } finally {
      setAvatarSaving(false);
    }
  };

  // Nếu chưa đăng nhập, redirect về login
  if (!authUser) {
    return (
      <div className="rounded-3xl border border-orange-400/30 bg-orange-500/10 p-10 text-center">
        <p className="text-orange-200 mb-4">Bạn cần đăng nhập để xem hồ sơ</p>
        <Link
          to="/login"
          className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p>Đang tải hồ sơ…</p>;
  }

  if (error) {
    return <p className="text-red-400">Không tải được hồ sơ: {error}</p>;
  }

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("vi-VN")
    : authUser?.created_at
    ? new Date(authUser.created_at).toLocaleDateString("vi-VN")
    : "Đang cập nhật";

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Hồ sơ của ${user?.name}`}
        description="Thông tin cá nhân, phim yêu thích và lịch sử xem lấy từ API auth."
        actions={
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsEditing((prev) => !prev);
                setStatus(null);
              }}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
            >
              {isEditing ? "Đóng chỉnh sửa" : "Chỉnh sửa hồ sơ"}
            </button>
            <Link
              to="/logout"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
            >
              Đăng xuất
            </Link>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setShowAvatarModal(true);
                setAvatarStatus(null);
                setAvatarCandidate(user?.avatar ?? "");
              }}
              className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-dark/60"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-16 w-16 rounded-full object-cover transition group-hover:opacity-80"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20 text-2xl text-primary">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-full bg-black/60 text-xs font-semibold text-white group-hover:flex">
                Đổi avatar
              </span>
            </button>
            <div>
              <p className="text-lg font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
              <p className="text-[11px] text-slate-500">Nhấn vào avatar để đổi ảnh.</p>
            </div>
          </div>
          <div className="grid gap-3 text-xs text-slate-300">
            <p>
              • Thành viên từ: <span className="text-white">{joinedDate}</span>
            </p>
            <p>
              • Gói sử dụng: <span className="text-primary">Premium AI</span>
            </p>
            <p>
              • Mood yêu thích:{" "}
              <span className="text-white">
                {user?.favorite_moods?.length
                  ? user.favorite_moods.join(", ")
                  : "Chưa cập nhật"}
              </span>
            </p>
          </div>
          {isEditing && authUser && (
            <form
              onSubmit={async (event: FormEvent) => {
                event.preventDefault();
                setStatus(null);
                if (!authUser) return;

                const payload: {
                  favoriteMoods?: string[];
                  currentPassword?: string;
                  newPassword?: string;
                } = {};

                const normalizedMoods = moodInput
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean);
                const currentMoods = user?.favorite_moods ?? [];
                const favoriteChanged =
                  JSON.stringify(normalizedMoods) !== JSON.stringify(currentMoods);
                if (favoriteChanged) {
                  payload.favoriteMoods = normalizedMoods;
                }

                if (newPassword.trim()) {
                  if (!currentPassword.trim()) {
                    setStatus({
                      type: "error",
                      message: "Nhập mật khẩu hiện tại để đổi mật khẩu.",
                    });
                    return;
                  }
                  payload.currentPassword = currentPassword;
                  payload.newPassword = newPassword;
                }

                if (!payload.favoriteMoods && !payload.newPassword) {
                  setStatus({
                    type: "error",
                    message: "Không có thay đổi nào để lưu.",
                  });
                  return;
                }

                setSaving(true);
                try {
                  const response = await api.auth.updateProfile(authUser.id, payload);
                  localStorage.setItem("user", JSON.stringify(response.user));
                  checkAuthStatus();
                  refetch();
                  setStatus({
                    type: "success",
                    message: "Cập nhật hồ sơ thành công.",
                  });
                  setCurrentPassword("");
                  setNewPassword("");
                  setMoodInput(response.user.favorite_moods?.join(", ") ?? "");
                  setIsEditing(false);
                } catch (err) {
                  setStatus({
                    type: "error",
                    message:
                      err instanceof Error
                        ? err.message
                        : "Không thể cập nhật hồ sơ.",
                  });
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-4 rounded-2xl border border-white/10 bg-dark/60 p-4"
            >
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Mood yêu thích (ngăn cách bằng dấu phẩy)
                </label>
                <input
                  value={moodInput}
                  onChange={(event) => setMoodInput(event.target.value)}
                  placeholder="Hành động, Lãng mạn..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Để đổi mật khẩu, vui lòng nhập cả mật khẩu hiện tại và mật khẩu mới. Bạn có thể chỉ cập nhật mood yêu thích nếu muốn.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              {status && (
                <p
                  className={`text-sm ${
                    status.type === "success" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {status.message}
                </p>
              )}
            </form>
          )}
        </div>

        {/* PHIM YÊU THÍCH & LỊCH SỬ */}
        <div className="space-y-5">
          {/* FAVORITES */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <p className="text-sm font-semibold text-white">Phim yêu thích</p>
            {favorites.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                Bạn chưa thêm phim nào vào danh sách yêu thích.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {favorites.map((movie) => {
                  const posterSrc =
                    "poster" in movie &&
                    typeof (movie as { poster?: string }).poster === "string"
                      ? (movie as { poster?: string }).poster
                      : movie.thumbnail;

                  return (
                    <Link
                      key={movie.id}
                      to={`/movie/${movie.id}`}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-dark/60 p-3 transition hover:border-primary/80"
                    >
                      <img
                        src={posterSrc}
                        alt={movie.title}
                        className="h-20 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {movie.title}
                        </p>
                        <p className="text-xs text-slate-300">
                          {movie.tags?.join(" • ")}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* HISTORY */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Lịch sử xem gần đây
              </p>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  disabled={clearingHistory}
                  className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {clearingHistory ? "Đang xóa..." : "Xóa tất cả"}
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-300">
              {history.length === 0 && (
                <p className="text-slate-500">
                  Chưa có lịch sử. Xem phim để hệ thống ghi nhận nhé!
                </p>
              )}

              {history.map((item) => (
                <div
                  key={`history-${item.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-dark/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-white">
                        {item.title ?? "Không xác định"}
                      </span>
                      <span className="text-xs text-slate-500">
                        Đã xem:{" "}
                        {item.lastWatchedAt
                          ? new Date(item.lastWatchedAt).toLocaleDateString(
                              "vi-VN"
                            )
                          : "Gần đây"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/watch/${item.movieId}`}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-dark transition hover:bg-primary/90"
                    >
                      Xem lại
                    </Link>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      disabled={deletingHistory === item.id}
                      className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingHistory === item.id ? "Xóa..." : "×"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-dark/95 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <p className="text-lg font-semibold text-white">Cập nhật avatar</p>
              <button
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarStatus(null);
                  setAvatarCandidate(user?.avatar ?? "");
                }}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:border-primary hover:text-primary"
              >
                Đóng
              </button>
            </div>
            <div className="space-y-4 px-6 py-6">
              {avatarCandidate && (
                <div className="flex justify-center">
                  <img
                    src={avatarCandidate}
                    alt="Avatar preview"
                    className="h-32 w-32 rounded-full object-cover"
                  />
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Link ảnh
                </label>
                <input
                  value={avatarCandidate}
                  onChange={(event) => setAvatarCandidate(event.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Hoặc tải ảnh lên
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="mt-2 w-full text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-dark"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Hệ thống lưu trực tiếp link hoặc dữ liệu base64, vui lòng chọn ảnh dung lượng nhỏ.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAvatarModal(false);
                    setAvatarStatus(null);
                    setAvatarCandidate(user?.avatar ?? "");
                  }}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAvatarSave}
                  disabled={avatarSaving}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {avatarSaving ? "Đang lưu..." : "Lưu avatar"}
                </button>
              </div>
              {avatarStatus && (
                <p
                  className={`text-sm ${
                    avatarStatus.type === "success" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {avatarStatus.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
