import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const VA_PAYOUT_RATE = 0.2;
const HOT_TASK_PAY_MULTIPLIER = 1.1;
function getYtdStart(): string {
  return new Date(new Date().getFullYear(), 0, 1).toISOString();
}

export const dynamic = "force-dynamic";

export default async function CfoVasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/cfo"));

  const { data: profiles } = await supabase.from("profiles").select("id, role");
  const vaProfiles = (profiles ?? []).filter((p) => p.role === "va");

  const { data: vaProfileRows } = await supabase
    .from("va_profiles")
    .select("user_id, display_name, payment_method, payment_account")
    .in("user_id", vaProfiles.map((p) => p.id));

  const { data: completedTickets } = await supabase
    .from("tickets")
    .select("assigned_va_id, credit_cost, tip_amount, completed_at, was_hot_when_claimed")
    .eq("status", "completed")
    .not("assigned_va_id", "is", null);
  const { data: adjustments } = await supabase.from("va_adjustments").select("va_id, amount_cents, type");
  const { data: payments } = await supabase.from("va_payments").select("va_id, amount_cents, paid_at");
  const { data: taskTipsRows } = await supabase.from("task_tips").select("va_id, amount");

  const ytdStart = getYtdStart();
  const payInfo: Record<string, string> = {};
  const taskEarnings: Record<string, number> = {};
  const tipsTotal: Record<string, number> = {};
  const paidTotal: Record<string, number> = {};
  const bonusesTotal: Record<string, number> = {};

  (vaProfileRows ?? []).forEach((r) => {
    const method = r.payment_method === "paypal" ? "PayPal" : r.payment_method === "wise" ? "Wise" : "-";
    payInfo[r.user_id] = method && r.payment_account ? method + ": " + r.payment_account : (method !== "-" ? method + " (no account)" : "-");
  });
  vaProfiles.forEach((p) => {
    taskEarnings[p.id] = 0;
    tipsTotal[p.id] = 0;
    paidTotal[p.id] = 0;
    bonusesTotal[p.id] = 0;
  });
  (completedTickets ?? []).forEach((t) => {
    const vaId = t.assigned_va_id!;
    if (taskEarnings[vaId] === undefined) return;
    const rate = t.was_hot_when_claimed ? VA_PAYOUT_RATE * HOT_TASK_PAY_MULTIPLIER : VA_PAYOUT_RATE;
    const dollars = (t.credit_cost ?? 0) * rate + (t.tip_amount ?? 0) / 100;
    if ((t.completed_at ?? "") >= ytdStart) taskEarnings[vaId] += dollars;
  });
  (taskTipsRows ?? []).forEach((r) => {
    tipsTotal[r.va_id] = (tipsTotal[r.va_id] ?? 0) + Number(r.amount);
  });
  (adjustments ?? []).forEach((a) => {
    if (a.type === "bonus") bonusesTotal[a.va_id] = (bonusesTotal[a.va_id] ?? 0) + a.amount_cents / 100;
  });
  (payments ?? []).forEach((p) => {
    paidTotal[p.va_id] = (paidTotal[p.va_id] ?? 0) + p.amount_cents / 100;
  });

  let vaEmails: Record<string, string> = {};
  try {
    const service = createServiceClient();
    const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 });
    vaProfiles.forEach((p) => {
      const u = authUsers?.find((x) => x.id === p.id);
      vaEmails[p.id] = u?.email ?? p.id.slice(0, 8);
    });
  } catch {
    // ignore
  }

  return (
    <>
      <h1 className="page-title">VAs - pay and payout info</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Payment method (Wise / PayPal), account details, and earnings summary. Read-only.
      </p>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>VA (email)</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Display name</th>
              <th style={{ textAlign: "left", padding: "var(--space-sm)" }}>Pay to (Wise / PayPal)</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Task earnings (YTD)</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Tips total</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Bonuses</th>
              <th style={{ textAlign: "right", padding: "var(--space-sm)" }}>Paid out</th>
            </tr>
          </thead>
          <tbody>
            {vaProfiles.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                <td style={{ padding: "var(--space-sm)" }}>{vaEmails[p.id] || p.id.slice(0, 8)}</td>
                <td style={{ padding: "var(--space-sm)" }}>{vaProfileRows?.find((r) => r.user_id === p.id)?.display_name ?? "-"}</td>
                <td style={{ padding: "var(--space-sm)", fontSize: "0.85rem" }}>{payInfo[p.id] ?? "-"}</td>
                <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${(taskEarnings[p.id] ?? 0).toFixed(2)}</td>
                <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${(tipsTotal[p.id] ?? 0).toFixed(2)}</td>
                <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${(bonusesTotal[p.id] ?? 0).toFixed(2)}</td>
                <td style={{ padding: "var(--space-sm)", textAlign: "right" }}>${(paidTotal[p.id] ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {vaProfiles.length === 0 && <p className="form-note" style={{ padding: "var(--space-md)" }}>No VAs yet.</p>}
      </div>
    </>
  );
}
