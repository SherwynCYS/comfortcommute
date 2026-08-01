import { getBusStopPlaces } from "./places.server";
import { haversineDistance } from "./transit.server";

const LTA_BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice";

export type LiveBus = {
  order: 1 | 2 | 3;
  etaMinutes: number | null;
  lat: number | null;
  lng: number | null;
  load: "SEA" | "SDA" | "LSD" | null;
  isWheelchairAccessible: boolean;
  busType: string | null;
  isMonitored: boolean;
};

export type LiveService = {
  serviceNo: string;
  operator: string;
  buses: LiveBus[];
};

export type NearbyStop = {
  code: string;
  name: string;
  road: string;
  lat: number;
  lng: number;
  meters: number;
};

export type BusJourneyStop = {
  code: string;
  name: string;
  road: string;
  lat: number;
  lng: number;
  sequence: number;
  isCurrent: boolean;
};

export type BusJourney = {
  serviceNo: string;
  direction: number;
  stops: BusJourneyStop[];
};

type RawBus = {
  EstimatedArrival?: string;
  Latitude?: string;
  Longitude?: string;
  Load?: string;
  Feature?: string;
  Type?: string;
  Monitored?: number;
};

function toNumber(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
}

function mapBus(raw: RawBus | undefined, order: 1 | 2 | 3): LiveBus | null {
  if (!raw || !raw.EstimatedArrival) return null;
  const eta = new Date(raw.EstimatedArrival).getTime();
  return {
    order,
    etaMinutes: Number.isFinite(eta) ? Math.max(0, Math.round((eta - Date.now()) / 60000)) : null,
    lat: toNumber(raw.Latitude),
    lng: toNumber(raw.Longitude),
    load: (raw.Load as LiveBus["load"]) ?? null,
    isWheelchairAccessible: raw.Feature === "WAB",
    busType: raw.Type ?? null,
    isMonitored: raw.Monitored === 1,
  };
}

export async function fetchLiveArrivals(code: string, apiKey: string): Promise<LiveService[]> {
  const response = await fetch(`${LTA_BASE_URL}/v3/BusArrival?BusStopCode=${code}`, {
    headers: { AccountKey: apiKey, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`LTA arrivals error ${response.status}`);

  const json = (await response.json()) as {
    Services?: { ServiceNo: string; Operator?: string; NextBus?: RawBus; NextBus2?: RawBus; NextBus3?: RawBus }[];
  };

  return (json.Services ?? [])
    .map((service) => ({
      serviceNo: service.ServiceNo,
      operator: service.Operator ?? "",
      buses: [
        mapBus(service.NextBus, 1),
        mapBus(service.NextBus2, 2),
        mapBus(service.NextBus3, 3),
      ].filter((bus): bus is LiveBus => bus !== null),
    }))
    .sort((a, b) => {
      const aEta = a.buses[0]?.etaMinutes ?? 999;
      const bEta = b.buses[0]?.etaMinutes ?? 999;
      return aEta - bEta;
    });
}

export async function findNearbyStops(
  lat: number,
  lng: number,
  apiKey: string,
  limit = 8
): Promise<NearbyStop[]> {
  const stops = await getBusStopPlaces(apiKey);
  return stops
    .map((stop) => ({
      code: stop.id.replace("bus-", ""),
      name: stop.name,
      road: stop.description,
      lat: stop.lat,
      lng: stop.lng,
      meters: Math.round(haversineDistance(lat, lng, stop.lat, stop.lng)),
    }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

export async function lookupStop(code: string, apiKey: string): Promise<NearbyStop | null> {
  const stops = await getBusStopPlaces(apiKey);
  const match = stops.find((stop) => stop.id === `bus-${code}`);
  if (!match) return null;
  return {
    code,
    name: match.name,
    road: match.description,
    lat: match.lat,
    lng: match.lng,
    meters: 0,
  };
}

type RawRouteStop = {
  ServiceNo?: string;
  Direction?: number;
  StopSequence?: number;
  BusStopCode?: string;
};

let routeCache: { expiresAt: number; rows: RawRouteStop[] } | null = null;

async function getBusRouteRows(apiKey: string) {
  if (routeCache && routeCache.expiresAt > Date.now()) return routeCache.rows;

  const rows: RawRouteStop[] = [];
  for (let skip = 0; skip < 100000; skip += 500) {
    const response = await fetch(`${LTA_BASE_URL}/BusRoutes?$skip=${skip}`, {
      headers: { AccountKey: apiKey, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`LTA bus routes error ${response.status}`);
    const page = (await response.json()) as { value?: RawRouteStop[] };
    const batch = page.value ?? [];
    rows.push(...batch);
    if (batch.length < 500) break;
  }

  routeCache = { expiresAt: Date.now() + 6 * 60 * 60 * 1000, rows };
  return rows;
}

export async function fetchBusJourney(
  serviceNo: string,
  currentStopCode: string,
  apiKey: string
): Promise<BusJourney[]> {
  const [rows, places] = await Promise.all([getBusRouteRows(apiKey), getBusStopPlaces(apiKey)]);
  const placeByCode = new Map(places.map((place) => [place.id.replace("bus-", ""), place]));
  const matching = rows.filter(
    (row) => row.ServiceNo?.toLowerCase() === serviceNo.toLowerCase() && row.BusStopCode
  );
  const directions = [...new Set(matching.map((row) => row.Direction ?? 1))];

  return directions
    .map((direction) => ({
      serviceNo,
      direction,
      stops: matching
        .filter((row) => (row.Direction ?? 1) === direction)
        .sort((a, b) => (a.StopSequence ?? 0) - (b.StopSequence ?? 0))
        .map((row) => {
          const code = row.BusStopCode ?? "";
          const place = placeByCode.get(code);
          return {
            code,
            name: place?.name ?? `Bus stop ${code}`,
            road: place?.description ?? "",
            lat: place?.lat ?? 0,
            lng: place?.lng ?? 0,
            sequence: row.StopSequence ?? 0,
            isCurrent: code === currentStopCode,
          };
        }),
    }))
    .filter((journey) => journey.stops.some((stop) => stop.isCurrent));
}
