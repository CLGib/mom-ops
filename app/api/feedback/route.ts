import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateFeedbackAttachmentUrl } from "@/lib/feedback-attachment-url";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitResult = await checkRateLimit(`feedback:${user.id}`, RATE_LIMITS.feedback);
  if (!limitResult.success) {
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: { type?: string; title?: string; description?: string; attachment_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type === "bug" ? "bug" : "feature";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  // Only allow attachment URLs from our storage bucket; reject javascript:, data:, and off-site URLs
  const attachmentUrl = validateFeedbackAttachmentUrl(body.attachment_url);

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  const requestorRole = (roleRow?.role as "member" | "va" | "admin" | "director" | "cfo") ?? "member";

  const { data: card, error } = await supabase
    .from("feature_bug_cards")
    .insert({
      type,
      title,
      description,
      status: "backlog",
      requestor_id: user.id,
      requestor_role: requestorRole,
      requestor_email: user.email ?? null,
      attachment_url: attachmentUrl,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: card?.id });
}
