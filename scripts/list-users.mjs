#!/usr/bin/env node
/**
 * List all users in Supabase Auth (email and id) so you can find the right email for fix-member-after-checkout.
 * Usage: node scripts/list-users.mjs
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
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (serviceKey.length < 20) {
  console.error("SUPABASE_SERVICE_ROLE_KEY looks too short. In Supabase: Project Settings → API → copy the full secret key (eye icon to reveal).");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  if (!users?.length) {
    console.log("No users found.");
    return;
  }
  console.log("Users in Supabase Auth:\n");
  for (const u of users) {
    console.log("  ", u.email ?? "(no email)", "  id:", u.id);
  }
  console.log("\nRun: node scripts/fix-member-after-checkout.mjs \"email@example.com\"");
}

main();
