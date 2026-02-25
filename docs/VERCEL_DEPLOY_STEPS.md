# Vercel deploy: Stripe webhook fix

Your local repo has the Stripe `InvoiceWithSubscription` fix and a verification comment (`InvoiceWithSubscription v2`). Push and deploy as follows.

## 1. Push to GitHub

From the project root run:

```bash
git push origin main
```

- If prompted for **SSH passphrase**, enter the passphrase for `~/.ssh/id_ed25519` (nothing will show as you type).
- If you get **Permission denied (publickey)**:
  - Use HTTPS and a Personal Access Token:
    ```bash
    git remote set-url origin https://github.com/YOUR_USERNAME/mom-ops.git
    git push origin main
    ```
    When prompted for password, use a [GitHub Personal Access Token](https://github.com/settings/tokens), not your GitHub password.

## 2. Confirm the fix is on GitHub

- Open **https://github.com/YOUR_USERNAME/mom-ops**
- Open **app/api/webhooks/stripe/route.ts** on branch **main**
- You should see near the top: `// ---- Fix Stripe Invoice subscription typing (InvoiceWithSubscription v2) ----` and `type InvoiceWithSubscription`
- In the `invoice.payment_failed` block you should see `as InvoiceWithSubscription` and `subscription_details?.subscription`

If you still see `as Stripe.Invoice` and only `invoice.subscription`, the push did not reach GitHub; fix auth and push again.

## 3. Make Vercel build the latest commit

- In the **Vercel** project: **Settings → Git**
  - Confirm the connected repository is correct
  - Confirm **Production Branch** is **main**
- **Deployments**: start a **new** deployment from the latest commit on **main**
  - Either push again to trigger an automatic deploy, or
  - Use **Redeploy** and choose **Use latest commit** (do not redeploy an old deployment without that option)

After a successful deploy, the build should pass. If the build log still shows `as Stripe.Invoice` at line 238, Vercel is not building from the latest main; re-check the connected repo and production branch.
