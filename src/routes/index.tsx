import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Bus, MapPin, Bell, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "ComfortCommute | AltF4" },
      { name: "description", content: "Plan faster, more comfortable commutes with AI-powered route recommendations and real-time alerts." },
      { property: "og:title", content: "ComfortCommute | AltF4" },
      { property: "og:description", content: "Plan faster, more comfortable commutes with AI-powered route recommendations and real-time alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LandingPage() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const hasSession = Boolean(data.session);
      setIsSignedIn(hasSession);
      if (hasSession) {
        void router.navigate({ to: "/planner" });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        setIsSignedIn(true);
        void router.navigate({ to: "/planner" });
      }
      if (event === "SIGNED_OUT") setIsSignedIn(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Bus className="h-6 w-6 text-primary" />
            Nebula Commute
          </div>
          <Link to={isSignedIn ? "/planner" : "/auth"}>
            <Button variant="outline">{isSignedIn ? "Open planner" : "Sign in"}</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-16 text-center md:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Commute smarter, not harder
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            AI-powered route planning for Singapore public transport. Choose comfort or speed, get
            seat availability insights, and receive alerts when your favourites are affected.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to={isSignedIn ? "/planner" : "/auth"}>
              <Button size="lg">{isSignedIn ? "Open planner" : "Get started"}</Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<MapPin className="h-6 w-6 text-primary" />}
              title="AI route recommendations"
              description="Pick time, comfort, or balanced priority and let AI rank the best options for your journey."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6 text-primary" />}
              title="Favourite alerts"
              description="Save routes and stops. We notify you when incidents or crowd mitigation plans affect them."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-primary" />}
              title="Comfort filters"
              description="Filter by seat availability, fewer transfers, less walking, air-conditioned rides, and accessibility."
            />
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
        Built for Nebula X · NUS Hackathon · Problem 2
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
