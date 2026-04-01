This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Inbound email (tasks by email)

Members can create a task by sending or forwarding an email to a dedicated address. The app identifies the member by the sender (From) address and creates a ticket with the email subject/body and any image or video attachments.

1. **Env vars** (in `.env.local` or your host):
   - `RESEND_API_KEY` – required for fetching email body and attachments after the webhook.
   - `RESEND_WEBHOOK_SECRET` – optional; when set, webhook requests are verified (recommended in production).
   - `NEXT_PUBLIC_INBOUND_TASK_EMAIL` – optional; the address shown in the member dashboard (e.g. `task@in.yourdomain.com`).

2. **Resend setup**
   - In [Resend](https://resend.com): add a domain and enable **Inbound** (MX records). Get the inbound address (e.g. `task@in.yourdomain.com`).
   - Create a **Webhook** for event `email.received` with URL `https://your-app.com/api/webhooks/inbound-email`. Copy the signing secret into `RESEND_WEBHOOK_SECRET`.

3. **Database**  
   Run the migration that creates `inbound_email_events` (idempotency) if you use Supabase migrations.

4. Tell members the inbound address; they can email or forward messages there to create tasks.

## Rate limiting

API routes and the login page are rate limited to prevent abuse. When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set, limits use [Upstash Redis](https://upstash.com) (serverless-friendly). When unset (e.g. local dev), an in-memory fallback applies per instance.

**Limits:**
- Login page: 30 requests/min per IP
- `/api/tasks/expand` (AI): 10/min per user
- `/api/feedback`: 10/min per user
- `/api/nps`: 5/min per user
- `/api/tickets` (create): 20/min per user
- `/api/stripe/checkout/tip`, `/api/stripe/checkout/credits`: 10/min per user

To enable production rate limiting, create a Redis database at [Upstash](https://console.upstash.com) and add the REST URL and token to your env.

## Error monitoring

Client-side errors are captured in [PostHog](https://posthog.com) with two layers:

- global browser exception capture enabled in `instrumentation-client.ts`
- app-level runtime error capture in `app/components/AppErrorBoundary.tsx`

Unhandled or boundary-caught runtime errors are sent to PostHog automatically.

## Analytics dashboard (PostHog)

CEO, CFO, and CXO can view a funnel and site-traffic dashboard at **Analytics** in their sidebar (`/admin/analytics`, `/director/analytics`, `/cfo/analytics`). To show the embedded PostHog dashboard:

- In PostHog: open your dashboard (e.g. “Analytics basics”), click **Share** → enable “Share publicly” → copy the **embed** iframe `src` URL.
- In `.env.local`: set `NEXT_PUBLIC_POSTHOG_FUNNEL_DASHBOARD_EMBED_URL` to that URL (e.g. `https://us.posthog.com/embedded/...`).

If unset, the Analytics page shows instructions to configure the variable.

## Facebook / Meta Ads (Pixel)

The app includes the [Meta Pixel](https://developers.facebook.com/docs/meta-pixel) base code (in the layout header) so Meta can track PageViews and conversion events for ads. The pixel ID **4415077502056050** is used by default.

- To use a different pixel (e.g. for staging), set `NEXT_PUBLIC_META_PIXEL_ID` in `.env.local` or your host.
- The pixel sends **PageView** on each page and **InitiateCheckout** when users click checkout. Fire more events (**Lead**, **CompleteRegistration**, **Purchase**, etc.) from client code via `trackMetaPixelEvent()` in `@/lib/meta-pixel`.

## Forgot password

The login page has a "Forgot password?" link. Users enter their email and receive a reset link that opens at `/reset-password` with tokens in the URL hash (implicit flow so it works from any device). Add **Supabase Auth → URL Configuration → Redirect URLs**: `https://themomops.com/reset-password` and `http://localhost:3000/reset-password` for local dev.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
