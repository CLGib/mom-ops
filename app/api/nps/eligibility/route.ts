import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_COMPLETED_TASKS = 3;
const NPS_COOLDOWN_MONTHS = 6;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "member") {
    return NextResponse.json({ eligible: false, reason: "members_only" });
  }

  const { count, error: countError } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("member_id", user.id)
    .in("status", ["completed", "closed"]);

  if (countError || count == null) {
    return NextResponse.json({ eligible: false, reason: "check_failed" });
  }

  if (count < MIN_COMPLETED_TASKS) {
    return NextResponse.json({
      eligible: false,
      reason: "min_tasks",
      completedTasks: count,
      required: MIN_COMPLETED_TASKS,
    });
  }

  const cooldownDate = new Date();
  cooldownDate.setMonth(cooldownDate.getMonth() - NPS_COOLDOWN_MONTHS);

  const { data: lastResponse } = await supabase
    .from("nps_responses")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lastResponse) {
    const lastAt = new Date(lastResponse.created_at);
    if (lastAt >= cooldownDate) {
      return NextResponse.json({
        eligible: false,
        reason: "cooldown",
        lastNpsAt: lastResponse.created_at,
      });
    }
  }

  return NextResponse.json({ eligible: true });
}
