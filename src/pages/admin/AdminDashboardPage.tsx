import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";

const cards = [
  {
    title: "Phim đang phát hành",
    value: "128",
    delta: "+8 phim mới",
    badge: "Cần duyệt 3 poster",
  },
  {
    title: "Người dùng hoạt động",
    value: "24,560",
    delta: "+12% MoM",
    badge: "5 tài khoản bị báo cáo",
  },
  {
    title: "Tỉ lệ hài lòng AI",
    value: "92%",
    delta: "+4% tuần này",
    badge: "Dựa trên 1.200 rating",
  },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Trung tâm quản trị"
        description="Giám sát dữ liệu phim, người dùng và hiệu suất AI. Các con số đang mô phỏng để minh hoạ giao diện."
        actions={
          <div className="flex gap-3">
            <Link
              to="/admin/add-movie"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark shadow-glow hover:bg-primary/90"
            >
              + Thêm phim
            </Link>
            <Link
              to="/admin/stats"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary"
            >
              Xem thống kê
            </Link>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25"
          >
            <p className="text-sm text-slate-300">{card.title}</p>
            <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
            <p className="mt-2 text-xs text-emerald-300">{card.delta}</p>
            <p className="mt-4 text-xs text-slate-400">{card.badge}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <p className="text-sm font-semibold text-white">Luồng công việc</p>
          <div className="mt-4 space-y-4 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              • Thêm phim → Up poster → Chờ duyệt → Xuất hiện trên trang chủ.
            </div>
            <div className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              • Báo cáo nội dung → Admin kiểm tra → Khoá tạm thời → Phản hồi user.
            </div>
            <div className="rounded-2xl border border-white/10 bg-dark/60 p-4">
              • Rating bất thường → Gửi sang nhóm Data để rà spam.
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <p className="text-sm font-semibold text-white">Ghi chú triển khai</p>
          <p className="mt-3 text-xs text-slate-300">
            Kết nối API admin (NestJS) với auth phân quyền. Cần middleware kiểm
            tra role trước khi truy cập các route `/admin/*`.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Dữ liệu biểu đồ sẽ lấy từ service thống kê (chạy nightly). Hiện tại
            hiển thị placeholder để kiểm thử UI.
          </p>
        </div>
      </section>
    </div>
  );
}
