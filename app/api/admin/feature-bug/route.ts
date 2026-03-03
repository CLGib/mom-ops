import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET: List all feature/bug cards (Admin/CXO only). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: cards, error } = await supabase
    .from("feature_bug_cards")
    .select("id, type, title, description, status, requestor_id, requestor_role, requestor_email, owner_id, attachment_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: cards ?? [] });
}
