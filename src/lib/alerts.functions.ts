import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getTrainServiceAlerts } from "./lta.functions";

export const listAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return context.supabase
      .from("alerts")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
  });

export const markAlertRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    return context.supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    return context.supabase
      .from("alerts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
  });

export const syncAlertsFromLta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: favorites } = await context.supabase
      .from("favorite_routes")
      .select("destination_name, origin_name")
      .eq("user_id", context.userId);

    const routeNames = new Set(
      (favorites ?? []).flatMap((f) => [f.origin_name, f.destination_name])
    );

    const lta = await getTrainServiceAlerts();
    const alerts = lta?.value ?? [];

    const newAlerts = alerts
      .filter((alert: { Status: string; Line: string }) =>
        Array.from(routeNames).some((name) =>
          alert.Line.toLowerCase().includes(name.toLowerCase())
        )
      )
      .map((alert: { Status: string; Line: string }) => ({
        user_id: context.userId,
        title: `Service update: ${alert.Line}`,
        body: alert.Status,
        severity: alert.Status.toLowerCase().includes("disruption")
          ? "critical"
          : "warning" as "critical" | "warning" | "info",
        affected_route_or_stop: alert.Line,
      }));

    if (newAlerts.length > 0) {
      await context.supabase.from("alerts").insert(newAlerts);
    }

    return { inserted: newAlerts.length };
  });
