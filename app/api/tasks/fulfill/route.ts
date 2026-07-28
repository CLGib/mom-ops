import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fulfillTicket } from "@/lib/fulfill-ticket";

// AI deliverables can take ~15-25s to generate.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const rl = await checkRateLimit(`task-fulfill:${user.id}`, RATE_LIMITS.taskFulfill);
  if (!rl.success) {
    const retryAfter = Math.max(1, rl.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "You've reached the limit for now. Please try again a bit later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: { ticketId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";
  if (!ticketId) {
    return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
  }

  // Access gate mirrors the dashboard: active subscription, free trial, or positive balance.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const service = createServiceClient(url, serviceKey);
  const { data: profile } = await service
    .from("profiles")
    .select("subscription_status, is_free_trial")
    .eq("id", user.id)
    .single();
  let balance: number | null = null;
  try {
    const { data: bal } = await service.rpc("get_member_balance", { p_member_id: user.id });
    balance = typeof bal === "number" ? bal : null;
  } catch {
    balance = null;
  }
  const isActive =
    profile?.subscription_status === "active" ||
    profile?.is_free_trial === true ||
    (balance != null && balance > 0);
  if (!isActive) {
    return NextResponse.json(
      { error: "Your plan isn't active. Start your subscription to send tasks." },
      { status: 402 },
    );
  }

  const result = await fulfillTicket(ticketId, user.id);
  if (!result.ok) {
    const status = result.error === "Task not found." ? 404 : 502;
    return NextResponse.json({ error: result.error ?? "Fulfillment failed." }, { status });
  }
  return NextResponse.json({ ok: true, ticketId, alreadyFulfilled: result.alreadyFulfilled ?? false });
}
