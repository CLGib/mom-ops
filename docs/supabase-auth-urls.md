# Supabase Auth URL configuration

For magic link and cookie-based auth to work on production (themomops.com), configure Supabase as follows.

## Dashboard: Auth → URL Configuration

1. **Site URL:** `https://themomops.com`
2. **Redirect URLs:** Add at least:
   - `https://themomops.com/auth/callback` (magic link, **email change confirmation**, OAuth)
   - `https://themomops.com/reset-password` (forgot password)
   - `https://themomops.com/**` (optional, allows any path)

Use the **apex** domain (themomops.com), not www. The app redirects www → apex so cookies are set on one host.

## Why

- The magic link and **email change confirmation** send users to `/auth/callback?code=...&next=...`. If the redirect URL for "Confirm email" is not set to `/auth/callback`, the new email will not be saved after the user clicks the confirmation link.
- The **password reset** link goes to `/reset-password` with tokens in the URL hash (implicit flow), so it works when the link is opened on a different device. The reset-password page reads the hash and sets the session.
- The callback route calls `exchangeCodeForSession(code)`, which **sets the `sb-*` cookies** on the current domain.
- If the redirect URL in Supabase pointed at a different host (e.g. preview URL or www), cookies would be set there and not on themomops.com, so middleware would never see a session.

## Email change not saving

If a user changes their email and receives the confirmation email but the new email never saves after they click the link:

1. In Supabase Dashboard → **Auth → URL Configuration**, ensure **Redirect URLs** includes `https://themomops.com/auth/callback`.
2. In **Auth → Email Templates**, check that the "Change Email Address" template uses a redirect to your site; Supabase will append the token/code. The app’s `/auth/callback` route must be the target so `exchangeCodeForSession` runs and the session (and email) is updated.

## Verify

After clicking a magic link and landing on production:

1. DevTools → Application → Cookies for `https://themomops.com` → you should see `sb-*` cookies.
2. Navigate to `/member` or `/member/onboarding` → 200 (no 307 to login).
