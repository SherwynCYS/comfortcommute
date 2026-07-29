import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .single();
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        displayName: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().optional().nullable(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    return context.supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        avatar_url: data.avatarUrl,
      })
      .eq("id", context.userId)
      .select()
      .single();
  });
