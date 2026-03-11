import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DirectorTaskList from "../DirectorTaskList";

export const dynamic = "force-dynamic";

export default async function DirectorTasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status, member_id, assigned_va_id, created_at, completed_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1 className="page-title">Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        View all tasks, status, and review completed tasks. You can flag quality issues and identify training gaps. You cannot override billing charges without CEO. Canceled tasks are hidden by default but searchable.
      </p>
      <section className="card">
        <h2 className="section-heading">All tasks</h2>
        <DirectorTaskList tickets={tickets ?? []} />
      </section>
    </>
  );
}
