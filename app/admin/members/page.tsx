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
  searchParams: Promise<{ search?: string; page?: string; created_from?: string; created_to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const params = await searchParams;
  const searchQuery = (params.search ?? "").trim().toLowerCase();
  const createdFrom = (params.created_from ?? "").trim() || null;
  const createdTo = (params.created_to ?? "").trim() || null;
  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);

  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_name, is_founding_member, created_at")
    .eq("role", "member")
    .order("created_at", { ascending: false });

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

  let filtered =
    !searchQuery
      ? memberProfiles ?? []
      : (memberProfiles ?? []).filter((p) => {
          const name = [p.preferred_name, p.full_name].filter(Boolean).join(" ").toLowerCase();
          const email = emailByMemberId[p.id]?.toLowerCase() ?? "";
          return name.includes(searchQuery) || email.includes(searchQuery);
        });

  if (createdFrom || createdTo) {
    const fromMs = createdFrom ? new Date(createdFrom + "T00:00:00.000Z").getTime() : null;
    const toMs = createdTo ? new Date(createdTo + "T23:59:59.999Z").getTime() : null;
    filtered = filtered.filter((p) => {
      const t = p.created_at ? new Date(p.created_at).getTime() : 0;
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t > toMs) return false;
      return true;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <>
      <h1 className="page-title" style={{ marginBottom: "var(--space-sm)" }}>Members</h1>
      <InviteMemberForm />
      <section className="card" style={{ marginBottom: "var(--space-sm)", padding: "var(--space-sm)" }}>
        <h2 className="section-heading" style={{ fontSize: "0.9rem", marginBottom: "var(--space-xs)" }}>
          Founding member welcome email
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-xs)", fontSize: "0.85rem" }}>
          Send a test of the founders launch email to your inbox, or send the real welcome to current founding members who haven&apos;t received it yet.
        </p>
        <BackfillFoundingMemberWelcomeButton founderCount={foundingMemberCount} />
      </section>
      <section className="card" style={{ padding: "var(--space-sm)" }}>
        <AdminMembersSearch
          initialSearch={params.search ?? ""}
          initialCreatedFrom={params.created_from ?? ""}
          initialCreatedTo={params.created_to ?? ""}
        />
        <MemberByEmailLookup />
        {filtered.length === 0 ? (
          <p className="form-note" style={{ marginTop: "var(--space-sm)", fontSize: "0.85rem" }}>
            {(memberProfiles?.length ?? 0) > 0 ? "No members match your search." : "No members yet."}
          </p>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "4px 6px", whiteSpace: "nowrap" }}>Created</th>
                  <th style={{ textAlign: "right", padding: "4px 6px" }}>Credits</th>
                  <th style={{ textAlign: "right", padding: "4px 6px" }}>Tasks</th>
                  <th style={{ textAlign: "right", padding: "4px 6px" }}>Avg</th>
                  <th style={{ textAlign: "right", padding: "4px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const ratingCount = ratingCountByMember[p.id] ?? 0;
                  const avgRating =
                    ratingCount > 0
                      ? (ratingSumByMember[p.id]! / ratingCount).toFixed(1)
                      : null;
                  const createdStr = p.created_at
                    ? new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                    : "-";
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                      <EditMemberNameCell
                        memberId={p.id}
                        fullName={p.full_name ?? null}
                        preferredName={p.preferred_name ?? null}
                        displayLabel={p.preferred_name || p.full_name || "-"}
                      />
                      <td style={{ padding: "4px 6px" }}>
                        {emailByMemberId[p.id] ?? "-"}
                      </td>
                      <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                        {createdStr}
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right" }}>
                        {creditsByMember[p.id] ?? 0}
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right" }}>
                        {taskCountByMember[p.id] ?? 0}
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right" }}>
                        {avgRating ?? "-"}
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right" }}>
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
              if (params.created_from) q.set("created_from", params.created_from);
              if (params.created_to) q.set("created_to", params.created_to);
              const prevPage = currentPage - 1;
              const nextPage = currentPage + 1;
              q.set("page", String(prevPage));
              const prevHref = `?${q.toString()}`;
              q.set("page", String(nextPage));
              const nextHref = `?${q.toString()}`;
              return (
                <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-sm)", alignItems: "center", fontSize: "0.85rem" }}>
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
