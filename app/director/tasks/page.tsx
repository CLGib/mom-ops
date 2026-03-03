import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function DirectorTasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, status, member_id, assigned_va_id, created_at, completed_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1 className="page-title">Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        View all tasks, status, and review completed tasks. You can flag quality issues and identify training gaps. You cannot override billing charges without CEO.
      </p>
      <section className="card">
        <h2 className="section-heading">All tasks</h2>
        <ul className="ticket-list">
          {(tickets ?? []).map((t) => (
            <li key={t.id} className="ticket-item">
              <div>
                <Link href={`/admin/${t.id}`}>{t.subject}</Link>
                <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                  {t.status} · {formatInCentral(t.created_at)}
                </span>
              </div>
              <Link href={`/admin/${t.id}`} className="btn btn-secondary">
                View
              </Link>
            </li>
          ))}
        </ul>
        {(!tickets || tickets.length === 0) && (
          <p className="form-note">No tasks yet.</p>
        )}
      </section>
    </>
  );
}
