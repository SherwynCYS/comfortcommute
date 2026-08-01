import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LegalFooter } from "@/components/layout/legal-footer";
import {
  ArrowRight,
  Bell,
  Bus,
  Coins,
  Accessibility,
  Sparkles,
  TrainFront,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "ComfortCommute | Smarter Singapore commutes" },
      {
        name: "description",
        content:
          "Plan faster, more comfortable Singapore commutes with AI route ranking, live crowd signals, fare estimates and alerts on your saved journeys.",
      },
      { property: "og:title", content: "ComfortCommute | Smarter Singapore commutes" },
      {
        property: "og:description",
        content:
          "Plan faster, more comfortable Singapore commutes with AI route ranking, live crowd signals, fare estimates and alerts on your saved journeys.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const features = [
  {
    icon: Sparkles,
    title: "AI that ranks, not just routes",
    description:
      "Google's live transit itineraries come in as the baseline, then AI re-ranks them against your chosen priority and explains why.",
  },
  {
    icon: Users,
    title: "Crowd & seat signals",
    description:
      "Live bus loading and passenger-volume data turn into a plain-language read on how likely you are to get a seat.",
  },
  {
    icon: Coins,
    title: "Fares for your card",
    description:
      "Student, senior, workfare or adult — every option is priced against the concession card in your profile.",
  },
  {
    icon: Bell,
    title: "Alerts on what you saved",
    description:
      "Save a journey once. We watch train service messages and flag disruptions that touch your favourites.",
  },
  {
    icon: Accessibility,
    title: "Comfort filters",
    description:
      "Fewer transfers, less walking, air-conditioned rides, step-free access — filter until the trip fits your body, not the timetable.",
  },
  {
    icon: TrainFront,
    title: "Home and work in one tap",
    description:
      "Set your two anchor places once and swap between the morning and evening trip instantly.",
  },
];

const priorities = ["Fastest", "Balanced", "Comfort", "Cheapest"];

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
      <header className="absolute inset-x-0 top-0 z-20 px-4 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5 font-display text-lg font-bold text-ink-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-glow/20 ring-1 ring-primary-glow/40">
              <Bus className="h-5 w-5 text-primary-glow" />
            </span>
            ComfortCommute
          </div>
          <Link to={isSignedIn ? "/planner" : "/auth"}>
            <Button
              variant="outline"
              className="border-ink-foreground/25 bg-ink-foreground/5 text-ink-foreground backdrop-blur hover:bg-ink-foreground/15 hover:text-ink-foreground"
            >
              {isSignedIn ? "Open planner" : "Sign in"}
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-hero px-4 pb-24 pt-32 text-ink-foreground md:pb-32 md:pt-40">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-glow/30 bg-primary-glow/10 px-3.5 py-1.5 text-xs font-medium text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Nebula X · NUS Hackathon
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] md:text-6xl">
              Your commute, ranked by how it{" "}
              <span className="bg-gradient-to-r from-primary-glow to-ink-foreground bg-clip-text text-transparent">
                actually feels
              </span>
              .
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-ink-foreground/70 md:text-lg">
              Real Singapore transit itineraries, enriched with live crowd data and concession
              fares, then ranked by whether you want speed, comfort or the cheapest way home.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={isSignedIn ? "/planner" : "/auth"}>
                <Button size="lg" className="group h-12 px-7 text-base shadow-glow">
                  {isSignedIn ? "Open planner" : "Start planning free"}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link to="/legal">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-6 text-base text-ink-foreground/70 hover:bg-ink-foreground/10 hover:text-ink-foreground"
                >
                  How our data works
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
              {priorities.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-4 py-1.5 text-sm text-ink-foreground/75 backdrop-blur"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto -mt-14 max-w-6xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border/70 bg-card p-6 text-card-foreground shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-mint text-primary ring-1 ring-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-mint p-8 text-center md:p-14">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Stop guessing which train to take
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
              Set your home, your work and your fare card once. Every trip after that is priced,
              ranked and explained for you.
            </p>
            <Link to={isSignedIn ? "/planner" : "/auth"} className="mt-7 inline-block">
              <Button size="lg" className="h-12 px-7 text-base">
                {isSignedIn ? "Open planner" : "Create your account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-surface">
        <LegalFooter />
        <p className="pb-6 text-center text-xs text-muted-foreground">
          © 2026 ComfortCommute · Nebula X · NUS Hackathon Problem 2
        </p>
      </footer>
    </div>
  );
}
