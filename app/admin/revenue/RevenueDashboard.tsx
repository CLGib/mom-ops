"use client";

import { useState, useEffect, useCallback } from "react";

const TABS = ["Overview", "Revenue", "Costs", "Payment Status", "Settings"] as const;
const COST_CATEGORY_LABELS: Record<string, string> = {
  va_cost: "VA Cost",
  tips_payout: "Tips Payout",
  drins_pay: "Drin's Pay",
  bonus: "Bonus",
  software: "Software & Tools",
  other: "Other",
  refund: "Refund",
  stripe_fees: "Stripe Fees",
};
const REVENUE_CATEGORY_LABELS: Record<string, string> = {
  new_signup: "New Sign Ups",
  recurring: "Recurring",
  credit_purchase: "Credit Purchases",
  refund: "Refunds",
};

type Summary = {
  month: string;
  revenue: { byCategory: Record<string, number>; total: number };
  costs: { total: number; unpaid: number };
  grossProfit: number;
  profitMargin: number;
  netCash: number;
  ytd: { revenue: number; costs: number; profit: number; refunds: number; bonusesPaid: number };
  chartData: { month: string; totals: Record<string, number> }[];
  costsList: { id: string; name: string; amount: number; category: string; is_paid: boolean; paid_date: string | null; receipt_url?: string | null }[];
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function getMonthOptions(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 24; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default function RevenueDashboard() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [costs, setCosts] = useState<Summary["costsList"]>([]);
  const [transactions, setTransactions] = useState<{ id: string; date: string; customer_email: string | null; description: string | null; category: string; amount_dollars: number; refunded: boolean }[]>([]);
  const [settings, setSettings] = useState<Record<string, number>>({ va_monthly_amount: 0, drins_pay_monthly_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/revenue/summary?month=${month}&refresh=${refreshKey > 0 ? "1" : "0"}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSummary(data);
      setCosts(data.costsList ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load summary");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [month, refreshKey]);

  const fetchTransactions = useCallback(async () => {
    const res = await fetch(`/api/admin/revenue/transactions?month=${month}`);
    if (!res.ok) return;
    const data = await res.json();
    setTransactions(data.transactions ?? []);
  }, [month]);

  const fetchCosts = useCallback(async () => {
    const res = await fetch(`/api/admin/revenue/costs?month=${month}`);
    if (!res.ok) return;
    const data = await res.json();
    setCosts(data.costs ?? []);
  }, [month]);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/revenue/settings");
    if (!res.ok) return;
    const data = await res.json();
    setSettings(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (tab === "Revenue") fetchTransactions();
  }, [tab, month, fetchTransactions]);
  useEffect(() => {
    if (tab === "Costs" || tab === "Payment Status") fetchCosts();
  }, [tab, month, fetchCosts]);
  useEffect(() => {
    if (tab === "Settings") fetchSettings();
  }, [tab, fetchSettings]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    fetchSummary();
    fetchTransactions();
  };

  const handleMarkPaid = async (id: string) => {
    const res = await fetch(`/api/admin/revenue/costs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_paid: true }),
    });
    if (res.ok) fetchSummary();
  };

  if (loading && !summary) {
    return (
      <div>
        <h1 className="page-title">Revenue Dashboard</h1>
        <p className="form-note">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Revenue Dashboard</h1>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2xs)" }}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setTab(t)}
              style={{ fontSize: "0.875rem" }}
            >
              {t}
            </button>
          ))}
        </nav>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <span className="form-note" style={{ margin: 0 }}>Month</span>
          <select
            className="input select"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ width: "auto" }}
          >
            {getMonthOptions().map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
          Refresh Stripe
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-md)" }}>
          {error}
        </p>
      )}

      {tab === "Overview" && summary && (
        <>
          <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
            <h2 className="section-heading">Current month</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "var(--space-md)" }}>
              <div><p className="form-note" style={{ margin: 0 }}>Revenue</p><p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatMoney(summary.revenue.total)}</p></div>
              <div><p className="form-note" style={{ margin: 0 }}>Costs</p><p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatMoney(summary.costs.total)}</p></div>
              <div><p className="form-note" style={{ margin: 0 }}>Gross profit</p><p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatMoney(summary.grossProfit)}</p></div>
              <div><p className="form-note" style={{ margin: 0 }}>Margin</p><p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{summary.profitMargin.toFixed(1)}%</p></div>
              <div><p className="form-note" style={{ margin: 0 }}>Still owed</p><p style={{ fontSize: "1.25rem", fontWeight: 600, color: summary.costs.unpaid > 0 ? "var(--color-error, #b91c1c)" : undefined }}>{formatMoney(summary.costs.unpaid)}</p></div>
              <div><p className="form-note" style={{ margin: 0 }}>Net cash</p><p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatMoney(summary.netCash)}</p></div>
            </div>
          </section>
          <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
            <h2 className="section-heading">Year to date</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)" }}>
              <span>Revenue: {formatMoney(summary.ytd.revenue)}</span>
              <span>Costs: {formatMoney(summary.ytd.costs)}</span>
              <span>Profit: {formatMoney(summary.ytd.profit)}</span>
              <span>Refunds: {formatMoney(summary.ytd.refunds)}</span>
              <span>Bonuses paid: {formatMoney(summary.ytd.bonusesPaid)}</span>
            </div>
          </section>
          <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
            <h2 className="section-heading">Revenue by month (last 12)</h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200 }}>
              {summary.chartData.map(({ month: m, totals }) => {
                const total = totals.new_signup + totals.recurring + totals.credit_purchase + totals.refund;
                const max = Math.max(...summary.chartData.map((d) => d.totals.new_signup + d.totals.recurring + d.totals.credit_purchase + d.totals.refund), 1);
                const h = total > 0 ? (total / max) * 180 : 0;
                return (
                  <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={`${m}: ${formatMoney(total)}`}>
                    <div style={{ width: "100%", maxWidth: 24, height: h, backgroundColor: "var(--accent)", borderRadius: 4 }} />
                    <span style={{ fontSize: "0.65rem", marginTop: 4 }}>{m.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card">
            <h2 className="section-heading">Payment status this month</h2>
            {summary.costsList.length === 0 ? (
              <p className="form-note">No cost entries for this month.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {summary.costsList.map((c) => (
                  <li key={c.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-xs) 0", borderBottom: "1px solid var(--border)" }}>
                    <span>{c.name}</span>
                    <span>{formatMoney(Number(c.amount))}</span>
                    {c.is_paid ? <span style={{ color: "var(--color-success, #15803d)" }}>✓ Paid{c.paid_date ? ` ${c.paid_date}` : ""}</span> : (
                      <button type="button" className="btn btn-primary" style={{ fontSize: "0.8rem" }} onClick={() => handleMarkPaid(c.id)}>Mark as paid</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === "Revenue" && (
        <>
          {summary && (
            <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
              <h2 className="section-heading">Revenue by category</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                {Object.entries(summary.revenue.byCategory).map(([k, v]) => (
                  <div key={k} style={{ padding: "var(--space-sm)", background: "var(--bg-alt)", borderRadius: 8 }}>
                    <span className="form-note">{REVENUE_CATEGORY_LABELS[k] ?? k}</span>
                    <p style={{ margin: 0, fontWeight: 600 }}>{formatMoney(v)}</p>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}><strong>Total revenue</strong> {formatMoney(summary.revenue.total)}</p>
            </section>
          )}
          <section className="card">
            <h2 className="section-heading">Transactions</h2>
            {transactions.length === 0 ? (
              <p className="form-note">No transactions for this month (or Stripe not configured).</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "var(--space-xs)" }}>Date</th>
                      <th style={{ textAlign: "left", padding: "var(--space-xs)" }}>Customer</th>
                      <th style={{ textAlign: "left", padding: "var(--space-xs)" }}>Category</th>
                      <th style={{ textAlign: "right", padding: "var(--space-xs)" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ padding: "var(--space-xs)" }}>{t.date}</td>
                        <td style={{ padding: "var(--space-xs)" }}>{t.customer_email ?? "—"}</td>
                        <td style={{ padding: "var(--space-xs)" }}>{REVENUE_CATEGORY_LABELS[t.category] ?? t.category}{t.refunded ? " (refund)" : ""}</td>
                        <td style={{ textAlign: "right", padding: "var(--space-xs)" }}>{formatMoney(t.amount_dollars)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === "Costs" && (
        <CostsTab month={month} costs={costs} onSaved={fetchCosts} onRefreshSummary={fetchSummary} />
      )}

      {tab === "Payment Status" && summary && (
        <section className="card">
          <h2 className="section-heading">Payment status — {month}</h2>
          {summary.costsList.length === 0 ? (
            <p className="form-note">No cost entries.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {summary.costsList.map((c) => (
                <li key={c.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0", borderBottom: "1px solid var(--border)" }}>
                  <span><strong>{c.name}</strong> ({COST_CATEGORY_LABELS[c.category] ?? c.category})</span>
                  <span>{formatMoney(Number(c.amount))}</span>
                  {c.is_paid ? <span style={{ color: "var(--color-success, #15803d)" }}>✓ Paid {c.paid_date ?? ""}</span> : (
                    <button type="button" className="btn btn-primary" onClick={() => handleMarkPaid(c.id)}>Mark as paid</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "Settings" && (
        <SettingsTab settings={settings} onSaved={fetchSettings} />
      )}
    </div>
  );
}

function CostsTab({
  month,
  costs,
  onSaved,
  onRefreshSummary,
}: {
  month: string;
  costs: Summary["costsList"];
  onSaved: () => void;
  onRefreshSummary: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [costMonth, setCostMonth] = useState(month);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setCostMonth(month);
  }, [month]);
  const [isPaid, setIsPaid] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || Number.isNaN(amt) || amt < 0) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("amount", String(amt));
      form.append("category", category);
      form.append("month", costMonth || new Date().toISOString().slice(0, 7));
      if (notes.trim()) form.append("notes", notes.trim());
      form.append("is_paid", isPaid ? "true" : "false");
      if (imageFile) form.append("image", imageFile);
      const res = await fetch("/api/admin/revenue/costs", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? await res.text());
      setName("");
      setAmount("");
      setNotes("");
      setIsPaid(false);
      setImageFile(null);
      onSaved();
      onRefreshSummary();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add cost");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cost entry?")) return;
    const res = await fetch(`/api/admin/revenue/costs/${id}`, { method: "DELETE" });
    if (res.ok) {
      onSaved();
      onRefreshSummary();
    }
  };

  return (
    <>
      <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="section-heading">Add cost (manual entry)</h2>
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Name, amount, category, month (optional), notes (optional). Categories: va_cost, tips_payout, drins_pay, bonus, software, other, refund, stripe_fees. Optional: attach an image (receipt/screenshot).
        </p>
        <form onSubmit={handleAdd} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "flex-end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="cost-name">Name</label>
            <input id="cost-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="cost-amount">Amount ($)</label>
            <input id="cost-amount" type="number" step="0.01" min="0" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="cost-category">Category</label>
            <select id="cost-category" className="input select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(COST_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="cost-month">Month (optional)</label>
            <input id="cost-month" type="month" className="input" value={costMonth} onChange={(e) => setCostMonth(e.target.value)} style={{ width: "auto" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="cost-notes">Notes (optional)</label>
            <input id="cost-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="cost-image">Image (optional)</label>
            <input id="cost-image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            {imageFile && <span className="form-note">{imageFile.name}</span>}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
            <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
            <span>Mark as paid</span>
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Add cost"}</button>
        </form>
      </section>
      <section className="card">
        <h2 className="section-heading">Costs for {month}</h2>
        {costs.length === 0 ? (
          <p className="form-note">No costs this month.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {costs.map((c) => (
              <li key={c.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-xs) 0", borderBottom: "1px solid var(--border)" }}>
                <span>{c.name}</span>
                <span>{formatMoney(Number(c.amount))}</span>
                <span className="form-note">{COST_CATEGORY_LABELS[c.category] ?? c.category}</span>
                {c.is_paid && <span style={{ color: "var(--color-success, #15803d)" }}>Paid</span>}
                {c.receipt_url && (
                  <a href={c.receipt_url} target="_blank" rel="noopener noreferrer" className="link" style={{ fontSize: "0.8rem" }}>Receipt</a>
                )}
                <button type="button" className="btn btn-secondary" style={{ fontSize: "0.8rem" }} onClick={() => handleDelete(c.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function SettingsTab({ settings, onSaved }: { settings: Record<string, number>; onSaved: () => void }) {
  const [vaAmount, setVaAmount] = useState(String(settings.va_monthly_amount ?? 0));
  const [drinsAmount, setDrinsAmount] = useState(String(settings.drins_pay_monthly_amount ?? 0));
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/revenue/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          va_monthly_amount: parseFloat(vaAmount) || 0,
          drins_pay_monthly_amount: parseFloat(drinsAmount) || 0,
        }),
      });
      if (res.ok) onSaved();
    } finally {
      setSaving(false);
    }
  };

  const csvTemplate = "name,amount,category,month,notes\nVA Cost,500,va_cost,2025-02,\nSoftware,29,software,2025-02,Subscription";

  return (
    <section className="card">
      <h2 className="section-heading">Preset amounts</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>Default monthly amounts for VA Cost and Drin&apos;s Pay (used when auto-creating preset rows). Add costs on the Costs tab (manual entry + optional image).</p>
      <form onSubmit={handleSave} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "flex-end" }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="va-monthly">VA monthly amount ($)</label>
          <input id="va-monthly" type="number" step="0.01" min="0" className="input" value={vaAmount} onChange={(e) => setVaAmount(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="drins-monthly">Drin&apos;s pay monthly ($)</label>
          <input id="drins-monthly" type="number" step="0.01" min="0" className="input" value={drinsAmount} onChange={(e) => setDrinsAmount(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>
      <h3 style={{ marginTop: "var(--space-lg)", marginBottom: "var(--space-xs)" }}>Export format</h3>
      <p className="form-note" style={{ marginBottom: "var(--space-xs)" }}>Export uses CSV. Add costs via the manual entry form (and optional image) on the Costs tab.</p>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}
        download="revenue-costs-template.csv"
        className="btn btn-secondary"
        style={{ display: "inline-block" }}
      >
        Download template
      </a>
    </section>
  );
}
