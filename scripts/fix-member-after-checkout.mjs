#!/usr/bin/env node
/**
 * Fix a member after they paid but the webhook missed: set subscription_status = active and grant 45 credits.
 * Usage: node scripts/fix-member-after-checkout.mjs <email>
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
if (!email) {
  console.error("Usage: node scripts/fix-member-after-checkout.mjs <email>");
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

  const { error: creditError } = await supabase.from("credit_transactions").insert({
    member_id: user.id,
    amount: 45,
    type: "purchase",
  });
  if (creditError) {
    console.error("Failed to grant credits:", creditError.message);
    process.exit(1);
  }
  console.log("Granted 45 credits to", email);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ subscription_status: "active" })
    .eq("id", user.id);
  if (updateError) {
    if (updateError.message.includes("subscription_status") || updateError.message.includes("schema") || updateError.message.includes("column")) {
      console.warn("Could not set subscription_status (column may be missing). Add it in Supabase SQL Editor:");
      console.warn("  alter table public.profiles add column if not exists subscription_status text check (subscription_status is null or subscription_status in ('active', 'canceled'));");
      console.warn("Then run this script again to set active.");
    } else {
      console.error("Failed to set subscription_status:", updateError.message);
      process.exit(1);
    }
  } else {
    console.log("Set subscription_status = active for", email);
  }
  console.log("Done.");
}

main();
