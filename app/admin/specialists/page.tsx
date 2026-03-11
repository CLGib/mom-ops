import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import InviteVAForm from "../InviteVAForm";
import BackfillVAWelcomeButton from "../BackfillVAWelcomeButton";
import DeleteVAButton from "../DeleteVAButton";
import VATrainingModeToggle from "../VATrainingModeToggle";
import MarkVATrainingCompleteButton from "../MarkVATrainingCompleteButton";

export default async function AdminSpecialistsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: profiles } = await supabase.from("profiles").select("id, role");
  const vaProfiles = (profiles ?? []).filter((p) => p.role === "va");

  const { data: reviewedTickets } = await supabase
    .from("tickets")
    .select("assigned_va_id, rating")
    .not("rating", "is", null);
  const vaRatingCount: Record<string, number> = {};
  const vaRatingSum: Record<string, number> = {};
  (reviewedTickets ?? []).forEach((t) => {
    const vaId = t.assigned_va_id;
    if (!vaId || t.rating == null) return;
    vaRatingCount[vaId] = (vaRatingCount[vaId] ?? 0) + 1;
    vaRatingSum[vaId] = (vaRatingSum[vaId] ?? 0) + t.rating;
  });

  const { data: vaProfileRows } = await supabase
    .from("va_profiles")
    .select("user_id, display_name, work_requires_review, training_complete")
    .in("user_id", vaProfiles.map((p) => p.id));
  const vaDisplayNames: Record<string, string> = {};
  const vaWorkRequiresReview: Record<string, boolean> = {};
  const vaTrainingComplete: Record<string, boolean> = {};
  (vaProfileRows ?? []).forEach((r) => {
    vaDisplayNames[r.user_id] = r.display_name ?? r.user_id.slice(0, 8);
    vaWorkRequiresReview[r.user_id] = r.work_requires_review === true;
    vaTrainingComplete[r.user_id] = r.training_complete === true;
  });

  let vaEmails: Record<string, string> = {};
  if (vaProfiles.length > 0) {
    try {
      const service = createServiceClient();
      const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
      const vaIds = new Set(vaProfiles.map((p) => p.id));
      authUsers?.forEach((u) => {
        if (vaIds.has(u.id)) vaEmails[u.id] = u.email ?? "";
      });
    } catch {
      // ignore
    }
  }

  return (
    <>
      <h1 className="page-title">Specialists</h1>
      <section className="card" style={{ marginBottom: "var(--space-md)" }}>
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Create a VA account and send a magic link to their email. They sign in from the link.
        </p>
        <InviteVAForm />
      </section>
      {vaProfiles.length > 0 && (
        <section className="card">
          <h2 className="section-heading" style={{ fontSize: "1rem", marginBottom: "var(--space-sm)" }}>
            Current VAs
          </h2>
          <BackfillVAWelcomeButton vaCount={vaProfiles.length} />
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {vaProfiles.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-md)",
                  padding: "var(--space-sm) 0",
                  borderBottom: "1px solid var(--color-border, #e5e5e5)",
                }}
              >
                <span>
                  {(vaDisplayNames[p.id] ?? vaEmails[p.id]) || p.id.slice(0, 8)}
                  {vaRatingCount[p.id] != null && (
                    <span className="ticket-meta" style={{ marginLeft: "var(--space-sm)" }}>
                      Rating: {(vaRatingSum[p.id]! / vaRatingCount[p.id]!).toFixed(1)} ({vaRatingCount[p.id]} review{vaRatingCount[p.id] !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                  <VATrainingModeToggle vaId={p.id} workRequiresReview={vaWorkRequiresReview[p.id] ?? true} />
                  <MarkVATrainingCompleteButton
                    vaId={p.id}
                    trainingComplete={vaTrainingComplete[p.id] ?? false}
                  />
                  <Link href={`/admin/va/${p.id}/profile`} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                    Edit profile
                  </Link>
                  <DeleteVAButton vaId={p.id} email={vaEmails[p.id] || p.id.slice(0, 8)} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
