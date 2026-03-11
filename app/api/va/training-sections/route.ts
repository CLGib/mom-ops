import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireVaOrAdminOrDirector(supabase: Awaited<ReturnType<typeof createClient>>) {
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
  return { user, isAdmin, isDirector, error: null as null };
}

/** GET: List all training sections (VA, admin, director). */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireVaOrAdminOrDirector(supabase);
  if (auth.error) return auth.error;

  const { data: sections, error } = await supabase
    .from("va_training_sections")
    .select("id, title, content, sort_order, video_url, video_url_2, image_urls, pdf_urls, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: sections ?? [] });
}

/** POST: Create a new training section (admin, director only). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireVaOrAdminOrDirector(supabase);
  if (auth.error) return auth.error;
  if (!auth.isAdmin && !auth.isDirector) {
    return NextResponse.json({ error: "Only admin or director can create training sections" }, { status: 403 });
  }

  let body: { title?: string; content?: string; sort_order?: number; video_url?: string; video_url_2?: string; image_urls?: string; pdf_urls?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content : "";
  const sortOrder = typeof body.sort_order === "number" && !Number.isNaN(body.sort_order) ? body.sort_order : 0;
  const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() || null : null;
  const videoUrl2 = typeof body.video_url_2 === "string" ? body.video_url_2.trim() || null : null;
  const imageUrls = typeof body.image_urls === "string" ? body.image_urls.trim() || null : null;
  const pdfUrls = typeof body.pdf_urls === "string" ? body.pdf_urls.trim() || null : null;

  const { data: section, error } = await supabase
    .from("va_training_sections")
    .insert({ title, content, sort_order: sortOrder, video_url: videoUrl, video_url_2: videoUrl2, image_urls: imageUrls, pdf_urls: pdfUrls })
    .select("id, title, content, sort_order, video_url, video_url_2, image_urls, pdf_urls, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(section);
}
