import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CfoExpensesUpload from "./CfoExpensesUpload";

export const dynamic = "force-dynamic";

export default async function CfoExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/cfo"));

  return (
    <>
      <h1 className="page-title">Add cost (manual entry)</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Enter a cost: name, amount, category, month (optional), notes (optional). You can attach an image (receipt/screenshot).
        Categories: va_cost, tips_payout, drins_pay, bonus, software, other, refund, stripe_fees.
      </p>
      <div className="card">
        <CfoExpensesUpload />
      </div>
      <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
        <a href="/cfo/revenue" className="link">View revenue dashboard</a> to see costs.
      </p>
    </>
  );
}
