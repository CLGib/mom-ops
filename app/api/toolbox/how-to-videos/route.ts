import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

async function requireToolboxRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null, isAdminOrDirector: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

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
    return { user: null as null, isAdminOrDirector: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, isAdminOrDirector: isAdmin || isDirector, error: null };
}

export type HowToVideoRow = {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  task_category: string | null;
  example_ticket_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  example_ticket_number?: number | null;
};

/** GET: List how-to videos (VA, admin, director). Includes example_ticket_number when set. */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;

  const { data: rows, error } = await supabase
    .from("va_how_to_videos")
    .select("id, title, description, youtube_url, task_category, example_ticket_id, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const videos = (rows ?? []) as HowToVideoRow[];
  const ticketIds = [...new Set(videos.map((v) => v.example_ticket_id).filter(Boolean))] as string[];
  let ticketNumbers: Record<string, number> = {};
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, ticket_number")
      .in("id", ticketIds);
    for (const t of tickets ?? []) {
      ticketNumbers[t.id] = t.ticket_number ?? 0;
    }
  }
  const withNumbers = videos.map((v) => ({
    ...v,
    example_ticket_number: v.example_ticket_id ? ticketNumbers[v.example_ticket_id] ?? null : null,
  }));

  return NextResponse.json({ videos: withNumbers });
}

/** POST: Create how-to video (admin, director only). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;
  if (!auth.isAdminOrDirector) {
    return NextResponse.json({ error: "Only admin or director can add how-to videos" }, { status: 403 });
  }

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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const youtubeUrl = typeof body.youtube_url === "string" ? body.youtube_url.trim() : "";
  if (!title || !youtubeUrl) {
    return NextResponse.json({ error: "title and youtube_url are required" }, { status: 400 });
  }
  if (!getYouTubeEmbedUrl(youtubeUrl)) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  let exampleTicketId: string | null = null;
  if (body.example_ticket_id && typeof body.example_ticket_id === "string") {
    exampleTicketId = body.example_ticket_id.trim() || null;
  } else if (typeof body.example_ticket_number === "number" && body.example_ticket_number > 0) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_number", body.example_ticket_number)
      .maybeSingle();
    exampleTicketId = ticket?.id ?? null;
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  const taskCategory = typeof body.task_category === "string" ? body.task_category.trim() || null : null;
  const sortOrder = typeof body.sort_order === "number" ? body.sort_order : 0;

  const { data: video, error } = await supabase
    .from("va_how_to_videos")
    .insert({ title, description, youtube_url: youtubeUrl, task_category: taskCategory, example_ticket_id: exampleTicketId, sort_order: sortOrder })
    .select("id, title, description, youtube_url, task_category, example_ticket_id, sort_order, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let example_ticket_number: number | null = null;
  if (video.example_ticket_id) {
    const { data: t } = await supabase.from("tickets").select("ticket_number").eq("id", video.example_ticket_id).single();
    example_ticket_number = t?.ticket_number ?? null;
  }
  return NextResponse.json({ ...video, example_ticket_number });
}
