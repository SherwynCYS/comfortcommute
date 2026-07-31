import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const LTA_BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice";

async function ltaFetch(path: string, apiKey: string) {
  const response = await fetch(`${LTA_BASE_URL}${path}`, {
    headers: {
      AccountKey: apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LTA API error [${response.status}]: ${text}`);
  }

  return response.json();
}

export const getBusArrivals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ busStopCode: z.string(), serviceNo: z.string().optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) throw new Error("Missing LTA_DATAMALL_API_KEY");

    const params = new URLSearchParams();
    params.set("BusStopCode", data.busStopCode);
    if (data.serviceNo) params.set("ServiceNo", data.serviceNo);

    return ltaFetch(`/BusArrivalv2?${params.toString()}`, apiKey);
  });

export const getBusStops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ skip: z.number().int().min(0).default(0) }).parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) throw new Error("Missing LTA_DATAMALL_API_KEY");

    return ltaFetch(`/BusStops?$skip=${data.skip}`, apiKey);
  });

export const getTrainServiceAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const apiKey = process.env.LTA_DATAMALL_API_KEY;
  if (!apiKey) throw new Error("Missing LTA_DATAMALL_API_KEY");

  return ltaFetch("/TrainServiceAlerts", apiKey);
});

export const getBusServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ skip: z.number().int().min(0).default(0) }).parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) throw new Error("Missing LTA_DATAMALL_API_KEY");

    return ltaFetch(`/BusServices?$skip=${data.skip}`, apiKey);
  });

export const getBusRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ skip: z.number().int().min(0).default(0) }).parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) throw new Error("Missing LTA_DATAMALL_API_KEY");

    return ltaFetch(`/BusRoutes?$skip=${data.skip}`, apiKey);
  });

export const getCrowdDensity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ trainLine: z.string().optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LTA_DATAMALL_API_KEY;
    if (!apiKey) throw new Error("Missing LTA_DATAMALL_API_KEY");

    const params = new URLSearchParams();
    if (data.trainLine) params.set("TrainLine", data.trainLine);

    return ltaFetch(`/PCDRealTime?${params.toString()}`, apiKey);
  });
