import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { queueEmail } from "@/lib/email/queue";

// Public newsletter signup for the content homepage. Stores the email in
// `subscribers` (service role) and queues a welcome email. Idempotent: a repeat
// signup of the same address is treated as success.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limitResult = await checkRateLimit(`subscribe:${ip}`, RATE_LIMITS.subscribe);
  if (!limitResult.success) {
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: { email?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 60) || null : null;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("subscribers").insert({ email, source });

  // 23505 = unique violation = already subscribed. Treat as success (idempotent),
  // and skip re-queuing the welcome (dedupe_key would no-op anyway).
  const alreadySubscribed = error?.code === "23505";
  if (error && !alreadySubscribed) {
    console.error("[subscribe] insert error:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  if (!alreadySubscribed) {
    try {
      await queueEmail({
        to_email: email,
        template: "newsletter_welcome_v1",
        payload: { email },
        dedupe_key: `newsletter:${email}`,
      });
    } catch (e) {
      // Best-effort: the subscriber is saved even if the welcome email fails to queue.
      console.warn("[subscribe] welcome email queue failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
