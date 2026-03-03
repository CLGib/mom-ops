import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";
import ClaimTicketButton from "../ClaimTicketButton";
import VAAssignedTaskList from "../VAAssignedTaskList";
import RealtimeAssignedTasks from "../RealtimeAssignedTasks";
import VACreateTicketForm from "../VACreateTicketForm";

export const dynamic = "force-dynamic";

export default async function VATasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/tasks"));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .single();
  const onboardingComplete = vaProfile?.onboarding_complete === true;

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name")
    .eq("role", "member")
    .order("id");

  let memberEmails: Record<string, string> = {};
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
    const memberIds = new Set((memberProfiles ?? []).map((p) => p.id));
    authUsers?.forEach((u) => {
      if (memberIds.has(u.id)) memberEmails[u.id] = u.email ?? "";
    });
  } catch {
    // service key not available
  }

  const members = (memberProfiles ?? [])
    .map((p) => ({
      id: p.id,
      label: memberEmails[p.id] || p.preferred_name || p.full_name || p.id.slice(0, 8),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));

  const { data: unassigned } = await supabase
    .from("tickets")
    .select("id, subject, member_id, created_at, requested_va_id")
    .eq("status", "new")
    .is("assigned_va_id", null)
    .order("created_at", { ascending: false });

  const { data: assigned } = await supabase
    .from("tickets")
    .select("id, subject, status, credit_cost, tip_amount, created_at, updated_at")
    .eq("assigned_va_id", user.id)
    .order("updated_at", { ascending: false });

  const inProgressTasks = (assigned ?? []).filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "closed" &&
      t.status !== "cancelled_by_va" &&
      t.status !== "cancelled_by_admin"
  );
  const assignedTicketIds = (assigned ?? []).map((t) => t.id);

  return (
    <main className="app-shell">
      {assignedTicketIds.length > 0 && <RealtimeAssignedTasks assignedTicketIds={assignedTicketIds} />}
      <h1 className="page-title">Tasks</h1>

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

      {onboardingComplete && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <h2 className="section-heading">Create task</h2>
          <p className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: "var(--space-sm)" }}>
            Create a task for a member. It will be assigned to you.
          </p>
          <div className="card">
            <VACreateTicketForm members={members} />
          </div>
        </section>
      )}

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Inbox</h2>
        <p className="form-note" style={{ marginTop: "var(--space-2xs)", marginBottom: "var(--space-sm)" }}>
          Reply to these, then claim more below.
        </p>
        {inProgressTasks.length === 0 ? (
          <p className="form-note">Inbox clear. Claim more tasks below when you&apos;re ready.</p>
        ) : (
          <VAAssignedTaskList tickets={inProgressTasks} inboxMode />
        )}
      </section>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Claim more tasks</h2>
        <ul className="ticket-list">
          {(unassigned ?? []).map((t) => (
            <li key={t.id} className="ticket-item">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-xs)" }}>
                <Link href={onboardingComplete ? `/va/${t.id}` : "/va/onboarding"}>{t.subject}</Link>
                {t.requested_va_id === user.id && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.125rem 0.5rem",
                      borderRadius: 4,
                      backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
                      color: "var(--accent, #b8860b)",
                    }}
                  >
                    Requested you
                  </span>
                )}
                <span className="ticket-meta">{formatInCentral(t.created_at)}</span>
              </div>
              <ClaimTicketButton ticketId={t.id} subject={t.subject} onboardingComplete={onboardingComplete} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
