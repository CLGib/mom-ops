import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { memberId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey);

  const { data: memberProfile } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", memberId)
    .single();

  if (!memberProfile || memberProfile.role !== "member") {
    return NextResponse.json(
      { error: "User not found or is not a member" },
      { status: 400 }
    );
  }

  const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(memberId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || "Failed to delete member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
