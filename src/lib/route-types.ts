export type RoutePriority = "comfort" | "time" | "balanced";

export type RouteFilters = {
  seatAvailability?: boolean;
  fewerTransfers?: boolean;
  lessWalking?: boolean;
  airConditioned?: boolean;
  accessible?: boolean;
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
