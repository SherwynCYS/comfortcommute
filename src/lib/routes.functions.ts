import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBusArrivals, getBusStops, getTrainServiceAlerts } from "./lta.functions";

export type RoutePriority = "comfort" | "time" | "balanced";

export type RouteFilters = {
  seatAvailability?: boolean;
  fewerTransfers?: boolean;
  lessWalking?: boolean;
  airConditioned?: boolean;
  accessible?: boolean;
};

export type CommuteRoute = {
  id: string;
  summary: string;
  totalTimeMinutes: number;
  walkingDistanceMeters: number;
  transfers: number;
  crowdLevel: "low" | "medium" | "high";
  seatAvailability: "likely" | "unlikely" | "unknown";
  steps: RouteStep[];
  score: number;
};

export type RouteStep = {
  mode: "walk" | "bus" | "mrt" | "lrt";
  from: string;
  to: string;
  durationMinutes: number;
  serviceNo?: string;
  line?: string;
  instruction: string;
};

const PlanRouteInput = z.object({
  originName: z.string().min(1),
  originLat: z.number(),
  originLng: z.number(),
  destinationName: z.string().min(1),
  destinationLat: z.number(),
  destinationLng: z.number(),
  priority: z.enum(["comfort", "time", "balanced"]),
  filters: z.record(z.boolean()).default({}),
});

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateRoute(
  origin: { name: string; lat: number; lng: number },
  destination: { name: string; lat: number; lng: number }
): CommuteRoute {
  const directDistance = haversineDistance(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  // Rough heuristic: walking + MRT/bus combination
  const walkToStation = Math.min(800, directDistance * 0.15);
  const transitDistance = directDistance * 0.85;
  const walkFromStation = Math.min(600, directDistance * 0.1);

  const walkToTime = Math.round(walkToStation / 80);
  const transitTime = Math.round(transitDistance / 400);
  const walkFromTime = Math.round(walkFromStation / 80);

  const totalTime = walkToTime + transitTime + walkFromTime;

  return {
    id: `route-${Date.now()}-direct`,
    summary: `${origin.name} to ${destination.name}`,
    totalTimeMinutes: totalTime,
    walkingDistanceMeters: Math.round(walkToStation + walkFromStation),
    transfers: 0,
    crowdLevel: "medium",
    seatAvailability: "unknown",
    steps: [
      {
        mode: "walk",
        from: origin.name,
        to: "Nearest station / bus stop",
        durationMinutes: walkToTime,
        instruction: `Walk to the nearest station or bus stop (~${Math.round(walkToStation)}m)`,
      },
      {
        mode: "mrt",
        from: "Nearest station / bus stop",
        to: "Near destination",
        durationMinutes: transitTime,
        instruction: "Take the most direct train or bus toward your destination",
      },
      {
        mode: "walk",
        from: "Near destination",
        to: destination.name,
        durationMinutes: walkFromTime,
        instruction: `Walk to ${destination.name} (~${Math.round(walkFromStation)}m)`,
      },
    ],
    score: 0,
  };
}

function estimateAlternativeRoute(
  origin: { name: string; lat: number; lng: number },
  destination: { name: string; lat: number; lng: number }
): CommuteRoute {
  const direct = estimateRoute(origin, destination);

  // Slightly longer route with one transfer but lower crowd
  const transferRoute: CommuteRoute = {
    ...direct,
    id: `route-${Date.now()}-transfer`,
    summary: `${origin.name} to ${destination.name} via transfer`,
    totalTimeMinutes: direct.totalTimeMinutes + 8,
    transfers: 1,
    crowdLevel: "low",
    seatAvailability: "likely",
    steps: [
      ...direct.steps.slice(0, 1),
      {
        mode: "bus",
        from: "Nearest bus stop",
        to: "Interchange",
        durationMinutes: Math.max(5, Math.round(direct.totalTimeMinutes * 0.4)),
        instruction: "Take a feeder bus to the interchange",
      },
      {
        mode: "mrt",
        from: "Interchange",
        to: "Near destination",
        durationMinutes: Math.max(5, Math.round(direct.totalTimeMinutes * 0.5)),
        instruction: "Transfer to the train toward your destination",
      },
      ...direct.steps.slice(2),
    ],
    score: 0,
  };

  return transferRoute;
}

function scoreRoute(route: CommuteRoute, priority: RoutePriority, filters: RouteFilters): number {
  let score = 100;

  // Time penalty
  score -= route.totalTimeMinutes * 0.8;
  score -= route.transfers * 6;
  score -= route.walkingDistanceMeters * 0.015;

  // Comfort adjustments
  if (route.crowdLevel === "low") score += 10;
  if (route.crowdLevel === "high") score -= 10;
  if (route.seatAvailability === "likely") score += 8;
  if (route.seatAvailability === "unlikely") score -= 5;

  // Priority weighting
  if (priority === "time") {
    score -= route.totalTimeMinutes * 0.5;
  } else if (priority === "comfort") {
    score += route.crowdLevel === "low" ? 15 : route.crowdLevel === "high" ? -15 : 0;
    score += route.seatAvailability === "likely" ? 12 : 0;
  }

  // Filter adjustments
  if (filters.seatAvailability && route.seatAvailability === "likely") score += 10;
  if (filters.fewerTransfers && route.transfers <= 1) score += 8;
  if (filters.lessWalking && route.walkingDistanceMeters < 1000) score += 8;
  if (filters.airConditioned) score += 3;
  if (filters.accessible) score += 5;

  return Math.round(score);
}

export const planRoute = createServerFn({ method: "POST" })
  .validator((input: unknown) => PlanRouteInput.parse(input))
  .handler(async ({ data }) => {
    const origin = {
      name: data.originName,
      lat: data.originLat,
      lng: data.originLng,
    };
    const destination = {
      name: data.destinationName,
      lat: data.destinationLat,
      lng: data.destinationLng,
    };

    const filters = data.filters as RouteFilters;

    const direct = estimateRoute(origin, destination);
    const transfer = estimateAlternativeRoute(origin, destination);

    const candidates = [direct, transfer].map((route) => ({
      ...route,
      score: scoreRoute(route, data.priority, filters),
    }));

    candidates.sort((a, b) => b.score - a.score);

    return candidates;
  });
