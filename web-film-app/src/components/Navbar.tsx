import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

const linkBaseClasses =
  "px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-primary";

const activeClasses =
  "text-primary border-b-2 border-primary -mb-[2px] rounded-b-none";

const formatVnd = (value?: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value ?? 0)} VNĐ`;

interface NavItem {
  label: string;
  to: string;
}

export function Navbar() {
  const { user, isAuthenticated, logout, checkAuthStatus } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const balanceRefreshRef = useRef(0);
  const balanceRefreshingRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
      // admin entry moved into user menu
    }
    return items;
  }, [user?.role]);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadUnread = async () => {
      try {
        const result = await api.notifications.unreadCount();
        if (active) {
          setUnreadCount(result.count || 0);
        }
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      }
    };

    const handleFocus = () => {
      void loadUnread();
    };

    const handleInboxRead = () => {
      setUnreadCount(0);
      void loadUnread();
    };

    void loadUnread();
    timer = setInterval(loadUnread, 15000);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("inbox:read", handleInboxRead as EventListener);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("inbox:read", handleInboxRead as EventListener);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (userMenuTimerRef.current) {
        clearTimeout(userMenuTimerRef.current);
      }
    };
  }, []);

  const openUserMenu = () => {
    if (userMenuTimerRef.current) {
      clearTimeout(userMenuTimerRef.current);
      userMenuTimerRef.current = null;
    }
    void refreshUserBalance();
    setUserMenuOpen(true);
  };

  const closeUserMenu = (delay = 120) => {
    if (userMenuTimerRef.current) {
      clearTimeout(userMenuTimerRef.current);
    }
    userMenuTimerRef.current = setTimeout(() => {
      setUserMenuOpen(false);
      userMenuTimerRef.current = null;
    }, delay);
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const refreshUserBalance = async () => {
    if (!isAuthenticated || !user?.id) return;
    if (balanceRefreshingRef.current) return;
    const now = Date.now();
    if (now - balanceRefreshRef.current < 15000) return;

    balanceRefreshingRef.current = true;
    try {
      const result = await api.auth.profile(user.id);
      if (result?.user) {
        localStorage.setItem("user", JSON.stringify(result.user));
        checkAuthStatus();
      }
      balanceRefreshRef.current = now;
    } catch {
      // ignore refresh errors
    } finally {
      balanceRefreshingRef.current = false;
    }
  };

  const avatarFallback = user?.name?.charAt(0).toUpperCase() || "?";
  const renderAvatar = (sizeClasses: string) => (
    user?.avatar ? (
      <img
        src={user.avatar}
        alt={user?.name ? `Avatar của ${user.name}` : "Avatar"}
        className={`${sizeClasses} rounded-full object-cover`}
      />
    ) : (
      <div
        className={`${sizeClasses} flex items-center justify-center rounded-full bg-primary text-xs font-bold text-dark`}
      >
        {avatarFallback}
      </div>
    )
  );

  const renderUnreadBadge = (sizeClasses: string) => {
    if (!unreadCount) return null;
    return (
      <span
        className={`absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white ${sizeClasses}`}
      >
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    );
  };


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
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-dark/80 backdrop-blur-md">
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:py-4">
        <div className="flex items-center gap-3">
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
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2 text-base font-semibold text-white whitespace-nowrap sm:text-lg"
          >
            <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold uppercase tracking-wide">
              Lumi
            </span>
            <span>AI Cinema</span>
          </NavLink>
        </div>

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
              <div
                className="relative"
                onMouseEnter={() => isDesktop && openUserMenu()}
                onMouseLeave={() => isDesktop && closeUserMenu()}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() =>
                    setUserMenuOpen((open) => {
                      const next = !open;
                      if (next) {
                        void refreshUserBalance();
                      }
                      return next;
                    })
                  }
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-primary hover:text-primary"
                >
                  {renderAvatar("h-8 w-8")}
                  {renderUnreadBadge("min-w-5")}
                </button>
                <div
                  onMouseEnter={() => isDesktop && openUserMenu()}
                  onMouseLeave={() => isDesktop && closeUserMenu()}
                  className={`menu-panel absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 p-2 text-sm text-white shadow-2xl shadow-black/50 backdrop-blur transition ${
                    userMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs text-slate-200 shadow-glow">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-300">
                      Số dư
                    </p>
                    <p className="mt-1 text-base font-semibold text-emerald-300">
                      {formatVnd(user?.balance)}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-white/10" />
                  <NavLink
                    to="/inbox"
                    className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2">
                      Hộp thư
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </span>
                  </NavLink>
                  <NavLink
                    to="/history"
                    className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                  >
                    Lịch sử xem
                  </NavLink>
                  <NavLink
                    to="/topup"
                    className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                  >
                    Nạp tiền
                  </NavLink>
                  <NavLink
                    to="/profile"
                    className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                  >
                    Hồ sơ
                  </NavLink>
                  {user?.role === "admin" && (
                    <NavLink
                      to="/admin"
                      className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                    >
                      Quản trị
                    </NavLink>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 w-full rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-left font-semibold text-red-400 transition hover:bg-red-500/25"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
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

        {isAuthenticated && (
          <button
            type="button"
            aria-expanded={userMenuOpen}
            aria-label="Mở menu tài khoản"
            onClick={() =>
              setUserMenuOpen((open) => {
                const next = !open;
                if (next) {
                  void refreshUserBalance();
                }
                return next;
              })
            }
            className={`relative h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-primary hover:text-primary ${
              isDesktop ? "hidden" : "flex"
            }`}
          >
            {renderAvatar("h-8 w-8")}
            {renderUnreadBadge("min-w-5")}
          </button>
        )}
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
            {!isAuthenticated && (
              <div className="grid gap-2 pt-2 text-sm">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {isAuthenticated && (
        <div
          className={`${
            isDesktop ? "hidden" : ""
          } absolute left-0 right-0 top-full z-30 transition-all duration-200 ${
            userMenuOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 pb-4">
            <div className="menu-panel space-y-2 rounded-2xl border border-white/10 p-4 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-white shadow-glow">
                <p className="text-[10px] uppercase tracking-wide text-emerald-300">
                  Số dư
                </p>
                <p className="mt-1 text-base font-semibold text-emerald-300">
                  {formatVnd(user?.balance)}
                </p>
              </div>
              <NavLink
                to="/inbox"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-primary hover:text-primary"
              >
                <span className="flex items-center gap-2">
                  Hộp thư
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink
                to="/history"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-primary hover:text-primary"
              >
                <span>Lịch sử xem</span>
              </NavLink>
              <NavLink
                to="/topup"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-primary hover:text-primary"
              >
                <span>Nạp tiền</span>
              </NavLink>
              <NavLink
                to="/profile"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-primary hover:text-primary"
              >
                <span>Hồ sơ</span>
              </NavLink>
              {user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-primary hover:text-primary"
                >
                  <span>Quản trị</span>
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-left font-semibold text-red-400 transition hover:bg-red-500/25"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
