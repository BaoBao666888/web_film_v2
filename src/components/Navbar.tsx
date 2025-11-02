import { useMemo } from "react";
import { NavLink } from "react-router-dom";

const linkBaseClasses =
  "px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-primary";

const activeClasses =
  "text-primary border-b-2 border-primary -mb-[2px] rounded-b-none";

interface NavItem {
  label: string;
  to: string;
}

export function Navbar() {
  const navItems = useMemo<NavItem[]>(
    () => [
      { label: "Trang chủ", to: "/" },
      { label: "Tìm kiếm", to: "/search" },
      { label: "Gợi ý AI", to: "/recommend" },
      { label: "Chatbot", to: "/chat" },
      { label: "Dashboard", to: "/admin" },
    ],
    []
  );

  return (
    <header className="sticky top-0 z-40 bg-dark/80 backdrop-blur-md border-b border-white/10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-lg font-semibold text-white"
        >
          <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold uppercase tracking-wide">
            Lumi
          </span>
          <span>AI Cinema</span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  linkBaseClasses,
                  "rounded-full border border-transparent",
                  isActive ? activeClasses : "text-slate-200",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/login"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
          >
            Đăng nhập
          </NavLink>
          <NavLink
            to="/register"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
          >
            Đăng ký
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
