import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

    const { createRouteRecommendation } = await import("./ai-recommendation.server");
    return createRouteRecommendation(data, key);
  });
