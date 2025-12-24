import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type { AdminStatsResponse } from "../../types/api";

export function AdminDashboardPage() {
  const { data, loading, error } = useFetch<AdminStatsResponse>("/admin/stats");
  const cards = data?.metrics ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        title="Trung tâm quản trị"
        description="Giám sát dữ liệu phim, người dùng và hiệu suất AI."
        actions={
          <div className="flex gap-3">
            <Link
              to="/admin/add-movie"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark shadow-glow hover:bg-primary/90"
            >
              + Thêm phim
            </Link>
            <Link
              to="/admin/manage"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
            >
              Quản lý phim
            </Link>
            <Link
              to="/admin/stats"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
            >
              Xem thống kê
            </Link>
            <Link
              to="/admin/users"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
            >
              DS Users
            </Link>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-3">
        {loading && <p className="text-slate-400">Đang tải thống kê…</p>}
        {error && <p className="text-red-400">Không tải được: {error}</p>}
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25"
          >
            <p className="text-sm text-slate-300">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
            <p className="mt-2 text-xs text-emerald-300">
              Dữ liệu thời gian thực
            </p>
          </div>
        ))}
      </section>

      {data?.topMoods?.length ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <p className="text-sm font-semibold text-white">Top mood hiện tại</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
            {data.topMoods.map((item) => (
              <span
                key={item.mood}
                className="rounded-full border border-white/10 px-4 py-1 text-white"
              >
                {item.mood}: {item.total} phim
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
