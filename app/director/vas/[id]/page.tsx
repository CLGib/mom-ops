import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DirectorVADetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, preferred_name")
    .eq("id", id)
    .single();

  if (!profile || profile.role !== "va") notFound();

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("display_name, onboarding_complete")
    .eq("user_id", id)
    .single();

  const { data: tasks } = await supabase
    .from("tickets")
    .select("id, subject, status, completed_at, rating")
    .eq("assigned_va_id", id)
    .order("completed_at", { ascending: false });

  const completed = (tasks ?? []).filter((t) => t.status === "completed" || t.status === "closed");
  const withRating = completed.filter((t) => t.rating != null);
  const avgRating =
    withRating.length > 0
      ? (withRating.reduce((s, t) => s + (t.rating ?? 0), 0) / withRating.length).toFixed(1)
      : null;

  const displayName = vaProfile?.display_name ?? profile.preferred_name ?? profile.full_name ?? id.slice(0, 8);

  return (
    <>
      <Link href="/director/vas" className="back-link">
        ← Back to VAs
      </Link>
      <h1 className="page-title">{displayName}</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        VA profile and metrics. You can suspend, remove, leave internal notes. You cannot change base pay or compensation.
      </p>
      <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="section-heading">Metrics</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>Tasks completed: <strong>{completed.length}</strong></li>
          <li>Current average rating: <strong>{avgRating ?? "—"}</strong> {avgRating != null ? "/ 5" : ""}</li>
          <li>Onboarding: <strong>{vaProfile?.onboarding_complete ? "Complete" : "Pending"}</strong></li>
        </ul>
      </section>
      <section className="card">
        <h2 className="section-heading">Task history</h2>
        <ul className="ticket-list">
          {(tasks ?? []).slice(0, 20).map((t) => (
            <li key={t.id} className="ticket-item">
              <Link href={`/admin/${t.id}`}>{t.subject}</Link>
              <span className="ticket-meta">{t.status} · {t.rating != null ? `${t.rating}/5` : "—"}</span>
            </li>
          ))}
        </ul>
        {(!tasks || tasks.length === 0) && <p className="form-note">No tasks yet.</p>}
      </section>
    </>
  );
}
