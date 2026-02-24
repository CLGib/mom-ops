#!/usr/bin/env node
/**
 * Creates a new price for the existing "Mom Ops" product.
 * Usage: node scripts/add-stripe-price.mjs [amount_cents]
 * Default: 2995 ($29.95)
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnvLocal() {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

loadEnvLocal();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
});

const amountCents = parseInt(process.argv[2], 10) || 2995;

async function main() {
  const { data: products } = await stripe.products.list({
    active: true,
    limit: 100,
  });
  const momOps = products.find((p) => p.name === "Mom Ops");
  if (!momOps) {
    throw new Error('Product "Mom Ops" not found in Stripe');
  }

  const price = await stripe.prices.create({
    product: momOps.id,
    unit_amount: amountCents,
    currency: "usd",
    recurring: { interval: "month" },
  });
  const display = (amountCents / 100).toFixed(2);
  console.log("Created price:", price.id, `$${display}/month`);
  console.log("\nSTRIPE_PRICE_ID=" + price.id);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
