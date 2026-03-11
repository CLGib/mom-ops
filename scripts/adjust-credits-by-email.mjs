#!/usr/bin/env node
/**
 * Add or subtract credits for a member by email (admin adjustment).
 * Usage: node scripts/adjust-credits-by-email.mjs <email> <amount>
 * Example: node scripts/adjust-credits-by-email.mjs member@example.com 100
 *          node scripts/adjust-credits-by-email.mjs member@example.com -50
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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
const email = process.argv[2];
const amount = parseInt(process.argv[3], 10);

if (!email || Number.isNaN(amount) || amount === 0) {
  console.error("Usage: node scripts/adjust-credits-by-email.mjs <email> <amount>");
  console.error("  amount: positive to add credits, negative to subtract");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const {
    data: { users },
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error("No user found with email:", email);
    process.exit(1);
  }

  const { error } = await supabase.from("credit_transactions").insert({
    member_id: user.id,
    amount,
    type: "admin_adjustment",
  });
  if (error) {
    console.error("Failed to insert credit_transactions:", error.message);
    process.exit(1);
  }

  console.log("Adjusted credits for", email, "by", amount, "(member_id:", user.id + ")");
}

main();
