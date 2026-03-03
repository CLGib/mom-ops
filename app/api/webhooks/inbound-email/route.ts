import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { queueEmail } from "@/lib/email/queue";

const BUCKET = "task-attachments";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Parse "Display Name <user@example.com>" or "user@example.com" to a single email (lowercase). */
function parseSenderEmail(from: string): string | null {
  if (!from || typeof from !== "string") return null;
  const trimmed = from.trim();
  const match = trimmed.match(/<([^>]+)>/);
  if (match) {
    const email = match[1].trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }
  const lower = trimmed.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower) ? lower : null;
}

function isImageOrVideo(contentType: string): boolean {
  return (
    contentType.startsWith("image/") || contentType.startsWith("video/")
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const apiKey = process.env.RESEND_API_KEY;

  let payload: { type: string; data?: { email_id: string; from: string; subject: string; attachments?: Array<{ id: string; filename: string | null; content_type: string }> } };
  try {
    const resend = new Resend(apiKey);
    payload = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    }) as typeof payload;
  } catch (err) {
    console.error("[inbound-email] Webhook verification failed:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  if (payload?.type !== "email.received" || !payload?.data?.email_id) {
    return NextResponse.json(
      { error: "Expected type email.received with data.email_id" },
      { status: 400 }
    );
  }

  const { email_id, from, subject } = payload.data;
  const senderEmail = parseSenderEmail(from);
  if (!senderEmail) {
    console.warn("[inbound-email] Could not parse sender from:", from);
    return NextResponse.json({ ok: true, skipped: "invalid_from" });
  }

  const supabase = getSupabase();

  const { error: claimError } = await supabase
    .from("inbound_email_events")
    .insert({ email_id });
  if (claimError?.code === "23505") {
    return NextResponse.json({ ok: true, skipped: "already_processed" });
  }
  if (claimError) {
    console.error("[inbound-email] Idempotency insert error:", claimError);
    return NextResponse.json({ ok: true, skipped: "claim_error" });
  }

  const {
    data: { users },
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const member = users?.find(
    (u) => u.email?.toLowerCase() === senderEmail
  );
  if (!member) {
    return NextResponse.json({ ok: true, skipped: "unknown_sender" });
  }

  if (!apiKey) {
    console.error("[inbound-email] RESEND_API_KEY not set");
    return NextResponse.json({ ok: true, error: "config" });
  }

  const resend = new Resend(apiKey);
  const { data: emailData, error: getEmailError } = await resend.emails.receiving.get(email_id);
  if (getEmailError || !emailData) {
    console.error("[inbound-email] Failed to fetch email:", getEmailError ?? "no data");
    return NextResponse.json({ ok: true, error: "fetch_email" });
  }

  const description = emailData.text ?? emailData.html ?? null;

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      member_id: member.id,
      subject: subject ?? "(No subject)",
      description,
      status: "new",
    })
    .select("id")
    .single();

  if (ticketError || !ticket) {
    console.error("[inbound-email] Ticket insert failed:", ticketError);
    return NextResponse.json({ ok: true, error: "ticket_insert" });
  }

  const ticketId = ticket.id;
  try {
    await queueEmail({
      to_email: senderEmail,
      template: "task_submitted_v1",
      payload: { ticket_id: ticketId, subject: subject ?? "(No subject)" },
      dedupe_key: `task_submitted:${ticketId}`,
    });
  } catch (e) {
    console.warn("[inbound-email] queueEmail failed:", e);
  }
  const { data: attachmentsData } = await resend.emails.receiving.attachments.list({
    emailId: email_id,
  });
  const attachments = attachmentsData?.data ?? [];

  for (const att of attachments) {
    if (!isImageOrVideo(att.content_type)) continue;
    if (!att.download_url) continue;
    try {
      const res = await fetch(att.download_url);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = att.filename?.split(".").pop() || "bin";
      const safeName = `${Date.now()}-${att.id.slice(0, 8)}.${ext}`;
      const path = `${ticketId}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: att.content_type,
          upsert: false,
        });
      if (uploadError) {
        console.warn("[inbound-email] Upload failed for attachment:", att.id, uploadError);
        continue;
      }
      const mediaType = att.content_type.startsWith("image/") ? "image" : "video";
      await supabase.from("ticket_attachments").insert({
        ticket_id: ticketId,
        file_path: path,
        file_name: att.filename ?? undefined,
        media_type: mediaType,
      });
    } catch (err) {
      console.warn("[inbound-email] Attachment fetch/upload error:", att.id, err);
    }
  }

  return NextResponse.json({ ok: true, ticket_id: ticketId });
}
