import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getKit } from "@/lib/kits";
import { ownsKit } from "@/lib/kit-access";
import { markdownToBrandedDocInput } from "@/lib/markdown-to-branded-blocks";
import { buildBrandedDocx } from "@/lib/build-branded-docx";
import { brandedBlocksToHtml } from "@/lib/branded-blocks-to-html";

// Rich playbooks are token-heavy and can take ~60-100s. Vercel Pro honors up to 300s.
export const maxDuration = 180;

function systemPrompt(kitTitle: string, customization: string): string {
  return `You are the Mom Ops kit assistant. You take a done-for-you playbook and tailor it to one specific mom, producing a finished, ready-to-use document — not a draft, not a list of questions.

Kit: ${kitTitle}
How to tailor this kit: ${customization}

Rules:
- Fill in every section of the template with real, specific, usable content based on the buyer's answers. Make reasonable assumptions rather than leaving blanks.
- Warm, clear, scannable. Like a friend who already did this and handed over her exact plan.
- Honor any allergy/safety notes as hard constraints.
- Never use em dashes (—). Use commas, periods, colons, or parentheses instead.
- Output ONLY GitHub-flavored markdown following the template's structure (use #, ##, ###, -, 1., > callouts, and | markdown tables |). Start with a single "# " title line. No commentary before or after, no code fences.`;
}

function buildUserPrompt(
  template: string,
  inputs: Record<string, string>,
  profile: Record<string, unknown> | null
): string {
  const answers = Object.entries(inputs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const profileText = profile ? JSON.stringify(profile).slice(0, 1500) : "(none)";
  return `Her answers:\n${answers || "(none provided)"}\n\nWhat we already know about her (for light personalization; don't contradict her answers): ${profileText}\n\nFollow this template exactly, filling every section with tailored content:\n\n${template}`;
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const { slug } = await ctx.params;
  const kit = getKit(slug);
  if (!kit) {
    return NextResponse.json({ error: "Unknown kit" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const entitled = await ownsKit(user.id, kit.slug);
  if (!entitled) {
    return NextResponse.json({ error: "You don't own this kit yet." }, { status: 403 });
  }

  const rl = await checkRateLimit(`kit-generate:${user.id}`, RATE_LIMITS.kitGenerate);
  if (!rl.success) {
    const retryAfter = Math.max(1, rl.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "You've customized a lot in a short time — try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: { inputs?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const inputs = (body.inputs ?? {}) as Record<string, string>;

  // Validate required fields.
  for (const f of kit.inputFields) {
    if (f.required && !String(inputs[f.name] ?? "").trim()) {
      return NextResponse.json({ error: `Please fill in: ${f.label}` }, { status: 400 });
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_name, full_name, city, state, kids_count, kids_ages")
    .eq("id", user.id)
    .maybeSingle();

  const preparedFor =
    (profile?.preferred_name as string) || (profile?.full_name as string) || undefined;

  let markdown = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4",
        max_tokens: 5000,
        system: systemPrompt(kit.title, kit.customizationPrompt),
        messages: [{ role: "user", content: buildUserPrompt(kit.playbookTemplate, inputs, profile ?? null) }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[kit/generate] Anthropic error", res.status, errText.slice(0, 400));
      throw new Error("AI request failed");
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const block = data.content?.find((c) => c.type === "text");
    markdown = (block?.text ?? "").trim().replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    if (markdown.length < 40) throw new Error("AI produced no usable content");
  } catch (e) {
    console.error("[kit/generate] generation failed", e);
    return NextResponse.json(
      { error: "Your kit assistant hit a snag. Please try again in a moment." },
      { status: 502 }
    );
  }

  const docInput = markdownToBrandedDocInput(markdown, {
    preparedBy: "Mom Ops",
    preparedFor,
  });
  const previewHtml = brandedBlocksToHtml(docInput.blocks);

  let docxBase64 = "";
  try {
    const buffer = await buildBrandedDocx(docInput);
    docxBase64 = buffer.toString("base64");
  } catch (e) {
    console.error("[kit/generate] docx build failed", e);
    // Preview still works even if the .docx fails; surface a soft error.
  }

  const filename = `${kit.slug}-${docInput.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`.replace(/-+/g, "-");

  return NextResponse.json({
    title: docInput.title,
    previewHtml,
    docxBase64,
    filename,
  });
}
