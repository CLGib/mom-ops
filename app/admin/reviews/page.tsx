import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatInCentral } from "@/lib/format-date";

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: reviewedTickets } = await supabase
    .from("tickets")
    .select("id, subject, member_id, assigned_va_id, rating, feedback, completed_at")
    .not("rating", "is", null)
    .order("completed_at", { ascending: false });

  const { data: profiles } = await supabase.from("profiles").select("id, role");
  const vaProfiles = (profiles ?? []).filter((p) => p.role === "va");
  const memberIds = [...new Set((reviewedTickets ?? []).map((t) => t.member_id))];

  const { data: vaProfileRows } = await supabase
    .from("va_profiles")
    .select("user_id, display_name")
    .in("user_id", vaProfiles.map((p) => p.id));
  const vaDisplayNames: Record<string, string> = {};
  (vaProfileRows ?? []).forEach((r) => {
    vaDisplayNames[r.user_id] = r.display_name ?? r.user_id.slice(0, 8);
  });

  let vaEmails: Record<string, string> = {};
  let memberEmails: Record<string, string> = {};
  try {
    const service = createServiceClient();
    const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
    const vaIds = new Set(vaProfiles.map((p) => p.id));
    const memberIdSet = new Set(memberIds);
    authUsers?.forEach((u) => {
      if (vaIds.has(u.id)) vaEmails[u.id] = u.email ?? "";
      if (memberIdSet.has(u.id)) memberEmails[u.id] = u.email ?? "";
    });
  } catch {
    // ignore
  }

  return (
    <>
      <h1 className="page-title">Reviews</h1>
      <section className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Task</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Member</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>VA</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Rating</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Feedback</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {(reviewedTickets ?? []).map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                <td style={{ padding: "var(--space-sm)" }}>
                  <Link href={`/admin/${t.id}`}>{t.subject}</Link>
                </td>
                <td style={{ padding: "var(--space-sm)" }}>{memberEmails[t.member_id] ?? t.member_id.slice(0, 8)}</td>
                <td style={{ padding: "var(--space-sm)" }}>
                  {t.assigned_va_id ? (vaDisplayNames[t.assigned_va_id] ?? vaEmails[t.assigned_va_id] ?? t.assigned_va_id.slice(0, 8)) : "—"}
                </td>
                <td style={{ padding: "var(--space-sm)" }}>{t.rating} of 5</td>
                <td style={{ padding: "var(--space-sm)", maxWidth: 240 }}>{t.feedback ?? "—"}</td>
                <td style={{ padding: "var(--space-sm)" }}>{t.completed_at ? formatInCentral(t.completed_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
