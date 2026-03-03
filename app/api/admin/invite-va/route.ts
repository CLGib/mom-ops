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
    .maybeSingle();
  const role = roleRow?.role ?? null;
  const isAdmin = role === "admin";
  const isDirector = role === "director";
  if (!isAdmin && !isDirector) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey);

  const { data: inviteData, error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/auth/callback`,
    }
  );

  if (inviteError) {
    return NextResponse.json(
      { error: inviteError.message || "Failed to send invite" },
      { status: 400 }
    );
  }

  const invitedUserId = inviteData?.user?.id;
  if (invitedUserId) {
    await serviceSupabase
      .from("profiles")
      .update({ role: "va" })
      .eq("id", invitedUserId);
    if (isDirector) {
      await serviceSupabase.from("va_invites").upsert(
        { invited_by: user.id, va_id: invitedUserId },
        { onConflict: "va_id" }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Magic link sent. VA can sign in from the email link.",
    userId: invitedUserId,
  });
}
