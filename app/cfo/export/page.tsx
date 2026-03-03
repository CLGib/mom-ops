import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CfoExportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/cfo"));

  const month = new Date().toISOString().slice(0, 7);

  return (
    <>
      <h1 className="page-title">Export data</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Download CSV exports for payroll and reporting.
      </p>
      <div className="card" style={{ maxWidth: "32rem" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ padding: "var(--space-sm) 0", borderBottom: "1px solid var(--border)" }}>
            <a href="/api/admin/tips-export" className="btn btn-secondary" download style={{ display: "inline-block" }}>
              Export tips (CSV)
            </a>
            <p className="form-note" style={{ margin: "var(--space-2xs) 0 0" }}>Task tips per VA for payroll.</p>
          </li>
          <li style={{ padding: "var(--space-sm) 0", borderBottom: "1px solid var(--border)" }}>
            <a href={`/api/admin/revenue/costs/export?month=${month}`} className="btn btn-secondary" download style={{ display: "inline-block" }}>
              Export costs this month (CSV)
            </a>
            <p className="form-note" style={{ margin: "var(--space-2xs) 0 0" }}>Revenue cost entries for {month}.</p>
          </li>
          <li style={{ padding: "var(--space-sm) 0" }}>
            <a href="/api/admin/revenue/costs/export" className="btn btn-secondary" download style={{ display: "inline-block" }}>
              Export all costs (CSV)
            </a>
            <p className="form-note" style={{ margin: "var(--space-2xs) 0 0" }}>All revenue cost entries.</p>
          </li>
        </ul>
      </div>
    </>
  );
}
