import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueEmail } from "@/lib/email/queue";

async function requireAdminDirectorOrCfo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [{ data: roleRow }, { data: directorRow }, { data: cfoRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("cfos").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isDirector = role === "director" || !!directorRow;
  const isAdmin = role === "admin";
  const isCfo = role === "cfo" || !!cfoRow;
  if (!isAdmin && !isDirector && !isCfo) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

/** PATCH: Update card (status, owner, title, description). When status -> done, email requestor. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminDirectorOrCfo(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;
  let body: { status?: string; owner_id?: string | null; title?: string; description?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing } = await supabase.from("feature_bug_cards").select("id, status, requestor_email, title, type").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.owner_id !== undefined) updates.owner_id = body.owner_id || null;
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { data: updated, error } = await supabase.from("feature_bug_cards").update(updates).eq("id", id).select("status, requestor_email, title, type").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (updated?.status === "done" && existing.status !== "done" && updated.requestor_email) {
    try {
      await queueEmail({
        to_email: updated.requestor_email,
        template: "feature_bug_done_v1",
        payload: { title: updated.title, type: updated.type },
        dedupe_key: `feature_bug_done:${id}`,
      });
    } catch (e) {
      console.warn("[feature-bug] queueEmail feature_bug_done_v1 failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}

/** DELETE: Remove card (Admin/CXO only). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminDirectorOrCfo(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { error } = await supabase.from("feature_bug_cards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
