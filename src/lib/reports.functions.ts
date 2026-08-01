import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const INCIDENT_TYPES = [
  "crowding",
  "breakdown",
  "delay",
  "no_show",
  "accessibility",
  "police",
  "hazard",
  "other",
] as const;

const ReportInput = z.object({
  type: z.enum(INCIDENT_TYPES),
  description: z.string().max(280).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  busStopCode: z.string().max(10).optional(),
  serviceNo: z.string().max(10).optional(),
});

const POINTS_PER_REPORT = 10;
const POINTS_PER_VOTE = 2;

async function awardPoints(
  supabase: { from: (table: string) => any },
  userId: string,
  points: number,
  countsAsReport: boolean
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("points, reports_count")
    .eq("id", userId)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({
      points: (profile?.points ?? 0) + points,
      reports_count: (profile?.reports_count ?? 0) + (countsAsReport ? 1 : 0),
    })
    .eq("id", userId);
}

export const listIncidentReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("incident_reports")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    const reports = data ?? [];
    const { data: votes } = await context.supabase
      .from("incident_votes")
      .select("report_id, is_confirm")
      .eq("user_id", context.userId);

    const myVotes = new Map((votes ?? []).map((v) => [v.report_id, v.is_confirm]));

    return reports.map((report) => ({
      ...report,
      isMine: report.user_id === context.userId,
      myVote: myVotes.has(report.id) ? (myVotes.get(report.id) ? "confirm" : "dismiss") : null,
    }));
  });

export const createIncidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ReportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("incident_reports")
      .insert({
        user_id: context.userId,
        type: data.type,
        description: data.description ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        bus_stop_code: data.busStopCode ?? null,
        service_no: data.serviceNo ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    await awardPoints(context.supabase, context.userId, POINTS_PER_REPORT, true);
    return inserted;
  });

export const voteIncidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ reportId: z.string().uuid(), isConfirm: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("incident_votes")
      .upsert(
        { report_id: data.reportId, user_id: context.userId, is_confirm: data.isConfirm },
        { onConflict: "report_id,user_id" }
      );

    if (error) throw new Error(error.message);
    await awardPoints(context.supabase, context.userId, POINTS_PER_VOTE, false);
    return { success: true };
  });

export const deleteIncidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("incident_reports")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
