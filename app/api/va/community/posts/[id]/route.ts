import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
 * GET /api/va/community/posts/[id]?comments_page=1&comments_limit=20
 * Single post with paginated comments, like count, liked.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireVa(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const commentsPage = Math.max(1, parseInt(request.nextUrl.searchParams.get("comments_page") ?? "1", 10) || 1);
  const commentsLimit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("comments_limit") ?? "20", 10) || 20));

  const { data: post, error: postError } = await supabase
    .from("va_community_posts")
    .select("id, author_id, title, body, ticket_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const from = (commentsPage - 1) * commentsLimit;
  const to = from + commentsLimit - 1;

  const [
    { count: commentsTotal },
    { data: commentRows },
    { data: likeRows },
    { data: userLike },
    { data: authorProfile },
    { data: ticketRow },
  ] = await Promise.all([
    supabase.from("va_community_comments").select("id", { count: "exact", head: true }).eq("post_id", id),
    supabase
      .from("va_community_comments")
      .select("id, author_id, body, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .range(from, to),
    supabase.from("va_community_likes").select("post_id").eq("post_id", id),
    supabase.from("va_community_likes").select("post_id").eq("post_id", id).eq("va_id", user!.id).maybeSingle(),
    supabase.from("va_profiles").select("display_name").eq("user_id", post.author_id).maybeSingle(),
    post.ticket_id
      ? supabase.from("tickets").select("ticket_number").eq("id", post.ticket_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const commentAuthorIds = [...new Set((commentRows ?? []).map((c: { author_id: string }) => c.author_id))];
  const { data: commentProfiles } =
    commentAuthorIds.length > 0
      ? await supabase.from("va_profiles").select("user_id, display_name").in("user_id", commentAuthorIds)
      : { data: [] as { user_id: string; display_name: string | null }[] };

  const displayByAuthor: Record<string, string> = {};
  for (const r of commentProfiles ?? []) {
    displayByAuthor[r.user_id] = r.display_name?.trim() || "VA";
  }

  const comments = (commentRows ?? []).map((c: { id: string; author_id: string; body: string; created_at: string }) => ({
    ...c,
    author_display_name: displayByAuthor[c.author_id] ?? "VA",
  }));

  const likeCount = (likeRows ?? []).length;

  return NextResponse.json({
    ...post,
    author_display_name: authorProfile?.display_name?.trim() ?? "VA",
    ticket_number: ticketRow?.ticket_number ?? null,
    like_count: likeCount,
    liked: !!userLike,
    comments,
    comments_total: commentsTotal ?? 0,
    comments_page: commentsPage,
    comments_limit: commentsLimit,
  });
}

/**
 * PATCH /api/va/community/posts/[id] — Update own post. Body: { body?, title?, ticket_id? }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireVa(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const { data: existing } = await supabase
    .from("va_community_posts")
    .select("id, author_id")
    .eq("id", id)
    .single();
  if (!existing || existing.author_id !== user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { body?: string; title?: string; ticket_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { body?: string; title?: string | null; ticket_id?: string | null } = {};
  if (typeof body.body === "string") {
    const t = body.body.trim();
    if (t) updates.body = t;
  }
  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    updates.title = typeof body.title === "string" ? body.title.trim() || null : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "ticket_id")) {
    updates.ticket_id = typeof body.ticket_id === "string" && body.ticket_id.trim() ? body.ticket_id.trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    const { data: post } = await supabase
      .from("va_community_posts")
      .select("id, author_id, title, body, ticket_id, created_at, updated_at")
      .eq("id", id)
      .single();
    return NextResponse.json(post);
  }

  const { data: post, error } = await supabase
    .from("va_community_posts")
    .update(updates)
    .eq("id", id)
    .eq("author_id", user!.id)
    .select("id, author_id, title, body, ticket_id, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(post);
}

/**
 * DELETE /api/va/community/posts/[id] — Delete own post.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireVa(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from("va_community_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", user!.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
