import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";


export const listAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("alerts")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markAlertRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("alerts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const syncAlertsFromLta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Network-wide alerts: every user receives every LTA service message,
    // regardless of whether the affected line is in their favourites.
    const { fetchTrainServiceAlerts } = await import("./lta.server");
    const lta = await fetchTrainServiceAlerts();
    const alerts = lta.value ?? [];

    const { data: existing } = await context.supabase
      .from("alerts")
      .select("title, body")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const seen = new Set((existing ?? []).map((a) => `${a.title}::${a.body}`));

    const newAlerts = alerts
      .map((alert) => ({
        user_id: context.userId,
        title: `Service update: ${alert.Line}`,
        body: alert.Status,
        severity: alert.Status.toLowerCase().includes("disruption")
          ? ("critical" as const)
          : ("warning" as const),
        affected_route_or_stop: alert.Line,
      }))
      .filter((alert) => !seen.has(`${alert.title}::${alert.body}`));

    if (newAlerts.length > 0) {
      const { error } = await context.supabase.from("alerts").insert(newAlerts);
      if (error) throw new Error(error.message);
    }

    return { inserted: newAlerts.length };
  });

