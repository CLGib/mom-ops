import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST: Activate free trial for the current user (idempotent).
 * Call when member has the free_trial offer cookie and lands on /member.
 * Grants 35 credits (type free_trial) and sets profile.is_free_trial = true.
 * If already activated, returns success without changing anything.
 */
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
  const role = roleRow?.role ?? null;
  if (role !== "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const serviceSupabase = createServiceClient(url, serviceKey);

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("is_free_trial")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile lookup failed" },
      { status: 500 }
    );
  }

  if (profile.is_free_trial === true) {
    return NextResponse.json({ ok: true, already_activated: true });
  }

  const { error: updateError } = await serviceSupabase
    .from("profiles")
    .update({ is_free_trial: true })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  const { error: creditError } = await serviceSupabase
    .from("credit_transactions")
    .insert({
      member_id: user.id,
      amount: 35,
      type: "free_trial",
    });

  if (creditError) {
    return NextResponse.json(
      { error: creditError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, credits_granted: 35 });
}
