import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { label: "Trang chủ", to: "/" },
      { label: "Xu hướng", to: "/trending" },
      { label: "Tìm kiếm", to: "/search" },
      { label: "Xem chung", to: "/watch-party" },
      { label: "Gợi ý AI", to: "/recommend" },
      { label: "Chatbot", to: "/chat" },
    ];
    if (user?.role === "admin") {
      items.push({ label: "Dashboard", to: "/admin" });
    }
    return items;
  }, [user?.role]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const renderNavLink = (item: NavItem, isMobile?: boolean) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) => {
        const activeClass = isMobile
          ? "border-primary/60 bg-white/10 text-primary"
          : activeClasses;
        return [
          linkBaseClasses,
          isMobile
            ? "flex w-full items-center justify-between rounded-xl border border-white/10 text-base text-white"
            : "rounded-full border border-transparent",
          isActive ? activeClass : "text-slate-200",
        ].join(" ");
      }}
    >
      {item.label}
      {isMobile && <span className="text-xs text-slate-400">→</span>}
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-dark/80 backdrop-blur-md">
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:py-4">
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2 text-base font-semibold text-white whitespace-nowrap sm:text-lg"
        >
          <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold uppercase tracking-wide">
            Lumi
          </span>
          <span>AI Cinema</span>
        </NavLink>

        {/* Container for desktop nav and auth */}
        <div
          className={`flex-grow items-center ${
            isDesktop ? "flex" : "hidden"
          }`}
        >
          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => renderNavLink(item))}
          </div>

          {/* Spacer */}
          <div className="flex-grow" />

          {/* Auth Buttons */}
          <div className="flex flex-none items-center gap-3">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/profile"
                  className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-primary hover:text-primary"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-dark">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{user?.name}</span>
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    window.location.reload();
                  }}
                  className="rounded-full border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/30"
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
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label="Mở menu"
          onClick={() => setMenuOpen((open) => !open)}
          className={`h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-primary hover:text-primary ${
            isDesktop ? "hidden" : "flex"
          }`}
        >
          <div className="space-y-1.5">
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition ${
                menuOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition ${
                menuOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </nav>

      <div
        className={`${
          isDesktop ? "hidden" : ""
        } absolute left-0 right-0 top-full z-30 transition-all duration-200 ${
          menuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 pb-4">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/70 p-4 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="grid gap-2">
              {navItems.map((item) => renderNavLink(item, true))}
            </div>
            <div className="grid gap-2 pt-2 text-sm">
              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/profile"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-primary hover:text-primary"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-dark">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <span>{user?.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">Hồ sơ</span>
                  </NavLink>
                  <button
                    onClick={() => {
                      logout();
                      window.location.reload();
                    }}
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-left font-semibold text-red-400 transition hover:bg-red-500/25"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-semibold text-white transition hover:border-primary hover:text-primary"
                  >
                    Đăng nhập
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-dark shadow-glow transition hover:bg-primary/90"
                  >
                    Đăng ký tài khoản
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
