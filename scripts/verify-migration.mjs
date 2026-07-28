// Read-only check that the AI/concierge columns exist on tickets and PostgREST sees them.
// Run: node scripts/verify-migration.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cols = ["ai_generated", "ai_fulfilled_at", "concierge_requested", "concierge_requested_at"];
const { error } = await supabase.from("tickets").select(cols.join(", ")).limit(1);

if (error) {
  console.log("❌ Migration NOT applied (or PostgREST hasn't reloaded yet).");
  console.log("   Error:", error.message);
  process.exit(1);
}
console.log("✅ All 4 columns exist and PostgREST can query them:");
for (const c of cols) console.log("   •", c);
console.log("\nMigration verified. The ticket page and fulfillment flow can now run.");
