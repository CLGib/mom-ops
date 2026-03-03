<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Mom Ops Next.js App Router application. Here is a summary of all changes made:

## What was set up

- **`posthog-js`** and **`posthog-node`** installed as dependencies
- **`instrumentation-client.ts`** (root): Client-side PostHog initialization using the Next.js 15.3+ `instrumentation-client` pattern. Includes session replay, exception capture (error tracking), and a `/ingest` reverse proxy.
- **`src/lib/posthog-server.ts`**: Server-side PostHog singleton client for use in API routes and webhook handlers.
- **`next.config.ts`**: Added `/ingest` reverse proxy rewrites so PostHog requests are routed through your own domain (less likely to be blocked by ad blockers), plus `skipTrailingSlashRedirect: true`.
- **`.env.local`**: `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables set.

**Client-side events** are captured directly with `posthog.capture()` imported from `posthog-js`.
**Server-side events** are captured via `getPostHogClient()` from `src/lib/posthog-server.ts`.
**User identification** is performed on successful password login in `AuthForm.tsx` using `posthog.identify(email, { email })`.
**Server-side identification** is performed in the Stripe webhook on subscription activation and cancellation.

## Events instrumented

| Event Name | Description | File |
|---|---|---|
| `checkout_initiated` | User clicks the checkout button to start a subscription or founders plan purchase | `app/(marketing)/components/CheckoutButton.tsx` |
| `user_signed_in` | User successfully signs in with email/password. Also triggers PostHog identify(). | `app/login/AuthForm.tsx` |
| `magic_link_requested` | User requests a magic link sign-in email | `app/login/AuthForm.tsx` |
| `onboarding_completed` | Member completes the onboarding survey and submits it | `app/member/onboarding/OnboardingSurvey.tsx` |
| `ticket_message_sent` | Member sends a message in a ticket thread (with or without attachments) | `app/member/TicketThread.tsx` |
| `tip_checkout_initiated` | Member initiates a tip payment for their VA specialist | `app/member/TipCard.tsx` |
| `nps_submitted` | Member submits an NPS score and optional comment | `app/member/NPSPopover.tsx` |
| `nps_dismissed` | Member dismisses the NPS survey without rating | `app/member/NPSPopover.tsx` |
| `quiz_completed` | Member completes a quiz and submits answers | `app/member/quizzes/[slug]/QuizRunner.tsx` |
| `reactivate_subscription_initiated` | Member clicks the reactivate subscription button | `app/member/ReactivateButton.tsx` |
| `subscription_activated` | (Server) Checkout session completed, subscription granted, credits issued | `app/api/webhooks/stripe/route.ts` |
| `subscription_renewed` | (Server) Renewal invoice paid, renewal credits issued | `app/api/webhooks/stripe/route.ts` |
| `subscription_canceled` | (Server) Subscription canceled via webhook | `app/api/webhooks/stripe/route.ts` |
| `ticket_created` | (Server) Member successfully creates a new support task | `app/api/tickets/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/328006/dashboard/1320105)

### Insights
- [Checkout → Subscription Conversion Funnel](https://us.posthog.com/project/328006/insights/yvzS03g9) — Tracks conversion rate from checkout button click to successful subscription within 7 days
- [Subscription Health: New, Renewals & Cancellations (Weekly)](https://us.posthog.com/project/328006/insights/lhD4bvwO) — Weekly trend comparing new activations, renewals, and cancellations to monitor net subscription growth
- [Member Activation Funnel: Login → Onboarding → First Task](https://us.posthog.com/project/328006/insights/lxruLqSm) — Measures how many new members complete onboarding and submit their first task within 14 days
- [NPS Survey Engagement (Submissions vs Dismissals)](https://us.posthog.com/project/328006/insights/U6lczDmb) — Tracks NPS survey response quality over time
- [Daily Task Activity: Tasks Created & Messages Sent](https://us.posthog.com/project/328006/insights/2KhZmA8v) — Core engagement metric showing platform usage day-over-day

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
