import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** PATCH: CEO (admin) updates a member's full_name and/or preferred_name. */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { memberId?: string; full_name?: string | null; preferred_name?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { memberId, full_name, preferred_name } = body;
  if (!memberId || typeof memberId !== "string") {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const payload: { full_name?: string | null; preferred_name?: string | null } = {};
  if (Object.hasOwn(body, "full_name")) payload.full_name = full_name == null ? null : String(full_name).trim() || null;
  if (Object.hasOwn(body, "preferred_name")) payload.preferred_name = preferred_name == null ? null : String(preferred_name).trim() || null;
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Provide full_name and/or preferred_name" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", memberId)
    .single();
  if (!profile || profile.role !== "member") {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
