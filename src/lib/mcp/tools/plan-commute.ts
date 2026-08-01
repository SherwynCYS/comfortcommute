import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "plan_commute",
  title: "Plan a commute",
  description:
    "Plan and rank Singapore public-transport journeys between two coordinates, priced for the commuter's fare card. Use search_places first to get coordinates.",
  inputSchema: {
    originName: z.string().trim().min(1).describe("Human-readable origin name."),
    originLat: z.number().describe("Origin latitude."),
    originLng: z.number().describe("Origin longitude."),
    destinationName: z.string().trim().min(1).describe("Human-readable destination name."),
    destinationLat: z.number().describe("Destination latitude."),
    destinationLng: z.number().describe("Destination longitude."),
    priority: z
      .enum(["comfort", "time", "balanced", "price"])
      .default("balanced")
      .describe("What to optimise the ranking for."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();

    const supabase = supabaseForUser(ctx);
    const { data: profile } = await supabase
      .from("profiles")
      .select("card_type")
      .eq("id", ctx.getUserId())
      .maybeSingle();

    const { buildCandidateRoutes } = await import("@/lib/transit.server");
    const { rankRoutes } = await import("@/lib/scoring.server");
    const { estimateFareCents, isCardType } = await import("@/lib/fares");

    const cardType = isCardType(profile?.card_type) ? profile.card_type : "adult_card";

    const candidates = await buildCandidateRoutes(
      { name: input.originName, lat: input.originLat, lng: input.originLng },
      { name: input.destinationName, lat: input.destinationLat, lng: input.destinationLng }
    );

    const priced = candidates.map((route) => {
      const boardings = route.steps.filter((step) => step.mode !== "walk").length;
      const estimated = estimateFareCents({ distanceKm: route.rideDistanceKm, cardType, boardings });
      const adult = estimateFareCents({ distanceKm: route.rideDistanceKm, cardType: "adult_card", boardings });
      const provider = route.providerFareCents;
      const fareCents = provider && adult > 0 ? Math.round(provider * (estimated / adult)) : estimated;
      return { ...route, fareCents };
    });

    const ranked = rankRoutes(priced, input.priority, {}).map((route) => ({
      summary: route.summary,
      totalTimeMinutes: route.totalTimeMinutes,
      fareSgd: (route.fareCents / 100).toFixed(2),
      transfers: route.transfers,
      walkingDistanceMeters: route.walkingDistanceMeters,
      crowdLevel: route.crowdLevel,
      seatAvailability: route.seatAvailability,
      departureTime: route.departureTime,
      arrivalTime: route.arrivalTime,
      steps: route.steps.map((s) => s.instruction),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ cardType, routes: ranked }) }],
      structuredContent: { cardType, routes: ranked },
    };
  },
});
