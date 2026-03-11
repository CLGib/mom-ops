import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_ROLES = ["member", "va", "admin", "director", "cfo"] as const;

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
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });
  }

  let body: { userId?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim().toLowerCase() : "";
  if (!userId || !role || !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json(
      { error: "userId and role (member, va, admin, director, cfo) required" },
      { status: 400 }
    );
  }

  // Prevent self-demotion that could lock out the last admin (business rule)
  if (userId === user.id && role !== "admin") {
    return NextResponse.json(
      { error: "Cannot change your own role; use another admin to change roles." },
      { status: 400 }
    );
  }

  // Use service for reading target's role so RLS does not 403 (admin check uses user_roles; RLS uses admins table)
  const service = createServiceClient();
  const { data: targetRoleRow } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  const previousRole = targetRoleRow?.role ?? null;

  const { error: profileError } = await service
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (profileError) {
    return NextResponse.json(
      { error: `profiles: ${profileError.message}` },
      { status: 500 }
    );
  }

  // Keep user_roles in sync (trigger may do this; explicit upsert ensures consistency)
  const { error: roleError } = await service
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (roleError) {
    return NextResponse.json(
      { error: `user_roles: ${roleError.message}` },
      { status: 500 }
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: user.id,
    action_type: "role_change",
    affected_entity_type: "user",
    affected_entity_id: userId,
    details: { from_role: previousRole, to_role: role },
  });
  if (auditError) {
    console.warn("[set-role] Audit log insert failed:", auditError.message);
  }

  return NextResponse.json({ ok: true });
}
