import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdminOrDirector() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [{ data: roleRow }, { data: directorRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isDirector = role === "director" || !!directorRow;
  const isAdmin = role === "admin";
  if (!isAdmin && !isDirector) return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true, supabase } as const;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDirector();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  let body: { name?: string; amount?: number; category?: string; month?: string; notes?: string; is_paid?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.amount === "number" && body.amount >= 0) updates.amount = body.amount;
  if (typeof body.category === "string") updates.category = body.category;
  if (typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month)) updates.month = body.month;
  if (Object.hasOwn(body, "notes")) updates.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  if (typeof body.is_paid === "boolean") {
    updates.is_paid = body.is_paid;
    updates.paid_date = body.is_paid ? new Date().toISOString().slice(0, 10) : null;
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  const { data, error } = await auth.supabase!
    .from("revenue_costs")
    .update(updates)
    .eq("id", id)
    .select("id, name, amount, category, month, is_paid, paid_date, notes, source, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cost: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDirector();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const { error } = await auth.supabase!.from("revenue_costs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
