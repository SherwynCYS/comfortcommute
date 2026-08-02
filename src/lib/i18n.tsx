import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "zh" | "ms" | "ta";

export const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "zh", label: "中文", short: "中文" },
  { value: "ms", label: "Bahasa Melayu", short: "BM" },
  { value: "ta", label: "தமிழ்", short: "த" },
];

const en = {
  // shell
  plan: "Plan",
  live: "Live",
  saved: "Saved",
  alerts: "Alerts",
  profile: "Profile",
  disclaimer: "Disclaimer",
  language: "Language",

  // planner
  aiRanked: "AI-ranked journeys",
  whereTo: "Where to today?",
  plannerSubtitle: "Live Singapore transit, scored for your priority.",
  homeToWork: "Home → Work",
  workToHome: "Work → Home",
  toHome: "To home",
  toWork: "To work",
  from: "From",
  to: "To",
  priority: "Priority",
  fastest: "Fastest",
  balanced: "Balanced",
  comfort: "Comfort",
  cheapest: "Cheapest",
  comfortFilters: "Comfort filters",
  seatLikely: "Seat likely",
  fewerTransfers: "Fewer transfers",
  lessWalking: "Less walking",
  aircon: "Air-con",
  accessible: "Accessible",
  lowerFare: "Lower fare",
  findRoutes: "Find best routes",

  // live
  liveTitle: "Live near you",
  liveSubtitle: "Buses move on the map as they drive. Countdowns refresh every 20 seconds.",
  busesTab: "Buses",
  mrtTab: "MRT map",
  arrivals: "Arrivals",
  refresh: "Refresh",
  saveStop: "Save this stop",
  speakAlerts: "Speak alerts when a bus is 2 min away",
  commuterReports: "Commuter reports",
  report: "Report",
  noServices: "No services reporting at this stop right now.",
  railTitle: "Singapore rail network",
  railSubtitle: "Drag to pan, pinch or use the buttons to zoom. Double-tap to zoom in fast.",
  recentre: "Recentre on my location",

  // favourites
  favTitle: "Your favourites",
  favSubtitle: "Saved journeys, stops and places we watch for disruptions.",
  routes: "Routes",
  stops: "Stops",
  places: "Places",
  remove: "Remove",

  // alerts
  alertsSubtitle: "Live LTA service messages across the whole network.",
  markAllRead: "Mark all read",
  showingUnread: "Showing unread",
  unread: "Unread",
  loadingAlerts: "Loading alerts…",

  // profile
  home: "Home",
  workSchool: "Work / school",
  signOut: "Sign out",
  save: "Save",
};

export type MessageKey = keyof typeof en;

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en,
  zh: {
    plan: "规划", live: "实时", saved: "收藏", alerts: "通知", profile: "个人",
    disclaimer: "免责声明", language: "语言",
    aiRanked: "AI 排序行程", whereTo: "今天去哪里？", plannerSubtitle: "实时新加坡交通，按你的优先项评分。",
    homeToWork: "家 → 公司", workToHome: "公司 → 家", toHome: "回家", toWork: "去公司",
    from: "出发地", to: "目的地", priority: "优先项", fastest: "最快", balanced: "均衡",
    comfort: "舒适", cheapest: "最便宜", comfortFilters: "舒适筛选", seatLikely: "有座机会大",
    fewerTransfers: "更少换乘", lessWalking: "更少步行", aircon: "冷气", accessible: "无障碍",
    lowerFare: "更低车费", findRoutes: "寻找最佳路线",
    liveTitle: "附近实时", liveSubtitle: "巴士在地图上实时移动，倒计时每 20 秒更新。",
    busesTab: "巴士", mrtTab: "地铁图", arrivals: "到站时间", refresh: "刷新", saveStop: "收藏此站",
    speakAlerts: "巴士还有 2 分钟到站时语音提醒", commuterReports: "通勤者报告", report: "上报",
    noServices: "此站目前没有班次数据。", railTitle: "新加坡地铁网络",
    railSubtitle: "拖动平移，双指或按钮缩放。双击快速放大。", recentre: "回到我的位置",
    favTitle: "我的收藏", favSubtitle: "已保存的行程、车站和地点，我们会替你留意干扰。",
    routes: "路线", stops: "车站", places: "地点", remove: "移除",
    alertsSubtitle: "全网实时 LTA 服务信息。", markAllRead: "全部标为已读",
    showingUnread: "只看未读", unread: "未读", loadingAlerts: "正在载入通知…",
    home: "家", workSchool: "公司 / 学校", signOut: "登出", save: "保存",
  },
  ms: {
    plan: "Rancang", live: "Langsung", saved: "Disimpan", alerts: "Amaran", profile: "Profil",
    disclaimer: "Penafian", language: "Bahasa",
    aiRanked: "Perjalanan disusun AI", whereTo: "Ke mana hari ini?",
    plannerSubtitle: "Pengangkutan Singapura secara langsung, dinilai ikut keutamaan anda.",
    homeToWork: "Rumah → Kerja", workToHome: "Kerja → Rumah", toHome: "Ke rumah", toWork: "Ke tempat kerja",
    from: "Dari", to: "Ke", priority: "Keutamaan", fastest: "Terpantas", balanced: "Seimbang",
    comfort: "Keselesaan", cheapest: "Termurah", comfortFilters: "Penapis keselesaan",
    seatLikely: "Berkemungkinan ada tempat duduk", fewerTransfers: "Kurang tukar", lessWalking: "Kurang berjalan",
    aircon: "Berhawa dingin", accessible: "Mesra OKU", lowerFare: "Tambang lebih rendah",
    findRoutes: "Cari laluan terbaik",
    liveTitle: "Langsung berdekatan", liveSubtitle: "Bas bergerak di peta secara langsung. Kiraan detik dikemas kini setiap 20 saat.",
    busesTab: "Bas", mrtTab: "Peta MRT", arrivals: "Ketibaan", refresh: "Muat semula", saveStop: "Simpan hentian ini",
    speakAlerts: "Beritahu secara suara bila bas 2 minit lagi", commuterReports: "Laporan penumpang",
    report: "Lapor", noServices: "Tiada perkhidmatan dilaporkan di hentian ini sekarang.",
    railTitle: "Rangkaian rel Singapura", railSubtitle: "Seret untuk gerak, cubit atau guna butang untuk zum. Ketik dua kali untuk zum pantas.",
    recentre: "Kembali ke lokasi saya",
    favTitle: "Kegemaran anda", favSubtitle: "Perjalanan, hentian dan tempat tersimpan yang kami pantau.",
    routes: "Laluan", stops: "Hentian", places: "Tempat", remove: "Buang",
    alertsSubtitle: "Mesej perkhidmatan LTA langsung seluruh rangkaian.", markAllRead: "Tanda semua dibaca",
    showingUnread: "Menunjukkan belum dibaca", unread: "Belum dibaca", loadingAlerts: "Memuatkan amaran…",
    home: "Rumah", workSchool: "Kerja / sekolah", signOut: "Log keluar", save: "Simpan",
  },
  ta: {
    plan: "திட்டம்", live: "நேரலை", saved: "சேமிப்பு", alerts: "எச்சரிக்கை", profile: "சுயவிவரம்",
    disclaimer: "பொறுப்புத்துறப்பு", language: "மொழி",
    aiRanked: "AI தரவரிசைப் பயணங்கள்", whereTo: "இன்று எங்கே செல்ல?",
    plannerSubtitle: "நேரலை சிங்கப்பூர் போக்குவரத்து, உங்கள் முன்னுரிமைப்படி மதிப்பீடு.",
    homeToWork: "வீடு → வேலை", workToHome: "வேலை → வீடு", toHome: "வீட்டிற்கு", toWork: "வேலைக்கு",
    from: "இருந்து", to: "வரை", priority: "முன்னுரிமை", fastest: "வேகமானது", balanced: "சமநிலை",
    comfort: "வசதி", cheapest: "மலிவானது", comfortFilters: "வசதி வடிகட்டிகள்",
    seatLikely: "இருக்கை கிடைக்கலாம்", fewerTransfers: "குறைவான மாற்றங்கள்", lessWalking: "குறைவான நடை",
    aircon: "குளிரூட்டப்பட்டது", accessible: "அணுகக்கூடியது", lowerFare: "குறைந்த கட்டணம்",
    findRoutes: "சிறந்த வழிகளைத் தேடு",
    liveTitle: "அருகில் நேரலை", liveSubtitle: "பேருந்துகள் வரைபடத்தில் நகரும். எண்ணிக்கை 20 வினாடிக்கு ஒருமுறை புதுப்பிக்கும்.",
    busesTab: "பேருந்து", mrtTab: "MRT வரைபடம்", arrivals: "வருகைகள்", refresh: "புதுப்பி",
    saveStop: "இந்த நிறுத்தத்தைச் சேமி", speakAlerts: "பேருந்து 2 நிமிடத்தில் வரும்போது குரல் அறிவிப்பு",
    commuterReports: "பயணிகள் அறிக்கைகள்", report: "அறிக்கை",
    noServices: "இந்த நிறுத்தத்தில் இப்போது சேவை தகவல் இல்லை.", railTitle: "சிங்கப்பூர் ரயில் வலையமைப்பு",
    railSubtitle: "இழுத்து நகர்த்தவும், கிள்ளி அல்லது பொத்தான்களால் பெரிதாக்கவும். இருமுறை தட்டினால் விரைவாக பெரிதாகும்.",
    recentre: "என் இருப்பிடத்திற்கு",
    favTitle: "உங்கள் விருப்பங்கள்", favSubtitle: "சேமித்த பயணங்கள், நிறுத்தங்கள் மற்றும் இடங்கள்.",
    routes: "வழிகள்", stops: "நிறுத்தங்கள்", places: "இடங்கள்", remove: "நீக்கு",
    alertsSubtitle: "முழு வலையமைப்பிற்கான நேரலை LTA சேவை செய்திகள்.", markAllRead: "அனைத்தையும் படித்ததாகக் குறி",
    showingUnread: "படிக்காதவை", unread: "படிக்காதவை", loadingAlerts: "எச்சரிக்கைகள் ஏற்றப்படுகிறது…",
    home: "வீடு", workSchool: "வேலை / பள்ளி", signOut: "வெளியேறு", save: "சேமி",
  },
};

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
    t: (key) => messages[locale][key as MessageKey] ?? en[key as MessageKey] ?? key,
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
