import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/va/peers
 * Returns list of other VAs (id, display_name) for reassign dropdown. VA-only.
 */
export async function GET() {
  const supabase = await createServerClient();
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
  const isVa = roleRow?.role === "va";
  const isAdmin = roleRow?.role === "admin";
  if (!isVa && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: profiles } = await service
    .from("profiles")
    .select("id")
    .eq("role", "va");
  const vaIds = (profiles ?? []).map((p) => p.id).filter((id) => isAdmin || id !== user.id);
  if (vaIds.length === 0) {
    return NextResponse.json({ vas: [] });
  }

  const { data: vaProfileRows } = await service
    .from("va_profiles")
    .select("user_id, display_name, onboarding_complete, training_complete")
    .in("user_id", vaIds);

  const vas = (vaProfileRows ?? [])
    .filter((r) => r.onboarding_complete === true && r.training_complete === true)
    .map((r) => ({
      id: r.user_id,
      display_name: r.display_name?.trim() || null,
    }))
    .sort((a, b) => (a.display_name || a.id).localeCompare(b.display_name || b.id));

  return NextResponse.json({ vas });
}
