import { Link, useRouter } from "@tanstack/react-router";
import { Bus, Heart, Bell, User, Radio, Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LegalFooter } from "@/components/layout/legal-footer";
import { ConsentGate } from "@/components/onboarding/consent-gate";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeMode } from "@/lib/theme";


const navItems = [
  { to: "/planner", label: "Plan", icon: Bus },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/favorites", label: "Saved", icon: Heart },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <ConsentGate>
      <MobileShellInner>{children}</MobileShellInner>
    </ConsentGate>
  );
}

function MobileShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);


  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Link
            to="/planner"
            className="flex items-center gap-2.5 font-display text-base font-bold text-foreground"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-soft">
              <Bus className="h-4 w-4" />
            </span>
            ComfortCommute
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              to="/legal"
              className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Disclaimer
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-xl">{children}</div>
      </main>

      <div className="mx-auto w-full max-w-xl">
        <LegalFooter compact />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl justify-around px-2 py-1.5">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              badge={item.to === "/alerts" ? unreadCount : 0}
              isActive={router.state.location.pathname === item.to}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const order: ThemeMode[] = ["light", "dark", "system"];
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      aria-label={`Theme: ${mode}. Tap to change`}
      title={`Theme: ${mode}`}
      onClick={() => setMode(order[(order.indexOf(mode) + 1) % order.length]!)}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function NavItem({
  item,
  badge,
  isActive,
}: {
  item: { to: string; label: string; icon: React.ElementType };
  badge: number;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "relative flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-all",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
      {item.label}
      {badge > 0 && (
        <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
