import { Link, useRouter } from "@tanstack/react-router";
import { Bus, Heart, Bell, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/planner", label: "Plan", icon: Bus },
  { to: "/favorites", label: "Saved", icon: Heart },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
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
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Link to="/planner" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Bus className="h-6 w-6 text-primary" />
            Nebula Commute
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-xl">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl justify-around py-2">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} badge={item.to === "/alerts" ? unreadCount : 0} isActive={router.state.location.pathname === item.to} />
          ))}
        </div>
      </nav>
    </div>
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
      className={`relative flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {item.label}
      {badge > 0 && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
