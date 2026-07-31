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

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        displayName: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().optional().nullable(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const patch: {
      id: string;
      display_name?: string | null;
      avatar_url?: string | null;
    } = { id: context.userId };
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;

    const { data: updated, error } = await context.supabase
      .from("profiles")
      .upsert(patch, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated;
  });
