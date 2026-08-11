// Standalone test of the kit AI customizer's core: does it produce a genuinely
// useful, tailored playbook? No DB/auth/Stripe — just the Anthropic call.
// Run: node scripts/test-kit-generate.mjs
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const apiKey = env.ANTHROPIC_API_KEY;
const model = (env.ANTHROPIC_MODEL || "claude-sonnet-4").trim();
if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

// Mirrors src/lib/kits.ts (neighborhood-camp) + the generate route's prompts.
const kitTitle = "The Neighborhood Camp Op";
const customizationPrompt = `This is a "Neighborhood Camp" kit. The buyer is a mom hosting a casual backyard/neighborhood day camp for local kids — this is NOT a commercial camp, so keep it scrappy, warm, and low-stress, not corporate. Scale everything to the number of kids, their ages, the number of days, and the hours given. Honor any allergy notes as hard constraints in the snacks and supply list. If no theme is given, pick a fun age-appropriate one. If a budget is given, keep the supply total under it and note swaps. Make the supply list genuinely shoppable (real item names, rough quantities). Everything should feel ready-to-run, like a friend who already did this handed over her exact plan.`;
const playbookTemplate = readFileSync(new URL("./_camp_template.txt", import.meta.url), "utf8").trim();

const inputs = {
  area: "our backyard in Austin, TX",
  kidsAges: "mostly 5–8, plus my 3-year-old",
  kidCount: "12",
  days: "2 days",
  hours: "9am–12pm",
  theme: "mermaids / under the sea",
  budget: "keep it under $75",
  notes: "one kid has a peanut allergy; no pool; we have a big shade tree",
};
const profile = { preferred_name: "Sarah", city: "Austin", state: "TX", kids_count: 2, kids_ages: [7, 3] };

const system = `You are the Mom Ops kit assistant. You take a done-for-you playbook and tailor it to one specific mom, producing a finished, ready-to-use document — not a draft, not a list of questions.

Kit: ${kitTitle}
How to tailor this kit: ${customizationPrompt}

Rules:
- Fill in every section of the template with real, specific, usable content based on the buyer's answers. Make reasonable assumptions rather than leaving blanks.
- Warm, clear, scannable. Like a friend who already did this and handed over her exact plan.
- Honor any allergy/safety notes as hard constraints.
- Output ONLY GitHub-flavored markdown following the template's structure (use #, ##, ###, -, 1., > callouts, and | markdown tables |). Start with a single "# " title line. No commentary before or after, no code fences.`;

const answers = Object.entries(inputs).map(([k, v]) => `- ${k}: ${v}`).join("\n");
const userPrompt = `Her answers:\n${answers}\n\nWhat we already know about her: ${JSON.stringify(profile)}\n\nFollow this template exactly, filling every section with tailored content:\n\n${playbookTemplate}`;

const t0 = Date.now();
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  body: JSON.stringify({ model, max_tokens: 3500, system, messages: [{ role: "user", content: userPrompt }] }),
});
const ms = Date.now() - t0;
if (!res.ok) { console.error("HTTP", res.status, (await res.text()).slice(0, 400)); process.exit(1); }
const data = await res.json();
const md = (data.content?.find((c) => c.type === "text")?.text ?? "").trim();
const usage = data.usage ? `${data.usage.input_tokens}in/${data.usage.output_tokens}out` : "";
const hasTable = /\|.+\|/.test(md);
const mentionsAllergy = /peanut|allerg|nut-free|nut free/i.test(md);
const sections = [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);

console.log(`\n⏱  ${ms}ms  ${usage}`);
console.log(`✅ supply table present: ${hasTable}`);
console.log(`✅ honors peanut allergy: ${mentionsAllergy}`);
console.log(`Sections: ${sections.join(" · ")}`);
console.log(`\n${"=".repeat(80)}\n${md}\n${"=".repeat(80)}`);
