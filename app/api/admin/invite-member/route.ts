import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { queueEmail } from "@/lib/email/queue";
import { sendOne } from "@/lib/email/send";

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; credits?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const credits = typeof body.credits === "number" ? body.credits : parseInt(String(body.credits ?? ""), 10);
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (Number.isNaN(credits) || credits < 1) {
    return NextResponse.json(
      { error: "credits must be a positive integer (number of credits to seed)" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey);

  // Check if user already exists (don't invite again)
  const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    return NextResponse.json(
      { error: "A user with that email already exists. Use Adjust credits to add credits instead." },
      { status: 400 }
    );
  }

  // Store invite so redeem_member_invite can grant credits when they first load /member
  const { error: insertError } = await supabase.from("member_invites").insert({
    email,
    credits_to_seed: credits,
    invited_by: user.id,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "An invite is already pending for that email." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Create user and send invite via Resend (more reliable than Supabase invite email)
  const randomPassword = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const { data: newUser, error: createErr } = await serviceSupabase.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
  });
  if (createErr || !newUser?.user?.id) {
    await supabase.from("member_invites").delete().eq("email", email).is("redeemed_at", null);
    return NextResponse.json(
      { error: createErr?.message ?? "Failed to create user" },
      { status: 400 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json(
      { error: "Server configuration error: NEXT_PUBLIC_SITE_URL is required for invite redirects" },
      { status: 500 }
    );
  }
  const { data: linkData } = await serviceSupabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}/member` },
  });
  const magicLink = linkData?.properties?.action_link as string | undefined;
  if (!magicLink) {
    await supabase.from("member_invites").delete().eq("email", email).is("redeemed_at", null);
    return NextResponse.json(
      { error: "Failed to generate invite link" },
      { status: 500 }
    );
  }

  try {
    await queueEmail({
      to_email: email,
      template: "member_invite_v1",
      payload: { magic_link: magicLink, credits },
      dedupe_key: `member_invite:${email}`,
    });
  } catch (e) {
    await supabase.from("member_invites").delete().eq("email", email).is("redeemed_at", null);
    const msg = e instanceof Error ? e.message : "Failed to queue invite email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Send immediately so the invite doesn't depend on the email cron job
  const { data: outboxRow } = await serviceSupabase
    .from("email_outbox")
    .select("id, to_email, template, payload, status, attempts, last_error")
    .eq("dedupe_key", `member_invite:${email}`)
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (outboxRow) {
    const result = await sendOne({
      id: outboxRow.id,
      to_email: outboxRow.to_email,
      template: outboxRow.template,
      payload: (outboxRow.payload as Record<string, unknown>) ?? {},
      status: outboxRow.status,
      attempts: outboxRow.attempts ?? 0,
      last_error: outboxRow.last_error,
    });
    if (!result.ok) {
      // Email queued but send failed (e.g. RESEND_API_KEY). Don't rollback invite; cron will retry.
      console.error("[invite-member] Immediate send failed:", result.error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Invite sent. They will receive an email with a link to access their dashboard. Once they sign in, they will have the seeded credits (no subscription required).",
    userId: newUser.user.id,
  });
}
