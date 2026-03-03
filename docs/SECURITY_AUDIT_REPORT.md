# MomOps Security Audit Report

**Date:** March 1, 2025  
**Scope:** Full codebase (production SaaS: auth, Stripe, admin/VA/member portals, PII/task data)  
**Assumption:** Live system with real users; attackers are sophisticated.

---

## Executive Summary

The application has **solid foundations**: Supabase auth with cookie-based sessions, role checks on most API routes, Stripe webhook signature verification, RLS on critical tables, and security headers (HSTS, X-Content-Type-Options, X-Frame-Options). **Critical issues** are limited but important: **API routes are not covered by the middleware matcher**, so every route must enforce auth itself (most do; a few gaps and one logic bug remain). **Director credit grants fail at the DB** due to RLS. **Feedback `attachment_url`** is not validated and could be abused for XSS/redirects. **Server actions** that run when the middleware bypasses auth (next-action) must all validate the session—current ones do, but the pattern is easy to miss for new code. **No rate limiting** on API or login, and **sensitive data in logs** (e.g. user IDs in webhook logs) should be reduced. Addressing the critical and high items below will materially reduce risk.

---

## 1. Critical Issues (Must Fix Immediately)

### C1. API Routes Not Protected by Middleware (Enforcement Gap)

**Location:** `middleware.ts` (config matcher), all of `app/api/**`

**Finding:**  
The middleware `config.matcher` is:

```ts
matcher: ["/member/:path*", "/va/:path*", "/admin/:path*", "/director/:path*", "/cfo/:path*"],
```

So **no `/api/*` path is matched**. Middleware never runs for API routes. Auth is enforced only inside each route handler. If any new or existing API route omits auth, it is exposed to unauthenticated access.

**Exploit scenario:**  
An attacker discovers an API route that was added without `getUser()` and a 401 check (e.g. a new admin or member endpoint). They call it without cookies and access or mutate data.

**Remediation:**

1. **Option A (recommended):** Add API route protection in middleware for sensitive prefixes:
   - In `middleware.ts`, extend the matcher to include `/api/admin/:path*`, `/api/va/:path*`, and optionally `/api/tickets`, `/api/feedback`, `/api/nps`, `/api/stripe/checkout/tip`, `/api/stripe/checkout/credits`, `/api/emails/queue`, `/api/tasks/expand`, `/api/quizzes/:path*`. For those paths, after `getUser()`, require a valid user (and for `/api/admin/*` optionally require role admin). This provides defense-in-depth so a single forgotten check does not open the whole surface.
2. **Option B:** Keep current design but enforce a strict process: every API route (except webhooks and public endpoints like `founders/count`, `stripe/checkout` for guest checkout) must call a shared `requireAuth()` / `requireAdmin()` helper and return 401/403 before any business logic. Add a checklist or test that asserts auth on each route.
3. Document which API routes are intentionally public: e.g. `GET /api/founders/count`, `POST /api/webhooks/*`, `POST /api/stripe/checkout`, `POST /api/stripe/checkout/founders`.

---

### C2. Director Credit Grant Fails at Database (RLS vs API Logic)

**Location:** `app/api/admin/credits-by-email/route.ts` (lines 72–82), RLS policies in `supabase/migrations/20240224000001_rls_policies.sql` and related migrations.

**Finding:**  
The route allows both **admin** and **director** (lines 19–24) and uses the **cookie-based Supabase client** (`supabase` from `createClient()`) for the insert into `credit_transactions` (lines 72–78). RLS on `credit_transactions` only allows **admin** to insert (`credit_transactions_admin_insert` with `current_user_role() = 'admin'`). There is no `credit_transactions_director_insert` policy. So when a **director** calls this endpoint, the insert is rejected by RLS and the director sees a 500 or Supabase error.

**Exploit scenario:**  
Less an exploit than a broken feature: directors believe they can grant credits; the operation fails and may leak error details or confuse support.

**Remediation:**

1. Use the **service role client** for the insert after the existing role check (admin or director), so the insert is not subject to RLS:
   - After resolving the member by email (lines 59–69), call `createServiceClient()` (or equivalent) and perform the `credit_transactions` insert with that client.
   - Keep the existing audit_log insert for directors using the user client (or service client with `user_id` in the payload).
2. Alternatively, add an RLS policy that allows directors to insert into `credit_transactions` only when the insert is an admin adjustment (e.g. a policy that checks `current_user_role()` or a directors table and restricts to a specific `type` like `admin_adjustment`). Option 1 is simpler and keeps sensitive operations on the service client.

---

### C3. Feedback `attachment_url` Accepts Arbitrary URLs (XSS / Open Redirect)

**Location:** `app/api/feedback/route.ts` (body and insert), `app/admin/feature-bug/FeatureBugBoard.tsx` (lines 223–231)

**Finding:**  
The feedback API accepts `attachment_url` from the request body and stores it in `feature_bug_cards` without validation. The admin board then uses it as `href` and `img src`:

```tsx
<a href={selectedCard.attachment_url} ...>
  <img src={selectedCard.attachment_url} ... />
</a>
```

If an attacker submits `attachment_url: "javascript:alert(1)"` or a `data:` URL, or a link to a malicious site, admins viewing the card could trigger XSS (where supported) or open redirect/phishing.

**Exploit scenario:**  
Attacker sends a feedback submission (authenticated as any role) with `attachment_url: "javascript:alert(document.domain)"` or a malicious `data:text/html,...`. Admin opens the card and clicks the link or loads the image; script runs in admin context or user is sent to attacker site.

**Remediation:**

1. **Validate and sanitize `attachment_url` in the API:**
   - Allow only URLs that point to your own storage (e.g. same-origin or allowlisted Supabase storage host and bucket, e.g. `feedback-attachments`). Reject `javascript:`, `data:`, `vbscript:`, and other non-http(s) schemes.
   - Example: require that `attachment_url` starts with your known storage base URL (from env) and optionally matches a path pattern for the feedback bucket.
2. **In the UI**, even after validation, render links with `rel="noopener noreferrer"` and consider not using `attachment_url` as `img src` unless the URL is from your allowlist; for images, prefer a dedicated image URL or a verified storage path.
3. Consider storing only a **storage path** in the DB and building the full URL server-side when needed, so the client never receives arbitrary URLs from users.

---

## 2. High Risk

### H1. Middleware Bypass for Server Actions (next-action)

**Location:** `middleware.ts` (lines 28–31)

**Finding:**  
When a request is POST and has a `next-action` (or `Next-Action`) header, the middleware returns `NextResponse.next()` immediately and **skips** all auth (getUser, role, path-by-role). Next.js sets this header for server actions. So any route that handles a server action is reachable without the middleware having verified the user. Auth must be enforced **inside** the server action.

**Exploit scenario:**  
If a developer adds a server action that mutates sensitive data but forgets to call `getUser()` and check the session, an unauthenticated attacker could POST to that action with a forged `next-action` header and trigger the mutation.

**Remediation:**

1. Keep the bypass so server actions can run, but **document** that every server action must call `createClient()` (or equivalent) and `getUser()`, and return an error if there is no user (or wrong role).
2. Prefer a shared wrapper for server actions that enforces auth (and optionally role) so new actions cannot forget.
3. Optionally, in middleware, for POST requests with `next-action`, still run auth and attach the user to the request (e.g. via header or context) so that the action can rely on it; this requires that the action always validates the same user/session.

---

### H2. No Rate Limiting on API or Login

**Location:** All API routes; `app/login/AuthForm.tsx` (magic link / password login)

**Finding:**  
There is no application-level rate limiting on:
- Login (magic link, password, forgot password)
- API routes (tickets, feedback, NPS, checkout, tip, credits, tasks/expand, etc.)

Only Supabase/Resend provider limits apply. An attacker can brute-force passwords, spam magic links, or abuse expensive endpoints (e.g. AI expand, email queue).

**Exploit scenario:**  
Mass requests to `/api/tasks/expand` (Anthropic) or login endpoints cause cost or DoS; or brute-force on passwords if any are weak.

**Remediation:**

1. Add rate limiting middleware or per-route checks (e.g. by IP and/or user id): strict limits on `/api/auth/*` and login, and on expensive routes like `/api/tasks/expand` and `/api/emails/queue`.
2. Use Vercel/server provider rate limits if available, or a store (e.g. Redis) for counters.
3. Keep and possibly tighten client-side cooldown for magic link (already present in AuthForm) and ensure Resend/Supabase rate limits are sufficient.

---

### H3. PostHog Distinct ID from Client Header (Spoofable)

**Location:** `app/api/tickets/route.ts` (lines 76–77)

**Finding:**  
The ticket creation handler uses:

```ts
const distinctId = request.headers.get("X-POSTHOG-DISTINCT-ID") ?? user.id;
```

So if the client sends `X-POSTHOG-DISTINCT-ID`, that value is used for PostHog instead of the authenticated `user.id`. This can corrupt analytics or allow attribution of events to a fake ID.

**Exploit scenario:**  
A user sends a custom `X-POSTHOG-DISTINCT-ID` to skew funnels or associate their actions with another ID.

**Remediation:**  
Use only server-side identity for server-generated events: `distinctId = user.id` and do not read `X-POSTHOG-DISTINCT-ID` for server-side capture. If you need client-side distinct id for client-side PostHog, use it only in client-side code, not in API routes.

---

### H4. Auth Callback Redirect Path Not Strict (Open Redirect Risk)

**Location:** `app/auth/callback/route.ts` (lines 38–44)

**Finding:**  
Redirect target is built as:

```ts
const nextPath = next.startsWith("/") ? next : `/${next}`;
const targetPath = isHome ? "/login" : nextPath;
const redirectUrl = new URL(targetPath, requestUrl.origin);
if (redirectUrl.origin !== requestUrl.origin) return NextResponse.redirect(new URL("/login", requestUrl.origin));
```

Origin check blocks cross-origin redirects. However, if `next` is a protocol-relative or absolute path that normalizes to another origin (e.g. `//evil.com`), `new URL("//evil.com", requestUrl.origin)` can yield `https://evil.com`; in that case `redirectUrl.origin !== requestUrl.origin` is true and you redirect to `/login`, so current code is safe. Remaining risk is relying on URL parsing for all edge cases (e.g. bypasses or parser quirks).

**Remediation:**  
Restrict `next` to a strict allowlist of pathnames: allow only characters that are valid in a path (no `\`, no `//`, no scheme). For example:

- Reject if `next` contains `//` or `\` or starts with a scheme.
- Normalize and ensure the result is a path that starts with `/` and does not leave your origin (e.g. strip any host and use only pathname for `redirectUrl`).

---

### H5. Sensitive Data in Logs

**Location:** `app/api/webhooks/stripe/route.ts` (e.g. lines 65, 136, 187, 251, 330, 382), `app/api/auth/signout/route.ts` (line 9)

**Finding:**  
Webhook and other handlers log event ids, user ids, and sometimes emails or other identifiers. Example: `console.log("[webhook] ... user", userIdFinal, ...)`. Signout logs referer, host, pathname. In production, logs are often aggregated and may be accessible to more people than intended; user IDs and similar are PII and can support correlation or abuse.

**Remediation:**  
Avoid logging user IDs, emails, or other PII in production. Log only event types, non-identifying ids (e.g. event id), and generic messages. If you need to debug, use a short-lived debug flag and redact in log pipeline. In signout, log only that a signout occurred, not referer/host (or redact).

---

## 3. Medium Risk

### M1. Admin Ticket Page Has No Explicit Role Check

**Location:** `app/admin/[id]/page.tsx`

**Finding:**  
The page fetches a ticket by `id` without filtering by `member_id` or checking the current user’s role. It relies on **middleware** to restrict `/admin/*` to admins. If middleware were misconfigured or bypassed, any authenticated user could hit this page and, with a ticket id, could potentially see ticket data. The middleware matcher does include `/admin/:path*`, so in practice only admins reach the page.

**Remediation:**  
Add an explicit role check at the start of the page (e.g. fetch `user_roles` and require `role === 'admin'`), and optionally restrict the ticket query to tickets the admin is allowed to see (e.g. all tickets for admin). This gives defense-in-depth if middleware or routing changes.

---

### M2. VA Profile Update by ID (vaId) Without VA Verification

**Location:** `app/api/admin/va-profile/route.ts` (lines 26–28, 41–44)

**Finding:**  
The route accepts `vaId` from form data and updates `va_profiles` for that `user_id`. It does not verify that `vaId` is actually a VA (e.g. that the user has role `va` or exists in a VAs table). An admin could accidentally (or maliciously) set or overwrite profile data for a non-VA user id.

**Remediation:**  
Before updating, verify that `vaId` belongs to a VA: e.g. query `user_roles` or your VA table and ensure the role is `va`. If not, return 400 with a clear error.

---

### M3. Credits-by-email Uses User Client for Insert (RLS Dependency)

**Location:** `app/api/admin/credits-by-email/route.ts` (lines 72–78)

**Finding:**  
Already covered under C2: the insert uses the cookie client. For directors, RLS blocks the insert. For admins, RLS allows it. So the behavior depends on RLS being correct and consistent. Using the service client after role check (admin or director) would make behavior consistent and avoid RLS dependency for this admin operation.

**Remediation:**  
Same as C2: use service role client for the insert after verifying admin or director.

---

### M4. Tasks/Expand (AI) Available to Any Authenticated User

**Location:** `app/api/tasks/expand/route.ts`

**Finding:**  
Any authenticated user (member, VA, admin, etc.) can call this endpoint and consume Anthropic API. There is no role restriction or rate limit. Cost and abuse potential are moderate.

**Remediation:**  
Restrict to members (or roles that are allowed to create tasks) and add rate limiting per user or per IP (see H2).

---

### M5. Invite Member Redirect URL

**Location:** `app/api/admin/invite-member/route.ts` (line 91)

**Finding:**  
`redirectTo` for the magic link is built from `process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin`. If env vars are missing, `request.nextUrl.origin` is used, which in normal deployments is your own host. So risk is low, but if the app were ever behind a proxy that set origin incorrectly, redirect could go to the wrong place.

**Remediation:**  
Prefer a single configured base URL (e.g. `NEXT_PUBLIC_SITE_URL`) for all auth redirects and fail clearly if it is not set in production. Avoid falling back to `request.nextUrl.origin` for auth links.

---

## 4. Low Risk

### L1. Signout Logs Referer/Host/Pathname

**Location:** `app/api/auth/signout/route.ts` (line 9)

**Finding:**  
Temporary debug log logs referer, host, pathname. This can leak which page triggered signout and the host.

**Remediation:**  
Remove or gate behind a debug flag and do not log in production.

---

### L2. Create Ticket Server Action Accepts Optional Access Token

**Location:** `app/member/actions.ts` (`createTicket`), `createClient` with `Authorization: Bearer ${token}`

**Finding:**  
The server action can accept an optional `accessToken` and use it to authenticate. If a client ever passes a stolen or guessed token, that token would be used. The token is expected to come from a trusted client (e.g. your own front end). Risk is low if tokens are short-lived and not logged.

**Remediation:**  
Prefer cookie-based auth only for web; if token is for a mobile or other client, ensure it is never logged and consider binding to a fingerprint or device.

---

### L3. Hotjar Snippet Inline Script

**Location:** `app/components/Hotjar.tsx` (lines 11–21)

**Finding:**  
Hotjar is loaded via `dangerouslySetInnerHTML` with a static snippet and a fixed ID. The content is controlled by the codebase, not user input, so XSS risk is low.

**Remediation:**  
No change required for security; optionally load Hotjar via `next/script` with `src` to a static file to avoid inline script if CSP is tightened later.

---

### L4. Founders Count Endpoint Public

**Location:** `app/api/founders/count/route.ts`

**Finding:**  
GET is unauthenticated and returns the current “claimed” count. This is likely intentional for the marketing page. No sensitive data is exposed.

**Remediation:**  
None if intentional. If the number is sensitive, add a simple secret query param or rate limit to avoid scraping.

---

## 5. Informational / Best Practices

### I1. Content Security Policy (CSP)

**Location:** `next.config.ts` (headers)

**Finding:**  
Headers set include X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS. There is no Content-Security-Policy. Adding a CSP would reduce XSS impact and constrain script and connection sources.

**Remediation:**  
Introduce a strict CSP (e.g. `default-src 'self'; script-src 'self' 'unsafe-inline' ...` for Hotjar/PostHog if needed) and tighten over time. Prefer nonce or hash for inline scripts.

---

### I2. Cookie Flags (HttpOnly, Secure, SameSite)

**Finding:**  
Supabase auth cookies are set by the Supabase client. Defaults for Supabase SSR typically use secure and same-site in production. Verify in the Supabase dashboard and in browser dev tools that session cookies have `HttpOnly`, `Secure`, and `SameSite=Lax` (or `Strict`) in production.

**Remediation:**  
Confirm Supabase cookie options and document the expected flags. If you set any cookies manually, ensure they are HttpOnly and Secure in production.

---

### I3. Dependency Audit

**Finding:**  
`npm audit` reported 0 vulnerabilities at audit time. Dependencies (Next.js, Supabase, Stripe, Resend, PostHog, etc.) are in use; keep them updated and re-run audit and upgrade regularly.

**Remediation:**  
Schedule periodic `npm audit` and dependency updates; track known CVEs for Supabase and Stripe SDKs.

---

### I4. Stripe and Payments (Positive)

**Finding:**  
- Stripe webhook verifies signature with `STRIPE_WEBHOOK_SECRET` and rejects invalid requests.  
- Checkout sessions are created server-side; no secret key in client.  
- Tip and credits checkout routes require auth and (where relevant) ownership (e.g. ticket belongs to member).  
- Payment success and subscription state are driven by webhook events, not client assertion.

**Remediation:**  
None; keep webhook signature verification and server-side session creation as-is.

---

### I5. RLS and Data Access (Positive)

**Finding:**  
Critical tables (profiles, tickets, ticket_messages, credit_transactions) have RLS. Policies tie access to `auth.uid()` and role (e.g. admin, director, VA). Member ticket page filters by `member_id = user.id`, preventing horizontal privilege escalation. VA member-context page requires `assigned_va_id === user.id`.

**Remediation:**  
When adding new tables or columns, add RLS and test with different roles. Reuse the same patterns (e.g. `current_user_role()` where applicable).

---

### I6. Message and HTML Sanitization (Positive)

**Finding:**  
`MessageBody` uses `sanitizeMessageBody()` from `@/lib/sanitize-html` before `dangerouslySetInnerHTML`. Allowed tags and attributes are restricted; `safeHref` limits links to `/`, `https?://`, and `mailto:`.

**Remediation:**  
Keep using this sanitizer for any user-supplied HTML. Consider a well-maintained library (e.g. DOMPurify) if you need richer HTML and want to stay up to date with bypasses.

---

## 6. Recommended Immediate Fix Order

1. **C2** – Fix director credit grant (use service client for insert or add RLS for director).  
2. **C3** – Validate and restrict feedback `attachment_url` (allowlist storage URL; reject `javascript:`/`data:`).  
3. **C1** – Add defense-in-depth for API auth (middleware for `/api/admin/*`, etc., or strict requireAuth/requireAdmin pattern and review).  
4. **H3** – Stop using `X-POSTHOG-DISTINCT-ID` in tickets API; use only `user.id` for server-side PostHog.  
5. **H5** – Remove or redact PII (user ids, emails) from production logs in webhook and signout.  
6. **H2** – Add rate limiting for login and expensive APIs (e.g. tasks/expand, emails/queue).  
7. **H4** – Harden auth callback redirect (strict path allowlist for `next`).  
8. **M2** – Validate that `vaId` in va-profile route is a VA before update.  
9. **M1** – Add explicit admin role check (and optional ticket scope) on admin ticket page.  
10. **I1** – Introduce CSP in next.config and tune for your scripts (Hotjar, PostHog).

---

*End of report. For questions or follow-up, refer to the file and line references above.*
