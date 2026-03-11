import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireVaResourceRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const [
    { data: roleRow },
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isVa = role === "va";
  const isAdmin = role === "admin" || !!adminRow;
  const isDirector = role === "director" || !!directorRow;
  if (!isVa && !isAdmin && !isDirector) {
    return { user: null as null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

/** PATCH: Update a Canva link (owner only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireVaResourceRole(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("va_canva_links")
    .select("id, created_by")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.created_by !== user!.id) {
    return NextResponse.json({ error: "Only the link owner can edit it" }, { status: 403 });
  }

  let body: { url?: string; title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { url?: string; title?: string | null; description?: string | null } = {};
  if (typeof body.url === "string") {
    const u = body.url.trim();
    if (u) updates.url = u;
  }
  if (body.title !== undefined) updates.title = typeof body.title === "string" ? body.title.trim() || null : null;
  if (body.description !== undefined) updates.description = typeof body.description === "string" ? body.description.trim() || null : null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("va_canva_links").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: Delete a Canva link (owner only). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireVaResourceRole(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("va_canva_links")
    .select("id, created_by")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.created_by !== user!.id) {
    return NextResponse.json({ error: "Only the link owner can delete it" }, { status: 403 });
  }

  const { error } = await supabase.from("va_canva_links").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
