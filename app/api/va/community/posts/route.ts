import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function requireVa(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "va") {
    return { user: null as null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

/**
 * GET /api/va/community/posts?page=1&limit=20&q=...&author_id=...&ticket_id=...
 * List posts with search and pagination. Returns { posts, total, page, limit }.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireVa(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));
  const q = (request.nextUrl.searchParams.get("q") ?? request.nextUrl.searchParams.get("search") ?? "").trim();
  const authorId = request.nextUrl.searchParams.get("author_id") ?? undefined;
  const ticketId = request.nextUrl.searchParams.get("ticket_id") ?? undefined;

  let query = supabase
    .from("va_community_posts")
    .select("id, author_id, title, body, ticket_id, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (authorId) query = query.eq("author_id", authorId);
  if (ticketId) query = query.eq("ticket_id", ticketId);
  if (q) {
    const escaped = escapeIlike(q).replace(/'/g, "''");
    const pattern = `%${escaped}%`;
    query = query.or(`title.ilike.'${pattern}',body.ilike.'${pattern}'`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data: rows, count: total, error } = await query.range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = (rows ?? []) as Array<{
    id: string;
    author_id: string;
    title: string | null;
    body: string;
    ticket_id: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const ticketIds = [...new Set(posts.map((p) => p.ticket_id).filter(Boolean))] as string[];
  const postIds = posts.map((p) => p.id);

  const [profilesRes, ticketsRes, likesCountRes, commentsCountRes, userLikesRes] = await Promise.all([
    authorIds.length > 0
      ? supabase.from("va_profiles").select("user_id, display_name").in("user_id", authorIds)
      : Promise.resolve({ data: [] as { user_id: string; display_name: string | null }[] }),
    ticketIds.length > 0
      ? supabase.from("tickets").select("id, ticket_number").in("id", ticketIds)
      : Promise.resolve({ data: [] as { id: string; ticket_number: number | null }[] }),
    postIds.length > 0
      ? supabase.from("va_community_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    postIds.length > 0
      ? supabase.from("va_community_comments").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    postIds.length > 0
      ? supabase.from("va_community_likes").select("post_id").eq("va_id", user!.id).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const displayByAuthor: Record<string, string> = {};
  for (const r of profilesRes.data ?? []) {
    displayByAuthor[r.user_id] = r.display_name?.trim() || "VA";
  }
  const ticketNumberById: Record<string, number> = {};
  for (const t of ticketsRes.data ?? []) {
    if (t.ticket_number != null) ticketNumberById[t.id] = t.ticket_number;
  }
  const likeCountByPost: Record<string, number> = {};
  for (const l of likesCountRes.data ?? []) {
    likeCountByPost[l.post_id] = (likeCountByPost[l.post_id] ?? 0) + 1;
  }
  const commentCountByPost: Record<string, number> = {};
  for (const c of commentsCountRes.data ?? []) {
    commentCountByPost[c.post_id] = (commentCountByPost[c.post_id] ?? 0) + 1;
  }
  const userLikedSet = new Set((userLikesRes.data ?? []).map((l) => l.post_id));

  const result = posts.map((p) => ({
    ...p,
    author_display_name: displayByAuthor[p.author_id] ?? "VA",
    ticket_number: p.ticket_id ? ticketNumberById[p.ticket_id] ?? null : null,
    like_count: likeCountByPost[p.id] ?? 0,
    comment_count: commentCountByPost[p.id] ?? 0,
    liked: userLikedSet.has(p.id),
  }));

  return NextResponse.json({
    posts: result,
    total: total ?? 0,
    page,
    limit,
  });
}

/**
 * POST /api/va/community/posts — Create post. Body: { body, title?, ticket_id? }.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireVa(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body: { body?: string; title?: string; ticket_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const postBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!postBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() || null : null;
  const ticketId = typeof body.ticket_id === "string" && body.ticket_id.trim() ? body.ticket_id.trim() : null;

  const { data: post, error } = await supabase
    .from("va_community_posts")
    .insert({
      author_id: user!.id,
      title,
      body: postBody,
      ticket_id: ticketId,
    })
    .select("id, author_id, title, body, ticket_id, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await supabase
    .from("va_profiles")
    .select("display_name")
    .eq("user_id", user!.id)
    .maybeSingle();
  const ticketNumber =
    ticketId && post
      ? (await supabase.from("tickets").select("ticket_number").eq("id", ticketId).maybeSingle()).data?.ticket_number ?? null
      : null;

  return NextResponse.json({
    ...post,
    author_display_name: profile?.display_name?.trim() || "VA",
    ticket_number: ticketNumber,
    like_count: 0,
    comment_count: 0,
    liked: false,
  });
}
