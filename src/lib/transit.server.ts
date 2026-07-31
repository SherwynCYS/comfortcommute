import type { CommuteRoute, RouteStep } from "./route-types";
import { getBusStopPlaces, railPlaces, type Place } from "./places.server";

const LTA_BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const WALK_SPEED_M_PER_MIN = 80;
const MAX_WALK_METERS = 800;

export type Point = { name: string; lat: number; lng: number };

type LtaBusRoute = {
  ServiceNo: string;
  Operator: string;
  Direction: number;
  StopSequence: number;
  BusStopCode: string;
  Distance: number;
};

type RouteStop = { code: string; seq: number; distanceKm: number };

let busRouteCache: { index: Map<string, RouteStop[]>; fetchedAt: number } | null = null;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchBusRouteIndex(apiKey: string): Promise<Map<string, RouteStop[]>> {
  const index = new Map<string, RouteStop[]>();

  for (let skip = 0; skip < 30000; skip += 500) {
    const response = await fetch(`${LTA_BASE_URL}/BusRoutes?$skip=${skip}`, {
      headers: { AccountKey: apiKey, Accept: "application/json" },
    });
    if (!response.ok) break;

    const json = (await response.json()) as { value?: LtaBusRoute[] };
    const value = json.value ?? [];
    if (value.length === 0) break;

    for (const row of value) {
      const key = `${row.ServiceNo}|${row.Direction}`;
      const list = index.get(key) ?? [];
      list.push({ code: row.BusStopCode, seq: row.StopSequence, distanceKm: row.Distance ?? 0 });
      index.set(key, list);
    }

    if (value.length < 500) break;
  }

  for (const list of index.values()) list.sort((a, b) => a.seq - b.seq);
  return index;
}

async function getBusRouteIndex(apiKey: string): Promise<Map<string, RouteStop[]>> {
  if (busRouteCache && Date.now() - busRouteCache.fetchedAt < CACHE_TTL_MS) return busRouteCache.index;
  try {
    const index = await fetchBusRouteIndex(apiKey);
    if (index.size > 0) busRouteCache = { index, fetchedAt: Date.now() };
    return index;
  } catch {
    return busRouteCache?.index ?? new Map();
  }
}

function nearest(places: Place[], point: Point, count: number, maxMeters = MAX_WALK_METERS) {
  return places
    .map((place) => ({ place, meters: haversineDistance(point.lat, point.lng, place.lat, place.lng) }))
    .filter((entry) => entry.meters <= maxMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, count);
}

function walkStep(from: string, to: string, meters: number): RouteStep {
  return {
    mode: "walk",
    from,
    to,
    durationMinutes: Math.max(1, Math.round(meters / WALK_SPEED_M_PER_MIN)),
    instruction: `Walk to ${to} (~${Math.round(meters)}m)`,
  };
}

type ArrivalService = { ServiceNo: string; NextBus?: { EstimatedArrival?: string; Load?: string } };

async function fetchServicesAtStop(
  code: string,
  apiKey: string
): Promise<Map<string, { waitMinutes: number; load: string }>> {
  const result = new Map<string, { waitMinutes: number; load: string }>();
  try {
    const response = await fetch(`${LTA_BASE_URL}/BusArrivalv2?BusStopCode=${code}`, {
      headers: { AccountKey: apiKey, Accept: "application/json" },
    });
    if (!response.ok) return result;
    const json = (await response.json()) as { Services?: ArrivalService[] };
    for (const service of json.Services ?? []) {
      const eta = service.NextBus?.EstimatedArrival;
      const waitMinutes = eta
        ? Math.max(0, Math.round((new Date(eta).getTime() - Date.now()) / 60000))
        : 5;
      result.set(service.ServiceNo, {
        waitMinutes: Number.isFinite(waitMinutes) ? Math.min(waitMinutes, 20) : 5,
        load: service.NextBus?.Load ?? "SEA",
      });
    }
  } catch {
    /* ignore single-stop failures */
  }
  return result;
}

/**
 * Direct bus journeys: find services that serve both a stop near the origin and a stop
 * near the destination, using live LTA arrivals (fast, and gives real crowd + wait data).
 */
async function buildBusRoutes(origin: Point, destination: Point, apiKey: string): Promise<CommuteRoute[]> {
  const stops = await getBusStopPlaces(apiKey);
  if (stops.length === 0) return [];

  const originStops = nearest(stops, origin, 5, 1000);
  const destStops = nearest(stops, destination, 5, 1000);
  if (originStops.length === 0 || destStops.length === 0) return [];

  const codeOf = (place: Place) => place.id.replace("bus-", "");

  const [originServices, destServices] = await Promise.all([
    Promise.all(originStops.map((s) => fetchServicesAtStop(codeOf(s.place), apiKey))),
    Promise.all(destStops.map((s) => fetchServicesAtStop(codeOf(s.place), apiKey))),
  ]);

  type Option = {
    serviceNo: string;
    board: (typeof originStops)[number];
    alight: (typeof destStops)[number];
    rideKm: number;
    waitMinutes: number;
    load: string;
    totalMinutes: number;
    walkMeters: number;
  };
  const options: Option[] = [];

  for (let i = 0; i < originStops.length; i++) {
    for (const [serviceNo, info] of originServices[i]) {
      for (let j = 0; j < destStops.length; j++) {
        if (!destServices[j].has(serviceNo)) continue;
        const board = originStops[i];
        const alight = destStops[j];
        if (codeOf(board.place) === codeOf(alight.place)) continue;

        const rideKm =
          (haversineDistance(
            board.place.lat,
            board.place.lng,
            alight.place.lat,
            alight.place.lng
          ) *
            1.35) /
          1000;
        if (rideKm < 0.4) continue;

        const walkMeters = board.meters + alight.meters;
        const rideMinutes = Math.max(2, Math.round((rideKm / 19) * 60));
        const totalMinutes =
          rideMinutes + info.waitMinutes + Math.round(walkMeters / WALK_SPEED_M_PER_MIN);

        options.push({
          serviceNo,
          board,
          alight,
          rideKm,
          waitMinutes: info.waitMinutes,
          load: info.load,
          totalMinutes,
          walkMeters,
        });
      }
    }
  }

  // Keep the best option per service number, then the fastest few overall.
  const bestByService = new Map<string, Option>();
  for (const opt of options) {
    const existing = bestByService.get(opt.serviceNo);
    if (!existing || opt.totalMinutes < existing.totalMinutes) bestByService.set(opt.serviceNo, opt);
  }

  return Array.from(bestByService.values())
    .sort((a, b) => a.totalMinutes - b.totalMinutes)
    .slice(0, 3)
    .map((opt, i) => {
      const boardName = opt.board.place.name;
      const alightName = opt.alight.place.name;
      const rideMinutes = Math.max(2, Math.round((opt.rideKm / 19) * 60));
      const crowdLevel = opt.load === "LSD" ? "high" : opt.load === "SDA" ? "medium" : "low";

      return {
        id: `bus-${opt.serviceNo}-${i}`,
        summary: `Bus ${opt.serviceNo} · ${origin.name} to ${destination.name}`,
        totalTimeMinutes: opt.totalMinutes,
        walkingDistanceMeters: Math.round(opt.walkMeters),
        transfers: 0,
        crowdLevel,
        seatAvailability: opt.load === "SEA" ? "likely" : opt.load === "LSD" ? "unlikely" : "unknown",
        rideDistanceKm: opt.rideKm,
        fareCents: 0,
        steps: [
          walkStep(origin.name, `${boardName} bus stop`, opt.board.meters),
          {
            mode: "bus",
            from: boardName,
            to: alightName,
            durationMinutes: rideMinutes,
            serviceNo: opt.serviceNo,
            instruction: `Take bus ${opt.serviceNo} from ${boardName} to ${alightName} (~${opt.rideKm.toFixed(1)} km, next bus in ~${opt.waitMinutes} min)`,
          },
          walkStep(alightName, destination.name, opt.alight.meters),
        ],
        score: 0,
      } satisfies CommuteRoute;
    });
}


/** MRT/LRT journey using the nearest stations to each end. */
function buildRailRoute(origin: Point, destination: Point): CommuteRoute | null {
  const boardOptions = nearest(railPlaces, origin, 1, 1500);
  const alightOptions = nearest(railPlaces, destination, 1, 1500);
  const board = boardOptions[0];
  const alight = alightOptions[0];
  if (!board || !alight || board.place.id === alight.place.id) return null;

  const railMeters =
    haversineDistance(board.place.lat, board.place.lng, alight.place.lat, alight.place.lng) * 1.35;
  const railMinutes = Math.max(3, Math.round((railMeters / 1000 / 40) * 60) + 4);
  const walkMeters = board.meters + alight.meters;
  const total = railMinutes + Math.round(walkMeters / WALK_SPEED_M_PER_MIN);

  return {
    id: `rail-${board.place.id}-${alight.place.id}`,
    summary: `Train · ${origin.name} to ${destination.name}`,
    totalTimeMinutes: total,
    walkingDistanceMeters: Math.round(walkMeters),
    transfers: railMeters > 8000 ? 1 : 0,
    crowdLevel: "medium",
    seatAvailability: "unknown",
    rideDistanceKm: railMeters / 1000,
    fareCents: 0,
    steps: [
      walkStep(origin.name, board.place.name, board.meters),
      {
        mode: "mrt",
        from: board.place.name,
        to: alight.place.name,
        durationMinutes: railMinutes,
        line: board.place.description,
        instruction: `Take the train from ${board.place.name} (${board.place.description}) to ${alight.place.name} (${alight.place.description})`,
      },
      walkStep(alight.place.name, destination.name, alight.meters),
    ],
    score: 0,
  };
}

/** Bus feeder to the nearest station, then train — the classic Singapore mixed trip. */
async function buildBusRailRoute(
  origin: Point,
  destination: Point,
  apiKey: string
): Promise<CommuteRoute | null> {
  const station = nearest(railPlaces, origin, 1, 4000)[0];
  if (!station) return null;

  const feeders = await buildBusRoutes(
    origin,
    { name: station.place.name, lat: station.place.lat, lng: station.place.lng },
    apiKey
  );
  const feeder = feeders[0];
  const rail = buildRailRoute(
    { name: station.place.name, lat: station.place.lat, lng: station.place.lng },
    destination
  );
  if (!feeder || !rail) return null;

  const steps = [...feeder.steps.slice(0, 2), ...rail.steps.slice(1)];
  const totalTime = steps.reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    id: `busrail-${feeder.id}-${rail.id}`,
    summary: `Bus + train · ${origin.name} to ${destination.name}`,
    totalTimeMinutes: totalTime,
    walkingDistanceMeters: Math.round(feeder.walkingDistanceMeters * 0.5 + rail.walkingDistanceMeters * 0.5),
    transfers: 1,
    crowdLevel: "low",
    seatAvailability: "likely",
    rideDistanceKm: feeder.rideDistanceKm + rail.rideDistanceKm,
    fareCents: 0,
    steps,
    score: 0,
  };
}

function walkOnlyRoute(origin: Point, destination: Point): CommuteRoute {
  const meters = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng) * 1.25;
  return {
    id: "walk-only",
    summary: `Walk · ${origin.name} to ${destination.name}`,
    totalTimeMinutes: Math.max(1, Math.round(meters / WALK_SPEED_M_PER_MIN)),
    walkingDistanceMeters: Math.round(meters),
    transfers: 0,
    crowdLevel: "low",
    seatAvailability: "likely",
    rideDistanceKm: 0,
    fareCents: 0,
    steps: [walkStep(origin.name, destination.name, meters)],
    score: 0,
  };
}

export async function buildCandidateRoutes(
  origin: Point,
  destination: Point
): Promise<CommuteRoute[]> {
  const apiKey = process.env.LTA_DATAMALL_API_KEY;
  const directMeters = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);

  const candidates: CommuteRoute[] = [];

  if (directMeters <= 1200) candidates.push(walkOnlyRoute(origin, destination));

  const rail = buildRailRoute(origin, destination);
  if (rail) candidates.push(rail);

  if (apiKey) {
    const [buses, busRail] = await Promise.all([
      buildBusRoutes(origin, destination, apiKey).catch(() => []),
      buildBusRailRoute(origin, destination, apiKey).catch(() => null),
    ]);
    candidates.push(...buses);
    if (busRail) candidates.push(busRail);
  }

  if (candidates.length === 0) candidates.push(walkOnlyRoute(origin, destination));

  const seen = new Set<string>();
  return candidates.filter((route) => (seen.has(route.id) ? false : (seen.add(route.id), true)));
}
