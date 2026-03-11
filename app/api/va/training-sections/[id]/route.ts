import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdminOrDirector(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const [
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!adminRow && !directorRow) {
    return { user: null as null, error: NextResponse.json({ error: "Only admin or director can edit training sections" }, { status: 403 }) };
  }
  return { user, error: null as null };
}

/** PATCH: Update a training section (admin, director only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminOrDirector(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("va_training_sections")
    .select("id")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { title?: string; content?: string; sort_order?: number; video_url?: string; video_url_2?: string; image_urls?: string; pdf_urls?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { title?: string; content?: string; sort_order?: number; video_url?: string | null; video_url_2?: string | null; image_urls?: string | null; pdf_urls?: string | null } = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t) updates.title = t;
  }
  if (typeof body.content === "string") {
    updates.content = body.content;
  }
  if (typeof body.sort_order === "number" && !Number.isNaN(body.sort_order)) {
    updates.sort_order = body.sort_order;
  }
  if (body.video_url !== undefined) {
    updates.video_url = typeof body.video_url === "string" ? body.video_url.trim() || null : null;
  }
  if (body.video_url_2 !== undefined) {
    updates.video_url_2 = typeof body.video_url_2 === "string" ? body.video_url_2.trim() || null : null;
  }
  if (body.image_urls !== undefined) {
    updates.image_urls = typeof body.image_urls === "string" ? body.image_urls.trim() || null : null;
  }
  if (body.pdf_urls !== undefined) {
    updates.pdf_urls = typeof body.pdf_urls === "string" ? body.pdf_urls.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("va_training_sections").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: Delete a training section (admin, director only). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminOrDirector(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("va_training_sections")
    .select("id")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("va_training_sections").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
