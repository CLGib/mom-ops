import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import { getTaskLibrary } from "@/lib/task-library";
import VAAssignedTaskList from "../VAAssignedTaskList";
import RealtimeAssignedTasks from "../RealtimeAssignedTasks";
import RealtimeUnassignedTickets from "../RealtimeUnassignedTickets";
import CreateTaskCollapsible from "../CreateTaskCollapsible";
import UnassignedTaskList from "../UnassignedTaskList";
import VATasksPageSearch from "../VATasksPageSearch";

export const dynamic = "force-dynamic";

export default async function VATasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/tasks"));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("onboarding_complete, training_complete")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vaProfile) redirect("/va/onboarding");
  const onboardingComplete = vaProfile.onboarding_complete === true;
  const trainingComplete = vaProfile.training_complete === true;
  if (!trainingComplete) redirect("/va/training");
  const canClaimTasks = onboardingComplete && trainingComplete;

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, avatar_url")
    .eq("role", "member")
    .order("id");

  // VA sees only name and avatar for member search — never email
  const members = (memberProfiles ?? [])
    .map((p) => ({
      id: p.id,
      label: p.preferred_name || p.full_name || p.id.slice(0, 8),
      avatarUrl: p.avatar_url ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));

  const taskLibrary = await getTaskLibrary();

  const { data: unassigned } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, member_id, status, created_at, requested_va_id, no_rush")
    .in("status", ["new", "reopened"])
    .is("assigned_va_id", null)
    .order("created_at", { ascending: true });

  const { data: assigned } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status, credit_cost, tip_amount, created_at, updated_at")
    .eq("assigned_va_id", user.id)
    .order("updated_at", { ascending: false });

  // All tickets for search (VAs can read any ticket; unassigned = read-only when viewing)
  const { data: allTicketsForSearch } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status, credit_cost, tip_amount, created_at, updated_at, assigned_va_id")
    .order("updated_at", { ascending: false })
    .limit(1000);

  const inProgressTasks = (assigned ?? []).filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "closed" &&
      t.status !== "cancelled_by_va" &&
      t.status !== "cancelled_by_admin"
  );
  const assignedTicketIds = (assigned ?? []).map((t) => t.id);
  const assignedIdSet = new Set(assignedTicketIds);

  // Tickets where VA was @mentioned in an internal note — show in inbox until closed
  const { data: mentionRows } = await supabase
    .from("ticket_mentions")
    .select("ticket_id")
    .eq("mentioned_user_id", user.id);
  const mentionedTicketIds = [...new Set((mentionRows ?? []).map((r) => r.ticket_id))];
  const openMentionedIds = mentionedTicketIds.filter((id) => !assignedIdSet.has(id));
  let mentionedTickets: typeof inProgressTasks = [];
  if (openMentionedIds.length > 0) {
    const { data: mentioned } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, status, credit_cost, tip_amount, created_at, updated_at")
      .in("id", openMentionedIds);
    mentionedTickets = (mentioned ?? []).filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "closed" &&
        t.status !== "cancelled_by_va" &&
        t.status !== "cancelled_by_admin"
    );
  }

  const inboxTickets = [
    ...inProgressTasks.map((t) => ({ ...t, mentionedOnly: false as const })),
    ...mentionedTickets.map((t) => ({ ...t, mentionedOnly: true as const })),
  ].sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime());

  return (
    <main className="app-shell">
      {assignedTicketIds.length > 0 && <RealtimeAssignedTasks assignedTicketIds={assignedTicketIds} />}
      <RealtimeUnassignedTickets />
      <h1 className="page-title">Tasks</h1>

      <VATasksPageSearch allTickets={allTicketsForSearch ?? []} currentUserId={user.id} />

      {!onboardingComplete && (
        <div className="card" style={{ marginBottom: "var(--space-lg)", borderColor: "var(--accent)" }}>
          <p style={{ margin: 0, marginBottom: "var(--space-sm)" }}>
            <strong>Complete onboarding before you can claim tasks.</strong>
          </p>
          <Link href="/va/onboarding" className="btn btn-primary">
            Go to Onboarding
          </Link>
        </div>
      )}

      {canClaimTasks && (
        <CreateTaskCollapsible
          members={members}
          taskLibrary={taskLibrary.map((t) => ({ task: t.task, credits: t.credits }))}
        />
      )}

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Inbox</h2>
        <p className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: "var(--space-sm)" }}>
          Reply to these, then claim more below.
        </p>
        {inboxTickets.length === 0 ? (
          <p className="form-note">Inbox clear. Claim more tasks below when you&apos;re ready.</p>
        ) : (
          <VAAssignedTaskList tickets={inboxTickets} inboxMode />
        )}
      </section>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Claim more tasks</h2>
        {(unassigned ?? []).length === 0 ? (
          <p className="form-note">No unassigned tasks right now.</p>
        ) : (
          <UnassignedTaskList
            tickets={unassigned ?? []}
            currentUserId={user.id}
            onboardingComplete={canClaimTasks}
          />
        )}
      </section>
    </main>
  );
}
