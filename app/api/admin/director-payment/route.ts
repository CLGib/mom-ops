import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKETS = ["five_star", "nps_bonus", "ceo_bonus", "va_onboarded", "ticket_pay", "tips"] as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminRow } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!adminRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { directorId?: string; amountCents?: number; bucket?: string; note?: string; paidAt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const directorId = typeof body.directorId === "string" ? body.directorId.trim() : "";
  const amountCents = typeof body.amountCents === "number" ? body.amountCents : parseInt(String(body.amountCents), 10);
  const bucket = BUCKETS.includes(body.bucket as (typeof BUCKETS)[number]) ? body.bucket : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  let paidAt: string | null = typeof body.paidAt === "string" ? body.paidAt.trim() || null : null;
  if (paidAt) {
    const d = new Date(paidAt);
    if (Number.isNaN(d.getTime())) paidAt = null;
    else paidAt = d.toISOString();
  }

  if (!directorId) return NextResponse.json({ error: "directorId is required" }, { status: 400 });
  if (!bucket) return NextResponse.json({ error: "bucket must be one of: " + BUCKETS.join(", ") }, { status: 400 });
  if (Number.isNaN(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "amountCents must be a positive integer" }, { status: 400 });
  }

  const { data: directorRow } = await supabase.from("directors").select("user_id").eq("user_id", directorId).maybeSingle();
  if (!directorRow) return NextResponse.json({ error: "Invalid director" }, { status: 400 });

  const { error } = await supabase.from("director_payments").insert({
    director_id: directorId,
    amount_cents: amountCents,
    bucket,
    note: note ?? undefined,
    paid_at: paidAt ?? new Date().toISOString(),
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
