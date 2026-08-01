import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated } from "../supabase";

export default defineTool({
  name: "search_places",
  title: "Search Singapore places",
  description:
    "Search Singapore addresses, landmarks, MRT/LRT stations and bus stops. Returns coordinates to feed into plan_commute.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Place, address, station or bus stop name to look for."),
    limit: z.number().int().min(1).max(20).default(8).describe("Maximum number of results."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();

    const { railPlaces, getBusStopPlaces, searchPlaceList, searchAddresses } = await import(
      "@/lib/places.server"
    );

    const apiKey = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env?.LTA_DATAMALL_API_KEY;

    const [busStops, addresses] = await Promise.all([
      apiKey ? getBusStopPlaces(apiKey) : Promise.resolve([]),
      searchAddresses(query, Math.min(limit, 8)),
    ]);

    const transit = searchPlaceList([...railPlaces, ...busStops], query, limit);
    const seen = new Set<string>();
    const results = [...addresses, ...transit]
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .slice(0, limit)
      .map((p) => ({ name: p.name, description: p.description, lat: p.lat, lng: p.lng, type: p.type }));

    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
      structuredContent: { results },
    };
  },
});
