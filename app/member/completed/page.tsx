import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function MemberCompletedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, completed_at, updated_at, created_at")
    .eq("member_id", user.id)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });

  return (
    <main className="app-shell">
      <h1 className="page-title">Completed Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Tasks that have been completed or closed.
      </p>
      {(tickets ?? []).length === 0 ? (
        <p className="form-note">No completed tasks yet.</p>
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
                <span className="member-task-card__status">Completed</span>
                <strong className="member-task-card__subject">{t.subject || "Task"}</strong>
                <span className="member-task-card__date">
                  {formatInCentral(t.completed_at ?? t.updated_at ?? t.created_at)}
                </span>
                <Link href={`/member/${t.id}`} className="btn btn-primary member-task-card__action">
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
