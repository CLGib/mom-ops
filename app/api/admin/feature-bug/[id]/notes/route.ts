import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

/** GET: List notes for a card. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminDirectorOrCfo(supabase);
  if (auth.error) return auth.error;

  const { id: cardId } = await params;
  const { data: notes, error } = await supabase
    .from("feature_bug_notes")
    .select("id, author_id, note_text, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: notes ?? [] });
}

/** POST: Add a note. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireAdminDirectorOrCfo(supabase);
  if (auth.error) return auth.error;
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cardId } = await params;
  let body: { note_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const noteText = typeof body.note_text === "string" ? body.note_text.trim() : "";
  if (!noteText) return NextResponse.json({ error: "note_text required" }, { status: 400 });

  const { data: note, error } = await supabase
    .from("feature_bug_notes")
    .insert({ card_id: cardId, author_id: auth.user.id, note_text: noteText })
    .select("id, note_text, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note });
}
