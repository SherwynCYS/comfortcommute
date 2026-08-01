import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type { BusJourney, BusJourneyStop, LiveBus, LiveService, NearbyStop } from "./live-bus.server";

export const getNearbyStops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ lat: z.number(), lng: z.number(), limit: z.number().int().min(1).max(20).default(8) }).parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) return [];
    const { findNearbyStops } = await import("./live-bus.server");
    return findNearbyStops(data.lat, data.lng, apiKey, data.limit);
  });

export const getStopLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ code: z.string().min(3).max(10) }).parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) return { stop: null, services: [], available: false };

    const { fetchLiveArrivals, lookupStop } = await import("./live-bus.server");
    const [stop, services] = await Promise.all([
      lookupStop(data.code, apiKey).catch(() => null),
      fetchLiveArrivals(data.code, apiKey).catch(() => []),
    ]);

    return { stop, services, available: true };
  });

export const getBusJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ serviceNo: z.string().min(1).max(10), stopCode: z.string().min(3).max(10) }).parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) return [];
    const { fetchBusJourney } = await import("./live-bus.server");
    return fetchBusJourney(data.serviceNo, data.stopCode, apiKey);
  });
