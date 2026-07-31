import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PlaceResult = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  type: "rail" | "bus";
};

export const searchPlaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ query: z.string().default(""), limit: z.number().int().min(1).max(50).default(15) }).parse(input)
  )
  .handler(async ({ data }): Promise<PlaceResult[]> => {
    const { railPlaces, getBusStopPlaces, searchPlaceList } = await import("./places.server");

    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    const busStops = apiKey ? await getBusStopPlaces(apiKey) : [];

    return searchPlaceList([...railPlaces, ...busStops], data.query, data.limit);
  });
