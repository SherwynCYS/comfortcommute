import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "save_favourite_route",
  title: "Save a favourite journey",
  description:
    "Save a journey to the signed-in commuter's ComfortCommute favourites so it is watched for disruptions.",
  inputSchema: {
    name: z.string().trim().min(1).max(80).describe("Label for the saved journey, e.g. 'Morning commute'."),
    originName: z.string().trim().min(1).describe("Origin name."),
    originLat: z.number().optional().describe("Origin latitude."),
    originLng: z.number().optional().describe("Origin longitude."),
    destinationName: z.string().trim().min(1).describe("Destination name."),
    destinationLat: z.number().optional().describe("Destination latitude."),
    destinationLng: z.number().optional().describe("Destination longitude."),
    priority: z.enum(["comfort", "time", "balanced", "price"]).default("balanced"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("favorite_routes")
      .insert({
        user_id: ctx.getUserId(),
        name: input.name,
        origin_name: input.originName,
        origin_lat: input.originLat,
        origin_lng: input.originLng,
        destination_name: input.destinationName,
        destination_lat: input.destinationLat,
        destination_lng: input.destinationLng,
        priority: input.priority,
        filters: {},
      })
      .select("id,name,origin_name,destination_name,priority")
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved "${data.name}" to favourites.` }],
      structuredContent: { route: data },
    };
  },
});
