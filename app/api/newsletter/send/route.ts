import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNewsletterOwner, unsubscribeUrl } from "@/lib/newsletter";
import { getNoteBySlug } from "@/lib/notes";
import { queueNewsletterBroadcast } from "@/lib/email/broadcast";
import { queueEmail } from "@/lib/email/queue";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Turn the owner's plain-text hook into simple, safe HTML paragraphs. */
function hookToHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => `<p>${esc(block.trim()).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

/**
 * Owner-only: send a newsletter issue. The email is a short hook the owner
 * writes/edits in the studio, plus a "Read the whole thing" button linking to
 * the full post. Idempotent per note slug (safe to click twice).
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

  const { slug, subject, body, test, testEmail } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    subject?: string;
    body?: string;
    test?: boolean;
    testEmail?: string;
  };
  if (!slug) return NextResponse.json({ error: "Missing note slug" }, { status: 400 });
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and hook are required" }, { status: 400 });
  }

  const note = await getNoteBySlug(slug);
  if (!note) {
    return NextResponse.json({ error: "Note not found or not published" }, { status: 404 });
  }

  const bodyHtml = hookToHtml(body);
  const postUrl = `${SITE_URL}/notes/${slug}`;
  const cleanSubject = subject.trim();

  // Test send: only to the owner, so they can preview the real email. Unique
  // dedupe key so it can be re-tested.
  if (test) {
    const email = (testEmail || user.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid test email address" }, { status: 400 });
    }
    await queueEmail({
      to_email: email,
      template: "newsletter_issue_v1",
      payload: {
        subject: cleanSubject,
        body_html: bodyHtml,
        post_url: postUrl,
        unsubscribe_url: unsubscribeUrl(email),
      },
      dedupe_key: `nl-test:${slug}:${email}:${Date.now()}`,
    });
    return NextResponse.json({ ok: true, subject: cleanSubject, queued: 1, recipients: 1, test: true });
  }

  const { queued, recipients } = await queueNewsletterBroadcast({
    issueSlug: slug,
    subject: cleanSubject,
    bodyHtml,
    postUrl,
  });

  return NextResponse.json({ ok: true, subject: cleanSubject, queued, recipients });
}
