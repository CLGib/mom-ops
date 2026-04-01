import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST() {
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey);

  // Release reopened: set assigned_va_id = null, keep status = reopened
  const { data: reopenedRows } = await serviceSupabase
    .from("tickets")
    .update({ assigned_va_id: null })
    .eq("status", "reopened")
    .not("assigned_va_id", "is", null)
    .select("id");

  // Release all other pending: set assigned_va_id = null, status = new
  const { data: activeRows } = await serviceSupabase
    .from("tickets")
    .update({ assigned_va_id: null, status: "new" })
    .in("status", ["assigned", "awaiting_member_approval", "in_progress", "waiting_on_member"])
    .not("assigned_va_id", "is", null)
    .select("id");

  const released = (reopenedRows?.length ?? 0) + (activeRows?.length ?? 0);

  return NextResponse.json({ released });
}
