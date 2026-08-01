import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export type AccentPreset = {
  id: string;
  label: string;
  hue: number;
  chroma: number;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "teal", label: "Transit Teal", hue: 190, chroma: 0.088 },
  { id: "ocean", label: "Ocean", hue: 248, chroma: 0.11 },
  { id: "violet", label: "Violet", hue: 300, chroma: 0.105 },
  { id: "rose", label: "Rose", hue: 18, chroma: 0.115 },
  { id: "amber", label: "Amber", hue: 72, chroma: 0.115 },
  { id: "emerald", label: "Emerald", hue: 155, chroma: 0.1 },
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0]!;

export const THEME_STORAGE_KEY = "cc-theme";

export type ThemeState = { mode: ThemeMode; accentId: string; hue: number; chroma: number };

const DEFAULT_STATE: ThemeState = {
  mode: "system",
  accentId: DEFAULT_ACCENT.id,
  hue: DEFAULT_ACCENT.hue,
  chroma: DEFAULT_ACCENT.chroma,
};

/** Swatch colors used for preview chips (safe in components, not hardcoded UI colors). */
export function accentSwatch(hue: number, chroma: number) {
  return `oklch(0.62 ${chroma + 0.03} ${hue})`;
}

export function readStoredTheme(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    return {
      mode: parsed.mode ?? DEFAULT_STATE.mode,
      accentId: parsed.accentId ?? DEFAULT_STATE.accentId,
      hue: typeof parsed.hue === "number" ? parsed.hue : DEFAULT_STATE.hue,
      chroma: typeof parsed.chroma === "number" ? parsed.chroma : DEFAULT_STATE.chroma,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function applyTheme(state: ThemeState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = state.mode === "dark" || (state.mode === "system" && prefersDark);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";

  const h = state.hue;
  const c = state.chroma;

  const set = (name: string, value: string) => root.style.setProperty(name, value);

  if (dark) {
    set("--primary", `oklch(0.746 ${c + 0.03} ${h})`);
    set("--primary-foreground", "oklch(0.181 0.028 258)");
    set("--primary-glow", `oklch(0.855 ${c + 0.027} ${h - 4})`);
    set("--accent", `oklch(0.318 ${c * 0.6} ${h + 15})`);
    set("--accent-foreground", `oklch(0.925 ${c * 0.45} ${h - 10})`);
    set("--ring", `oklch(0.746 ${c + 0.03} ${h})`);
    set("--sidebar-primary", `oklch(0.746 ${c + 0.03} ${h})`);
    set("--sidebar-accent", `oklch(0.318 ${c * 0.6} ${h + 15})`);
    set(
      "--gradient-mint",
      `linear-gradient(135deg, oklch(0.262 ${c * 0.45} ${h + 10}) 0%, oklch(0.301 ${c * 0.6} ${h}) 100%)`,
    );
    set(
      "--shadow-glow",
      `0 0 0 1px oklch(0.746 ${c + 0.03} ${h} / 0.25), 0 16px 40px -18px oklch(0.746 ${c + 0.03} ${h} / 0.5)`,
    );
  } else {
    set("--primary", `oklch(0.518 ${c} ${h})`);
    set("--primary-foreground", "oklch(0.985 0.005 185)");
    set("--primary-glow", `oklch(0.812 ${c + 0.033} ${h - 10})`);
    set("--accent", `oklch(0.912 ${c * 0.7} ${h - 8})`);
    set("--accent-foreground", `oklch(0.28 ${c * 0.64} ${h + 10})`);
    set("--ring", `oklch(0.518 ${c} ${h})`);
    set("--sidebar-primary", `oklch(0.518 ${c} ${h})`);
    set("--sidebar-accent", `oklch(0.912 ${c * 0.7} ${h - 8})`);
    set(
      "--gradient-mint",
      `linear-gradient(135deg, oklch(0.962 ${c * 0.3} ${h - 5}) 0%, oklch(0.938 ${c * 0.57} ${h - 12}) 100%)`,
    );
    set(
      "--shadow-glow",
      `0 0 0 1px oklch(0.518 ${c} ${h} / 0.2), 0 16px 40px -18px oklch(0.518 ${c} ${h} / 0.55)`,
    );
  }

  set("--gradient-primary", "linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 120%)");
  set("--chart-1", "var(--primary)");
  set("--chart-2", "var(--primary-glow)");
}

/** Inline script string: applies the saved theme before first paint (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})||'{}');var m=s.mode||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

type ThemeContextValue = ThemeState & {
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  setAccent: (preset: { id: string; hue: number; chroma: number }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULT_STATE);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setState(stored);
    applyTheme(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = () => {
      setSystemDark(mq.matches);
      applyTheme(readStoredTheme());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const persist = useCallback((next: ThemeState) => {
    setState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...state,
      resolvedMode:
        state.mode === "system" ? (systemDark ? "dark" : "light") : (state.mode as "light" | "dark"),
      setMode: (mode) => persist({ ...state, mode }),
      setAccent: (preset) =>
        persist({ ...state, accentId: preset.id, hue: preset.hue, chroma: preset.chroma }),
    }),
    [state, systemDark, persist],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
