import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import InviteMemberForm from "../InviteMemberForm";
import DeleteMemberButton from "../DeleteMemberButton";
import AdminMembersSearch from "../AdminMembersSearch";
import MemberByEmailLookup from "../MemberByEmailLookup";
import BackfillFoundingMemberWelcomeButton from "../BackfillFoundingMemberWelcomeButton";
import EditMemberNameCell from "../EditMemberNameCell";

const PAGE_SIZE = 20;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const params = await searchParams;
  const searchQuery = (params.search ?? "").trim().toLowerCase();
  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, is_founding_member")
    .eq("role", "member")
    .order("id");

  const foundingMemberCount = (memberProfiles ?? []).filter((p) => p.is_founding_member === true).length;

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <>
      <h1 className="page-title">Members</h1>
      <InviteMemberForm />
      <section className="card" style={{ marginBottom: "var(--space-md)" }}>
        <h2 className="section-heading" style={{ fontSize: "1rem", marginBottom: "var(--space-sm)" }}>
          Founding member welcome email
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Send a test of the founders launch email to your inbox, or send the real welcome to current founding members who haven&apos;t received it yet.
        </p>
        <BackfillFoundingMemberWelcomeButton founderCount={foundingMemberCount} />
      </section>
      <section className="card">
        <AdminMembersSearch initialSearch={params.search ?? ""} />
        <MemberByEmailLookup />
        {filtered.length === 0 ? (
          <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
            {(memberProfiles?.length ?? 0) > 0 ? "No members match your search." : "No members yet."}
          </p>
        ) : (
          <>
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
                {paginated.map((p) => {
                  const ratingCount = ratingCountByMember[p.id] ?? 0;
                  const avgRating =
                    ratingCount > 0
                      ? (ratingSumByMember[p.id]! / ratingCount).toFixed(1)
                      : null;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                      <EditMemberNameCell
                        memberId={p.id}
                        fullName={p.full_name ?? null}
                        preferredName={p.preferred_name ?? null}
                        displayLabel={p.preferred_name || p.full_name || "-"}
                      />
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
            {totalPages > 1 && (() => {
              const q = new URLSearchParams();
              if (params.search) q.set("search", params.search);
              const prevPage = currentPage - 1;
              const nextPage = currentPage + 1;
              q.set("page", String(prevPage));
              const prevHref = `?${q.toString()}`;
              q.set("page", String(nextPage));
              const nextHref = `?${q.toString()}`;
              return (
                <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-md)", alignItems: "center" }}>
                  <a
                    href={currentPage > 0 ? prevHref : "#"}
                    className="btn btn-secondary"
                    aria-disabled={currentPage === 0}
                    style={currentPage === 0 ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                  >
                    Previous
                  </a>
                  <span className="form-note">
                    Page {currentPage + 1} of {totalPages} ({filtered.length} total)
                  </span>
                  <a
                    href={currentPage < totalPages - 1 ? nextHref : "#"}
                    className="btn btn-secondary"
                    aria-disabled={currentPage >= totalPages - 1}
                    style={currentPage >= totalPages - 1 ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                  >
                    Next
                  </a>
                </div>
              );
            })()}
          </>
        )}
      </section>
    </>
  );
}
