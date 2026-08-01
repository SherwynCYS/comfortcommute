import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FavoritePlaceInput = z.object({
  label: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  address: z.string().max(240).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const listFavoritePlaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorite_places")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createFavoritePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => FavoritePlaceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("favorite_places")
      .insert({
        user_id: context.userId,
        label: data.label,
        name: data.name,
        address: data.address ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteFavoritePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorite_places")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
