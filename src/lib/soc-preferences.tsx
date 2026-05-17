import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { translations } from "./translations";

const THEME_KEY = "soc-theme";
const RANGE_KEY = "soc-time-range";
const SIDEBAR_KEY = "soc-sidebar-appearance";
const NAVBAR_KEY = "soc-navbar-appearance";
const BODY_KEY = "soc-body-background";
const THEME_COLOR_KEY = "soc-theme-color";
const LANG_KEY = "soc-language";

export type SocTimeRange = "24h" | "7d" | "30d";

type ThemeMode = "light" | "dark";
export type SidebarAppearance = "default" | "darker";
export type NavbarAppearance = "default" | "solid" | "darker";
export type BodyBackground = "default" | "dotted" | "grid";
export type ThemeColor = "orange" | "blue" | "green" | "violet" | "rose";
export type SocLanguage = "fr" | "en" | "wo" | "ar";

type SocPreferencesContextValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  timeRange: SocTimeRange;
  setTimeRange: (r: SocTimeRange) => void;
  sidebarAppearance: SidebarAppearance;
  setSidebarAppearance: (v: SidebarAppearance) => void;
  navbarAppearance: NavbarAppearance;
  setNavbarAppearance: (v: NavbarAppearance) => void;
  bodyBackground: BodyBackground;
  setBodyBackground: (v: BodyBackground) => void;
  themeColor: ThemeColor;
  setThemeColor: (v: ThemeColor) => void;
  language: SocLanguage;
  setLanguage: (v: SocLanguage) => void;
  t: (key: string) => string;
};

const SocPreferencesContext = createContext<SocPreferencesContextValue | null>(null);

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(THEME_KEY);
  return v === "dark" || v === "light" ? v : "light";
}

function readStoredRange(): SocTimeRange {
  if (typeof window === "undefined") return "7d";
  const v = localStorage.getItem(RANGE_KEY);
  return v === "24h" || v === "7d" || v === "30d" ? v : "7d";
}

function readStoredSidebar(): SidebarAppearance {
  if (typeof window === "undefined") return "default";
  const v = localStorage.getItem(SIDEBAR_KEY);
  return v === "darker" ? "darker" : "default";
}

function readStoredNavbar(): NavbarAppearance {
  if (typeof window === "undefined") return "default";
  const v = localStorage.getItem(NAVBAR_KEY);
  return v === "solid" || v === "darker" ? v : "default";
}

function readStoredBody(): BodyBackground {
  if (typeof window === "undefined") return "default";
  const v = localStorage.getItem(BODY_KEY);
  return v === "dotted" || v === "grid" ? v : "default";
}

function readStoredThemeColor(): ThemeColor {
  if (typeof window === "undefined") return "orange";
  const v = localStorage.getItem(THEME_COLOR_KEY);
  return ["orange", "blue", "green", "violet", "rose"].includes(v as any) ? (v as ThemeColor) : "orange";
}

function readStoredLanguage(): SocLanguage {
  if (typeof window === "undefined") return "fr";
  const v = localStorage.getItem(LANG_KEY);
  return ["fr", "en", "wo", "ar"].includes(v as any) ? (v as SocLanguage) : "fr";
}

export function SocPreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [timeRange, setTimeRangeState] = useState<SocTimeRange>("7d");
  const [sidebarAppearance, setSidebarAppearanceState] = useState<SidebarAppearance>("default");
  const [navbarAppearance, setNavbarAppearanceState] = useState<NavbarAppearance>("default");
  const [bodyBackground, setBodyBackgroundState] = useState<BodyBackground>("default");
  const [themeColor, setThemeColorState] = useState<ThemeColor>("orange");
  const [language, setLanguageState] = useState<SocLanguage>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
    setTimeRangeState(readStoredRange());
    setSidebarAppearanceState(readStoredSidebar());
    setNavbarAppearanceState(readStoredNavbar());
    setBodyBackgroundState(readStoredBody());
    setThemeColorState(readStoredThemeColor());
    setLanguageState(readStoredLanguage());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    
    // Apply theme color class
    root.classList.remove("theme-orange", "theme-blue", "theme-green", "theme-violet", "theme-rose");
    root.classList.add(`theme-${themeColor}`);
    
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, themeColor, mounted]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((x) => (x === "dark" ? "light" : "dark")), []);

  const setTimeRange = useCallback((r: SocTimeRange) => {
    setTimeRangeState(r);
    localStorage.setItem(RANGE_KEY, r);
  }, []);

  const setSidebarAppearance = useCallback((v: SidebarAppearance) => {
    setSidebarAppearanceState(v);
    localStorage.setItem(SIDEBAR_KEY, v);
  }, []);

  const setNavbarAppearance = useCallback((v: NavbarAppearance) => {
    setNavbarAppearanceState(v);
    localStorage.setItem(NAVBAR_KEY, v);
  }, []);

  const setBodyBackground = useCallback((v: BodyBackground) => {
    setBodyBackgroundState(v);
    localStorage.setItem(BODY_KEY, v);
  }, []);

  const setThemeColor = useCallback((v: ThemeColor) => {
    setThemeColorState(v);
    localStorage.setItem(THEME_COLOR_KEY, v);
  }, []);

  const setLanguage = useCallback((v: SocLanguage) => {
    setLanguageState(v);
    localStorage.setItem(LANG_KEY, v);
    toast?.success?.(`Langue changée : ${v === "fr" ? "Français" : v === "en" ? "English" : v === "wo" ? "Wolof" : "العربية"}`);
  }, []);

  const t = useCallback((key: string) => {
    return translations[language]?.[key] || translations["fr"]?.[key] || key;
  }, [language]);

  const value = useMemo(
    () => ({
      theme, setTheme, toggleTheme, timeRange, setTimeRange,
      sidebarAppearance, setSidebarAppearance,
      navbarAppearance, setNavbarAppearance,
      bodyBackground, setBodyBackground,
      themeColor, setThemeColor,
      language, setLanguage, t,
    }),
    [theme, setTheme, toggleTheme, timeRange, setTimeRange, sidebarAppearance, setSidebarAppearance, navbarAppearance, setNavbarAppearance, bodyBackground, setBodyBackground, themeColor, setThemeColor, language, setLanguage, t],
  );

  return <SocPreferencesContext.Provider value={value}>{children}</SocPreferencesContext.Provider>;
}

export function useSocPreferences() {
  const ctx = useContext(SocPreferencesContext);
  if (!ctx) throw new Error("useSocPreferences must be used within SocPreferencesProvider");
  return ctx;
}
