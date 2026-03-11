import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInCentral } from "@/lib/format-date";

export const dynamic = "force-dynamic";

type AttentionDetailsNew = {
  total?: number;
  max?: number;
  band?: string;
  answers?: Record<string, string>;
  scores?: Record<string, number>;
};

type VaApplicationRow = {
  id: string;
  created_at: string;
  email: string;
  name: string | null;
  attention_score_pct: number | null;
  attention_details: AttentionDetailsNew | Record<string, boolean> | null;
  creative_response: string | null;
};

function isNewDetails(d: VaApplicationRow["attention_details"]): d is AttentionDetailsNew {
  return d !== null && typeof d === "object" && "total" in d && typeof (d as AttentionDetailsNew).total === "number";
}

export default async function AdminVaApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/va-applications"));

  const { data: rows, error } = await supabase
    .from("va_applications")
    .select("id, created_at, email, name, attention_score_pct, attention_details, creative_response")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/va-applications]", error.message);
  }
  const applications = (rows ?? []) as VaApplicationRow[];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
        <h1 className="page-title" style={{ margin: 0 }}>VA applications</h1>
        <Link href="/admin" className="btn btn-secondary">Back to dashboard</Link>
      </div>
      <p className="form-note" style={{ marginBottom: "var(--space-xl)" }}>
        Submissions from the VA apply quiz. Score bands: 16–20 Elite, 12–15 Strong, 8–11 Needs Training, 0–7 Not Recommended.
      </p>
      {applications.length === 0 ? (
        <p className="form-note">No applications yet.</p>
      ) : (
        <ul className="ticket-list" style={{ listStyle: "none", padding: 0 }}>
          {applications.map((app) => {
            const details = app.attention_details;
            const isNew = isNewDetails(details);
            const total = isNew ? details.total : null;
            const max = isNew ? details.max : null;
            const band = isNew ? details.band : null;
            return (
              <li key={app.id} className="card" style={{ padding: "var(--space-lg)", marginBottom: "var(--space-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{app.email}</span>
                    {app.name && <span style={{ marginLeft: "var(--space-sm)", color: "var(--text-muted)" }}>{app.name}</span>}
                  </div>
                  <span className="form-note" style={{ fontSize: "0.85rem" }}>{formatInCentral(app.created_at)}</span>
                </div>
                <div style={{ marginTop: "var(--space-sm)", display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center" }}>
                  {isNew && total != null && max != null ? (
                    <>
                      <span>
                        <span className="form-note" style={{ fontSize: "0.85rem" }}>Score: </span>
                        <strong>{total}/{max}</strong>
                      </span>
                      {band && (
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{band}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>
                        <span className="form-note" style={{ fontSize: "0.85rem" }}>Score: </span>
                        <strong>{app.attention_score_pct != null ? `${app.attention_score_pct}%` : "—"}</strong>
                      </span>
                      {details && typeof details === "object" && !("total" in details) && (
                        <span className="form-note" style={{ fontSize: "0.8rem" }}>
                          (legacy format)
                        </span>
                      )}
                    </>
                  )}
                </div>
                {app.creative_response && (
                  <div style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-md)", borderTop: "1px solid var(--border)" }}>
                    <p className="form-note" style={{ margin: "0 0 var(--space-xs)", fontSize: "0.85rem" }}>Creative response</p>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.9375rem" }}>{app.creative_response}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
