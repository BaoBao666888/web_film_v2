import { PageHeader } from "../../components/PageHeader";
import { useFetch } from "../../hooks/useFetch";
import type { AdminStatsResponse } from "../../types/api";

export function AdminStatsPage() {
  const { data, loading, error } = useFetch<AdminStatsResponse>("/admin/stats");
  const stats = data?.metrics ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        title="Thống kê & phân tích"
        description="Theo dõi hiệu quả nội dung và xu hướng người dùng."
      />

      <section className="grid gap-6 md:grid-cols-3">
        {loading && <p className="text-slate-400">Đang tải...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-bold text-white">{item.value}</p>
            <p className="mt-2 text-xs text-emerald-300">
              Dữ liệu cập nhật gần nhất
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <p className="text-sm font-semibold text-white">Biểu đồ cảm xúc</p>
          <div className="flex h-64 items-end gap-3 rounded-2xl border border-white/5 bg-dark/60 p-6">
            {(data?.topMoods ?? []).length === 0 && (
              <p className="text-xs text-slate-500">
                Chưa có dữ liệu mood. Khi người dùng xem/đánh giá nhiều hơn,
                biểu đồ sẽ hiện tại đây.
              </p>
            )}
            {(data?.topMoods ?? []).map((mood, idx) => (
              <div key={idx} className="flex w-14 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-primary"
                  style={{
                    height: `${Math.min(100, mood.total * 10)}%`,
                    minHeight: "40px",
                  }}
                />
                <p className="text-[10px] text-slate-400">{mood.mood}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
