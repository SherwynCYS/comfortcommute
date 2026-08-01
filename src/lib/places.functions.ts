import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PlaceResult = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  type: "rail" | "bus" | "address";
};

export const searchPlaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ query: z.string().default(""), limit: z.number().int().min(1).max(50).default(15) }).parse(input)
  )
  .handler(async ({ data }): Promise<PlaceResult[]> => {
    const { railPlaces, getBusStopPlaces, searchPlaceList, searchAddresses } = await import("./places.server");

    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    const [busStops, addresses] = await Promise.all([
      apiKey ? getBusStopPlaces(apiKey) : Promise.resolve([]),
      searchAddresses(data.query, 8),
    ]);

    const transit = searchPlaceList([...railPlaces, ...busStops], data.query, data.limit);

    const q = data.query.trim().toLowerCase();
    const transitIntent = /^\d{3,5}$/.test(q) || /\b(mrt|lrt|bus|stop|station|interchange)\b/.test(q);

    // Bus stops and stations are transit objects, not generic "places": surface
    // the strongest transit matches first, then geocoded addresses.
    const merged = transitIntent
      ? [...transit, ...addresses]
      : [...transit.slice(0, 4), ...addresses, ...transit.slice(4)];

    const seen = new Set<string>();
    return merged.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, data.limit);
  });
