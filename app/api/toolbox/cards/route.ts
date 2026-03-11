import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireToolboxRole(supabase: Awaited<ReturnType<typeof createClient>>) {
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

/** GET: List all VA Toolbox cards (VA, admin, director). */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;

  const { data: cards, error } = await supabase
    .from("va_toolbox_cards")
    .select("id, title, prompt, suggested_ai, how_to_use, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: cards ?? [] });
}

/** POST: Create a new VA Toolbox card (VA, admin, director). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body: { title?: string; prompt?: string; suggested_ai?: string; how_to_use?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!title || !prompt) {
    return NextResponse.json({ error: "title and prompt are required" }, { status: 400 });
  }

  const { data: card, error } = await supabase
    .from("va_toolbox_cards")
    .insert({
      title,
      prompt,
      suggested_ai: typeof body.suggested_ai === "string" ? body.suggested_ai.trim() || null : null,
      how_to_use: typeof body.how_to_use === "string" ? body.how_to_use.trim() || null : null,
      created_by: user!.id,
    })
    .select("id, title, prompt, suggested_ai, how_to_use, created_by, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(card);
}
