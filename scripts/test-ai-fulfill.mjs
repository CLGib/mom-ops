// Standalone test of the AI fulfillment engine's core: does Claude produce a
// genuinely useful, correctly-formatted deliverable? No DB, no auth, read-only API call.
// Run: node scripts/test-ai-fulfill.mjs
import { readFileSync } from "node:fs";

// --- load ANTHROPIC_* from .env.local (no dotenv dep) ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const apiKey = env.ANTHROPIC_API_KEY;
const model = (env.ANTHROPIC_MODEL || "claude-sonnet-4").trim();
if (!apiKey) throw new Error("ANTHROPIC_API_KEY not found in .env.local");

// --- the exact system prompt from app/api/tasks/fulfill/route.ts ---
const SYSTEM_PROMPT = `You are the Mom Ops assistant — a warm, sharp, genuinely helpful teammate who takes tasks off a busy mom's plate.

You are handed a task. Your job is to DO IT and hand back a finished deliverable she can use right now — not a plan for how she could do it herself, not a list of questions.

How to work:
- Actually produce the thing. If she asks for a meal plan, write the meal plan AND the grocery list. If she asks for birthday party ideas, give a real plan: theme, a simple timeline, a shopping list, and 2-3 activity ideas. If she asks you to research options, give specific named options with the trade-offs so she can just decide.
- Go one level above the ask. Anticipate the obvious next need and include it.
- Be decisive. Make reasonable assumptions rather than asking her to fill in blanks. If you truly must assume something, state the assumption in one short line so she can adjust.
- Keep it warm and scannable. Short sections with bolded mini-headings, tight bullet lists. No filler, no throat-clearing, no "as an AI".
- When part of the task genuinely requires a phone call, a booking, a purchase, or showing up somewhere in the real world, do everything up to that point (draft the script, find the number, line up the options) and clearly note that a human on the Mom Ops team can take it the rest of the way.

OUTPUT FORMAT — strict:
- Return ONLY HTML. No markdown, no code fences, no commentary before or after.
- Use ONLY these tags: <p>, <ul>, <ol>, <li>, <strong>, <em>, <a href="...">, <br/>.
- There are NO heading tags available. For a section heading, use <p><strong>Heading</strong></p>.
- Start with one short, warm line acknowledging what you did. Then the deliverable. End with a short "Want a human to take this further?" line only if the task has a real-world action step.`;

const ALLOWED = new Set(["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "a", "span"]);

const tasks = [
  {
    subject: "Emma's 5th birthday party",
    description:
      "Backyard party for about 12 kids in late September. She's obsessed with mermaids. Budget is tight-ish. I have no idea where to start.",
    profile: { preferred_name: "Sarah", city: "Austin", state: "TX", kids_count: 2, kids_ages: [5, 2] },
  },
  {
    subject: "Weekly meal plan",
    description: "Easy weeknight dinners, nothing fancy, one kid is a picky eater and we don't do pork.",
    profile: { preferred_name: "Sarah", kids_count: 2, diet_notes: "no pork; picky 5yo" },
  },
];

async function run(task) {
  const userPrompt = [
    `Task: ${task.subject}`,
    `Details from the member:\n${task.description}`,
    `\nWhat we know about her: ${JSON.stringify(task.profile)}`,
    `\nNow produce the finished deliverable as HTML per the format rules.`,
  ].join("\n");

  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 2500, system: SYSTEM_PROMPT, messages: [{ role: "user", content: userPrompt }] }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) {
    console.error(`\n❌ ${task.subject}: HTTP ${res.status}\n`, (await res.text()).slice(0, 400));
    return;
  }
  const data = await res.json();
  const html = (data.content?.find((c) => c.type === "text")?.text ?? "").trim();

  // Check every tag used is within our sanitizer allowlist.
  const tags = [...html.matchAll(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1].toLowerCase());
  const disallowed = [...new Set(tags)].filter((t) => !ALLOWED.has(t));
  const usage = data.usage ? `${data.usage.input_tokens}in/${data.usage.output_tokens}out tok` : "";

  console.log(`\n${"=".repeat(78)}\n📋 TASK: ${task.subject}  (${ms}ms, ${usage})`);
  console.log(`Tags used: ${[...new Set(tags)].join(", ")}`);
  console.log(disallowed.length ? `⚠️  DISALLOWED TAGS (would be stripped): ${disallowed.join(", ")}` : `✅ all tags within sanitizer allowlist`);
  console.log(`${"-".repeat(78)}\n${html}\n`);
}

for (const t of tasks) await run(t);
console.log(`${"=".repeat(78)}\nDone.`);
