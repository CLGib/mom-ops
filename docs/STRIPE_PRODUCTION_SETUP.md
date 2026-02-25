# Stripe production setup (all at once)

Use this checklist to switch to Stripe **Live** keys and have checkout + webhooks + founders work in production.

---

## 1. Stripe Dashboard: switch to Live mode

In [Stripe Dashboard](https://dashboard.stripe.com), toggle **Test mode** off (top right) so you’re in **Live** mode for all steps below.

---

## 2. API keys (Live)

**Developers → API keys**

- **Publishable key** (starts with `pk_live_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Secret key** (starts with `sk_live_`) → `STRIPE_SECRET_KEY`

(If you use Stripe in the frontend later, the publishable key is the one that’s safe to expose.)

---

## 3. Products and prices (Live)

**Product → Mom Ops** (create the product in Live if it doesn’t exist yet).

Create two **recurring** monthly prices in USD:

| Price        | Amount  | Env var                    |
|-------------|--------|----------------------------|
| Standard    | $29.95 | `STRIPE_PRICE_ID`          |
| Founding    | $15.95 | `STRIPE_FOUNDERS_PRICE_ID` |

- **Products → Mom Ops → Add price** (or use existing):  
  - $29.95/month → copy **Price ID** (e.g. `price_xxx`) → `STRIPE_PRICE_ID`
  - $15.95/month → copy **Price ID** → `STRIPE_FOUNDERS_PRICE_ID`

Or from your project (with Live secret key in env):

```bash
# In Live mode, with STRIPE_SECRET_KEY=sk_live_... in .env.local
node scripts/add-stripe-price.mjs 2995   # → STRIPE_PRICE_ID
node scripts/add-stripe-price.mjs 1595   # → STRIPE_FOUNDERS_PRICE_ID
```

---

## 4. Webhook (production endpoint)

**Developers → Webhooks → Add endpoint**

- **Endpoint URL:** `https://YOUR_PRODUCTION_DOMAIN/api/webhooks/stripe`  
  (e.g. `https://mom-ops.vercel.app/api/webhooks/stripe`)
- **Events to send:**  
  - `checkout.session.completed`  
  - `invoice.paid`  
  - `customer.subscription.deleted`
- **Add endpoint** → open the new endpoint → **Signing secret** → **Reveal** → copy → `STRIPE_WEBHOOK_SECRET`

---

## 5. Set all env vars in one place

Set these in **Vercel** (Project → Settings → Environment Variables) for **Production** (and Preview if you want):

| Variable | Where to get it | Example (fake) |
|----------|-----------------|----------------|
| `STRIPE_SECRET_KEY` | Dashboard → API keys (Live) → Secret key | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Dashboard → API keys (Live) → Publishable key | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhooks → your production endpoint → Signing secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Mom Ops product → $29.95/month price ID | `price_...` |
| `STRIPE_FOUNDERS_PRICE_ID` | Mom Ops product → $15.95/month price ID | `price_...` |
| `FOUNDERS_CLAIMED` | Optional; default `0`. Bump when founding spots are claimed. | `0` |

Also ensure **`NEXT_PUBLIC_SITE_URL`** is your production URL (e.g. `https://yourdomain.com`) so checkout success/cancel redirects are correct.

---

## 6. Optional: use production keys locally

To test production checkout locally (e.g. with `stripe listen` forwarding to your app), duplicate the same variables in `.env.local` with **Live** values. Use a **test** webhook signing secret from `stripe listen --forward-to localhost:3000/api/webhooks/stripe` so local events are signed correctly; don’t put the production webhook secret in `.env.local` unless you’re not using Stripe CLI.

---

## Quick checklist

- [ ] Live mode in Dashboard
- [ ] `STRIPE_SECRET_KEY` (sk_live_)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_)
- [ ] `STRIPE_PRICE_ID` ($29.95/month price)
- [ ] `STRIPE_FOUNDERS_PRICE_ID` ($15.95/month price)
- [ ] Production webhook endpoint added, events selected
- [ ] `STRIPE_WEBHOOK_SECRET` (from that endpoint)
- [ ] `NEXT_PUBLIC_SITE_URL` = production URL
- [ ] `FOUNDERS_CLAIMED` = 0 (or current count)
- [ ] All variables set in Vercel for Production
- [ ] Redeploy so new env is picked up

After that, production checkout (standard and founders) and webhooks run on Live mode.
