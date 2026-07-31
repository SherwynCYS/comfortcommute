import type { CommuteRoute } from "./route-types";
import type { BusBoarding } from "./google-routes.server";
import { getBusStopPlaces } from "./places.server";
import { haversineDistance } from "./transit.server";

const LTA_BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice";

type ArrivalService = { ServiceNo: string; NextBus?: { EstimatedArrival?: string; Load?: string } };

/** LTA bus load codes: SEA = seats available, SDA = standing, LSD = limited standing. */
type Load = "SEA" | "SDA" | "LSD";

async function fetchStopArrivals(code: string, apiKey: string) {
  const result = new Map<string, { waitMinutes: number; load: Load }>();
  try {
    const response = await fetch(`${LTA_BASE_URL}/v3/BusArrival?BusStopCode=${code}`, {
      headers: { AccountKey: apiKey, Accept: "application/json" },
    });
    if (!response.ok) return result;
    const json = (await response.json()) as { Services?: ArrivalService[] };
    for (const service of json.Services ?? []) {
      const eta = service.NextBus?.EstimatedArrival;
      const raw = eta ? Math.round((new Date(eta).getTime() - Date.now()) / 60000) : NaN;
      result.set(service.ServiceNo, {
        waitMinutes: Number.isFinite(raw) ? Math.min(Math.max(0, raw), 30) : 5,
        load: (service.NextBus?.Load as Load) ?? "SEA",
      });
    }
  } catch {
    /* a single stop failing must not break planning */
  }
  return result;
}

const LOAD_RANK: Record<Load, number> = { SEA: 0, SDA: 1, LSD: 2 };

/**
 * Layer live LTA bus load on top of Google's itineraries — this is the comfort signal
 * Google does not have: how crowded the bus you are about to board actually is.
 */
export async function enrichWithLiveCrowd(
  entries: { route: CommuteRoute; boardings: BusBoarding[] }[]
): Promise<CommuteRoute[]> {
  const apiKey = process.env.LTA_DATAMALL_API_KEY;
  const hasBus = entries.some((entry) => entry.boardings.length > 0);
  if (!apiKey || !hasBus) return entries.map((entry) => entry.route);

  const stops = await getBusStopPlaces(apiKey).catch(() => []);
  if (stops.length === 0) return entries.map((entry) => entry.route);

  const codeFor = (lat: number, lng: number) => {
    let best: { code: string; meters: number } | null = null;
    for (const stop of stops) {
      const meters = haversineDistance(lat, lng, stop.lat, stop.lng);
      if (!best || meters < best.meters) best = { code: stop.id.replace("bus-", ""), meters };
    }
    return best && best.meters <= 250 ? best.code : null;
  };

  // One fetch per distinct boarding stop across all itineraries.
  const codes = new Set<string>();
  const boardingCodes = entries.map((entry) =>
    entry.boardings.map((boarding) => {
      const code = codeFor(boarding.lat, boarding.lng);
      if (code) codes.add(code);
      return { serviceNo: boarding.serviceNo, code };
    })
  );

  const arrivalsByCode = new Map<string, Map<string, { waitMinutes: number; load: Load }>>();
  await Promise.all(
    Array.from(codes).map(async (code) => {
      arrivalsByCode.set(code, await fetchStopArrivals(code, apiKey));
    })
  );

  return entries.map((entry, index) => {
    const loads: Load[] = [];
    let waitMinutes = 0;

    for (const { serviceNo, code } of boardingCodes[index]) {
      if (!code) continue;
      const info = arrivalsByCode.get(code)?.get(serviceNo);
      if (!info) continue;
      loads.push(info.load);
      waitMinutes = Math.max(waitMinutes, info.waitMinutes);
    }

    if (loads.length === 0) return entry.route;

    const worst = loads.reduce((a, b) => (LOAD_RANK[b] > LOAD_RANK[a] ? b : a));
    const steps = entry.route.steps.map((step) => {
      if (step.mode !== "bus") return step;
      const match = boardingCodes[index].find((b) => b.serviceNo === step.serviceNo);
      const info = match?.code ? arrivalsByCode.get(match.code)?.get(step.serviceNo!) : undefined;
      if (!info) return step;
      return {
        ...step,
        instruction: `${step.instruction} · next bus in ~${info.waitMinutes} min, ${
          info.load === "SEA" ? "seats available" : info.load === "SDA" ? "standing room" : "very crowded"
        }`,
      };
    });

    return {
      ...entry.route,
      steps,
      crowdLevel: worst === "LSD" ? "high" : worst === "SDA" ? "medium" : "low",
      seatAvailability: worst === "SEA" ? "likely" : worst === "LSD" ? "unlikely" : "unknown",
      totalTimeMinutes: entry.route.totalTimeMinutes + Math.min(waitMinutes, 10),
    } satisfies CommuteRoute;
  });
}
