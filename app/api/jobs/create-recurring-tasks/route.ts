import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildTicketFromRecurringTask,
  getDayOfWeekInTz,
  getWeekKeyInTz,
  type RecurringTaskRow,
} from "@/lib/recurring-task-to-ticket";
import type { ProfileForTemplate } from "@/lib/fill-task-template";
import { notifyVAsNewTask } from "@/lib/email/notify-vas-new-task";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !secret) return false;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

const DEFAULT_TZ = "America/Chicago";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !secret) {
    return NextResponse.json(
      { error: "Cron job not configured: set CRON_SECRET in production." },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date();

  const { data: recurringRows, error: recurringError } = await supabase
    .from("member_recurring_tasks")
    .select("id, member_id, task_library_id, subject, description_template, context_notes, credit_cost, schedule_type, schedule_config, last_created_at")
    .eq("is_active", true)
    .eq("schedule_type", "weekly");

  if (recurringError) {
    return NextResponse.json(
      { error: recurringError.message, created: 0 },
      { status: 500 }
    );
  }

  const tasks = (recurringRows ?? []) as (RecurringTaskRow & { schedule_type: string; schedule_config: Record<string, unknown>; last_created_at: string | null })[];
  let created = 0;

  for (const rec of tasks) {
    const dayOfWeek = rec.schedule_config?.day_of_week;
    if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) continue;

    const tz = DEFAULT_TZ;
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("timezone, preferred_name, full_name, city, state, partner_name, kids_count, kids_ages, household_members, diet_notes, custom_field_values")
      .eq("id", rec.member_id)
      .single();

    const memberTz = (profileRow?.timezone ?? tz) || tz;
    const todayDay = getDayOfWeekInTz(now, memberTz);
    if (todayDay !== dayOfWeek) continue;

    const weekKeyNow = getWeekKeyInTz(now, memberTz);
    if (rec.last_created_at) {
      const weekKeyLast = getWeekKeyInTz(new Date(rec.last_created_at), memberTz);
      if (weekKeyLast === weekKeyNow) continue;
    }

    const profile: ProfileForTemplate | null = profileRow
      ? {
          preferred_name: profileRow.preferred_name ?? null,
          full_name: profileRow.full_name ?? null,
          city: profileRow.city ?? null,
          state: profileRow.state ?? null,
          timezone: profileRow.timezone ?? null,
          partner_name: profileRow.partner_name ?? null,
          kids_count: profileRow.kids_count ?? null,
          kids_ages: profileRow.kids_ages ?? null,
          household_members: (profileRow.household_members as ProfileForTemplate["household_members"]) ?? null,
          diet_notes: profileRow.diet_notes ?? null,
          custom_field_values: (profileRow.custom_field_values as ProfileForTemplate["custom_field_values"]) ?? null,
        }
      : null;

    let libraryTask: { id: string; task: string; template: string; credits: number } | null = null;
    if (rec.task_library_id) {
      const { data: lib } = await supabase
        .from("task_library")
        .select("id, task, template, credits")
        .eq("id", rec.task_library_id)
        .single();
      if (lib) libraryTask = lib;
    }

    const { data: balance } = await supabase.rpc("get_member_balance", {
      p_member_id: rec.member_id,
    });
    const creditsNeeded = rec.credit_cost ?? libraryTask?.credits ?? 0;
    if (typeof balance === "number" && balance < creditsNeeded) continue;

    const { subject, description, credit_cost } = buildTicketFromRecurringTask(
      rec,
      libraryTask,
      profile
    );

    const { data: ticket, error: insertErr } = await supabase
      .from("tickets")
      .insert({
        member_id: rec.member_id,
        subject,
        description: description || null,
        status: "new",
        credit_cost: credit_cost || null,
        recurring_task_id: rec.id,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[create-recurring-tasks] insert ticket failed", rec.id, insertErr);
      continue;
    }
    if (!ticket?.id) continue;

    const { error: updateErr } = await supabase
      .from("member_recurring_tasks")
      .update({ last_created_at: new Date().toISOString() })
      .eq("id", rec.id);

    if (updateErr) {
      console.warn("[create-recurring-tasks] last_created_at update failed", rec.id, updateErr);
    }
    try {
      await notifyVAsNewTask(ticket.id);
    } catch (e) {
      console.warn("[create-recurring-tasks] notify VAs failed", ticket.id, e);
    }
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
