import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { planRoute, type CommuteRoute, type RouteFilters, type RoutePriority } from "@/lib/routes.functions";
import { recommendRoute, type AiRecommendation } from "@/lib/ai.functions";
import { createFavoriteRoute } from "@/lib/favorites.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Bus, Clock, Footprints, Heart, Loader2, MapPin, Sparkles, Users } from "lucide-react";
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
      { title: "Plan Journey | Nebula Commute" },
      { name: "description", content: "Plan your commute with AI-powered recommendations." },
      { property: "og:title", content: "Plan Journey | Nebula Commute" },
      { property: "og:description", content: "Plan your commute with AI-powered recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const sampleOrigins = [
  { name: "Jurong East", lat: 1.3332, lng: 103.7418 },
  { name: "Tampines", lat: 1.3525, lng: 103.9447 },
  { name: "Orchard", lat: 1.3048, lng: 103.8318 },
];

const sampleDestinations = [
  { name: "Raffles Place", lat: 1.2839, lng: 103.8525 },
  { name: "Dhoby Ghaut", lat: 1.2991, lng: 103.8458 },
  { name: "Buona Vista", lat: 1.3074, lng: 103.7908 },
];

function PlannerPage() {
  const [origin, setOrigin] = useState(sampleOrigins[0]);
  const [destination, setDestination] = useState(sampleDestinations[0]);
  const [priority, setPriority] = useState<RoutePriority>("balanced");
  const [filters, setFilters] = useState<RouteFilters>({
    seatAvailability: false,
    fewerTransfers: false,
    lessWalking: false,
    airConditioned: false,
    accessible: false,
  });
  const [routes, setRoutes] = useState<CommuteRoute[]>([]);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  const planFn = useServerFn(planRoute);
  const recommendFn = useServerFn(recommendRoute);
  const saveRouteFn = useServerFn(createFavoriteRoute);

  const saveMutation = useMutation({
    mutationFn: saveRouteFn,
    onSuccess: () => toast.success("Route saved to favourites"),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save route"),
  });

  const handlePlan = async () => {
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="origin">From</Label>
            <select
              id="origin"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={origin.name}
              onChange={(e) => {
                const found = sampleOrigins.find((o) => o.name === e.target.value);
                if (found) setOrigin(found);
              }}
            >
              {sampleOrigins.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">To</Label>
            <select
              id="destination"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={destination.name}
              onChange={(e) => {
                const found = sampleDestinations.find((d) => d.name === e.target.value);
                if (found) setDestination(found);
              }}
            >
              {sampleDestinations.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
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
            <p className="text-xs text-muted-foreground">Score: {route.score}</p>
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
        </div>

        <Separator />

        <div className="space-y-2">
          {route.steps.map((step, idx) => (
            <div key={idx} className="flex gap-3 text-sm">
              <div className="mt-1">
                {step.mode === "walk" ? <Footprints className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-medium">
                  {step.mode === "walk" ? "Walk" : step.serviceNo ?? step.line ?? "Ride"} · {step.durationMinutes} min
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
