import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return data;

    const { data: created, error: insertError } = await context.supabase
      .from("profiles")
      .insert({ id: context.userId })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    return created;
  });

const PlaceInput = z
  .object({
    name: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
  })
  .nullable();

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        displayName: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().optional().nullable(),
        occupation: z
          .enum(["student", "working_adult", "national_service", "senior", "job_seeker", "other"])
          .optional(),
        cardType: z
          .enum([
            "adult_card",
            "student_card",
            "senior_card",
            "workfare_card",
            "disability_card",
            "cash",
          ])
          .optional(),
        home: PlaceInput.optional(),
        work: PlaceInput.optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { id: context.userId };
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;
    if (data.occupation !== undefined) patch.occupation = data.occupation;
    if (data.cardType !== undefined) patch.card_type = data.cardType;
    if (data.home !== undefined) {
      patch.home_name = data.home?.name ?? null;
      patch.home_lat = data.home?.lat ?? null;
      patch.home_lng = data.home?.lng ?? null;
    }
    if (data.work !== undefined) {
      patch.work_name = data.work?.name ?? null;
      patch.work_lat = data.work?.lat ?? null;
      patch.work_lng = data.work?.lng ?? null;
    }

    const { data: updated, error } = await context.supabase
      .from("profiles")
      .upsert(patch as never, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated;
  });
