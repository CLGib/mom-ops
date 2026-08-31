/**
 * Server-only: send a single outbound email from a queue row. Resolves to_email from payload.member_id if needed.
 * Copy follows Mom Ops brand: calm, competent, warm, relief-oriented. Short and skimmable.
 */
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "support@themomops.com";
// A personal display name ("Chrissy at Mom Ops <support@…>") reads as a human,
// which helps Gmail sort into Primary instead of Promotions.
const FROM_NAME = process.env.RESEND_FROM_NAME ?? "Chrissy at Mom Ops";
const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
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
  const dashboard = `${SITE_URL}/my-stuff`;
  const templates: Record<string, () => { subject: string; html: string }> = {
    newsletter_welcome_v1: () => ({
      subject: "You're on the list (notes from the workshop)",
      html: `
        <p>Hey — it's Chrissy.</p>
        <p>You just signed up to watch me build things and steal whatever works. Thank you. That genuinely makes my day.</p>
        <p>Here's the deal: once a week I send one email. One thing I'm building, one thing I learned, one AI trick, one mistake, one shortcut. No fluff, no gurus, no pretending I have it all figured out. Just notes from the workshop.</p>
        <p>If something saves me ten hours, I'll show you. If something makes money, I'll explain exactly how. If something flops, you'll hear about that too.</p>
        <p>Talk soon,<br/>Chrissy</p>
        <p style="color:#8A8681;font-size:13px;">You're getting this because you subscribed at <a href="${SITE_URL}">themomops.com</a>. Reply "unsubscribe" anytime and I'll take you off.</p>
      `.trim(),
    }),
    account_ready_magic_link_v1: () => {
      const link = typeof payload.magic_link === "string" ? payload.magic_link : dashboard;
      return {
        subject: "Your Mom Ops account is ready",
        html: `
          <p>Your payment was successful. Click the link below to access your stuff and set a password.</p>
          <p><a href="${link}">Open My Stuff</a></p>
          <p>- Mom Ops</p>
        `.trim(),
      };
    },
    payment_failed_v1: () => ({
      subject: "Payment issue. Mom Ops",
      html: `
        <p>There was a problem with your payment. Please update your payment method in your account to avoid interruption.</p>
        <p><a href="${dashboard}">Go to My Stuff</a></p>
        <p>- The Mom Ops Team</p>
      `.trim(),
    }),
    subscription_canceled_v1: () => ({
      subject: "Your Mom Ops subscription has been canceled",
      html: `
        <p>Your subscription has been canceled. We're sorry to see you go.</p>
        <p>- The Mom Ops Team</p>
      `.trim(),
    }),
    // A weekly newsletter issue: a short hook the owner wrote, plus a button to
    // read the full post on the site. subject, body_html, post_url, and
    // unsubscribe_url come from the send route / broadcast enqueuer.
    newsletter_issue_v1: () => {
      const bodyHtml = typeof payload.body_html === "string" ? payload.body_html : "";
      const subject =
        typeof payload.subject === "string" && payload.subject.trim()
          ? payload.subject
          : "Notes from the workshop";
      const unsub =
        typeof payload.unsubscribe_url === "string" ? payload.unsubscribe_url : SITE_URL;
      const postUrl = typeof payload.post_url === "string" ? payload.post_url : "";
      const readMore = postUrl
        ? `<p style="margin:28px 0 8px;"><a href="${postUrl}" style="display:inline-block;background:#B8860B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:15px;">Read the whole thing →</a></p>`
        : "";
      return {
        subject,
        html: `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1917;line-height:1.65;font-size:16px;">
${bodyHtml}
${readMore}
<hr style="border:none;border-top:1px solid #ececec;margin:36px 0 16px;">
<p style="color:#8A8681;font-size:13px;line-height:1.5;">You're getting this because you're part of Mom Ops. <a href="${unsub}" style="color:#8A8681;">Unsubscribe</a> anytime, no hard feelings.<br/>Mom Ops, LLC</p>
</div>`,
      };
    },
  };
  const fn = templates[template];
  if (!fn) throw new Error(`Unknown template: ${template}`);
  return fn();
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
  // For newsletter issues, advertise one-click unsubscribe so Gmail/Apple show
  // a native "Unsubscribe" button (and it keeps us CAN-SPAM clean).
  const unsubUrl =
    typeof row.payload?.unsubscribe_url === "string" ? row.payload.unsubscribe_url : null;
  const { error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    replyTo: FROM_EMAIL,
    subject,
    html,
    ...(unsubUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
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
