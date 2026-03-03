import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const COST_CATEGORIES = ["va_cost", "tips_payout", "drins_pay", "bonus", "software", "other", "refund", "stripe_fees"] as const;
const BUCKET = "revenue-cost-receipts";

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
  return { ok: true, supabase, user } as const;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const { data, error } = await auth.supabase!
    .from("revenue_costs")
    .select("id, name, amount, category, month, is_paid, paid_date, notes, source, receipt_url, created_at")
    .eq("month", month)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ costs: data ?? [] });
}

function parseAmount(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return parseFloat(String(v ?? ""));
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const contentType = request.headers.get("content-type") ?? "";
  let name = "";
  let amount = 0;
  let category = "other";
  let month: string | null = new Date().toISOString().slice(0, 7);
  let notes: string | null = null;
  let isPaid = false;
  let receiptUrl: string | null = null;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    name = (formData.get("name") as string)?.trim() ?? "";
    amount = parseAmount(formData.get("amount"));
    const catRaw = (formData.get("category") as string)?.trim() ?? "";
    category = COST_CATEGORIES.includes(catRaw as (typeof COST_CATEGORIES)[number]) ? catRaw : "other";
    const monthVal = (formData.get("month") as string)?.trim();
    month = monthVal && /^\d{4}-\d{2}$/.test(monthVal) ? monthVal : new Date().toISOString().slice(0, 7);
    const notesVal = (formData.get("notes") as string)?.trim();
    notes = notesVal || null;
    isPaid = formData.get("is_paid") === "true" || formData.get("is_paid") === "1";
    file = (formData.get("image") as File) ?? (formData.get("file") as File) ?? null;
  } else {
    let body: { name?: string; amount?: number; category?: string; month?: string; notes?: string; is_paid?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    name = typeof body.name === "string" ? body.name.trim() : "";
    amount = typeof body.amount === "number" ? body.amount : parseAmount(body.amount);
    category = COST_CATEGORIES.includes(body.category as (typeof COST_CATEGORIES)[number]) ? (body.category as string) : "other";
    month = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : new Date().toISOString().slice(0, 7);
    notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    isPaid = body.is_paid === true;
  }

  if (!name || Number.isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: "name and amount (>= 0) required" }, { status: 400 });
  }

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
    const path = `${auth.user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
    const { error: upErr } = await auth.supabase!.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: `Image upload failed: ${upErr.message}` }, { status: 500 });
    const { data: urlData } = auth.supabase!.storage.from(BUCKET).getPublicUrl(path);
    receiptUrl = urlData.publicUrl;
  }

  const monthVal = month ?? new Date().toISOString().slice(0, 7);
  const { data, error } = await auth.supabase!.from("revenue_costs").insert({
    name,
    amount,
    category,
    month: monthVal,
    notes,
    is_paid: isPaid,
    paid_date: isPaid ? new Date().toISOString().slice(0, 10) : null,
    source: "manual",
    receipt_url: receiptUrl,
  }).select("id, name, amount, category, month, is_paid, paid_date, notes, source, receipt_url, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cost: data });
}
