import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SETTING_KEYS = ["va_monthly_amount", "drins_pay_monthly_amount"] as const;

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
  return { ok: true, supabase, isAdmin, isDirector } as const;
}

/** GET: Read settings */
export async function GET() {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  const { data: rows, error } = await auth.supabase!
    .from("revenue_dashboard_settings")
    .select("key, value_json");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const settings: Record<string, number> = {};
  for (const key of SETTING_KEYS) {
    settings[key] = 0;
  }
  for (const row of rows ?? []) {
    const val = parseFloat(row.value_json);
    if (!Number.isNaN(val)) settings[row.key] = val;
  }
  return NextResponse.json(settings);
}

/** PUT: Update settings (CEO/CXO only; CFO read-only) */
export async function PUT(request: NextRequest) {
  const auth = await requireAdminOrDirectorOrCfo();
  if (!auth.ok) return auth.res;
  if (!auth.isAdmin && !auth.isDirector) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, number>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  for (const key of SETTING_KEYS) {
    const val = body[key];
    if (typeof val !== "number" || val < 0) continue;
    await auth.supabase!
      .from("revenue_dashboard_settings")
      .upsert({ key, value_json: String(val), updated_at: new Date().toISOString() }, { onConflict: "key" });
  }
  const { data: rows } = await auth.supabase!
    .from("revenue_dashboard_settings")
    .select("key, value_json");
  const settings: Record<string, number> = {};
  for (const k of SETTING_KEYS) settings[k] = 0;
  for (const row of rows ?? []) {
    const val = parseFloat(row.value_json);
    if (!Number.isNaN(val)) settings[row.key] = val;
  }
  return NextResponse.json(settings);
}
