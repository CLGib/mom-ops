// Isolated test of the Personal Edge Finder prompt + template against a fictional
// person (not Christina) to verify the output structure/quality. No DB/auth/Stripe.
// Run: node scripts/test-edge-finder.mjs
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const apiKey = env.ANTHROPIC_API_KEY;
const model = (env.ANTHROPIC_MODEL || "claude-sonnet-4").trim();
if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

const template = readFileSync(new URL("./_edge_template.txt", import.meta.url), "utf8").trim();
const customizationPrompt = readFileSync(new URL("./_edge_prompt.txt", import.meta.url), "utf8").trim();

const system = `You are the Mom Ops kit assistant. You take a done-for-you template and tailor it to one specific person, producing a finished, ready-to-use document — not a draft, not a list of questions.

Kit: The Personal Edge Finder
How to tailor this kit: ${customizationPrompt}

Rules:
- Fill in every section of the template with real, specific, usable content based on their answers (and any uploaded files).
- Warm, clear, scannable. If files were uploaded, read them and weave them in.
- Never use em dashes. Use commas, periods, colons, or parentheses instead.
- Output ONLY GitHub-flavored markdown following the template's structure. Start with a single "# " title line. No commentary before or after, no code fences.`;

// Fictional person — a former teacher now running ops. No uploaded assessments.
const inputs = {
  ownWords: "I take chaos and turn it into a system everyone can actually follow.",
  whatPeopleSay: "People call me the calm one, the one who 'just handles it.' New hires get sent to me.",
  messFixed: "Our onboarding was a disaster, three weeks and people were still lost. I mapped the whole thing, cut it to three days, wrote the docs, and now it runs without me in the room.",
  proudWin: "Cut onboarding time about 80% and support tickets roughly in half in one quarter.",
  capabilityTrap: "Because I handle everything, everything gets handed to me. I've kind of become the bottleneck.",
  compliment: "You're so organized.",
  drivenBy: "I just want it to actually work. I genuinely don't care about the credit.",
  knownFor: "Building the systems that let a team scale without everyone burning out.",
};

const answers = Object.entries(inputs).map(([k, v]) => `- ${k}: ${v}`).join("\n");
const userPrompt = `Their answers:\n${answers}\n\nThey uploaded no assessments this time.\n\nFollow this template exactly, filling every section with tailored content:\n\n${template}`;

const t0 = Date.now();
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  body: JSON.stringify({ model, max_tokens: 5000, system, messages: [{ role: "user", content: userPrompt }] }),
});
const ms = Date.now() - t0;
if (!res.ok) { console.error("HTTP", res.status, (await res.text()).slice(0, 400)); process.exit(1); }
const data = await res.json();
const md = (data.content?.find((c) => c.type === "text")?.text ?? "").trim();
const usage = data.usage ? `${data.usage.input_tokens}in/${data.usage.output_tokens}out` : "";

const has = (re) => (re.test(md) ? "yes" : "NO");
console.log(`\n⏱  ${ms}ms  ${usage}`);
console.log(`headline section:      ${has(/##\s*The headline/i)}`);
console.log(`source table:          ${has(/\|\s*Source\s*\||Your own words/i)}`);
console.log(`reframe section:       ${has(/##\s*The reframe/i)}`);
console.log(`honest part / shadow:  ${has(/##\s*The honest part/i)}`);
console.log(`usable language:       ${has(/Language you can actually use|one-liner/i)}`);
console.log(`from here:             ${has(/##\s*From here/i)}`);
console.log(`sentence to sit with:  ${has(/sentence to sit with/i)}`);
console.log(`em dashes present:     ${/—/.test(md) ? "YES (bad)" : "no (good)"}`);
console.log(`\n${"=".repeat(80)}\n${md}\n${"=".repeat(80)}`);
