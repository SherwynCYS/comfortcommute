import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Bus, Heart, Bell, User } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/_layout")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const navItems = [
  { to: "/planner", label: "Plan", icon: Bus },
  { to: "/favorites", label: "Saved", icon: Heart },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

function AuthenticatedLayout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.cancelQueries();
        queryClient.clear();
        router.navigate({ to: "/auth", replace: true });
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [router, queryClient]);

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
        <div className="mx-auto max-w-xl">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl justify-around py-2">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} badge={item.to === "/alerts" ? unreadCount : 0} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  item,
  badge,
}: {
  item: { to: string; label: string; icon: React.ElementType };
  badge: number;
}) {
  const router = useRouter();
  const isActive = router.state.location.pathname === item.to;
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
