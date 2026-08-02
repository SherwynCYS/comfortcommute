import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { CommuteRoute, RouteFilters, RoutePriority } from "./route-types";

export type RecommendationInput = {
  originName: string;
  destinationName: string;
  priority: RoutePriority;
  filters: Record<string, boolean>;
  routes: CommuteRoute[];
};

export type AiRecommendation = { recommendedRouteId: string; explanation: string; rankedRouteIds: string[] };

export async function createRouteRecommendation(data: RecommendationInput, key: string): Promise<AiRecommendation> {
  const topRoute = data.routes[0];
  if (!topRoute) return { recommendedRouteId: "", explanation: "No suitable route was found.", rankedRouteIds: [] };

  const gateway = createLovableAiGatewayProvider(key, undefined, { structuredOutputs: true });
  const filterLabels = Object.entries(data.filters as RouteFilters).filter(([, value]) => value).map(([name]) => name).join(", ") || "none";
  const schema = z.object({ explanation: z.string() });
  const prompt = `You explain a Singapore public-transport recommendation. The deterministic scoring engine has already selected the first route as best; do not choose or rank routes. Explain in 1-2 plain-language sentences why it fits the traveller's ${data.priority} priority and filters (${filterLabels}). Mention a useful trade-off if present.\nTrip: ${data.originName} to ${data.destinationName}\nSelected route: ${JSON.stringify(topRoute)}\nOther options for comparison: ${JSON.stringify(data.routes.slice(1))}`;

  try {
    const { output } = await generateText({
      model: gateway("openai/gpt-5.6-sol"),
      output: Output.object({ schema }),
      prompt,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });
    return { recommendedRouteId: topRoute.id, explanation: output.explanation, rankedRouteIds: data.routes.map((route) => route.id) };
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) throw error;
    return { recommendedRouteId: topRoute.id, explanation: "This is the highest-scoring route for your selected priority and filters.", rankedRouteIds: data.routes.map((route) => route.id) };
  }
}