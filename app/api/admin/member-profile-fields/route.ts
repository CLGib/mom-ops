import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleRow?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 }) };
  }
  return { user, error: null as null };
}

const FIELD_TYPES = ["text", "number", "date", "multiline"] as const;

/** GET: List all custom field definitions (active first, then by sort_order). */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  const { data: rows, error } = await supabase
    .from("member_profile_custom_field_definitions")
    .select("id, key, label, field_type, sort_order, active, created_at, updated_at")
    .order("active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: rows ?? [] });
}

/** POST: Create a new custom field definition. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  let body: { key?: string; label?: string; field_type?: string; sort_order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const fieldType = typeof body.field_type === "string" && FIELD_TYPES.includes(body.field_type as (typeof FIELD_TYPES)[number]) ? body.field_type : "text";
  const sortOrder = typeof body.sort_order === "number" && Number.isFinite(body.sort_order) ? body.sort_order : 0;

  if (!key || !label) {
    return NextResponse.json({ error: "key and label are required" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("member_profile_custom_field_definitions")
    .insert({ key, label, field_type: fieldType, sort_order: sortOrder, active: true })
    .select("id, key, label, field_type, sort_order, active, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ field: row });
}
