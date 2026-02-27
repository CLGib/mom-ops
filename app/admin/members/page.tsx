import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, profile_completion, onboarding_completed_at")
    .eq("role", "member")
    .order("id");

  return (
    <>
      <h1 className="page-title">Members</h1>
      <section className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Name</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Profile completion</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Onboarding completed</th>
            </tr>
          </thead>
          <tbody>
            {(memberProfiles ?? []).map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                <td style={{ padding: "var(--space-sm)" }}>
                  {p.preferred_name || p.full_name || "—"}
                </td>
                <td style={{ padding: "var(--space-sm)" }}>
                  {p.profile_completion != null ? `${p.profile_completion}%` : "—"}
                </td>
                <td style={{ padding: "var(--space-sm)" }}>
                  {p.onboarding_completed_at ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
