#!/usr/bin/env node
/**
 * Set tickets' assigned_va_id from the most recent VA reply on the thread.
 *
 * Usage:
 *   node scripts/reassign-from-last-va-reply.mjs --dry-run
 *   node scripts/reassign-from-last-va-reply.mjs --apply
 *   node scripts/reassign-from-last-va-reply.mjs --apply --only-assigned-to=<uuid>
 *
 * Optional:
 *   --only-assigned-to=<uuid>   Only tickets currently assigned to this VA
 *   --open-only                 Only tickets not in terminal statuses (default on)
 *   --all-statuses              Include completed/closed/cancelled (use with care)
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
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

function parseArgs() {
  const out = {
    apply: false,
    dryRun: false,
    onlyAssignedTo: null,
    openOnly: true,
  };
  for (const a of process.argv.slice(2)) {
    if (a === "--apply") out.apply = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--all-statuses") out.openOnly = false;
    else if (a === "--open-only") out.openOnly = true;
    else if (a.startsWith("--only-assigned-to=")) out.onlyAssignedTo = a.slice("--only-assigned-to=".length).trim();
    else if (a === "--help" || a === "-h") {
      console.log(`reassign-from-last-va-reply.mjs — set assigned_va_id from latest VA ticket_message.
  --dry-run | --apply
  --only-assigned-to=<uuid>
  --open-only (default) | --all-statuses`);
      process.exit(0);
    }
  }
  if (!out.apply && !out.dryRun) {
    console.error("Pass --dry-run or --apply");
    process.exit(1);
  }
  if (out.apply && out.dryRun) {
    console.error("Use only one of --dry-run or --apply");
    process.exit(1);
  }
  return out;
}

loadEnvLocal();
const args = parseArgs();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const TERMINAL = ["completed", "closed", "cancelled_by_va", "cancelled_by_admin"];
const filter = "(" + TERMINAL.join(",") + ")";

const supabase = createClient(url, serviceKey);

async function main() {
  let q = supabase.from("tickets").select("id,ticket_number,status,assigned_va_id,subject");
  if (args.openOnly) q = q.not("status", "in", filter);
  if (args.onlyAssignedTo) q = q.eq("assigned_va_id", args.onlyAssignedTo);

  const { data: tickets, error: tErr } = await q;
  if (tErr) throw tErr;

  const rows = [];
  for (const t of tickets ?? []) {
    const { data: msg, error: mErr } = await supabase
      .from("ticket_messages")
      .select("sender_id,created_at")
      .eq("ticket_id", t.id)
      .eq("sender_role", "va")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (mErr) throw mErr;

    const fromReply = msg?.sender_id ?? null;
    rows.push({
      id: t.id,
      ticket_number: t.ticket_number,
      status: t.status,
      subject: (t.subject ?? "").slice(0, 60),
      current: t.assigned_va_id,
      fromReply,
      willSet: fromReply,
    });
  }

  const changes = rows.filter((r) => r.current !== r.willSet);
  console.log(JSON.stringify({ total: rows.length, wouldChange: changes.length }, null, 2));
  for (const r of changes) {
    console.log(
      `#${r.ticket_number ?? "?"} ${r.status} | ${r.current ?? "null"} -> ${r.willSet ?? "null"} | ${r.subject}`
    );
  }

  if (!args.apply || changes.length === 0) return;

  for (const r of changes) {
    const { error: uErr } = await supabase.from("tickets").update({ assigned_va_id: r.willSet }).eq("id", r.id);
    if (uErr) throw uErr;
  }
  console.log("Applied", changes.length, "updates.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
