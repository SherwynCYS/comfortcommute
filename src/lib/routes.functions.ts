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
    const { rankRoutes } = await import("./scoring.server");
    const { estimateFareCents } = await import("./fares");

    const candidates = await buildCandidateRoutes(
      { name: data.originName, lat: data.originLat, lng: data.originLng },
      { name: data.destinationName, lat: data.destinationLat, lng: data.destinationLng }
    );

    const priced = candidates.map((route) => {
      const boardings = route.steps.filter((step) => step.mode !== "walk").length;
      const estimated = estimateFareCents({
        distanceKm: route.rideDistanceKm,
        cardType: data.cardType,
        boardings,
      });
      // Prefer the operator fare reported by the routing provider (adult), scaled
      // to the traveller's card using our own adult-vs-card ratio.
      const provider = route.providerFareCents;
      const adult = estimateFareCents({
        distanceKm: route.rideDistanceKm,
        cardType: "adult_card",
        boardings,
      });
      const fareCents =
        provider && adult > 0 ? Math.round(provider * (estimated / adult)) : estimated;
      return { ...route, fareCents };
    });

    return rankRoutes(priced, data.priority, data.filters);
  });

