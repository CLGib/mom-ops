# Get production email working (magic link + payment emails)

After checkout, users should get:
1. **Payment success** – "Payment received – Mom Ops" with a link to the dashboard
2. **Guest signup** – "Your Mom Ops account is ready" with a magic link to sign in

Emails are **queued** when the Stripe webhook runs, then **sent** by a cron job that processes the queue every 2 minutes.

---

## 1. Vercel Cron Job (must be enabled)

The app has a cron that hits `/api/jobs/send-email` every 2 minutes (`vercel.json`). It must be enabled in Vercel.

1. Open your **Vercel** project → **Settings** → **Cron Jobs**
2. Confirm there is a cron for path **`/api/jobs/send-email`** with schedule **`*/2 * * * *`**
3. If it’s disabled or missing, re-deploy from the latest `main` (the cron is defined in `vercel.json`) and check again

---

## 2. Environment variables (Vercel)

In **Vercel** → **Settings** → **Environment Variables**, set:

| Variable | Required | Notes |
|----------|----------|--------|
| **`RESEND_API_KEY`** | Yes | From [Resend](https://resend.com) → API Keys. Needed to send mail. |
| **`RESEND_FROM_EMAIL`** | No | Defaults to `support@themomops.com`. Use a verified sender in Resend. |
| **`INBOUND_REPLY_DOMAIN`** | No | For reply-by-email: the receiving domain (e.g. `mail.themomops.com`). When set, VA-reply emails use Reply-To `reply+{ticket_id}@<this domain>` so member replies are appended to the same ticket. |
| **`CRON_SECRET`** | No | If set, the cron endpoint expects `Authorization: Bearer <CRON_SECRET>`. Leave unset unless you’ve set up a secret and configured the cron to send it. |

After changing env vars, **redeploy** (Deployments → … → Redeploy) so the new values are used.

---

## 3. Resend setup

1. In [Resend](https://resend.com), add and verify your **sending domain** (e.g. `themomops.com`) so `support@themomops.com` (or your `RESEND_FROM_EMAIL`) is allowed.
2. Create an **API key** and set it as **`RESEND_API_KEY`** in Vercel.

---

## 4. Quick check

- **Queue:** In **Supabase** → Table Editor → **`email_outbox`**, after a test checkout you should see rows with `status = 'queued'` (then `sent` once the cron runs).
- **Cron:** In Vercel → **Deployments** → select latest deployment → **Functions** (or Logs), trigger a run and look for requests to **`/api/jobs/send-email`** every ~2 minutes.
- **Manual run (for testing):**  
  `GET https://your-production-url.vercel.app/api/jobs/send-email`  
  If `CRON_SECRET` is not set, this will process up to 20 queued emails and return `{ sent, failed, processed }`.

Once the cron is enabled and `RESEND_API_KEY` is set (and domain verified), magic link and payment emails should send within a few minutes after checkout.

---

## 5. Invite emails

- **Member invites (admin → member):** Sent via Resend from this app. The invite is queued and **sent immediately** when you click “Send invite”, so delivery does not depend on the cron. Ensure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (or verified domain) are set; check **Supabase → Table Editor → `email_outbox`** for rows with `template = 'member_invite_v1'` and `status = 'sent'` or `'failed'` (and `last_error` if failed).
- **VA invites (admin/director → VA):** Sent by **Supabase Auth** (`inviteUserByEmail`). Configure **Supabase Dashboard → Authentication → Email** (SMTP or Supabase’s built-in). If using built-in, check rate limits and spam; for production, custom SMTP is recommended.
