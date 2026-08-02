import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { planRoute, type CommuteRoute, type RouteFilters, type RoutePriority } from "@/lib/routes.functions";
import { recommendRoute, type AiRecommendation } from "@/lib/ai.functions";
import { createFavoriteRoute, listFavoriteStops } from "@/lib/favorites.functions";
import { listFavoritePlaces } from "@/lib/favorite-places.functions";
import { PlaceSearch } from "@/components/planner/place-search";
import type { PlaceResult } from "@/lib/places.functions";
import { getProfile } from "@/lib/profile.functions";
import { formatFare, cardLabel, type CardType } from "@/lib/fares";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Briefcase, Bus, Clock, Coins, Footprints, Heart, Home, Loader2, MapPin, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { InfoButton } from "@/components/ui/info-button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/planner")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: PlannerPage,
  head: () => ({
    meta: [
      { title: "Plan Journey | ComfortCommute" },
      { name: "description", content: "Plan your commute with AI-powered recommendations." },
      { property: "og:title", content: "Plan Journey | ComfortCommute" },
      { property: "og:description", content: "Plan your commute with AI-powered recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PlannerPage() {
  const { t } = useI18n();
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [priority, setPriority] = useState<RoutePriority>("balanced");
  const [filters, setFilters] = useState<RouteFilters>({
    seatAvailability: false,
    fewerTransfers: false,
    lessWalking: false,
    airConditioned: false,
    accessible: false,
    cheaperFare: false,
  });
  const [routes, setRoutes] = useState<CommuteRoute[]>([]);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [loading, setLoading] = useState(false);


  const planFn = useServerFn(planRoute);
  const getProfileFn = useServerFn(getProfile);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn({ data: undefined }),
  });

  const cardType = (profile?.card_type as CardType | undefined) ?? "adult_card";

  const savedPlace = (kind: "home" | "work"): PlaceResult | null => {
    const name = kind === "home" ? profile?.home_name : profile?.work_name;
    const lat = kind === "home" ? profile?.home_lat : profile?.work_lat;
    const lng = kind === "home" ? profile?.home_lng : profile?.work_lng;
    if (!name || lat == null || lng == null) return null;
    return {
      id: kind,
      name,
      description: kind === "home" ? "Saved home" : "Saved work",
      lat,
      lng,
      type: "address",
    };

  };

  const homePlace = savedPlace("home");
  const workPlace = savedPlace("work");

  const listPlacesFn = useServerFn(listFavoritePlaces);
  const listStopsFn = useServerFn(listFavoriteStops);

  const { data: favPlaces = [] } = useQuery({
    queryKey: ["favorite-places"],
    queryFn: () => listPlacesFn({ data: undefined }),
  });
  const { data: favStops = [] } = useQuery({
    queryKey: ["favorite-stops"],
    queryFn: () => listStopsFn({ data: undefined }),
  });

  const savedOptions: PlaceResult[] = [
    ...(homePlace ? [homePlace] : []),
    ...(workPlace ? [workPlace] : []),
    ...favPlaces
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        id: `fav-place-${p.id}`,
        name: p.name,
        description: p.label || p.address || "Saved place",
        lat: p.lat as number,
        lng: p.lng as number,
        type: "address" as const,
      })),
    ...favStops
      .filter((s) => s.stop_lat != null && s.stop_lng != null)
      .map((s) => ({
        id: `fav-stop-${s.id}`,
        name: s.stop_name,
        description:
          s.transport_type === "bus"
            ? `Bus stop${s.stop_code ? ` ${s.stop_code}` : ""}`
            : "MRT/LRT station",
        lat: s.stop_lat as number,
        lng: s.stop_lng as number,
        type: (s.transport_type === "bus" ? "bus" : "rail") as "bus" | "rail",
      })),
  ];
  const recommendFn = useServerFn(recommendRoute);
  const saveRouteFn = useServerFn(createFavoriteRoute);

  const saveMutation = useMutation({
    mutationFn: saveRouteFn,
    onSuccess: () => toast.success("Route saved to favourites"),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save route"),
  });

  const handlePlan = async () => {
    if (!origin || !destination) {
      toast.error("Pick both a start and a destination");
      return;
    }
    setLoading(true);
    try {

      const candidates = await planFn({
        data: {
          originName: origin.name,
          originLat: origin.lat,
          originLng: origin.lng,
          destinationName: destination.name,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
          priority,
          filters,
          cardType,
        },
      });
      setRoutes(candidates);

      const ai = await recommendFn({
        data: {
          originName: origin.name,
          destinationName: destination.name,
          priority,
          filters,
          routes: candidates,
        },
      });
      setRecommendation(ai);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Planning failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (key: keyof RouteFilters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (route: CommuteRoute) => {
    if (!origin || !destination) return;
    saveMutation.mutate({

      data: {
        name: `${origin.name} → ${destination.name}`,
        originName: origin.name,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationName: destination.name,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        priority,
        filters,
      },
    });
  };

  return (
    <MobileShell>
      <div className="space-y-5 p-4">
        <section className="overflow-hidden rounded-3xl bg-gradient-hero p-5 text-ink-foreground shadow-lift">
          <div className="flex items-center gap-2 text-xs font-medium text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" />
            {t("aiRanked")}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold">{t("whereTo")}</h1>
          <p className="mt-1 text-sm text-ink-foreground/70">
            {t("plannerSubtitle")}
          </p>

          {(homePlace || workPlace) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {homePlace && workPlace && (
                <QuickChip
                  icon={Briefcase}
                  label={t("homeToWork")}
                  onClick={() => {
                    setOrigin(homePlace);
                    setDestination(workPlace);
                  }}
                />
              )}
              {homePlace && workPlace && (
                <QuickChip
                  icon={Home}
                  label={t("workToHome")}
                  onClick={() => {
                    setOrigin(workPlace);
                    setDestination(homePlace);
                  }}
                />
              )}
              {homePlace && (
                <QuickChip icon={Home} label={t("toHome")} onClick={() => setDestination(homePlace)} />
              )}
              {workPlace && (
                <QuickChip
                  icon={Briefcase}
                  label={t("toWork")}
                  onClick={() => setDestination(workPlace)}
                />
              )}
            </div>
          )}
        </section>

        <Card className="border-border/70 shadow-soft">
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4">
              <PlaceSearch id="origin" label={t("from")} value={origin} onChange={setOrigin} saved={savedOptions} />
              <PlaceSearch id="destination" label={t("to")} value={destination} onChange={setDestination} saved={savedOptions} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("priority")}</Label>
                <InfoButton label="How route priorities work">Fastest prioritises total journey time. Comfort favours lower crowding and better seat chances. Balanced weighs both, while Cheapest emphasises estimated fare.</InfoButton>
              </div>
              <RadioGroup
                value={priority}
                onValueChange={(v) => setPriority(v as RoutePriority)}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {[
                  { value: "time", label: t("fastest") },
                  { value: "balanced", label: t("balanced") },
                  { value: "comfort", label: t("comfort") },
                  { value: "price", label: t("cheapest") },
                ].map((option) => (
                  <label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      priority === option.value
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("comfortFilters")}</Label>
                <InfoButton label="About comfort estimates">Seat and crowd estimates use live operator data when available. They can change before you board.</InfoButton>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "seatAvailability", label: t("seatLikely") },
                  { key: "fewerTransfers", label: t("fewerTransfers") },
                  { key: "lessWalking", label: t("lessWalking") },
                  { key: "airConditioned", label: t("aircon") },
                  { key: "accessible", label: t("accessible") },
                  { key: "cheaperFare", label: t("lowerFare") },
                ].map((f) => {
                  const active = filters[f.key as keyof RouteFilters];
                  return (
                    <label
                      key={f.key}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={active}
                        onCheckedChange={() => toggleFilter(f.key as keyof RouteFilters)}
                      />
                      {f.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <Button onClick={handlePlan} disabled={loading} size="lg" className="w-full shadow-glow">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {t("findRoutes")}
            </Button>
            <p className="text-xs text-muted-foreground">
              Fares estimated for your {cardLabel(cardType).toLowerCase()} — change it in your
              profile. Estimates only, not a fare quotation.
            </p>
          </CardContent>
        </Card>

        {recommendation && (
          <Card className="border-primary/40 bg-gradient-mint shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </span>
                Best match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">
                {recommendation.explanation}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Ranked from live timetable, walking, transfers, fare and comfort data. The AI explains the result but does not replace the route score.
              </p>
            </CardContent>
          </Card>
        )}

        {routes.length > 0 && !routes.some((r) => r.steps.some((s) => s.mode === "bus")) && (
          <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            No bus options for this trip right now — live bus data is unavailable, so only train and
            walking routes are shown.
          </p>
        )}

        {routes.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {routes.length} option{routes.length === 1 ? "" : "s"}
            </h2>
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                recommended={route.id === recommendation?.recommendedRouteId}
                onSave={() => handleSave(route)}
              />
            ))}
          </section>
        )}
      </div>
    </MobileShell>
  );
}

function QuickChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-3 py-1.5 text-xs font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/20"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" });
}

function RouteCard({
  route,
  recommended,
  onSave,
}: {
  route: CommuteRoute;
  recommended?: boolean;
  onSave: () => void;
}) {
  return (
    <Card
      className={
        recommended
          ? "border-primary/60 shadow-glow transition-shadow"
          : "border-border/70 shadow-soft transition-shadow hover:shadow-lift"
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base leading-snug">{route.summary}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {route.departureTime
                ? `Depart ${formatTime(route.departureTime)}${route.arrivalTime ? ` · arrive ${formatTime(route.arrivalTime)}` : ""}`
                : `Score: ${route.score}`}
            </p>
          </div>
          {recommended && <Badge className="shrink-0">Recommended</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <MetricTile icon={Clock} value={`${route.totalTimeMinutes} min`} label="Travel" />
          <MetricTile icon={Coins} value={formatFare(route.fareCents)} label="Est. fare" />
          <MetricTile icon={Users} value={route.crowdLevel} label="Crowd" />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Footprints className="h-3.5 w-3.5" />
            {route.walkingDistanceMeters}m walk
          </span>
          <span className="flex items-center gap-1">
            <Bus className="h-3.5 w-3.5" />
            {route.transfers} transfer{route.transfers === 1 ? "" : "s"}
          </span>
        </div>

        <Separator />

        <div className="space-y-3">
          {route.steps.map((step, idx) => (
            <div key={idx} className="flex gap-3 text-sm">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  {step.mode === "walk" ? (
                    <Footprints className="h-3.5 w-3.5" />
                  ) : step.mode === "bus" ? (
                    <Bus className="h-3.5 w-3.5" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                </span>
                {idx < route.steps.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-1">
                <p className="font-medium">
                  {step.mode === "walk"
                    ? "Walk"
                    : step.mode === "bus"
                      ? `Bus ${step.serviceNo ?? ""}`.trim()
                      : (step.line ?? "Train")}{" "}
                  · {step.durationMinutes} min
                </p>
                <p className="text-xs text-muted-foreground">{step.instruction}</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={onSave}>
          <Heart className="mr-2 h-4 w-4" />
          Save route
        </Button>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/50 p-2.5 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <p className="truncate text-sm font-semibold capitalize">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

