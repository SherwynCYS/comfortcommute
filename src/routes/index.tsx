import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LegalFooter } from "@/components/layout/legal-footer";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Bell,
  Bus,
  Coins,
  Accessibility,
  MapPinned,
  Megaphone,
  Radio,
  Share2,
  Sparkles,
  TrainFront,
  Trophy,
  Users,
  Volume2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "ComfortCommute | Smarter Singapore commutes" },
      {
        name: "description",
        content:
          "Live bus positions, arrival countdowns, AI route ranking, crowd signals and Waze-style commuter reports — all in one Singapore commuting app.",
      },
      { property: "og:title", content: "ComfortCommute | Smarter Singapore commutes" },
      {
        property: "og:description",
        content:
          "Live bus positions, arrival countdowns, AI route ranking, crowd signals and Waze-style commuter reports for Singapore.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://comfortcommute.lovable.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://comfortcommute.lovable.app/og-image.png" },
    ],
  }),
});

/** Fraction (0-1) of the way the user has scrolled through the whole page. */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return progress;
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out",
        shown ? "translate-y-0 opacity-100 blur-0" : "translate-y-8 opacity-0 blur-[2px]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** A full-height chapter: sticky visual on the left, scrolling copy on the right. */
function Chapter({
  index,
  eyebrow,
  title,
  body,
  visual,
  points,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  points: { icon: React.ElementType; label: string }[];
}) {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:gap-14 md:py-28">
      <div className="md:sticky md:top-24 md:h-fit">
        <Reveal>{visual}</Reveal>
      </div>
      <div className="flex flex-col justify-center">
        <Reveal>
          <span className="font-display text-xs font-semibold tracking-[0.2em] text-primary">
            {index} · {eyebrow.toUpperCase()}
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p>
        </Reveal>
        <div className="mt-7 space-y-3">
          {points.map((point, i) => {
            const Icon = point.icon;
            return (
              <Reveal key={point.label} delay={80 * (i + 1)}>
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-soft">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-mint text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{point.label}</span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MapVisual() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border/70 bg-ink shadow-lift">
      <div className="grid-lines absolute inset-0 opacity-40" />
      <div className="absolute left-[18%] top-[24%] animate-pulse rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
        🚌 174 · 3m
      </div>
      <div className="absolute right-[14%] top-[48%] rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lift">
        🚌 61 · 7m
      </div>
      <div className="absolute bottom-[22%] left-[26%] rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-lift">
        ⚠️ Packed
      </div>
      <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-background/95 p-4 backdrop-blur">
        <p className="font-display text-sm font-semibold">Opp Blk 210</p>
        <p className="text-xs text-muted-foreground">3 buses tracked live · seats available on 174</p>
      </div>
    </div>
  );
}

function CommunityVisual() {
  const cards = [
    { emoji: "👻", text: "Bus 96 never showed up", votes: "12 confirmed" },
    { emoji: "🧍", text: "Cannot board, totally packed", votes: "7 confirmed" },
    { emoji: "♿", text: "Lift at exit B is down", votes: "4 confirmed" },
  ];
  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-gradient-mint p-6 shadow-lift">
      {cards.map((card, i) => (
        <Reveal key={card.text} delay={120 * i}>
          <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <span className="text-2xl">{card.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{card.text}</p>
              <p className="text-xs text-muted-foreground">{card.votes}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              +10
            </span>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function RankingVisual() {
  const options = [
    { name: "Comfort pick", detail: "Bus 174 · seats free · 34 min", tone: "bg-primary text-primary-foreground" },
    { name: "Fastest", detail: "MRT + bus · 27 min · standing", tone: "bg-card text-card-foreground" },
    { name: "Cheapest", detail: "Bus only · $1.19 · 41 min", tone: "bg-card text-card-foreground" },
  ];
  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-6 shadow-lift">
      {options.map((option, i) => (
        <Reveal key={option.name} delay={120 * i}>
          <div className={cn("rounded-2xl border border-border/60 p-4 shadow-soft", option.tone)}>
            <p className="font-display text-sm font-bold">{option.name}</p>
            <p className="mt-1 text-xs opacity-80">{option.detail}</p>
          </div>
        </Reveal>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        Ranked against your priority, then explained in plain English.
      </p>
    </div>
  );
}

const priorities = ["Fastest", "Balanced", "Comfort", "Cheapest"];

function LandingPage() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const progress = useScrollProgress();

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const hasSession = Boolean(data.session);
      setIsSignedIn(hasSession);
      if (hasSession) void router.navigate({ to: "/planner" });
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
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-40 h-0.5 origin-left bg-primary transition-transform duration-150"
        style={{ transform: `scaleX(${progress})` }}
      />

      <header className="absolute inset-x-0 top-0 z-30 px-4 py-5">
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
        {/* Chapter 0 — pinned hero that reacts to scroll */}
        <section className="relative h-[190vh]">
          <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-gradient-hero px-4 text-ink-foreground">
            <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl"
              style={{ transform: `translateY(${progress * -120}px)` }}
            />
            <div
              className="relative mx-auto max-w-3xl text-center"
              style={{
                transform: `translateY(${progress * -60}px) scale(${1 - Math.min(progress, 0.25) * 0.25})`,
                opacity: 1 - Math.min(progress * 2.4, 0.85),
              }}
            >
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
                Watch buses move in real time, see who's reporting delays around you, and get the
                route that fits your body — not just the timetable.
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

            <span className="absolute inset-x-0 bottom-8 text-center text-xs tracking-widest text-ink-foreground/50">
              SCROLL TO SEE THE JOURNEY
            </span>
          </div>
        </section>

        <Chapter
          index="01"
          eyebrow="Live map"
          title="See the bus before it sees you."
          body="Every GPS-tracked bus heading to your stop appears on the map and keeps moving as it drives. Countdowns refresh every 20 seconds, colour-coded by how full each bus already is."
          visual={<MapVisual />}
          points={[
            { icon: Radio, label: "Real-time bus positions on an interactive map" },
            { icon: MapPinned, label: "Nearby stops detected from your location" },
            { icon: Volume2, label: "Spoken alert when your bus is two minutes away" },
          ]}
        />

        <Chapter
          index="02"
          eyebrow="Community"
          title="Commuters warn each other, Waze-style."
          body="Tap once to report a packed bus, a breakdown, a bus that never came or a broken lift. Everyone nearby sees it instantly, confirms or dismisses it, and you earn points for keeping the network honest."
          visual={<CommunityVisual />}
          points={[
            { icon: Megaphone, label: "One-tap incident reports that expire in 3 hours" },
            { icon: Users, label: "Confirm or dismiss what others report" },
            { icon: Trophy, label: "Earn points for every useful contribution" },
          ]}
        />

        <Chapter
          index="03"
          eyebrow="Smart routing"
          title="Google's routes, re-ranked around you."
          body="Real transit itineraries come in as the baseline, then live crowd data, concession fares and your comfort filters decide the order — with a plain-language reason for the winner."
          visual={<RankingVisual />}
          points={[
            { icon: Sparkles, label: "AI ranking against comfort, time, or price" },
            { icon: Coins, label: "Fares priced for your concession card" },
            { icon: Accessibility, label: "Filters for step-free, fewer transfers, less walking" },
          ]}
        />

        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold">And the everyday things</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Share2, title: "Share your ETA", text: "Send a friend the time you'll actually arrive, straight from the arrival board." },
              { icon: Bell, title: "Alerts on favourites", text: "We watch train service messages and flag disruptions on your saved journeys." },
              { icon: TrainFront, title: "Home and work in one tap", text: "Anchor your two key places and flip between morning and evening trips." },
              { icon: MapPinned, title: "Save stops and places", text: "Favourite the stops you wait at and the places you keep travelling to." },
              { icon: Users, title: "Crowd and seat signals", text: "Live bus loading turns into a plain read on your chances of a seat." },
              { icon: Accessibility, title: "Comfort filters", text: "Filter until the trip fits your body, not the timetable." },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={60 * i}>
                  <div className="h-full rounded-2xl border border-border/70 bg-card p-6 text-card-foreground shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-mint text-primary ring-1 ring-primary/15">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-base font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-mint p-8 text-center md:p-14">
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Stop guessing which bus to take
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                Set your home, your work and your fare card once. Every trip after that is tracked,
                priced, ranked and explained for you.
              </p>
              <Link to={isSignedIn ? "/planner" : "/auth"} className="mt-7 inline-block">
                <Button size="lg" className="h-12 px-7 text-base">
                  {isSignedIn ? "Open planner" : "Create your account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
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
