import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function MemberCompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/member"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, completed_at, updated_at, created_at")
    .eq("member_id", user.id)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });

  const list = tickets ?? [];
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginated = list.slice(start, start + PAGE_SIZE);

  return (
    <main className="app-shell">
      <h1 className="page-title">Completed Tasks</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Tasks that have been completed or closed.
      </p>
      {list.length === 0 ? (
        <p className="form-note">No completed tasks yet.</p>
      ) : (
        <>
          <ul className="member-task-cards" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {paginated.map((t) => (
              <li
                key={t.id}
                className="member-task-card member-task-card--completed"
                style={{
                  padding: "var(--space-md)",
                  marginBottom: "var(--space-sm)",
                  border: "1px solid var(--color-border, #e5e5e5)",
                  borderRadius: "var(--radius, 6px)",
                  backgroundColor: "var(--color-bg, #fff)",
                }}
              >
                <div className="member-task-card__content">
                  <span className="member-task-card__status">Completed</span>
                  <strong className="member-task-card__subject">{t.subject || "Task"}</strong>
                  <span className="member-task-card__date">
                    {formatInCentral(t.completed_at ?? t.updated_at ?? t.created_at)}
                  </span>
                  <Link href={`/member/${t.id}`} className="btn btn-primary member-task-card__action">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                gap: "var(--space-md)",
                marginTop: "var(--space-md)",
                alignItems: "center",
              }}
            >
              {currentPage > 1 ? (
                <Link
                  href={currentPage === 2 ? "/member/completed" : `/member/completed?page=${currentPage - 1}`}
                  className="btn btn-secondary"
                >
                  Previous
                </Link>
              ) : (
                <span className="btn btn-secondary" style={{ opacity: 0.6, pointerEvents: "none" }}>
                  Previous
                </span>
              )}
              <span className="form-note">
                Page {currentPage} of {totalPages} ({list.length} total)
              </span>
              {currentPage < totalPages ? (
                <Link href={`/member/completed?page=${currentPage + 1}`} className="btn btn-secondary">
                  Next
                </Link>
              ) : (
                <span className="btn btn-secondary" style={{ opacity: 0.6, pointerEvents: "none" }}>
                  Next
                </span>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
