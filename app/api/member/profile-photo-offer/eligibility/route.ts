import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "member") {
    return NextResponse.json({ eligible: false });
  }

  const hasAvatar =
    typeof profile?.avatar_url === "string" &&
    profile.avatar_url.trim() !== "";
  if (hasAvatar) {
    return NextResponse.json({ eligible: false });
  }

  const { count, error: countError } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("member_id", user.id)
    .in("status", ["completed", "closed"]);

  if (countError || count == null || count < 1) {
    return NextResponse.json({ eligible: false });
  }

  return NextResponse.json({ eligible: true });
}
