import type { CommuteRoute, RouteStep } from "./route-types";
import { getBusStopPlaces, railPlaces, type Place } from "./places.server";

const LTA_BASE_URL = "http://datamall2.mytransport.sg/ltaodataservice";
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

/** Direct bus journeys built from real LTA bus route data. */
async function buildBusRoutes(origin: Point, destination: Point, apiKey: string): Promise<CommuteRoute[]> {
  const stops = await getBusStopPlaces(apiKey);
  if (stops.length === 0) return [];

  const originStops = nearest(stops, origin, 10);
  const destStops = nearest(stops, destination, 10);
  if (originStops.length === 0 || destStops.length === 0) return [];

  const originByCode = new Map(originStops.map((s) => [s.place.id.replace("bus-", ""), s]));
  const destByCode = new Map(destStops.map((s) => [s.place.id.replace("bus-", ""), s]));

  const index = await getBusRouteIndex(apiKey);
  type Option = {
    serviceNo: string;
    board: (typeof originStops)[number];
    alight: (typeof destStops)[number];
    rideKm: number;
    stopsCount: number;
    totalMinutes: number;
    walkMeters: number;
  };
  const options: Option[] = [];

  for (const [key, list] of index) {
    const serviceNo = key.split("|")[0];
    let boardIdx = -1;
    let board: Option["board"] | null = null;

    for (let i = 0; i < list.length; i++) {
      const candidate = originByCode.get(list[i].code);
      if (candidate && (!board || candidate.meters < board.meters)) {
        board = candidate;
        boardIdx = i;
      }
    }
    if (!board || boardIdx === -1) continue;

    let alight: Option["alight"] | null = null;
    let alightIdx = -1;
    for (let j = boardIdx + 1; j < list.length; j++) {
      const candidate = destByCode.get(list[j].code);
      if (candidate && (!alight || candidate.meters < alight.meters)) {
        alight = candidate;
        alightIdx = j;
      }
    }
    if (!alight || alightIdx === -1) continue;

    const rideKm = Math.max(0.5, list[alightIdx].distanceKm - list[boardIdx].distanceKm);
    const stopsCount = alightIdx - boardIdx;
    const walkMeters = board.meters + alight.meters;
    const rideMinutes = Math.round((rideKm / 20) * 60 + stopsCount * 0.4);
    const totalMinutes =
      rideMinutes + 4 + Math.round(walkMeters / WALK_SPEED_M_PER_MIN); // +4 min average wait

    options.push({ serviceNo, board, alight, rideKm, stopsCount, totalMinutes, walkMeters });
  }

  options.sort((a, b) => a.totalMinutes - b.totalMinutes);

  return options.slice(0, 2).map((opt, i) => {
    const boardName = opt.board.place.name;
    const alightName = opt.alight.place.name;
    const rideMinutes = Math.max(
      1,
      opt.totalMinutes - 4 - Math.round(opt.walkMeters / WALK_SPEED_M_PER_MIN)
    );

    return {
      id: `bus-${opt.serviceNo}-${i}`,
      summary: `Bus ${opt.serviceNo} · ${origin.name} to ${destination.name}`,
      totalTimeMinutes: opt.totalMinutes,
      walkingDistanceMeters: Math.round(opt.walkMeters),
      transfers: 0,
      crowdLevel: opt.stopsCount > 20 ? "high" : "medium",
      seatAvailability: opt.stopsCount <= 12 ? "likely" : "unknown",
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
          instruction: `Take bus ${opt.serviceNo} from ${boardName} to ${alightName} (${opt.stopsCount} stops, ~${opt.rideKm.toFixed(1)} km)`,
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
