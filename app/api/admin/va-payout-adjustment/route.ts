import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { vaId?: string; amountCents?: number; type?: "debit" | "bonus"; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const vaId = typeof body.vaId === "string" ? body.vaId.trim() : "";
  const amountCents = typeof body.amountCents === "number" ? body.amountCents : parseInt(String(body.amountCents), 10);
  const type = body.type === "debit" || body.type === "bonus" ? body.type : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  if (!vaId) {
    return NextResponse.json({ error: "vaId is required" }, { status: 400 });
  }
  if (Number.isNaN(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "amountCents must be a positive integer" }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: "type must be 'debit' or 'bonus'" }, { status: 400 });
  }

  const { error } = await supabase.from("va_adjustments").insert({
    va_id: vaId,
    amount_cents: amountCents,
    type,
    note: note ?? undefined,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
