import { createClient } from "@supabase/supabase-js";
import { queueEmail } from "./queue";
import { unsubscribeUrl } from "@/lib/newsletter";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Queue a newsletter issue to every active subscriber, one row per person in
 * email_outbox (the existing cron -> Resend pipeline delivers them with retries).
 *
 * Idempotent per issue: the dedupe_key is `nl:<issueSlug>:<email>`, so re-running
 * the same issue will not double-send. Skips anyone who has unsubscribed.
 */
export async function queueNewsletterBroadcast(opts: {
  issueSlug: string;
  subject: string;
  bodyHtml: string;
  postUrl?: string;
}): Promise<{ queued: number; recipients: number }> {
  const db = svc();
  const { data: subs, error } = await db
    .from("subscribers")
    .select("email")
    .is("unsubscribed_at", null);
  if (error) throw new Error(`could not load subscribers: ${error.message}`);

  const recipients = subs ?? [];
  let queued = 0;
  for (const s of recipients) {
    const email = String(s.email).trim().toLowerCase();
    if (!email) continue;
    try {
      await queueEmail({
        to_email: email,
        template: "newsletter_issue_v1",
        payload: {
          subject: opts.subject,
          body_html: opts.bodyHtml,
          ...(opts.postUrl ? { post_url: opts.postUrl } : {}),
          unsubscribe_url: unsubscribeUrl(email),
        },
        dedupe_key: `nl:${opts.issueSlug}:${email}`,
      });
      queued++;
    } catch {
      // Already queued for this issue (dedupe) or a transient error; skip.
    }
  }
  return { queued, recipients: recipients.length };
}
