import { PageHeader } from "../../components/PageHeader";

const stats = [
  {
    label: "Lượt xem trong ngày",
    value: "58,240",
    sub: "+9% so với hôm qua",
  },
  {
    label: "Playlist AI được mở",
    value: "7,420",
    sub: "+14% tuần này",
  },
  {
    label: "Đánh giá cảm xúc tích cực",
    value: "76%",
    sub: "+6% kể từ khi cập nhật gợi ý mới",
  },
];

export function AdminStatsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Thống kê & phân tích"
        description="Biểu diễn dữ liệu AI Recommendation và phản hồi người dùng. Số liệu mẫu để minh hoạ UI."
      />

      <section className="grid gap-6 md:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-bold text-white">{item.value}</p>
            <p className="mt-2 text-xs text-emerald-300">{item.sub}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <p className="text-sm font-semibold text-white">
            Biểu đồ cảm xúc (demo)
          </p>
          <div className="flex h-64 items-end gap-3 rounded-2xl border border-white/5 bg-dark/60 p-6">
            {[50, 80, 65, 90, 72].map((height, idx) => (
              <div key={idx} className="flex w-14 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-primary"
                  style={{ height: `${height}%`, minHeight: "40px" }}
                />
                <p className="text-[10px] text-slate-400">Tuần {idx + 1}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Ghi chú: Sẽ dùng chart library (Recharts) và dữ liệu từ endpoint
            `/admin/stats`.
          </p>
        </div>

        <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25 text-xs text-slate-300">
          <p className="text-sm font-semibold text-white">
            Checklist triển khai
          </p>
          <ul className="space-y-3">
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              • Kết nối dữ liệu recommendation engine để đo CTR playlist.
            </li>
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              • Đồng bộ phân tích sentiment từ form đánh giá.
            </li>
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              • Thêm filter theo thời gian (7 ngày, 30 ngày, quý).
            </li>
            <li className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              • Xuất báo cáo PDF cho team marketing.
            </li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
