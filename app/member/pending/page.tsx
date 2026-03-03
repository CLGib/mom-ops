import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function MemberPendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, status, created_at")
    .eq("member_id", user.id)
    .in("status", ["new", "assigned", "awaiting_member_approval", "in_progress", "waiting_on_member"])
    .order("created_at", { ascending: false });

  return (
    <main className="app-shell">
      <h1 className="page-title">Pending Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Tasks that are not yet completed or closed.
      </p>
      {(tickets ?? []).length === 0 ? (
        <p className="form-note">No pending tasks. <Link href="/member#submit" className="link">Submit a task</Link> from Home.</p>
      ) : (
        <ul className="member-task-cards" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(tickets ?? []).map((t) => (
            <li
              key={t.id}
              className="member-task-card"
              style={{
                padding: "var(--space-md)",
                marginBottom: "var(--space-sm)",
                border: "1px solid var(--color-border, #e5e5e5)",
                borderRadius: "var(--radius, 6px)",
                backgroundColor: "var(--color-bg, #fff)",
              }}
            >
              <div className="member-task-card__content">
                <span className="member-task-card__status">{t.status}</span>
                <strong className="member-task-card__subject">{t.subject || "Task"}</strong>
                <span className="member-task-card__date">{formatInCentral(t.created_at)}</span>
                <Link href={`/member/${t.id}`} className="btn btn-primary member-task-card__action">
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
