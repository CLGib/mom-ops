import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getKit } from "@/lib/kits";
import { ownsKit } from "@/lib/kit-access";
import { markdownToBrandedDocInput } from "@/lib/markdown-to-branded-blocks";
import { buildBrandedDocx } from "@/lib/build-branded-docx";
import { brandedBlocksToHtml } from "@/lib/branded-blocks-to-html";

// Rich documents are token-heavy and can take ~60-100s. Vercel Pro honors up to 300s.
export const maxDuration = 180;

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

function systemPrompt(kitTitle: string, customization: string): string {
  return `You are the Mom Ops kit assistant. You take a done-for-you template and tailor it to one specific person, producing a finished, ready-to-use document — not a draft, not a list of questions.

Kit: ${kitTitle}
How to tailor this kit: ${customization}

Rules:
- Fill in every section of the template with real, specific, usable content based on their answers (and any uploaded files). Make reasonable assumptions rather than leaving blanks.
- Warm, clear, scannable. Like a friend who already did this and handed over her exact work.
- If files were uploaded (assessments, reviews, resumes, screenshots), read them and explicitly weave what they reveal into the result.
- Never use em dashes (—). Use commas, periods, colons, or parentheses instead.
- Output ONLY GitHub-flavored markdown following the template's structure (use #, ##, ###, -, 1., > callouts, and | markdown tables |). Start with a single "# " title line. No commentary before or after, no code fences.`;
}

function buildUserPrompt(
  template: string,
  inputs: Record<string, string>,
  profile: Record<string, unknown> | null,
  fileCount: number
): string {
  const answers = Object.entries(inputs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const profileText = profile ? JSON.stringify(profile).slice(0, 1500) : "(none)";
  const uploads = fileCount > 0 ? `\n\nThey also uploaded ${fileCount} file(s) — read them and factor them in.` : "";
  return `Their answers:\n${answers || "(none provided)"}\n\nWhat we already know about them (light personalization; don't contradict their answers): ${profileText}${uploads}\n\nFollow this template exactly, filling every section with tailored content:\n\n${template}`;
}

async function fileToBlock(file: File): Promise<AnthropicBlock | null> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "upload").toLowerCase();
  const type = file.type || "";
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } };
  }
  if (type.startsWith("image/") || /\.(png|jpe?g)$/.test(name)) {
    const media = type.startsWith("image/") ? type : name.endsWith(".png") ? "image/png" : "image/jpeg";
    return { type: "image", source: { type: "base64", media_type: media, data: buf.toString("base64") } };
  }
  if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
    try {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      if (value?.trim()) {
        return { type: "text", text: `Uploaded document "${file.name}":\n${value.trim().slice(0, 20000)}` };
      }
    } catch {
      /* unreadable docx — skip */
    }
  }
  return null;
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
      { error: "You've generated a lot in a short time — try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // Accept either JSON (text-only) or multipart/form-data (with file uploads).
  let inputs: Record<string, string> = {};
  let files: File[] = [];
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const inputsRaw = form.get("inputs");
    if (typeof inputsRaw === "string") {
      try {
        inputs = JSON.parse(inputsRaw) as Record<string, string>;
      } catch {
        return NextResponse.json({ error: "Invalid inputs" }, { status: 400 });
      }
    }
    for (const entry of form.getAll("files")) {
      if (entry instanceof File && entry.size > 0) files.push(entry);
    }
  } else {
    try {
      const body = (await request.json()) as { inputs?: Record<string, string> };
      inputs = body.inputs ?? {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (files.length > MAX_FILES) files = files.slice(0, MAX_FILES);
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `"${f.name}" is over 10MB. Please upload a smaller file.` }, { status: 400 });
    }
  }

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

  // Build the message content: prompt text + any uploaded files as native blocks.
  const contentBlocks: AnthropicBlock[] = [
    { type: "text", text: buildUserPrompt(kit.playbookTemplate, inputs, profile ?? null, files.length) },
  ];
  let hasPdf = false;
  for (const file of files) {
    const block = await fileToBlock(file);
    if (block) {
      contentBlocks.push(block);
      if (block.type === "document") hasPdf = true;
    }
  }

  let markdown = "";
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    if (hasPdf) headers["anthropic-beta"] = "pdfs-2024-09-25";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4",
        max_tokens: 5000,
        system: systemPrompt(kit.title, kit.customizationPrompt),
        messages: [{ role: "user", content: contentBlocks }],
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
      { error: "Your assistant hit a snag. Please try again in a moment." },
      { status: 502 }
    );
  }

  const docInput = markdownToBrandedDocInput(markdown, { preparedBy: "Mom Ops", preparedFor });
  const previewHtml = brandedBlocksToHtml(docInput.blocks);

  let docxBase64 = "";
  try {
    const buffer = await buildBrandedDocx(docInput);
    docxBase64 = buffer.toString("base64");
  } catch (e) {
    console.error("[kit/generate] docx build failed", e);
  }

  const filename = `${kit.slug}-${docInput.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`.replace(/-+/g, "-");

  return NextResponse.json({ title: docInput.title, previewHtml, docxBase64, filename });
}
