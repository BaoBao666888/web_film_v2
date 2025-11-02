import { NavLink } from "react-router-dom";

const footerLinks = [
  {
    heading: "Sản phẩm",
    children: [
      { label: "Trang chủ", to: "/" },
      { label: "Gợi ý AI", to: "/recommend" },
      { label: "Chatbot phim", to: "/chat" },
      { label: "Đánh giá phim", to: "/rating" },
    ],
  },
  {
    heading: "Tài khoản",
    children: [
      { label: "Đăng nhập", to: "/login" },
      { label: "Đăng ký", to: "/register" },
      { label: "Hồ sơ", to: "/profile" },
    ],
  },
  {
    heading: "Quản trị",
    children: [
      { label: "Tổng quan", to: "/admin" },
      { label: "Quản lý phim", to: "/admin/manage" },
      { label: "Thêm phim", to: "/admin/add-movie" },
      { label: "Thống kê", to: "/admin/stats" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-dark/80 py-12">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-10 px-4 text-sm text-slate-300">
        <div className="max-w-sm">
          <p className="text-base font-semibold text-white">
            Lumi AI Cinema
          </p>
          <p className="mt-3 text-slate-400">
            Xem phim theo mood, nhận gợi ý cá nhân hóa và tương tác với chatbot
            thông minh – tất cả trong một nền tảng.
          </p>
        </div>
        {footerLinks.map((column) => (
          <div key={column.heading} className="min-w-[140px] flex-1">
            <p className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
              {column.heading}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {column.children.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="transition hover:text-primary"
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Lumi Studio. All rights reserved.</p>
        <p className="text-slate-400">
          Ghi chú: Một số tính năng AI đang được hoàn thiện — phần này dùng để
          mô tả luồng giao diện.
        </p>
      </div>
    </footer>
  );
}
