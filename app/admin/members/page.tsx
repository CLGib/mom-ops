import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import InviteMemberForm from "../InviteMemberForm";
import DeleteMemberButton from "../DeleteMemberButton";
import AdminMembersSearch from "../AdminMembersSearch";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const params = await searchParams;
  const searchQuery = (params.search ?? "").trim().toLowerCase();

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name")
    .eq("role", "member")
    .order("id");

  let emailByMemberId: Record<string, string> = {};
  try {
    const service = createServiceClient();
    const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
    const memberIds = new Set((memberProfiles ?? []).map((p) => p.id));
    authUsers?.forEach((u) => {
      if (memberIds.has(u.id) && u.email) emailByMemberId[u.id] = u.email;
    });
  } catch {
    // ignore
  }

  const { data: txRows } = await supabase
    .from("credit_transactions")
    .select("member_id, amount");
  const creditsByMember = (txRows ?? []).reduce(
    (acc, { member_id, amount }) => {
      acc[member_id] = (acc[member_id] ?? 0) + amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const { data: tickets } = await supabase
    .from("tickets")
    .select("member_id, rating");
  const taskCountByMember: Record<string, number> = {};
  const ratingSumByMember: Record<string, number> = {};
  const ratingCountByMember: Record<string, number> = {};
  for (const t of tickets ?? []) {
    taskCountByMember[t.member_id] = (taskCountByMember[t.member_id] ?? 0) + 1;
    if (t.rating != null) {
      ratingSumByMember[t.member_id] = (ratingSumByMember[t.member_id] ?? 0) + t.rating;
      ratingCountByMember[t.member_id] = (ratingCountByMember[t.member_id] ?? 0) + 1;
    }
  }

  const filtered =
    !searchQuery
      ? memberProfiles ?? []
      : (memberProfiles ?? []).filter((p) => {
          const name = [p.preferred_name, p.full_name].filter(Boolean).join(" ").toLowerCase();
          const email = emailByMemberId[p.id]?.toLowerCase() ?? "";
          return name.includes(searchQuery) || email.includes(searchQuery);
        });

  return (
    <>
      <h1 className="page-title">Members</h1>
      <InviteMemberForm />
      <section className="card">
        <AdminMembersSearch initialSearch={params.search ?? ""} />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Name</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Email</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Credits</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Tasks</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Avg rating</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const ratingCount = ratingCountByMember[p.id] ?? 0;
              const avgRating =
                ratingCount > 0
                  ? (ratingSumByMember[p.id]! / ratingCount).toFixed(1)
                  : null;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                  <td style={{ padding: "var(--space-sm)" }}>
                    {p.preferred_name || p.full_name || "-"}
                  </td>
                  <td style={{ padding: "var(--space-sm)" }}>
                    {emailByMemberId[p.id] ?? "-"}
                  </td>
                  <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>
                    {creditsByMember[p.id] ?? 0}
                  </td>
                  <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>
                    {taskCountByMember[p.id] ?? 0}
                  </td>
                  <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>
                    {avgRating ?? "-"}
                  </td>
                  <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>
                    <DeleteMemberButton
                      memberId={p.id}
                      memberName={[p.preferred_name, p.full_name].filter(Boolean).join(" ") || "Member"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
            {(memberProfiles?.length ?? 0) > 0 ? "No members match your search." : "No members yet."}
          </p>
        )}
      </section>
    </>
  );
}
