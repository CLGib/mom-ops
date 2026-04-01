import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user, error: null as null };
}

/** PATCH: Update a landing real example (admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("landing_real_examples")
    .select("id")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    title?: string;
    requestText?: string;
    deliverableImages?: string[] | null;
    deliverablePdf?: string | null;
    caption?: string | null;
    thumbnailUrl?: string | null;
    sortOrder?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: {
    title?: string;
    request_text?: string;
    deliverable_images?: string[] | null;
    deliverable_pdf?: string | null;
    caption?: string | null;
    thumbnail_url?: string | null;
    sort_order?: number;
  } = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t) updates.title = t;
  }
  if (typeof body.requestText === "string") updates.request_text = body.requestText.trim();
  if (body.deliverableImages !== undefined) {
    if (Array.isArray(body.deliverableImages) && body.deliverableImages.length > 0) {
      updates.deliverable_images = body.deliverableImages.filter((u): u is string => typeof u === "string" && u.trim() !== "").slice(0, 5);
      updates.deliverable_pdf = null;
    } else {
      updates.deliverable_images = null;
    }
  }
  if (body.deliverablePdf !== undefined) {
    const pdf = typeof body.deliverablePdf === "string" && body.deliverablePdf.trim() !== "" ? body.deliverablePdf.trim() : null;
    updates.deliverable_pdf = pdf;
    if (pdf && updates.deliverable_images === undefined) {
      const { data: cur } = await supabase.from("landing_real_examples").select("deliverable_images").eq("id", id).single();
      if (cur?.deliverable_images) updates.deliverable_images = null;
    }
  }
  if (body.caption !== undefined) updates.caption = typeof body.caption === "string" ? body.caption.trim() || null : null;
  if (body.thumbnailUrl !== undefined) updates.thumbnail_url = typeof body.thumbnailUrl === "string" ? body.thumbnailUrl.trim() || null : null;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) updates.sort_order = body.sortOrder;

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("landing_real_examples").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: Delete a landing real example (admin only). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("landing_real_examples")
    .select("id")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("landing_real_examples").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
