import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type {
  CommuteRoute,
  RouteStep,
  RouteFilters,
  RoutePriority,
} from "./route-types";

const PlanRouteInput = z.object({
  originName: z.string().min(1),
  originLat: z.number(),
  originLng: z.number(),
  destinationName: z.string().min(1),
  destinationLat: z.number(),
  destinationLng: z.number(),
  priority: z.enum(["comfort", "time", "balanced", "price"]),
  filters: z.record(z.boolean()).default({}),
  cardType: z
    .enum(["adult_card", "student_card", "senior_card", "workfare_card", "disability_card", "cash"])
    .default("adult_card"),
});

export const planRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => PlanRouteInput.parse(input))
  .handler(async ({ data }) => {
    const { buildCandidateRoutes } = await import("./transit.server");
    const { scoreRoute } = await import("./scoring.server");
    const { estimateFareCents } = await import("./fares");

    const candidates = await buildCandidateRoutes(
      { name: data.originName, lat: data.originLat, lng: data.originLng },
      { name: data.destinationName, lat: data.destinationLat, lng: data.destinationLng }
    );

    return candidates
      .map((route) => {
        const boardings = route.steps.filter((step) => step.mode !== "walk").length;
        const fareCents = estimateFareCents({
          distanceKm: route.rideDistanceKm,
          cardType: data.cardType,
          boardings,
        });
        const withFare = { ...route, fareCents };
        return { ...withFare, score: scoreRoute(withFare, data.priority, data.filters) };
      })
      .sort((a, b) => b.score - a.score);
  });
