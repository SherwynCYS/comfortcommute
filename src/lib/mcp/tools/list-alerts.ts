import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_alerts",
  title: "List commute alerts",
  description:
    "List disruption and crowd alerts raised for the signed-in commuter's saved routes and stops, newest first.",
  inputSchema: {
    unreadOnly: z.boolean().default(false).describe("Return only alerts the commuter has not read yet."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of alerts to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unreadOnly, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("alerts")
      .select("id,title,message,severity,is_read,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const alerts = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(alerts) }],
      structuredContent: { alerts, count: alerts.length },
    };
  },
});
