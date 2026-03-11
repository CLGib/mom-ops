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
  return { error: null as null };
}

const FIELD_TYPES = ["text", "number", "date", "multiline"] as const;

/** PATCH: Update a custom field definition. */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  let body: { key?: string; label?: string; field_type?: string; sort_order?: number; active?: boolean };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.key === "string") {
    const key = body.key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (key) updates.key = key;
  }
  if (typeof body.label === "string") updates.label = body.label.trim();
  if (typeof body.field_type === "string" && FIELD_TYPES.includes(body.field_type as (typeof FIELD_TYPES)[number])) {
    updates.field_type = body.field_type;
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    updates.sort_order = body.sort_order;
  }
  if (typeof body.active === "boolean") updates.active = body.active;

  const { data: row, error } = await supabase
    .from("member_profile_custom_field_definitions")
    .update(updates)
    .eq("id", id)
    .select("id, key, label, field_type, sort_order, active, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ field: row });
}

/** DELETE: Remove a custom field definition. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  const { error } = await supabase.from("member_profile_custom_field_definitions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
