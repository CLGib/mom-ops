import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  return { ok: true, supabase } as const;
}

/** GET: Export revenue costs as CSV. Query param month=YYYY-MM optional. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const month = request.nextUrl.searchParams.get("month") ?? "";
  let query = auth.supabase!.from("revenue_costs").select("id, name, amount, category, month, is_paid, paid_date, notes, source, receipt_url, created_at").order("month", { ascending: false }).order("created_at", { ascending: false });
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    query = query.eq("month", month);
  }
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const header = "name,amount,category,month,is_paid,paid_date,notes,source,receipt_url,created_at\n";
  const lines = (rows ?? []).map(
    (r) =>
      `"${(r.name ?? "").replace(/"/g, '""')}",${r.amount},${r.category},${r.month ?? ""},${r.is_paid},${r.paid_date ?? ""},"${(r.notes ?? "").replace(/"/g, '""')}",${r.source},${r.receipt_url ?? ""},${r.created_at ?? ""}`
  );
  const csv = header + lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenue-costs-${month || "all"}.csv"`,
    },
  });
}
