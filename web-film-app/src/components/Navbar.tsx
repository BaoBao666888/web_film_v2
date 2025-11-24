import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const linkBaseClasses =
  "px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-primary";

const activeClasses =
  "text-primary border-b-2 border-primary -mb-[2px] rounded-b-none";

interface NavItem {
  label: string;
  to: string;
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { label: "Trang chủ", to: "/" },
      { label: "Tìm kiếm", to: "/search" },
      { label: "Gợi ý AI", to: "/recommend" },
      { label: "Chatbot", to: "/chat" },
    ];
    if (user?.role === "admin") {
      items.push({ label: "Dashboard", to: "/admin" });
    }
    return items;
  }, [user?.role]);

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

        <div className="flex items-center gap-1">
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
          {isAuthenticated ? (
            <>
              <NavLink
                to="/profile"
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
              >
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-dark text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                {user?.name}
              </NavLink>
              <button
                onClick={() => {
                  logout();
                  window.location.reload();
                }}
                className="rounded-full bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/30"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
