import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

import { createClient as createServerClientFromCookies } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Try request cookies first (what the client sent)
    let serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });
    let { data: { user } } = await serverClient.auth.getUser();

    // Fallback: use next/headers cookies() — on Vercel it sometimes has the session when request.cookies doesn't
    if (!user) {
      const serverClientAlt = await createServerClientFromCookies();
      const { data } = await serverClientAlt.auth.getUser();
      user = data.user ?? null;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not logged in." },
        { status: 401 }
      );
    }

    const limitResult = await checkRateLimit(`tickets:${user.id}`, RATE_LIMITS.tickets);
    if (!limitResult.success) {
      const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;
    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey);
    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        member_id: user.id,
        subject,
        description,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const id = ticket?.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Failed to create task." },
        { status: 500 }
      );
    }
    try {
      // Use only server-side identity; do not trust client-supplied X-POSTHOG-DISTINCT-ID (spoofable)
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: user.id,
        event: "ticket_created",
        properties: {
          ticket_id: id,
          member_id: user.id,
          has_description: !!description,
        },
      });
      await posthog.shutdown();
    } catch (e) {
      console.warn("[tickets] PostHog ticket_created capture failed", e);
    }
    return NextResponse.json({ ticketId: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
