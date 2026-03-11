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
 * POST /api/va/community/posts/[id]/comments — Add comment. Body: { body }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireVa(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id: postId } = await params;

  const { data: post } = await supabase.from("va_community_posts").select("id").eq("id", postId).single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const commentBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!commentBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const { data: comment, error } = await supabase
    .from("va_community_comments")
    .insert({ post_id: postId, author_id: user!.id, body: commentBody })
    .select("id, post_id, author_id, body, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await supabase
    .from("va_profiles")
    .select("display_name")
    .eq("user_id", user!.id)
    .maybeSingle();

  return NextResponse.json({
    ...comment,
    author_display_name: profile?.display_name?.trim() || "VA",
  });
}
