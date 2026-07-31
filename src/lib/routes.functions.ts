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
  priority: z.enum(["comfort", "time", "balanced"]),
  filters: z.record(z.boolean()).default({}),
});

export const planRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => PlanRouteInput.parse(input))
  .handler(async ({ data }) => {
    const { buildCandidateRoutes } = await import("./transit.server");
    const { scoreRoute } = await import("./scoring.server");

    const candidates = await buildCandidateRoutes(
      { name: data.originName, lat: data.originLat, lng: data.originLng },
      { name: data.destinationName, lat: data.destinationLat, lng: data.destinationLng }
    );

    return candidates
      .map((route) => ({ ...route, score: scoreRoute(route, data.priority, data.filters) }))
      .sort((a, b) => b.score - a.score);
  });
