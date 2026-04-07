import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskLibrary } from "@/lib/task-library";
import { VA_STALE_CHECKIN_DAYS } from "@/lib/va/recurring-outreach";
import VAOutreachClient from "./VAOutreachClient";

export const dynamic = "force-dynamic";
const STALE_LIMIT = 50;

export default async function VAOutreachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/outreach"));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("onboarding_complete, training_complete")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vaProfile) redirect("/va/onboarding");
  if (!vaProfile.training_complete) redirect("/va/training");

  const { data: staleRows, error: staleError } = await supabase.rpc("va_get_stale_members", {
    p_days: VA_STALE_CHECKIN_DAYS,
    p_limit: STALE_LIMIT,
  });

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, avatar_url")
    .eq("role", "member")
    .order("id");

  const members = (memberProfiles ?? [])
    .map((p) => ({
      id: p.id,
      label: p.preferred_name || p.full_name || p.id.slice(0, 8),
      avatarUrl: p.avatar_url ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));

  const taskLibrary = await getTaskLibrary();
  const taskLibraryForForm = taskLibrary.map((t) => ({ task: t.task, credits: t.credits }));

  return (
    <main className="app-shell">
      <h1 className="page-title">Check-ins</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-md)", maxWidth: "42rem" }}>
        When there are no unassigned tasks, use this list to reach out to members who have been quiet (no ticket activity in the last{" "}
        {VA_STALE_CHECKIN_DAYS} days, or no tasks yet). Use View profile on each row for saved details, onboarding, and recent tasks to tailor
        suggestions—then create a check-in task to message them in the thread and personalize before sending.
      </p>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        <Link href="/va/tasks" className="link">
          Back to Tasks
        </Link>
      </p>

      <VAOutreachClient
        staleRows={staleRows ?? []}
        members={members}
        taskLibrary={taskLibraryForForm}
        loadError={staleError?.message ?? null}
      />
    </main>
  );
}
