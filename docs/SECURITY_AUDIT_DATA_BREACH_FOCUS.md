# Security Audit — Data Breach Focus

Audit date: 2025-03-04. Scope: risks that could lead to **large-scale or sensitive data exposure** (data breaches), not minor internal issues.

---

## Critical finding (fixed)

### 1. Email cron job was callable without auth when `CRON_SECRET` was unset

- **Risk:** `GET /api/jobs/send-email` is in the public API list (no middleware auth). The route used to allow requests when `CRON_SECRET` was not set (“fail open” for Vercel cron). Anyone could trigger the email worker and send all queued emails (notifications, password resets, etc.).
- **Fix applied:** In production (`NODE_ENV === "production"`), the route now:
  - Requires `CRON_SECRET` to be set (returns 503 if missing).
  - Requires `Authorization: Bearer <CRON_SECRET>` (returns 401 if missing or wrong).
- **Action for you:** Set `CRON_SECRET` in production and configure your cron (e.g. Vercel) to send `Authorization: Bearer <CRON_SECRET>` on requests to `/api/jobs/send-email`.

---

## What was checked and looks solid

### Authentication and authorization

- **API routes:** Admin routes use `user_roles.role === 'admin'` (or `admins` for director-payment/adjustment). VA/director/cfo routes check the right roles. Unauthenticated users get 401; wrong role gets 403.
- **Middleware:** `/api/*` that are not in `PUBLIC_API_PREFIXES` require a valid session; `/api/admin/*` additionally requires admin role.
- **Server actions:** e.g. `createTicket` in `app/member/actions.ts` use server Supabase client and/or validated bearer token; service role is used only for inserts with server-derived `member_id`.

### Webhooks (inbound, untrusted callers)

- **Stripe:** `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` — signature verified; no processing without it.
- **Resend (inbound email):** Uses Resend’s `webhooks.verify(...)` with `RESEND_WEBHOOK_SECRET` and Svix headers; returns 400 on failure.

### Cross-tenant / IDOR-style access

- **Tickets:** Create uses `member_id: user.id`. VA assistant and reassign check `assigned_va_id === user.id`. Reassign only allows reassigning to another VA (role + onboarding/training checks).
- **Emails queue:** Template-specific checks (e.g. ticket ownership, assigned VA) before queuing; no arbitrary `to_email` from client for sensitive templates.
- **Director/CFO:** director-payment and director-adjustment require `admins` table; revenue routes require admin/director/cfo via `user_roles` (and directors/cfos tables where used).

### Database (Supabase)

- **RLS:** Core tables (profiles, tickets, ticket_messages, credit_transactions, stripe_webhook_events, inbound_email_events) have RLS. Client uses anon key, so RLS is the main enforcement for browser access.
- **Service role:** Used only in server-side code (API routes, server actions, webhooks, email queue worker). Not exposed to the client.

### Public / unauthenticated endpoints (by design)

- **Stripe checkout:** Guest checkout; no auth required. Webhook ties events to users by email/id.
- **`/api/founders/count`:** Returns only a single number (count, capped); no PII.
- **`/api/webhooks/*`:** Verified by signature (Stripe, Resend) as above.

---

## Recommendations

1. **Production:** Ensure `CRON_SECRET` is set and your cron sends `Authorization: Bearer <CRON_SECRET>` to `/api/jobs/send-email`.
2. **Secrets:** Keep `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, webhook secrets, and API keys only in server env; never in client bundles or public APIs.
3. **RLS:** When adding new tables that hold PII or tenant data, enable RLS and add policies so the anon key cannot read or write across tenants.

---

## Summary

One critical issue was found and fixed: the email cron job could be triggered by unauthenticated callers when `CRON_SECRET` was unset. In production it now requires `CRON_SECRET` and a matching Bearer token. No other data-breach-level issues were identified in auth, webhooks, IDOR, or RLS for the code paths reviewed.
