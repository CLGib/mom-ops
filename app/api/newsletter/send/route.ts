import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNewsletterOwner } from "@/lib/newsletter";
import { getNoteBySlug } from "@/lib/notes";
import { queueNewsletterBroadcast } from "@/lib/email/broadcast";

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

  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Missing note slug" }, { status: 400 });

  const note = await getNoteBySlug(slug);
  if (!note) {
    return NextResponse.json({ error: "Note not found or not published" }, { status: 404 });
  }

  const bodyHtml = `<h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.2;margin:0 0 20px;">${note.title}</h1>${note.html}`;
  const { queued, recipients } = await queueNewsletterBroadcast({
    issueSlug: slug,
    subject: note.title,
    bodyHtml,
  });

  return NextResponse.json({ ok: true, subject: note.title, queued, recipients });
}
