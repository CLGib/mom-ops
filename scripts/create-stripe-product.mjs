#!/usr/bin/env node
/**
 * Creates a Stripe product "Mom Ops" and a monthly recurring price.
 * Loads .env.local from project root. Run from repo root:
 *   node scripts/create-stripe-product.mjs
 * Then add the printed STRIPE_PRICE_ID to .env.local.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnvLocal() {
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const value = m[2].replace(/^["']|["']$/g, "").trim();
        process.env[m[1]] = value;
      }
    }
  } catch (e) {
    console.error("Could not read .env.local:", e.message);
    process.exit(1);
  }
}

loadEnvLocal();
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY not set in .env.local");
  process.exit(1);
}

const stripe = new Stripe(key);

async function main() {
  const product = await stripe.products.create({
    name: "Mom Ops",
    description: "Monthly membership – task credits and VA support.",
  });
  console.log("Created product:", product.id, product.name);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 2995,
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log("Created price:", price.id, "$29.95/month");

  console.log("\nAdd this to your .env.local:\n");
  console.log("STRIPE_PRICE_ID=" + price.id);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
