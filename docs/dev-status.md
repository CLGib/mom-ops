# Dev Status

## Stripe: Subscription product

For a subscription to be created in Stripe, you need a **recurring Price**:

1. In [Stripe Dashboard](https://dashboard.stripe.com) go to **Products** → create or open a product (e.g. "Mom Ops membership").
2. Add a **Price** that is **Recurring** (monthly/yearly). Copy the Price ID (`price_xxxxx`).
3. In `.env.local` set:
   - `STRIPE_SECRET_KEY` (from Stripe → Developers → API keys)
   - `STRIPE_PRICE_ID=price_xxxxx` (the recurring price ID above)
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (or your production URL)

If `STRIPE_PRICE_ID` is missing or is a one-time price, the checkout API will return an error (you’ll see it in the browser alert or server logs).

---

## Checkout (current focus)

**In place:** Stripe subscription checkout at `POST /api/stripe/checkout`, webhook (credits + subscription_status), "Join Mom Ops" and signup flow send users to Stripe. Success → `/member?checkout=success`, cancel → `/?checkout=cancel`.

**Next:** Subscription gating in `/member` (see below).

---

## Supabase: Email confirmation and magic link redirects

In **Supabase Auth → URL Configuration → Redirect URLs**, add:

- `http://localhost:3000/?checkout=1` and `http://localhost:3000/login` (local; use 3004 if your dev server uses that port)
- `http://localhost:3004/?checkout=1` and `http://localhost:3004/login` (if you run on 3004)
- `https://yourdomain.com/?checkout=1` and `https://yourdomain.com/login` (production)

Magic-link sign-in sends users to `/login?next=...` after they click the email link.

Signup uses `emailRedirectTo` so after they confirm they land on `/?checkout=1` and are sent to Stripe.

---

## Next Task

Implement subscription gating in `/member`:

- If `subscription_status !== 'active'`
  - Disable task submission
  - Show Reactivate button → triggers checkout
