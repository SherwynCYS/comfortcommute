import { RAIL_STATIONS } from "@/data/mrt-stations";

export type Place = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  type: "rail" | "bus";
};

type LtaBusStop = {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Latitude: number;
  Longitude: number;
};

const LTA_BASE_URL = "http://datamall2.mytransport.sg/ltaodataservice";

let busStopCache: { stops: Place[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

async function fetchAllBusStops(apiKey: string): Promise<Place[]> {
  const stops: Place[] = [];

  for (let skip = 0; skip < 6000; skip += 500) {
    const response = await fetch(`${LTA_BASE_URL}/BusStops?$skip=${skip}`, {
      headers: { AccountKey: apiKey, Accept: "application/json" },
    });
    if (!response.ok) break;

    const json = (await response.json()) as { value?: LtaBusStop[] };
    const value = json.value ?? [];
    if (value.length === 0) break;

    for (const stop of value) {
      stops.push({
        id: `bus-${stop.BusStopCode}`,
        name: stop.Description,
        description: `Bus stop ${stop.BusStopCode} · ${stop.RoadName}`,
        lat: stop.Latitude,
        lng: stop.Longitude,
        type: "bus",
      });
    }

    if (value.length < 500) break;
  }

  return stops;
}

export async function getBusStopPlaces(apiKey: string): Promise<Place[]> {
  if (busStopCache && Date.now() - busStopCache.fetchedAt < CACHE_TTL_MS) {
    return busStopCache.stops;
  }

  try {
    const stops = await fetchAllBusStops(apiKey);
    if (stops.length > 0) {
      busStopCache = { stops, fetchedAt: Date.now() };
    }
    return stops;
  } catch {
    return busStopCache?.stops ?? [];
  }
}

export const railPlaces: Place[] = RAIL_STATIONS.map((station) => ({
  id: `rail-${station.codes[0]}`,
  name: `${station.name} MRT/LRT`,
  description: station.codes.join(" · "),
  lat: station.lat,
  lng: station.lng,
  type: "rail" as const,
}));

function scoreMatch(place: Place, query: string): number {
  const haystack = `${place.name} ${place.description}`.toLowerCase();
  const idx = haystack.indexOf(query);
  if (idx === -1) return -1;

  let score = 100 - idx;
  if (place.name.toLowerCase().startsWith(query)) score += 50;
  if (place.type === "rail") score += 25;
  return score;
}

export function searchPlaceList(places: Place[], rawQuery: string, limit: number): Place[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return places.filter((p) => p.type === "rail").slice(0, limit);

  return places
    .map((place) => ({ place, score: scoreMatch(place, query) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.place);
}
