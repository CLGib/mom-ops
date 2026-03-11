import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatInCentral } from "@/lib/format-date";
import DeleteReviewButton from "../DeleteReviewButton";

const PAGE_SIZE = 20;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const params = await searchParams;
  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);

  const { data: reviewedTickets } = await supabase
    .from("tickets")
    .select("id, subject, member_id, assigned_va_id, rating, feedback, completed_at")
    .not("rating", "is", null)
    .order("completed_at", { ascending: false });

  const ticketIds = (reviewedTickets ?? []).map((t) => t.id);
  const { data: taskReviews } = ticketIds.length > 0
    ? await supabase.from("task_reviews").select("id, task_id").in("task_id", ticketIds)
    : { data: [] as { id: string; task_id: string }[] | null };
  const ticketIdToReviewId: Record<string, string> = {};
  (taskReviews ?? []).forEach((r) => {
    ticketIdToReviewId[r.task_id] = r.id;
  });

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

  const list = reviewedTickets ?? [];
  const lowRatingTickets = list.filter((t) => t.rating != null && t.rating < 4);
  const listSorted = [...list].sort((a, b) => {
    const aLow = a.rating != null && a.rating < 4 ? 1 : 0;
    const bLow = b.rating != null && b.rating < 4 ? 1 : 0;
    if (bLow !== aLow) return bLow - aLow;
    return new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime();
  });
  const totalPages = Math.max(1, Math.ceil(listSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = listSorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <>
      <h1 className="page-title">Reviews</h1>
      {lowRatingTickets.length > 0 && (
        <section className="card card--highlight" style={{ marginBottom: "var(--space-2xl)", borderColor: "var(--color-accent, #b8860b)" }}>
          <h2 className="section-heading">Low ratings (below 4 stars)</h2>
          <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
            {lowRatingTickets.length} task{lowRatingTickets.length !== 1 ? "s" : ""} rated below 4 stars. These appear first in the table below.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {lowRatingTickets.slice(0, 10).map((t) => (
              <li key={t.id} style={{ marginBottom: "var(--space-sm)" }}>
                <Link href={`/admin/${t.id}`}>
                  {t.subject} – {t.rating}/5
                  {t.completed_at ? ` · ${formatInCentral(t.completed_at)}` : ""}
                </Link>
              </li>
            ))}
            {lowRatingTickets.length > 10 && (
              <li className="form-note" style={{ marginTop: "var(--space-sm)" }}>
                … and {lowRatingTickets.length - 10} more (see table below)
              </li>
            )}
          </ul>
        </section>
      )}
      <section className="card" style={{ overflowX: "auto" }}>
        {list.length === 0 ? (
          <p className="form-note">No reviews yet.</p>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Task</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Member</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>VA</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Rating</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Feedback</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: "1px solid var(--color-border, #e5e5e5)",
                      ...(t.rating != null && t.rating < 4 ? { backgroundColor: "var(--color-accent-subtle, rgba(184, 134, 11, 0.08))" } : {}),
                    }}
                  >
                    <td style={{ padding: "var(--space-sm)" }}>
                      <Link href={`/admin/${t.id}`}>{t.subject}</Link>
                    </td>
                    <td style={{ padding: "var(--space-sm)" }}>{memberEmails[t.member_id] ?? t.member_id.slice(0, 8)}</td>
                    <td style={{ padding: "var(--space-sm)" }}>
                      {t.assigned_va_id ? (vaDisplayNames[t.assigned_va_id] ?? vaEmails[t.assigned_va_id] ?? t.assigned_va_id.slice(0, 8)) : "-"}
                    </td>
                    <td style={{ padding: "var(--space-sm)" }}>
                      {t.rating} of 5
                      {t.rating != null && t.rating < 4 && (
                        <span style={{ marginLeft: "var(--space-2xs)", fontSize: "0.75rem", fontWeight: 600 }}>Low</span>
                      )}
                    </td>
                    <td style={{ padding: "var(--space-sm)", maxWidth: 240 }}>{t.feedback ?? "-"}</td>
                    <td style={{ padding: "var(--space-sm)" }}>{t.completed_at ? formatInCentral(t.completed_at) : "-"}</td>
                    <td style={{ padding: "var(--space-sm)" }}>
                      {ticketIdToReviewId[t.id] ? (
                        <DeleteReviewButton reviewId={ticketIdToReviewId[t.id]} />
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-md)", alignItems: "center" }}>
                <Link
                  href={currentPage > 0 ? `?page=${currentPage - 1}` : "#"}
                  className="btn btn-secondary"
                  aria-disabled={currentPage === 0}
                  style={currentPage === 0 ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                >
                  Previous
                </Link>
                <span className="form-note">
                  Page {currentPage + 1} of {totalPages} ({listSorted.length} total)
                </span>
                <Link
                  href={currentPage < totalPages - 1 ? `?page=${currentPage + 1}` : "#"}
                  className="btn btn-secondary"
                  aria-disabled={currentPage >= totalPages - 1}
                  style={currentPage >= totalPages - 1 ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                >
                  Next
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
