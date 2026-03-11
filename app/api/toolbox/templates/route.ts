import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "va-toolbox-templates";

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

/** GET: List all VA Toolbox templates with author names. */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;

  const { data: templates, error } = await supabase
    .from("va_toolbox_templates")
    .select("id, title, description, file_path, file_name, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((templates ?? []).map((t) => t.created_by))];
  const authorMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, preferred_name, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      const name = p.preferred_name?.trim() || p.full_name?.trim() || "Unknown";
      authorMap[p.id] = name;
    }
  }

  const list = (templates ?? []).map((t) => ({
    ...t,
    author: authorMap[t.created_by] ?? "Unknown",
  }));

  return NextResponse.json({ templates: list });
}

/** POST: Create a new template (client uploads file to storage first, then sends path + metadata). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body: { title?: string; description?: string; file_path?: string; file_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const file_path = typeof body.file_path === "string" ? body.file_path.trim() : "";
  const file_name = typeof body.file_name === "string" ? body.file_name.trim() : "";
  if (!title || !file_path || !file_name) {
    return NextResponse.json({ error: "title, file_path, and file_name are required" }, { status: 400 });
  }
  if (!file_path.startsWith(`${user!.id}/`)) {
    return NextResponse.json({ error: "file_path must be under your user folder" }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim() || null : null;

  const { data: template, error } = await supabase
    .from("va_toolbox_templates")
    .insert({
      title,
      description,
      file_path,
      file_name,
      created_by: user!.id,
    })
    .select("id, title, description, file_path, file_name, created_by, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(template);
}
