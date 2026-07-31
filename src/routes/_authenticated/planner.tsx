import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { planRoute, type CommuteRoute, type RouteFilters, type RoutePriority } from "@/lib/routes.functions";
import { recommendRoute, type AiRecommendation } from "@/lib/ai.functions";
import { createFavoriteRoute } from "@/lib/favorites.functions";
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
      <div className="space-y-6 p-4">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Plan your journey</h2>

        {(homePlace || workPlace) && (
          <div className="flex flex-wrap gap-2">
            {homePlace && workPlace && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOrigin(homePlace);
                  setDestination(workPlace);
                }}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Home → Work
              </Button>
            )}
            {homePlace && workPlace && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOrigin(workPlace);
                  setDestination(homePlace);
                }}
              >
                <Home className="mr-2 h-4 w-4" />
                Work → Home
              </Button>
            )}
            {homePlace && (
              <Button variant="outline" size="sm" onClick={() => setDestination(homePlace)}>
                <Home className="mr-2 h-4 w-4" />
                To home
              </Button>
            )}
            {workPlace && (
              <Button variant="outline" size="sm" onClick={() => setDestination(workPlace)}>
                <Briefcase className="mr-2 h-4 w-4" />
                To work
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <PlaceSearch id="origin" label="From" value={origin} onChange={setOrigin} />
          <PlaceSearch id="destination" label="To" value={destination} onChange={setDestination} />
        </div>


        <div className="space-y-2">
          <Label>Priority</Label>
          <RadioGroup
            value={priority}
            onValueChange={(v) => setPriority(v as RoutePriority)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="time" id="time" />
              <Label htmlFor="time">Fastest</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="balanced" id="balanced" />
              <Label htmlFor="balanced">Balanced</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="comfort" id="comfort" />
              <Label htmlFor="comfort">Comfort</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="price" id="price" />
              <Label htmlFor="price">Cheapest</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Comfort filters</Label>
          <div className="flex flex-wrap gap-3">
            {[
              { key: "seatAvailability", label: "Seat likely" },
              { key: "fewerTransfers", label: "Fewer transfers" },
              { key: "lessWalking", label: "Less walking" },
              { key: "airConditioned", label: "Air-con" },
              { key: "accessible", label: "Accessible" },
              { key: "cheaperFare", label: "Lower fare" },
            ].map((f) => (
              <label
                key={f.key}
                className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm"
              >
                <Checkbox
                  checked={filters[f.key as keyof RouteFilters]}
                  onCheckedChange={() => toggleFilter(f.key as keyof RouteFilters)}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handlePlan} disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Find best routes
        </Button>
        <p className="text-xs text-muted-foreground">
          Fares estimated for your {cardLabel(cardType).toLowerCase()} — change it in your profile.
        </p>
      </section>

      {recommendation && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              AI recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{recommendation.explanation}</p>
          </CardContent>
        </Card>
      )}

      {routes.length > 0 && !routes.some((r) => r.steps.some((s) => s.mode === "bus")) && (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No bus options for this trip right now — live bus data is unavailable, so only train and
          walking routes are shown.
        </p>
      )}

      <section className="space-y-4">

        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            recommended={route.id === recommendation?.recommendedRouteId}
            onSave={() => handleSave(route)}
          />
        ))}
        </section>
      </div>
    </MobileShell>
  );
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
    <Card className={recommended ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{route.summary}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {route.departureTime
                ? `Depart ${formatTime(route.departureTime)}${route.arrivalTime ? ` · arrive ${formatTime(route.arrivalTime)}` : ""}`
                : `Score: ${route.score}`}
            </p>
          </div>
          {recommended && <Badge variant="default">Recommended</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {route.totalTimeMinutes} min
          </div>
          <div className="flex items-center gap-1">
            <Footprints className="h-4 w-4 text-muted-foreground" />
            {route.walkingDistanceMeters}m walk
          </div>
          <div className="flex items-center gap-1">
            <Bus className="h-4 w-4 text-muted-foreground" />
            {route.transfers} transfers
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            {route.crowdLevel} crowd
          </div>
          <div className="flex items-center gap-1 font-medium">
            <Coins className="h-4 w-4 text-muted-foreground" />
            {formatFare(route.fareCents)}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          {route.steps.map((step, idx) => (
            <div key={idx} className="flex gap-3 text-sm">
              <div className="mt-1">
                {step.mode === "walk" ? (
                  <Footprints className="h-4 w-4" />
                ) : step.mode === "bus" ? (
                  <Bus className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {step.mode === "walk"
                    ? "Walk"
                    : step.mode === "bus"
                      ? `Bus ${step.serviceNo ?? ""}`.trim()
                      : (step.line ?? "Train")} · {step.durationMinutes} min
                </p>
                <p className="text-muted-foreground">{step.instruction}</p>
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
