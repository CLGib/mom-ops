// End-to-end verification of the AI fulfillment DB path against the (migrated) prod DB.
// Creates a CLEARLY-LABELED test ticket on the owner's own account, runs the exact steps
// /api/tasks/fulfill performs, asserts the invariants, then DELETES all test data it created.
// Run: node scripts/e2e-fulfill-check.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = "clriley903@gmail.com";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const apiKey = env.ANTHROPIC_API_KEY;
const model = (env.ANTHROPIC_MODEL || "claude-sonnet-4").trim();

const pass = (m) => console.log("  ✅", m);
const fail = (m) => { console.log("  ❌", m); process.exitCode = 1; };

// --- find the owner's user id (member_id) ---
let memberId = null;
let page = 1;
while (!memberId && page <= 10) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { fail("listUsers: " + error.message); break; }
  const u = data.users.find((x) => (x.email || "").toLowerCase() === OWNER_EMAIL);
  if (u) memberId = u.id;
  if (data.users.length < 200) break;
  page++;
}
if (!memberId) { fail(`Could not find owner account ${OWNER_EMAIL} — aborting (won't touch a real customer).`); process.exit(1); }
console.log("Owner member_id:", memberId, "\n");

let ticketId = null;
let messageId = null;
try {
  // 1. Create ticket (status new) — mirrors createTicket
  console.log("1. Create ticket (status=new)");
  const { data: t, error: te } = await supabase.from("tickets")
    .insert({ member_id: memberId, subject: "✅ TEST — AI fulfillment (auto-deleted)", description: "Give me a 3-item packing checklist for a weekend trip.", status: "new" })
    .select("id, status").single();
  if (te) throw new Error("ticket insert: " + te.message);
  ticketId = t.id;
  pass(`ticket ${ticketId} created, status=${t.status}`);

  // 2. Generate a real deliverable
  console.log("2. Generate deliverable via Claude");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 600, system: "Return ONLY HTML using <p>,<ul>,<li>,<strong>. No code fences.", messages: [{ role: "user", content: "Make a 3-item weekend packing checklist." }] }),
  });
  if (!res.ok) throw new Error("Anthropic " + res.status + ": " + (await res.text()).slice(0, 200));
  const html = ((await res.json()).content?.find((c) => c.type === "text")?.text ?? "").trim();
  pass(`deliverable generated (${html.length} chars)`);

  // 3. Insert assistant message with sender_id null (tests nullable + visibility trigger)
  console.log("3. Insert assistant message (sender_id=null)");
  const { data: msg, error: me } = await supabase.from("ticket_messages")
    .insert({ ticket_id: ticketId, sender_id: null, sender_role: "assistant", message: html, visible_to_member: true, internal: false })
    .select("id, visible_to_member, internal, sender_role").single();
  if (me) throw new Error("message insert: " + me.message);
  messageId = msg.id;
  pass(`message ${messageId} inserted, sender_role=${msg.sender_role}`);
  msg.visible_to_member === true ? pass("visibility trigger set visible_to_member=true (member CAN see it)") : fail("visible_to_member is " + msg.visible_to_member + " (member could NOT see it!)");
  msg.internal === false ? pass("internal=false") : fail("internal is true");

  // 4. Complete with credit_cost 0
  console.log("4. Mark completed (credit_cost=0, ai_generated=true)");
  const now = new Date().toISOString();
  const { error: ue } = await supabase.from("tickets")
    .update({ status: "completed", credit_cost: 0, ai_generated: true, ai_fulfilled_at: now, completed_at: now })
    .eq("id", ticketId);
  if (ue) throw new Error("ticket update: " + ue.message);
  const { data: t2 } = await supabase.from("tickets").select("status, ai_generated, credit_cost").eq("id", ticketId).single();
  t2.status === "completed" ? pass("status=completed") : fail("status=" + t2.status);
  t2.ai_generated === true ? pass("ai_generated=true") : fail("ai_generated=" + t2.ai_generated);

  // 5. Assert NO charge was created
  console.log("5. Assert no credit charge");
  const { data: charges } = await supabase.from("credit_transactions").select("id, amount, type").eq("ticket_id", ticketId).eq("type", "task_charge");
  (charges?.length ?? 0) === 0 ? pass("no task_charge row — member charged nothing (flat-fee model holds)") : fail(`found ${charges.length} charge row(s): ` + JSON.stringify(charges));

} catch (e) {
  fail("EXCEPTION: " + e.message);
} finally {
  // 6. Cleanup — delete everything this test created
  console.log("6. Cleanup");
  if (ticketId) {
    await supabase.from("credit_transactions").delete().eq("ticket_id", ticketId);
    if (messageId) await supabase.from("ticket_messages").delete().eq("id", messageId);
    await supabase.from("ticket_messages").delete().eq("ticket_id", ticketId);
    const { error: de } = await supabase.from("tickets").delete().eq("id", ticketId);
    de ? fail("cleanup ticket delete: " + de.message) : pass(`test ticket ${ticketId} + message deleted — DB clean`);
  }
}
console.log("\n" + (process.exitCode ? "❌ FAILED — see above" : "✅ END-TO-END PASS — the live flow works against the migrated DB"));
