#!/usr/bin/env node
/**
 * Grant free-trial credits (35) and set is_free_trial for a member by email.
 * Use when someone signed up via the free-trial flow but the cookie wasn't set
 * (e.g. magic link opened in another device). Idempotent: skips if already granted.
 *
 * Usage: node scripts/grant-free-trial-by-email.mjs <email>
 * Example: node scripts/grant-free-trial-by-email.mjs clriley903+free3@gmail.com
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnvLocal() {
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    // .env.local optional for CI
  }
}

loadEnvLocal();
const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/grant-free-trial-by-email.mjs <email>");
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_free_trial")
    .eq("id", user.id)
    .single();

  if (profile?.is_free_trial === true) {
    console.log("Free trial already granted for", email, "- skipping.");
    process.exit(0);
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ is_free_trial: true })
    .eq("id", user.id);

  if (updateErr) {
    console.error("Failed to set is_free_trial:", updateErr.message);
    process.exit(1);
  }

  const { error: creditErr } = await supabase.from("credit_transactions").insert({
    member_id: user.id,
    amount: 35,
    type: "free_trial",
  });

  if (creditErr) {
    console.error("Failed to insert credits:", creditErr.message);
    process.exit(1);
  }

  console.log("Granted free trial (35 credits) to", email, "(" + user.id + ")");
}

main();
