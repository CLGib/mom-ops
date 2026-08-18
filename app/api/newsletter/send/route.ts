import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNewsletterOwner, unsubscribeUrl } from "@/lib/newsletter";
import { getNoteBySlug } from "@/lib/notes";
import { queueNewsletterBroadcast } from "@/lib/email/broadcast";
import { queueEmail } from "@/lib/email/queue";

/**
 * Owner-only: queue a published Notebook note as a newsletter issue to every
 * active subscriber. Middleware already requires auth for /api/*; we add the
 * owner check on top. Idempotent per note slug (safe to click twice).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isNewsletterOwner(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug, test } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    test?: boolean;
  };
  if (!slug) return NextResponse.json({ error: "Missing note slug" }, { status: 400 });

  const note = await getNoteBySlug(slug);
  if (!note) {
    return NextResponse.json({ error: "Note not found or not published" }, { status: 404 });
  }

  const bodyHtml = `<h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.2;margin:0 0 20px;">${note.title}</h1>${note.html}`;

  // Test send: only to the logged-in owner, so they can preview the real email
  // before broadcasting. Unique dedupe key so it can be re-tested.
  if (test) {
    const email = (user.email ?? "").toLowerCase();
    await queueEmail({
      to_email: email,
      template: "newsletter_issue_v1",
      payload: { subject: note.title, body_html: bodyHtml, unsubscribe_url: unsubscribeUrl(email) },
      dedupe_key: `nl-test:${slug}:${email}:${Date.now()}`,
    });
    return NextResponse.json({ ok: true, subject: note.title, queued: 1, recipients: 1, test: true });
  }

  const { queued, recipients } = await queueNewsletterBroadcast({
    issueSlug: slug,
    subject: note.title,
    bodyHtml,
  });

  return NextResponse.json({ ok: true, subject: note.title, queued, recipients });
}
