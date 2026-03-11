import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

async function requireAdminOrDirector(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!adminRow && !directorRow) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { error: null };
}

/** PATCH: Update how-to video (admin, director only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminOrDirector(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { data: existing } = await supabase.from("va_how_to_videos").select("id").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    title?: string;
    description?: string;
    youtube_url?: string;
    task_category?: string | null;
    example_ticket_number?: number | null;
    example_ticket_id?: string | null;
    sort_order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: {
    title?: string;
    description?: string;
    youtube_url?: string;
    task_category?: string | null;
    example_ticket_id?: string | null;
    sort_order?: number;
  } = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t) updates.title = t;
  }
  if (body.description !== undefined) updates.description = typeof body.description === "string" ? body.description.trim() : "";
  if (typeof body.youtube_url === "string") {
    const u = body.youtube_url.trim();
    if (u) {
      if (!getYouTubeEmbedUrl(u)) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      updates.youtube_url = u;
    }
  }
  if (body.task_category !== undefined) updates.task_category = typeof body.task_category === "string" ? body.task_category.trim() || null : null;
  if (body.sort_order !== undefined) updates.sort_order = typeof body.sort_order === "number" ? body.sort_order : 0;

  if (body.example_ticket_id !== undefined || body.example_ticket_number !== undefined) {
    if (body.example_ticket_id !== undefined && (body.example_ticket_id === null || body.example_ticket_id === "")) {
      updates.example_ticket_id = null;
    } else if (typeof body.example_ticket_id === "string" && body.example_ticket_id.trim()) {
      updates.example_ticket_id = body.example_ticket_id.trim();
    } else if (typeof body.example_ticket_number === "number" && body.example_ticket_number > 0) {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("id")
        .eq("ticket_number", body.example_ticket_number)
        .maybeSingle();
      updates.example_ticket_id = ticket?.id ?? null;
    } else {
      updates.example_ticket_id = null;
    }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("va_how_to_videos").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: Delete how-to video (admin, director only). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminOrDirector(supabase);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { data: existing } = await supabase.from("va_how_to_videos").select("id").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("va_how_to_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
