import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "zh" | "ms" | "ta";

export const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "zh", label: "中文", short: "中文" },
  { value: "ms", label: "Bahasa Melayu", short: "BM" },
  { value: "ta", label: "தமிழ்", short: "த" },
];

const messages = {
  en: { plan: "Plan", live: "Live", saved: "Saved", alerts: "Alerts", profile: "Profile", disclaimer: "Disclaimer", language: "Language" },
  zh: { plan: "规划", live: "实时", saved: "收藏", alerts: "通知", profile: "个人", disclaimer: "免责声明", language: "语言" },
  ms: { plan: "Rancang", live: "Langsung", saved: "Disimpan", alerts: "Amaran", profile: "Profil", disclaimer: "Penafian", language: "Bahasa" },
  ta: { plan: "திட்டம்", live: "நேரலை", saved: "சேமிப்பு", alerts: "எச்சரிக்கை", profile: "சுயவிவரம்", disclaimer: "பொறுப்புத்துறப்பு", language: "மொழி" },
} satisfies Record<Locale, Record<string, string>>;

type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string) => string };
const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "cc-language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh" || stored === "ms" || stored === "ta") setLocaleState(stored);
  }, []);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale: (next) => {
      setLocaleState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next === "zh" ? "zh-SG" : next === "ms" ? "ms-SG" : next === "ta" ? "ta-SG" : "en-SG";
    },
    t: (key) => messages[locale][key] ?? messages.en[key] ?? key,
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}