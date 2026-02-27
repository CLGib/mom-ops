import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatInCentral } from "@/lib/format-date";
import AdjustVAPayoutForm from "../AdjustVAPayoutForm";
import RecordVAPaymentForm from "../RecordVAPaymentForm";

const VA_PAYOUT_RATE = 0.2;
function getYtdStart(): string {
  const year = new Date().getFullYear();
  return new Date(Date.UTC(year, 0, 1)).toISOString();
}

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const { data: profiles } = await supabase.from("profiles").select("id, role");
  const vaProfiles = (profiles ?? []).filter((p) => p.role === "va");

  const { data: completedTickets } = await supabase
    .from("tickets")
    .select("assigned_va_id, credit_cost, tip_amount, completed_at")
    .eq("status", "completed")
    .not("assigned_va_id", "is", null)
    .not("completed_at", "is", null);

  const { data: adjustments } = await supabase
    .from("va_adjustments")
    .select("va_id, amount_cents, type, created_at");
  const { data: payments } = await supabase
    .from("va_payments")
    .select("va_id, amount_cents, paid_at");

  const { data: taskTipsRows } = await supabase
    .from("task_tips")
    .select("id, task_id, va_id, member_id, amount, created_at")
    .order("created_at", { ascending: false });

  const { data: tickets } = await supabase.from("tickets").select("id, subject");
  const ticketSubjectById: Record<string, string> = {};
  (tickets ?? []).forEach((t) => {
    ticketSubjectById[t.id] = t.subject ?? t.id.slice(0, 8);
  });

  const tipsByVa: Record<string, number> = {};
  (taskTipsRows ?? []).forEach((r) => {
    tipsByVa[r.va_id] = (tipsByVa[r.va_id] ?? 0) + Number(r.amount);
  });

  const { data: vaProfileRows } = await supabase
    .from("va_profiles")
    .select("user_id, display_name")
    .in("user_id", vaProfiles.map((p) => p.id));
  const vaDisplayNames: Record<string, string> = {};
  (vaProfileRows ?? []).forEach((r) => {
    vaDisplayNames[r.user_id] = r.display_name ?? r.user_id.slice(0, 8);
  });

  let vaEmails: Record<string, string> = {};
  try {
    const service = createServiceClient();
    const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
    const vaIds = new Set(vaProfiles.map((p) => p.id));
    authUsers?.forEach((u) => {
      if (vaIds.has(u.id)) vaEmails[u.id] = u.email ?? "";
    });
  } catch {
    // ignore
  }

  const ytdStart = getYtdStart();
  type VaPayoutRow = {
    taskEarningsYtd: number;
    tipsYtd: number;
    bonusesYtd: number;
    debitsYtd: number;
    netEarnedYtd: number;
    paidYtd: number;
    currentBalance: number;
  };
  const payoutByVa: Record<string, VaPayoutRow> = {};
  vaProfiles.forEach((p) => {
    payoutByVa[p.id] = {
      taskEarningsYtd: 0,
      tipsYtd: 0,
      bonusesYtd: 0,
      debitsYtd: 0,
      netEarnedYtd: 0,
      paidYtd: 0,
      currentBalance: 0,
    };
  });
  (completedTickets ?? []).forEach((t) => {
    const vaId = t.assigned_va_id!;
    if (!payoutByVa[vaId]) return;
    const taskDollars = (t.credit_cost ?? 0) * VA_PAYOUT_RATE;
    const tipDollars = (t.tip_amount ?? 0) / 100;
    const isYtd = (t.completed_at ?? "") >= ytdStart;
    payoutByVa[vaId].taskEarningsYtd += isYtd ? taskDollars : 0;
    payoutByVa[vaId].tipsYtd += isYtd ? tipDollars : 0;
  });
  (adjustments ?? []).forEach((a) => {
    if (!payoutByVa[a.va_id]) return;
    const dollars = a.amount_cents / 100;
    const isYtd = (a.created_at ?? "") >= ytdStart;
    if (a.type === "bonus") {
      payoutByVa[a.va_id].bonusesYtd += isYtd ? dollars : 0;
    } else {
      payoutByVa[a.va_id].debitsYtd += isYtd ? dollars : 0;
    }
  });
  (payments ?? []).forEach((p) => {
    if (!payoutByVa[p.va_id]) return;
    const dollars = p.amount_cents / 100;
    payoutByVa[p.va_id].paidYtd += (p.paid_at ?? "") >= ytdStart ? dollars : 0;
  });
  Object.keys(payoutByVa).forEach((vaId) => {
    const r = payoutByVa[vaId];
    r.netEarnedYtd = r.taskEarningsYtd + r.tipsYtd + r.bonusesYtd;
    const lifetimeNet = (completedTickets ?? []).filter((t) => t.assigned_va_id === vaId).reduce((s, t) => s + (t.credit_cost ?? 0) * VA_PAYOUT_RATE + (t.tip_amount ?? 0) / 100, 0);
    const lifetimeBonuses = (adjustments ?? []).filter((a) => a.va_id === vaId && a.type === "bonus").reduce((s, a) => s + a.amount_cents / 100, 0);
    const lifetimeDebits = (adjustments ?? []).filter((a) => a.va_id === vaId && a.type !== "bonus").reduce((s, a) => s + a.amount_cents / 100, 0);
    const totalPaid = (payments ?? []).filter((p) => p.va_id === vaId).reduce((s, p) => s + p.amount_cents / 100, 0);
    r.currentBalance = lifetimeNet + lifetimeBonuses - lifetimeDebits - totalPaid;
  });

  const vasForForm = vaProfiles.map((p) => ({ id: p.id, email: vaEmails[p.id] ?? p.id.slice(0, 8) }));

  return (
    <>
      <h1 className="page-title">Payouts</h1>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">Tips</h2>
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Optional tips from members to VAs. Total per VA and per task; export for payroll.
        </p>
        <div className="card" style={{ marginBottom: "var(--space-md)", overflowX: "auto" }}>
          <h3 className="section-heading" style={{ fontSize: "1rem", marginBottom: "var(--space-sm)" }}>Total tips per VA</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>VA</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Total tips</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tipsByVa).sort(([, a], [, b]) => b - a).map(([vaId, total]) => (
                <tr key={vaId} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                  <td style={{ padding: "var(--space-sm)" }}>{vaDisplayNames[vaId] ?? vaEmails[vaId] ?? vaId.slice(0, 8)}</td>
                  <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(taskTipsRows?.length ?? 0) === 0 && <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>No tips yet.</p>}
        </div>
        <div className="card" style={{ marginBottom: "var(--space-md)", overflowX: "auto" }}>
          <h3 className="section-heading" style={{ fontSize: "1rem", marginBottom: "var(--space-sm)" }}>Tips per task</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Task</th>
                <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>VA</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Amount</th>
                <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(taskTipsRows ?? []).map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                  <td style={{ padding: "var(--space-sm)" }}><Link href={`/admin/${r.task_id}`}>{ticketSubjectById[r.task_id] ?? r.task_id.slice(0, 8)}</Link></td>
                  <td style={{ padding: "var(--space-sm)" }}>{vaDisplayNames[r.va_id] ?? vaEmails[r.va_id] ?? r.va_id.slice(0, 8)}</td>
                  <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${Number(r.amount).toFixed(2)}</td>
                  <td style={{ padding: "var(--space-sm)" }}>{r.created_at ? formatInCentral(r.created_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(taskTipsRows?.length ?? 0) === 0 && <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>No tips yet.</p>}
        </div>
        <div className="card" style={{ marginBottom: "var(--space-2xl)" }}>
          <a href="/api/admin/tips-export" className="btn btn-secondary" download>Export tips CSV (payroll)</a>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading">VA payouts</h2>
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          YTD = this calendar year. Net earned = tasks + tips + bonuses. Current balance (owed) = lifetime net − debits − total paid.
        </p>
        <div className="card" style={{ marginBottom: "var(--space-md)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>VA</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>From tasks (YTD)</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Tips (YTD)</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Bonuses (YTD)</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Debits (YTD)</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Net earned (YTD)</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Paid (YTD)</th>
                <th style={{ textAlign: "right", padding: "var(--space-sm)", fontWeight: 600 }}>Current balance (owed)</th>
              </tr>
            </thead>
            <tbody>
              {vaProfiles.map((p) => {
                const row = payoutByVa[p.id];
                if (!row) return null;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                    <td style={{ padding: "var(--space-sm)" }}>{vaEmails[p.id] || p.id.slice(0, 8)}</td>
                    <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${row.taskEarningsYtd.toFixed(2)}</td>
                    <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${row.tipsYtd.toFixed(2)}</td>
                    <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${row.bonusesYtd.toFixed(2)}</td>
                    <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${row.debitsYtd.toFixed(2)}</td>
                    <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${row.netEarnedYtd.toFixed(2)}</td>
                    <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${row.paidYtd.toFixed(2)}</td>
                    <td style={{ padding: "var(--space-sm)", textAlign: "right", fontWeight: 600 }}>${row.currentBalance.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ marginBottom: "var(--space-md)" }}>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>Apply debit or bonus (adjustments ledger only).</p>
          <AdjustVAPayoutForm vas={vasForForm} />
        </div>
        <div className="card">
          <h3 className="section-heading" style={{ fontSize: "1rem", marginBottom: "var(--space-xs)" }}>Record payment (paid)</h3>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>When you pay a VA, record it here.</p>
          <RecordVAPaymentForm vas={vasForForm} />
        </div>
      </section>
    </>
  );
}
