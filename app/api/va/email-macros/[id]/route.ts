import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null, isAdmin: false, isDirector: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const [
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const isAdmin = !!adminRow;
  const isDirector = !!directorRow;
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const isVa = roleRow?.role === "va";
  if (!isAdmin && !isDirector && !isVa) {
    return { user: null as null, isAdmin: false, isDirector: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, isAdmin, isDirector, isVa: !!isVa, error: null as null };
}

/** PATCH: Update an email macro. Admin/director can edit any; VA can edit only macros they created. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAuth(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("va_email_macros")
    .select("id, created_by")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = auth.isAdmin || auth.isDirector || (auth.isVa && existing.created_by === auth.user!.id);
  if (!canEdit) {
    return NextResponse.json({ error: "You can only edit macros you created" }, { status: 403 });
  }

  let body: { name?: string; body?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { name?: string; body?: string; category?: string | null } = {};
  if (typeof body.name === "string") {
    const t = body.name.trim();
    if (t) updates.name = t;
  }
  if (typeof body.body === "string") {
    const b = body.body.trim();
    if (b) updates.body = b;
  }
  if (body.category !== undefined) {
    updates.category = typeof body.category === "string" ? body.category.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("va_email_macros").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: Delete an email macro. Admin/director can delete any; VA can delete only macros they created. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAuth(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("va_email_macros")
    .select("id, created_by")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete = auth.isAdmin || auth.isDirector || (auth.isVa && existing.created_by === auth.user!.id);
  if (!canDelete) {
    return NextResponse.json({ error: "You can only delete macros you created" }, { status: 403 });
  }

  const { error } = await supabase.from("va_email_macros").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
