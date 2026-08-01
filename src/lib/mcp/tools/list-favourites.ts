import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_favourites",
  title: "List saved favourites",
  description:
    "List the signed-in commuter's saved journeys, saved bus/train stops and saved places in ComfortCommute.",
  inputSchema: {
    kind: z
      .enum(["all", "routes", "stops", "places"])
      .default("all")
      .describe("Which kind of favourite to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const wants = (k: string) => kind === "all" || kind === k;
    const result: Record<string, unknown> = {};

    if (wants("routes")) {
      const { data, error } = await supabase
        .from("favorite_routes")
        .select("id,name,origin_name,destination_name,priority,created_at")
        .order("created_at", { ascending: false });
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      result.routes = data ?? [];
    }

    if (wants("stops")) {
      const { data, error } = await supabase
        .from("favorite_stops")
        .select("id,stop_name,stop_code,transport_type,created_at")
        .order("created_at", { ascending: false });
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      result.stops = data ?? [];
    }

    if (wants("places")) {
      const { data, error } = await supabase
        .from("favorite_places")
        .select("id,label,place_name,lat,lng,created_at")
        .order("created_at", { ascending: false });
      if (error && error.code !== "42P01") {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      result.places = data ?? [];
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
