import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStripeRevenue,
  aggregateByCategory,
  monthlyTotals,
  clearRevenueCache,
  type RevenueCategory,
} from "@/lib/revenue/stripe";

async function requireAdminOrDirectorOrCfo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [{ data: roleRow }, { data: directorRow }, { data: cfoRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("cfos").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isDirector = role === "director" || !!directorRow;
  const isAdmin = role === "admin";
  const isCfo = role === "cfo" || !!cfoRow;
  if (!isAdmin && !isDirector && !isCfo) return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true, supabase, user } as const;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const refresh = searchParams.get("refresh") === "1";

  let stripeTransactions: Awaited<ReturnType<typeof getStripeRevenue>>["transactions"] = [];
  try {
    const { transactions } = await getStripeRevenue({ refresh });
    stripeTransactions = transactions;
  } catch (e) {
    console.warn("[revenue/summary] Stripe fetch failed", e);
    // Continue with empty revenue; costs still work
  }

  const byCategory = aggregateByCategory(stripeTransactions, month);
  const totalRevenue =
    byCategory.new_signup + byCategory.recurring + byCategory.credit_purchase + byCategory.refund;
  const monthly = monthlyTotals(stripeTransactions);

  const { data: costs } = await auth.supabase!
    .from("revenue_costs")
    .select("id, name, amount, category, is_paid, paid_date, source, receipt_url")
    .eq("month", month);

  const totalCosts = (costs ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const unpaid = (costs ?? []).filter((c) => !c.is_paid).reduce((s, c) => s + Number(c.amount), 0);
  const grossProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netCash = grossProfit - unpaid;

  const currentYear = new Date().getFullYear().toString();
  const ytdMonths = monthly.filter((m) => m.month.startsWith(currentYear));
  const ytdRevenue = ytdMonths.reduce(
    (s, m) =>
      s +
      m.totals.new_signup +
      m.totals.recurring +
      m.totals.credit_purchase +
      m.totals.refund,
    0
  );
  const { data: ytdCostsRows } = await auth.supabase!
    .from("revenue_costs")
    .select("amount, category")
    .gte("month", `${currentYear}-01`)
    .lte("month", month);
  const ytdCosts = (ytdCostsRows ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const ytdRefunds = ytdMonths.reduce((s, m) => s + m.totals.refund, 0);
  const ytdBonuses = (ytdCostsRows ?? []).filter((c) => c.category === "bonus").reduce((s, c) => s + Number(c.amount), 0);

  return NextResponse.json({
    month,
    revenue: {
      byCategory: byCategory as Record<RevenueCategory, number>,
      total: totalRevenue,
    },
    costs: { total: totalCosts, unpaid },
    grossProfit,
    profitMargin,
    netCash,
    ytd: { revenue: ytdRevenue, costs: ytdCosts, profit: ytdRevenue - ytdCosts, refunds: ytdRefunds, bonusesPaid: ytdBonuses },
    chartData: monthly,
    costsList: costs ?? [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const body = await request.json().catch(() => ({}));
  if (body.refresh === true) {
    clearRevenueCache();
    return NextResponse.json({ ok: true, message: "Cache cleared" });
  }
  return NextResponse.json({ error: "Invalid body" }, { status: 400 });
}
