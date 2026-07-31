import type { CommuteRoute, RouteFilters, RoutePriority } from "./route-types";

export function scoreRoute(
  route: CommuteRoute,
  priority: RoutePriority,
  filters: RouteFilters
): number {
  let score = 100;
  const fareDollars = route.fareCents / 100;

  score -= route.totalTimeMinutes * 0.8;
  score -= route.transfers * 6;
  score -= route.walkingDistanceMeters * 0.015;
  score -= fareDollars * 6;

  if (route.crowdLevel === "low") score += 10;
  if (route.crowdLevel === "high") score -= 10;
  if (route.seatAvailability === "likely") score += 8;
  if (route.seatAvailability === "unlikely") score -= 5;

  if (priority === "time") {
    score -= route.totalTimeMinutes * 0.5;
  } else if (priority === "comfort") {
    score += route.crowdLevel === "low" ? 15 : route.crowdLevel === "high" ? -15 : 0;
    score += route.seatAvailability === "likely" ? 12 : 0;
  } else if (priority === "price") {
    score -= fareDollars * 18;
  }

  if (filters.seatAvailability && route.seatAvailability === "likely") score += 10;
  if (filters.fewerTransfers && route.transfers <= 1) score += 8;
  if (filters.lessWalking && route.walkingDistanceMeters < 1000) score += 8;
  if (filters.airConditioned && route.steps.some((s) => s.mode !== "walk")) score += 3;
  if (filters.accessible) score += 5;
  if (filters.cheaperFare) score -= fareDollars * 10;

  return Math.round(score);
}
