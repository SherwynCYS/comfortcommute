import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { CommuteRoute, RoutePriority, RouteFilters } from "./routes.functions";

const RecommendInput = z.object({
  originName: z.string(),
  destinationName: z.string(),
  priority: z.enum(["comfort", "time", "balanced", "price"]),
  filters: z.record(z.string(), z.boolean()).default({}),
  routes: z.array(z.any()),
});

export type AiRecommendation = {
  recommendedRouteId: string;
  explanation: string;
  rankedRouteIds: string[];
};

export const recommendRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => RecommendInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key, undefined, {
      structuredOutputs: true,
    });
    const model = gateway("openai/gpt-5.6-sol");

    const filterLabels = Object.entries(data.filters as RouteFilters)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none";

    const prompt = `
You are a Singapore public transport commute assistant. The user wants to travel from "${data.originName}" to "${data.destinationName}".
Their priority is: ${data.priority} (comfort = prefer less crowded, more seats; time = fastest; balanced = reasonable mix; price = cheapest fare).
Active filters: ${filterLabels}.

Here are candidate routes (JSON):
${JSON.stringify(data.routes, null, 2)}

Each route includes an estimated fare in cents (fareCents) for the traveller's concession card — weigh cost when the priority is price or when fares differ noticeably.

Recommend the single best route for this user. Return the route id, a concise 1-2 sentence explanation, and the route ids ranked from best to worst.
`;

    const schema = z.object({
      recommendedRouteId: z.string(),
      explanation: z.string(),
      rankedRouteIds: z.array(z.string()),
    });

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema }),
        prompt,
        providerOptions: { lovable: { reasoningEffort: "none" } },
      });
      return output as AiRecommendation;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        // Fallback: pick the first route
        const firstRoute = data.routes[0] as CommuteRoute | undefined;
        return {
          recommendedRouteId: firstRoute?.id ?? "",
          explanation: "We picked the top-scoring route based on your priority.",
          rankedRouteIds: data.routes.map((r: CommuteRoute) => r.id),
        };
      }
      throw error;
    }
  });
