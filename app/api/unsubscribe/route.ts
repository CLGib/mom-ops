import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribe } from "@/lib/newsletter";

/**
 * One-click unsubscribe. Public (no auth): the HMAC token in the link is the
 * proof. Handles both:
 *  - GET  (a person clicking the link) -> a friendly confirmation page.
 *  - POST (Gmail/Apple "List-Unsubscribe-Post" one-click) -> 200 JSON.
 */

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function unsubscribe(email: string, token: string): Promise<boolean> {
  const normalized = (email || "").trim().toLowerCase();
  if (!verifyUnsubscribe(normalized, token)) return false;
  try {
    await svc()
      .from("subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", normalized);
    return true;
  } catch {
    return false;
  }
}

function page(ok: boolean): NextResponse {
  const body = ok
    ? `<h1>You're unsubscribed 💛</h1><p>You won't get any more emails from Mom Ops. No hard feelings, and thanks for hanging out.</p>`
    : `<h1>Hmm, that link didn't work</h1><p>The unsubscribe link looks invalid or expired. Reply to any email and I'll take you off by hand.</p>`;
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribe · Mom Ops</title><style>body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1A1917;max-width:520px;margin:12vh auto;padding:0 24px;line-height:1.6}h1{font-family:Georgia,serif}a{color:#B8860B}</style></head><body>${body}<p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com"}">Back to themomops.com</a></p></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("e") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const ok = await unsubscribe(email, token);
  return page(ok);
}

export async function POST(req: NextRequest) {
  // Params may come on the query string (RFC 8058 one-click) or the form body.
  let email = req.nextUrl.searchParams.get("e") ?? "";
  let token = req.nextUrl.searchParams.get("t") ?? "";
  if (!email || !token) {
    try {
      const form = await req.formData();
      email = email || String(form.get("e") ?? "");
      token = token || String(form.get("t") ?? "");
    } catch {
      /* no form body */
    }
  }
  const ok = await unsubscribe(email, token);
  return NextResponse.json({ ok });
}
