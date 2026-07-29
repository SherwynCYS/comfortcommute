import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getTrainServiceAlerts } from "./lta.functions";

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
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
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
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
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
    const { data: favorites } = await context.supabase
      .from("favorite_routes")
      .select("destination_name, origin_name")
      .eq("user_id", context.userId);

    const routeNames = new Set(
      (favorites ?? []).flatMap((f) => [f.origin_name, f.destination_name])
    );

    const lta = await getTrainServiceAlerts();
    const alerts = (lta as { value?: Array<{ Status: string; Line: string }> })?.value ?? [];

    const newAlerts = alerts
      .filter((alert) =>
        Array.from(routeNames).some((name) =>
          alert.Line.toLowerCase().includes(name.toLowerCase())
        )
      )
      .map((alert) => ({
        user_id: context.userId,
        title: `Service update: ${alert.Line}`,
        body: alert.Status,
        severity: alert.Status.toLowerCase().includes("disruption")
          ? ("critical" as const)
          : ("warning" as const),
        affected_route_or_stop: alert.Line,
      }));

    if (newAlerts.length > 0) {
      const { error } = await context.supabase.from("alerts").insert(newAlerts);
      if (error) throw new Error(error.message);
    }

    return { inserted: newAlerts.length };
  });
