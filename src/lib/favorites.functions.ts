import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FavoriteRouteInput = z.object({
  name: z.string().min(1),
  originName: z.string().min(1),
  originLat: z.number().optional(),
  originLng: z.number().optional(),
  destinationName: z.string().min(1),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  priority: z.enum(["comfort", "time", "balanced", "price"]).default("balanced"),
  filters: z.record(z.string(), z.boolean()).default({}),
});

const FavoriteStopInput = z.object({
  stopName: z.string().min(1),
  stopCode: z.string().optional(),
  stopLat: z.number().optional(),
  stopLng: z.number().optional(),
  transportType: z.enum(["bus", "mrt", "lrt"]).default("bus"),
});

export const listFavoriteRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorite_routes")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createFavoriteRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => FavoriteRouteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("favorite_routes")
      .insert({
        user_id: context.userId,
        name: data.name,
        origin_name: data.originName,
        origin_lat: data.originLat,
        origin_lng: data.originLng,
        destination_name: data.destinationName,
        destination_lat: data.destinationLat,
        destination_lng: data.destinationLng,
        priority: data.priority,
        filters: data.filters as Record<string, boolean>,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteFavoriteRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorite_routes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const listFavoriteStops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorite_stops")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createFavoriteStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => FavoriteStopInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("favorite_stops")
      .insert({
        user_id: context.userId,
        stop_name: data.stopName,
        stop_code: data.stopCode,
        stop_lat: data.stopLat,
        stop_lng: data.stopLng,
        transport_type: data.transportType,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteFavoriteStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorite_stops")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
