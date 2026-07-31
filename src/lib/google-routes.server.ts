import type { CommuteRoute, RouteStep } from "./route-types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type LatLng = { latitude: number; longitude: number };

type GStop = { name?: string; location?: { latLng?: LatLng } };

type GTransitDetails = {
  stopDetails?: {
    arrivalStop?: GStop;
    departureStop?: GStop;
    departureTime?: string;
  };
  headsign?: string;
  stopCount?: number;
  transitLine?: {
    name?: string;
    nameShort?: string;
    agencies?: { name?: string }[];
    vehicle?: { type?: string; name?: { text?: string } };
  };
};

type GStep = {
  travelMode?: string;
  distanceMeters?: number;
  staticDuration?: string;
  navigationInstruction?: { instructions?: string };
  transitDetails?: GTransitDetails;
};

type GRoute = {
  duration?: string;
  distanceMeters?: number;
  legs?: { steps?: GStep[] }[];
};

export type Point = { name: string; lat: number; lng: number };

function seconds(value?: string) {
  if (!value) return 0;
  const n = Number.parseFloat(value.replace("s", ""));
  return Number.isFinite(n) ? n : 0;
}

function minutes(value?: string) {
  return Math.max(0, Math.round(seconds(value) / 60));
}

function vehicleToMode(type?: string): RouteStep["mode"] {
  switch (type) {
    case "BUS":
    case "INTERCITY_BUS":
    case "TROLLEYBUS":
      return "bus";
    case "TRAM":
    case "MONORAIL":
      return "lrt";
    default:
      return "mrt";
  }
}

const FIELD_MASK = [
  "routes.duration",
  "routes.distanceMeters",
  "routes.legs.steps.travelMode",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.staticDuration",
  "routes.legs.steps.navigationInstruction",
  "routes.legs.steps.transitDetails",
].join(",");

async function computeTransitRoutes(
  origin: Point,
  destination: Point,
  routingPreference: "LESS_WALKING" | "FEWER_TRANSFERS" | undefined,
  lovableApiKey: string,
  mapsApiKey: string
): Promise<GRoute[]> {
  const response = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": mapsApiKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: "TRANSIT",
      computeAlternativeRoutes: true,
      languageCode: "en-SG",
      regionCode: "SG",
      units: "METRIC",
      transitPreferences: {
        allowedTravelModes: ["BUS", "SUBWAY", "TRAIN", "LIGHT_RAIL", "RAIL"],
        ...(routingPreference ? { routingPreference } : {}),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 403) {
      throw new Error(
        `Google Maps request was denied (403). Check the server key's restrictions in Google Cloud Console. ${body}`
      );
    }
    throw new Error(`Google Routes request failed [${response.status}]: ${body}`);
  }

  const json = (await response.json()) as { routes?: GRoute[] };
  return json.routes ?? [];
}

export type BusBoarding = { serviceNo: string; lat: number; lng: number };

function toCommuteRoute(
  route: GRoute,
  index: number,
  origin: Point,
  destination: Point
): { route: CommuteRoute; boardings: BusBoarding[] } | null {
  const gsteps = (route.legs ?? []).flatMap((leg) => leg.steps ?? []);
  if (gsteps.length === 0) return null;

  const steps: RouteStep[] = [];
  const boardings: BusBoarding[] = [];
  let walkMeters = 0;
  let rideMeters = 0;
  let transitCount = 0;


  for (const step of gsteps) {
    const durationMinutes = Math.max(1, minutes(step.staticDuration));

    if (step.travelMode === "TRANSIT" && step.transitDetails) {
      const details = step.transitDetails;
      const line = details.transitLine;
      const mode = vehicleToMode(line?.vehicle?.type);
      const label = line?.nameShort || line?.name || "Service";
      const from = details.stopDetails?.departureStop?.name ?? "Stop";
      const to = details.stopDetails?.arrivalStop?.name ?? "Stop";
      const stops = details.stopCount ? ` · ${details.stopCount} stops` : "";

      rideMeters += step.distanceMeters ?? 0;
      transitCount += 1;

      const boardAt = details.stopDetails?.departureStop?.location?.latLng;
      if (mode === "bus" && boardAt) {
        boardings.push({ serviceNo: label, lat: boardAt.latitude, lng: boardAt.longitude });
      }



      steps.push({
        mode,
        from,
        to,
        durationMinutes,
        ...(mode === "bus" ? { serviceNo: label } : { line: line?.name ?? label }),
        instruction:
          mode === "bus"
            ? `Take bus ${label} from ${from} to ${to}${stops}`
            : `Take ${line?.name ?? label} from ${from} to ${to}${stops}`,
      });
    } else {
      const meters = step.distanceMeters ?? 0;
      walkMeters += meters;
      const to = step.navigationInstruction?.instructions ?? "next point";
      steps.push({
        mode: "walk",
        from: steps.at(-1)?.to ?? origin.name,
        to,
        durationMinutes,
        instruction: `Walk ${Math.round(meters)}m (~${durationMinutes} min)`,
      });
    }
  }

  // Collapse consecutive walking legs into one, so the itinerary reads cleanly.
  const merged: RouteStep[] = [];
  for (const step of steps) {
    const prev = merged.at(-1);
    if (prev && prev.mode === "walk" && step.mode === "walk") {
      prev.durationMinutes += step.durationMinutes;
      prev.to = step.to;
      prev.instruction = `Walk ~${prev.durationMinutes} min`;
      continue;
    }
    merged.push({ ...step });
  }
  if (merged[0]?.mode === "walk") merged[0].from = origin.name;
  const last = merged.at(-1);
  if (last?.mode === "walk") {
    last.to = destination.name;
    last.instruction = `Walk to ${destination.name} (~${last.durationMinutes} min)`;
  }

  const transitSteps = merged.filter((s) => s.mode !== "walk");
  const summaryParts = transitSteps.map((s) =>
    s.mode === "bus" ? `Bus ${s.serviceNo}` : (s.line ?? "Train")
  );

  return {
    route: {
      id: `g-${index}-${summaryParts.join("-") || "walk"}`,
      summary: summaryParts.length
        ? summaryParts.join(" → ")
        : `Walk · ${origin.name} to ${destination.name}`,
      totalTimeMinutes: Math.max(1, minutes(route.duration)),
      walkingDistanceMeters: Math.round(walkMeters),
      transfers: Math.max(0, transitCount - 1),
      crowdLevel: "medium",
      seatAvailability: "unknown",
      rideDistanceKm: rideMeters / 1000,
      fareCents: 0,
      steps: merged,
      score: 0,
    },
    boardings,
  };
}

/**
 * Baseline itineraries from Google Routes (transit). Returns [] when the connector
 * is not configured so callers can fall back to the local heuristic engine.
 */
export async function buildGoogleTransitRoutes(
  origin: Point,
  destination: Point
): Promise<CommuteRoute[]> {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableApiKey || !mapsApiKey) return [];

  const [balanced, lessWalking, fewerTransfers] = await Promise.all([
    computeTransitRoutes(origin, destination, undefined, lovableApiKey, mapsApiKey),
    computeTransitRoutes(origin, destination, "LESS_WALKING", lovableApiKey, mapsApiKey).catch(() => []),
    computeTransitRoutes(origin, destination, "FEWER_TRANSFERS", lovableApiKey, mapsApiKey).catch(
      () => []
    ),
  ]);

  const built = [...balanced, ...lessWalking, ...fewerTransfers]
    .map((route, index) => toCommuteRoute(route, index, origin, destination))
    .filter((entry): entry is { route: CommuteRoute; boardings: BusBoarding[] } => entry !== null);

  // De-duplicate itineraries that use the same services for the same duration.
  const seen = new Set<string>();
  const unique = built.filter(({ route }) => {
    const key = `${route.summary}|${route.totalTimeMinutes}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const { enrichWithLiveCrowd } = await import("./crowd.server");
  return enrichWithLiveCrowd(unique);
}

