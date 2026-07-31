import { RAIL_STATIONS } from "@/data/mrt-stations";

export type PlaceType = "rail" | "bus" | "address";

export type Place = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  type: PlaceType;
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

/* ---------------- Address / place geocoding (Google-Maps style search) ---------------- */

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

// Singapore bounding box, so results stay local like a transit app should.
const SG_BBOX = { minLng: 103.6, minLat: 1.2, maxLng: 104.1, maxLat: 1.48 };

function inSingapore(lat: number, lng: number) {
  return (
    lat >= SG_BBOX.minLat && lat <= SG_BBOX.maxLat && lng >= SG_BBOX.minLng && lng <= SG_BBOX.maxLng
  );
}

function describeFeature(p: PhotonFeature["properties"]): string {
  const parts = [
    [p.housenumber, p.street].filter(Boolean).join(" "),
    p.district,
    p.city,
    p.postcode ? `Singapore ${p.postcode}` : p.country,
  ].filter((v): v is string => Boolean(v && v.trim()));

  return Array.from(new Set(parts)).join(", ");
}

export async function searchAddresses(query: string, limit: number): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    limit: String(Math.min(limit, 15)),
    lang: "en",
    lat: "1.3521",
    lon: "103.8198",
    bbox: `${SG_BBOX.minLng},${SG_BBOX.minLat},${SG_BBOX.maxLng},${SG_BBOX.maxLat}`,
  });

  try {
    const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "ComfortCommute/1.0" },
    });
    if (!response.ok) return [];

    const json = (await response.json()) as { features?: PhotonFeature[] };

    return (json.features ?? [])
      .map((feature): Place | null => {
        const [lng, lat] = feature.geometry?.coordinates ?? [];
        const props = feature.properties ?? {};
        if (typeof lat !== "number" || typeof lng !== "number") return null;
        if (!inSingapore(lat, lng)) return null;

        const name = props.name ?? [props.housenumber, props.street].filter(Boolean).join(" ");
        if (!name) return null;

        return {
          id: `addr-${props.osm_id ?? `${lat},${lng}`}`,
          name,
          description: describeFeature(props) || "Singapore",
          lat,
          lng,
          type: "address",
        };
      })
      .filter((p): p is Place => p !== null);
  } catch {
    return [];
  }
}

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
