#!/usr/bin/env node
/**
 * Seeds task_library table from src/data/task-library.json
 * Run after migration: npx supabase db push && node scripts/seed-task-library.mjs
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync("src/data/task-library.json", "utf8"));
const supabase = createClient(url, key);

// Clear existing (for re-seed)
const { error: delErr } = await supabase.from("task_library").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (delErr) {
  console.warn("Delete warning (table may be empty):", delErr.message);
}

const rows = data.map((t) => ({
  category: t.category,
  task: t.task,
  credits: t.credits ?? 0,
  template: t.template ?? "",
  rank: t.rank ?? 500,
}));

const { data: inserted, error } = await supabase.from("task_library").insert(rows).select("id");
if (error) {
  console.error("Seed failed:", error);
  process.exit(1);
}
console.log(`Seeded ${inserted?.length ?? rows.length} tasks into task_library`);
