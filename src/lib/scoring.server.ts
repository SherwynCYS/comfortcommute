import type { CommuteRoute, RouteFilters, RoutePriority } from "./route-types";

/**
 * Relative scoring: every route is judged against the best route in the same
 * result set, not against arbitrary absolute constants. This keeps us anchored
 * to the routing baseline (Google) — a route only outranks the fastest option
 * when it is meaningfully better on comfort/price for the chosen priority.
 */

type Weights = { time: number; transfers: number; walk: number; fare: number; comfort: number };

const WEIGHTS: Record<RoutePriority, Weights> = {
  time: { time: 62, transfers: 8, walk: 8, fare: 4, comfort: 18 },
  balanced: { time: 40, transfers: 12, walk: 12, fare: 12, comfort: 24 },
  comfort: { time: 24, transfers: 16, walk: 14, fare: 6, comfort: 40 },
  price: { time: 24, transfers: 8, walk: 8, fare: 44, comfort: 16 },
};

/** 1 when the value equals the set's best, decaying towards 0 as it gets worse. */
function relative(value: number, best: number, tolerance: number): number {
  const excess = Math.max(0, value - best);
  return 1 / (1 + excess / Math.max(tolerance, 1));
}

function comfortScore(route: CommuteRoute): number {
  const crowd = route.crowdLevel === "low" ? 1 : route.crowdLevel === "medium" ? 0.6 : 0.15;
  const seat =
    route.seatAvailability === "likely" ? 1 : route.seatAvailability === "unlikely" ? 0.2 : 0.6;
  return crowd * 0.6 + seat * 0.4;
}

export function rankRoutes(
  routes: CommuteRoute[],
  priority: RoutePriority,
  filters: RouteFilters
): CommuteRoute[] {
  if (routes.length === 0) return routes;

  const bestTime = Math.min(...routes.map((r) => r.totalTimeMinutes));
  const bestTransfers = Math.min(...routes.map((r) => r.transfers));
  const bestWalk = Math.min(...routes.map((r) => r.walkingDistanceMeters));
  const bestFare = Math.min(...routes.map((r) => r.fareCents));
  const w = WEIGHTS[priority];
  const timeTolerance = priority === "time" ? 8 : priority === "balanced" ? 12 : 18;

  const scored = routes.map((route) => {
    let score =
      w.time * relative(route.totalTimeMinutes, bestTime, timeTolerance) +
      w.transfers * relative(route.transfers, bestTransfers, 1) +
      w.walk * relative(route.walkingDistanceMeters, bestWalk, 600) +
      w.fare * relative(route.fareCents, bestFare, 50) +
      w.comfort * comfortScore(route);

    // Explicit user filters act as tie-breakers, never as large overrides.
    if (filters.seatAvailability && route.seatAvailability === "likely") score += 5;
    if (filters.fewerTransfers && route.transfers <= bestTransfers) score += 5;
    if (filters.lessWalking && route.walkingDistanceMeters <= bestWalk + 200) score += 5;
    if (filters.accessible && route.steps.every((s) => s.mode !== "bus")) score += 3;
    if (filters.cheaperFare && route.fareCents <= bestFare) score += 5;

    // Trust the routing baseline for near-ties.
    score -= Math.min(route.baselineRank ?? 0, 5) * 0.6;

    return { ...route, score: Math.round(score) };
  });

  return scored.sort((a, b) => b.score - a.score || a.totalTimeMinutes - b.totalTimeMinutes);
}
