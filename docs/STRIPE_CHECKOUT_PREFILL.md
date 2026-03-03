# Stripe Checkout Prefill – Founders Page

## What's Happening
On https://themomops.com/founders, Stripe Checkout sometimes pre-fills a visitor's name and email. When the visitor is **logged in**, we send their email via `customer_email` so Stripe prefills the **current** user (avoiding the "last user's info" showing for someone else). When the visitor is not logged in, we do not send `customer_email` — only an optional `referral_code`.

## Why Prefill Still Happens
- **Stripe cookies / localStorage**: Stripe may recognize returning visitors and prefill based on past sessions.
- **Stripe Link / saved wallets**: Even if the Link button is hidden (`link.display: "never"`), Stripe can still prefill if the user has a Link account or previously used Stripe on that device/browser.
- **Past Stripe subscriptions / same card**: Stripe can associate an email with a previously used card.
- **Browser autofill**: Chrome, Safari, and other browsers may fill in saved names/emails even in incognito.

## What We Already Do
- **Logged-in users**: we pass `customer_email` from the current session so Stripe prefills the correct person.
- **Guests**: we do not pass `customer_email` (or `customer`).
- `wallet_options: { link: { display: "never" } }` → hides the Link button.
- Note: `customer_creation` is only valid in Stripe's `payment` mode, not `subscription`, so we do not use it for founders checkout.

## What Can Be Done

### 1. Turn off Link in the Stripe Dashboard (recommended)
`wallet_options: { link: { display: "never" } }` only hides the Link **button**. Stripe can still use Link to prefill name/email when it recognizes the visitor. To disable Link entirely for your account:

1. In [Stripe Dashboard](https://dashboard.stripe.com) go to **Settings → Payments → Payment methods**.
2. Find **Link** in the list and **turn it off**.
3. Wait a few minutes for the change to apply.

This affects all Checkout sessions on your account. If prefill was coming from Link, it should stop after this.

### 2. Other options
- **Test in a fresh browser or guest profile** – confirms whether prefill is Stripe or browser autofill.
- **Contact Stripe Support** – ask if they can disable or limit prefill for your account.
- **Browser-side hints** – `autocomplete="off"` on any pre-checkout forms (won't affect Stripe-hosted fields).

## Key Takeaways
- Prefill is **not caused by our app**.
- Stripe may still prefill via cookies, Link, or prior sessions.
- There is **no guaranteed session parameter** to fully stop Stripe from pre-filling.
- For strict blank checkout, use a **fresh browser/device** or coordinate with **Stripe Support**.
