export type ThemePreference = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "themePreference";
let mediaQuery: MediaQueryList | null = null;
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

const isPreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

const getUserPreference = (): ThemePreference | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { theme_preference?: string };
    if (parsed?.theme_preference && isPreference(parsed.theme_preference)) {
      return parsed.theme_preference;
    }
    return null;
  } catch {
    return null;
  }
};

export const getStoredThemePreference = (): ThemePreference => {
  if (typeof localStorage === "undefined") return "system";
  const fromUser = getUserPreference();
  if (fromUser) return fromUser;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (isPreference(stored)) return stored;
  return "system";
};

export const setStoredThemePreference = (preference: ThemePreference) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, preference);
};

const resolveTheme = (preference: ThemePreference): "light" | "dark" => {
  if (preference === "system") {
    if (typeof window === "undefined" || !window.matchMedia) return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
};

const clearMediaListener = () => {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener("change", mediaListener);
    mediaListener = null;
  }
};

export const applyThemePreference = (preference: ThemePreference) => {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.classList.toggle("theme-light", resolved === "light");
  root.classList.toggle("theme-dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  setStoredThemePreference(preference);

  clearMediaListener();
  if (preference === "system" && typeof window !== "undefined") {
    mediaQuery = mediaQuery || window.matchMedia("(prefers-color-scheme: dark)");
    mediaListener = (event: MediaQueryListEvent) => {
      const next = event.matches ? "dark" : "light";
      root.classList.toggle("theme-light", next === "light");
      root.classList.toggle("theme-dark", next === "dark");
      root.dataset.theme = next;
      root.style.colorScheme = next;
    };
    mediaQuery.addEventListener("change", mediaListener);
  }
};

export const initTheme = () => {
  const preference = getStoredThemePreference();
  applyThemePreference(preference);
  return preference;
};
