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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { vaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const vaId = typeof body.vaId === "string" ? body.vaId.trim() : "";
  if (!vaId) {
    return NextResponse.json({ error: "vaId is required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey);

  const { data: vaProfile } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", vaId)
    .single();

  if (!vaProfile || vaProfile.role !== "va") {
    return NextResponse.json(
      { error: "User not found or is not a VA" },
      { status: 400 }
    );
  }

  await serviceSupabase
    .from("tickets")
    .update({ assigned_va_id: null })
    .eq("assigned_va_id", vaId);

  await serviceSupabase
    .from("tickets")
    .update({ requested_va_id: null })
    .eq("requested_va_id", vaId);

  const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(vaId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || "Failed to delete user" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
