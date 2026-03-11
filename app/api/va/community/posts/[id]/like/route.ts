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
 * POST /api/va/community/posts/[id]/like — Toggle like. Returns { liked, like_count }.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const auth = await requireVa(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id: postId } = await params;

  const { data: post } = await supabase.from("va_community_posts").select("id").eq("id", postId).single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("va_community_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("va_id", user!.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("va_community_likes")
      .delete()
      .eq("post_id", postId)
      .eq("va_id", user!.id);
  } else {
    await supabase.from("va_community_likes").insert({ post_id: postId, va_id: user!.id });
  }

  const { count } = await supabase
    .from("va_community_likes")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);

  return NextResponse.json({
    liked: !existing,
    like_count: count ?? 0,
  });
}
