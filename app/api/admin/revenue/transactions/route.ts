import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeRevenue } from "@/lib/revenue/stripe";

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
  const isCfo = role === "cfo" || !!cfoRow;
  const isDirector = role === "director" || !!directorRow;
  const isAdmin = role === "admin";
  if (!isAdmin && !isDirector && !isCfo) return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  try {
    const { transactions } = await getStripeRevenue({ month: month ?? undefined, refresh });
    let list = transactions
      .filter((t) => t.category !== "refund" || t.amount_dollars < 0)
      .map((t) => ({
        id: t.id,
        date: new Date(t.created * 1000).toISOString().slice(0, 10),
        created: t.created,
        customer_email: t.customer_email,
        description: t.description,
        category: t.category,
        amount_dollars: t.amount_dollars - t.refund_amount_cents / 100,
        refunded: t.refunded,
      }));
    if (month) {
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1).getTime() / 1000;
      const end = new Date(y, m, 0, 23, 59, 59).getTime() / 1000;
      list = list.filter((t) => t.created >= start && t.created <= end);
    }
    if (category) list = list.filter((t) => t.category === category);
    list.sort((a, b) => b.created - a.created);
    return NextResponse.json({ transactions: list });
  } catch (e) {
    console.warn("[revenue/transactions]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch" }, { status: 500 });
  }
}
