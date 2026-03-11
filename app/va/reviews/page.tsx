import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function VAReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/reviews"));

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, rating, feedback, completed_at, tip_amount")
    .eq("assigned_va_id", user.id)
    .in("status", ["completed", "closed"])
    .not("rating", "is", null)
    .order("completed_at", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com";

  return (
    <main className="app-shell">
      <h1 className="page-title">My reviews</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Reviews and feedback from members on tasks you completed. You can also read reviews on our website.
      </p>

      <p style={{ marginBottom: "var(--space-md)" }}>
        <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="link">
          Read reviews on our website →
        </a>
      </p>

      {(!tickets || tickets.length === 0) ? (
        <p className="form-note">No reviews yet. Once members rate completed tasks, they&apos;ll appear here.</p>
      ) : (
        <ul className="ticket-list" style={{ listStyle: "none", padding: 0 }}>
          {tickets.map((t) => (
            <li key={t.id} className="card" style={{ marginBottom: "var(--space-md)", padding: "var(--space-md)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
                <Link href={`/va/${t.id}`} className="link" style={{ fontWeight: 600 }}>
                  #{t.ticket_number ?? t.id.slice(0, 8)} {t.subject}
                </Link>
                <span className="ticket-meta" aria-label={`${t.rating} out of 5`}>
                  {"★".repeat(t.rating ?? 0)}
                  <span style={{ color: "var(--border, #e8e6e2)" }}>{"★".repeat(5 - (t.rating ?? 0))}</span>
                  <span style={{ marginLeft: "var(--space-2xs)" }}>{t.rating}/5</span>
                </span>
                {t.completed_at && (
                  <span className="ticket-meta">Completed {formatInCentral(t.completed_at)}</span>
                )}
                {t.tip_amount != null && t.tip_amount > 0 && (
                  <span className="ticket-meta" style={{ fontWeight: 500 }}>
                    Tip: ${(t.tip_amount / 100).toFixed(2)}
                  </span>
                )}
              </div>
              {t.feedback && (
                <blockquote
                  style={{
                    margin: "var(--space-sm) 0 0",
                    paddingLeft: "var(--space-md)",
                    borderLeft: "3px solid var(--border, #e5e5e5)",
                    color: "var(--text-secondary, #555)",
                  }}
                >
                  &ldquo;{t.feedback}&rdquo;
                </blockquote>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
