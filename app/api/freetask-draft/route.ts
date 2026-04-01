import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_MAX_LEN = 500;
const DESCRIPTION_MAX_LEN = 10000;

/**
 * POST: Create a freetask draft. Used by /freetask form before sending magic link.
 * Returns draft_id for use in emailRedirectTo (next=/member&freetask_draft=<id>).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;
    const requestedVaId =
      typeof body.requested_va_id === "string" && body.requested_va_id.trim()
        ? body.requested_va_id.trim()
        : null;

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (subject.length > SUBJECT_MAX_LEN) {
      return NextResponse.json(
        { error: `Subject must be ${SUBJECT_MAX_LEN} characters or less.` },
        { status: 400 }
      );
    }
    if (description != null && description.length > DESCRIPTION_MAX_LEN) {
      return NextResponse.json(
        { error: `Description must be ${DESCRIPTION_MAX_LEN} characters or less.` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: row, error } = await supabase
      .from("freetask_drafts")
      .insert({
        email,
        subject,
        description,
        requested_va_id: requestedVaId,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[freetask-draft] insert error:", error.message);
      return NextResponse.json(
        { error: "Could not save your task. Please try again." },
        { status: 500 }
      );
    }

    const draftId = row?.id;
    if (!draftId) {
      return NextResponse.json(
        { error: "Could not save your task. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft_id: String(draftId) });
  } catch (err) {
    console.warn("[freetask-draft] error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
