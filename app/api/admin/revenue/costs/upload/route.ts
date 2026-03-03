import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const COST_CATEGORIES = ["va_cost", "tips_payout", "drins_pay", "bonus", "software", "other", "refund"] as const;

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

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const monthDefault = (formData.get("month") as string) || new Date().toISOString().slice(0, 7);
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  const text = await file.text();
  const rows = parseCSV(text);
  const inserted: { name: string; amount: number; category: string; month: string }[] = [];
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = (r.name ?? r["cost name"] ?? "").trim();
    const amount = parseFloat(String(r.amount ?? r.amount_usd ?? "0").replace(/[$,]/g, ""));
    const categoryRaw = (r.category ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    const category = COST_CATEGORIES.includes(categoryRaw as (typeof COST_CATEGORIES)[number]) ? categoryRaw : "other";
    const month = /^\d{4}-\d{2}$/.test(String(r.month ?? "").trim()) ? String(r.month).trim() : monthDefault;
    if (!name || Number.isNaN(amount) || amount < 0) {
      errors.push(`Row ${i + 2}: skip (name/amount invalid)`);
      continue;
    }
    const { error } = await auth.supabase!.from("revenue_costs").insert({
      name,
      amount,
      category,
      month,
      notes: (r.notes ?? "").trim() || null,
      source: "upload",
    });
    if (error) errors.push(`Row ${i + 2}: ${error.message}`);
    else inserted.push({ name, amount, category, month });
  }
  return NextResponse.json({ inserted: inserted.length, errors });
}
