import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InviteVAForm from "../../admin/InviteVAForm";

export const dynamic = "force-dynamic";

export default async function DirectorVAsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/director"));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name")
    .eq("role", "va")
    .order("id");

  const { data: vaProfiles } = await supabase
    .from("va_profiles")
    .select("user_id, display_name, onboarding_complete")
    .in("user_id", (profiles ?? []).map((p) => p.id));

  const vaByUserId = new Map((vaProfiles ?? []).map((v) => [v.user_id, v]));

  return (
    <>
      <h1 className="page-title">VAs</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        Invite new VAs and manage current ones. You cannot change VA base pay or compensation model.
      </p>
      <section className="card" style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading">Invite new VA</h2>
        <InviteVAForm />
      </section>
      <section className="card">
        <h2 className="section-heading">Current VAs</h2>
        <ul className="ticket-list">
          {(profiles ?? []).map((p) => {
            const vp = vaByUserId.get(p.id);
            const name = vp?.display_name ?? p.preferred_name ?? p.full_name ?? p.id.slice(0, 8);
            return (
              <li key={p.id} className="ticket-item">
                <Link href={`/director/vas/${p.id}`}>{name}</Link>
                <span className="ticket-meta">
                  {vp?.onboarding_complete ? "Onboarded" : "Pending onboarding"}
                </span>
              </li>
            );
          })}
        </ul>
        {(!profiles || profiles.length === 0) && (
          <p className="form-note">No VAs yet. Invite one above.</p>
        )}
      </section>
    </>
  );
}
