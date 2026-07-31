export type RoutePriority = "comfort" | "time" | "balanced" | "price";

export type RouteFilters = {
  seatAvailability?: boolean;
  fewerTransfers?: boolean;
  lessWalking?: boolean;
  airConditioned?: boolean;
  accessible?: boolean;
  cheaperFare?: boolean;
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
  /** In-vehicle distance in km, used for fare estimation. */
  rideDistanceKm: number;
  /** Estimated fare in cents for the traveller's fare card. */
  fareCents: number;
  /** ISO departure time of the first transit leg, when the provider gives one. */
  departureTime?: string;
  /** ISO arrival time at the destination, when the provider gives one. */
  arrivalTime?: string;
  /** Adult fare in cents reported by the routing provider, if available. */
  providerFareCents?: number;
  /** Position in the routing provider's own ordering (0 = its top suggestion). */
  baselineRank?: number;
};
