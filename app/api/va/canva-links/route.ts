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

/** GET: List all Canva links (VA, admin, director). */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireVaResourceRole(supabase);
  if (auth.error) return auth.error;

  const { data: links, error } = await supabase
    .from("va_canva_links")
    .select("id, url, title, description, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: links ?? [] });
}

/** POST: Add a new Canva link (VA, admin, director). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireVaResourceRole(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body: { url?: string; title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const { data: link, error } = await supabase
    .from("va_canva_links")
    .insert({
      url,
      title: typeof body.title === "string" ? body.title.trim() || null : null,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      created_by: user!.id,
    })
    .select("id, url, title, description, created_by, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(link);
}
