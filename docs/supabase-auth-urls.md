# Supabase Auth URL configuration

For magic link and cookie-based auth to work on production (themomops.com), configure Supabase as follows.

## Dashboard: Auth → URL Configuration

1. **Site URL:** `https://themomops.com`
2. **Redirect URLs:** Add at least:
   - `https://themomops.com/auth/callback`
   - `https://themomops.com/**` (optional, allows any path)

Use the **apex** domain (themomops.com), not www. The app redirects www → apex so cookies are set on one host.

## Why

- The magic link sends users to `/auth/callback?code=...&next=...`.
- The callback route calls `exchangeCodeForSession(code)`, which **sets the `sb-*` cookies** on the current domain.
- If the redirect URL in Supabase pointed at a different host (e.g. preview URL or www), cookies would be set there and not on themomops.com, so middleware would never see a session.

## Verify

After clicking a magic link and landing on production:

1. DevTools → Application → Cookies for `https://themomops.com` → you should see `sb-*` cookies.
2. Navigate to `/member` or `/member/onboarding` → 200 (no 307 to login).
