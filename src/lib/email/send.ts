/**
 * Server-only: send a single outbound email from a queue row. Resolves to_email from payload.member_id if needed.
 */
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "support@themomops.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service role key not set");
  return createClient(url, key);
}

export type OutboxRow = {
  id: string;
  to_email: string | null;
  template: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_error: string | null;
};

function getTemplate(
  template: string,
  payload: Record<string, unknown>
): { subject: string; html: string } {
  const memberDashboard = `${SITE_URL}/member`;
  const taskLink = payload.ticket_id
    ? `${SITE_URL}/member/${payload.ticket_id}`
    : memberDashboard;
  const templates: Record<string, () => { subject: string; html: string }> = {
    welcome_v1: () => ({
      subject: "Welcome to Mom Ops",
      html: `
        <p>Thanks for signing up!</p>
        <p>Complete your checkout to get started, then head to your dashboard to submit your first task.</p>
        <p><a href="${memberDashboard}">Go to your dashboard</a></p>
        <p>— The Mom Ops Team</p>
      `.trim(),
    }),
    task_submitted_v1: () => ({
      subject: `We got your task: ${String(payload.subject ?? "New task")}`,
      html: `
        <p>We received your task and will assign it to a VA soon.</p>
        <p><strong>Subject:</strong> ${escapeHtml(String(payload.subject ?? "—"))}</p>
        <p><a href="${taskLink}">View task</a></p>
        <p>— The Mom Ops Team</p>
      `.trim(),
    }),
    new_message_v1: () => ({
      subject: `Your VA replied: ${String(payload.subject ?? "New message")}`,
      html: `
        <p>Your VA replied on a task.</p>
        <p><a href="${taskLink}">View conversation</a></p>
        <p>— The Mom Ops Team</p>
      `.trim(),
    }),
    task_complete_v1: () => ({
      subject: "Your task is complete",
      html: `
        <p>Your task has been marked complete.</p>
        <p><a href="${taskLink}">View task</a></p>
        <p>— The Mom Ops Team</p>
      `.trim(),
    }),
    payment_success_v1: () => ({
      subject: "Payment received – Mom Ops",
      html: `
        <p>We received your payment. Your Task Credits are ready to use.</p>
        <p><a href="${memberDashboard}">Go to dashboard</a></p>
        <p>— The Mom Ops Team</p>
      `.trim(),
    }),
    subscription_canceled_v1: () => ({
      subject: "Your Mom Ops subscription has been canceled",
      html: `
        <p>Your subscription has been canceled. We're sorry to see you go.</p>
        <p>— The Mom Ops Team</p>
      `.trim(),
    }),
    payment_failed_v1: () => ({
      subject: "Payment issue – Mom Ops",
      html: `
        <p>There was a problem with your payment. Please update your payment method in your account to avoid interruption.</p>
        <p><a href="${memberDashboard}">Update payment method</a></p>
        <p>— The Mom Ops Team</p>
      `.trim(),
    }),
  };
  const fn = templates[template];
  if (!fn) throw new Error(`Unknown template: ${template}`);
  return fn();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resolve recipient email: use row.to_email or look up by payload.member_id via Auth Admin. */
async function resolveToEmail(
  supabase: ReturnType<typeof getServiceSupabase>,
  row: OutboxRow
): Promise<string | null> {
  if (row.to_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.to_email))
    return row.to_email;
  const memberId = row.payload?.member_id;
  if (typeof memberId !== "string") return null;
  const { data } = await supabase.auth.admin.getUserById(memberId);
  const email = data?.user?.email;
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

const MAX_ATTEMPTS = 3;

/** Process one queue row: resolve to_email, render template, send via Resend, update row. */
export async function sendOne(row: OutboxRow): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  const supabase = getServiceSupabase();
  const toEmail = await resolveToEmail(supabase, row);
  if (!toEmail) {
    await supabase
      .from("email_outbox")
      .update({
        status: "failed",
        last_error: "Could not resolve to_email",
        attempts: row.attempts + 1,
      })
      .eq("id", row.id);
    return { ok: false, error: "Could not resolve to_email" };
  }

  let subject: string;
  let html: string;
  try {
    const t = getTemplate(row.template, row.payload);
    subject = t.subject;
    html = t.html;
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await supabase
      .from("email_outbox")
      .update({
        status: "failed",
        last_error: err,
        attempts: row.attempts + 1,
      })
      .eq("id", row.id);
    return { ok: false, error: err };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    replyTo: FROM_EMAIL,
    subject,
    html,
  });

  if (error) {
    const attempts = row.attempts + 1;
    const status = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
    await supabase
      .from("email_outbox")
      .update({
        status,
        attempts,
        last_error: error.message,
      })
      .eq("id", row.id);
    return { ok: false, error: error.message };
  }

  await supabase
    .from("email_outbox")
    .update({ status: "sent" })
    .eq("id", row.id);
  return { ok: true };
}
