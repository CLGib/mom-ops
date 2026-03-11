import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { VA_TEMPLATE_BRAND_GUIDE } from "@/lib/va-template-brand-guide";
import { buildBrandedDocx } from "@/lib/build-branded-docx";
import { markdownToBrandedDocInput } from "@/lib/markdown-to-branded-blocks";
import { getMemberDisplayNameForMacro } from "@/lib/member-display-name";

function buildOutputInstructions(hasContext: boolean): string {
  const contextGuidance = hasContext
    ? "- The user provided context below. Incorporate that context into the template where relevant (e.g. real details, preferences, or constraints). Use placeholders only for values the VA will fill in later (e.g. {{VA NAME}}, {{Date}})."
    : "- No context was provided. Use clear placeholders and example content throughout (e.g. [Example: Option A – direct flight, $350], {{DETAIL}}, or sample rows in tables) so the VA can see the intended structure and replace with real data.";
  return `
Your job: Generate a Mom Ops–branded document template in Markdown. The template is a starting point for a VA to fill in and deliver to a member. Follow the brand guide above for structure, tone, and formatting.

Output format (use exactly this structure, no other text before or after):
TITLE:
<one line: the document title>

TEMPLATE:
<full Markdown template content — headers, tables, lists, placeholders like {{VA NAME}}, {{Member-name}}>

- Do NOT wrap in a code block. Do NOT use JSON. Use the TITLE: and TEMPLATE: labels as shown.
- The template must be Markdown. Use headers (##, ###), tables, bullet lists, blockquotes for callouts (e.g. > **NOTE** ...), and placeholders in double curly braces like {{VA NAME}}, {{Member-name}}, {{Date}}.
${contextGuidance}
- Include a clear "VA recommendation / notes" section with example wording and a placeholder for the VA to write their personalized recommendation.
- If an optional add-on is requested (e.g. packing checklist), add a section for it at the end with a short intro and a useful checklist or list.
- Keep major sections to 4–5. Use subsections to break up content. Make it scannable and easy for the VA to fill in.
`;
}

export async function POST(request: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    { data: roleRow },
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role = roleRow?.role ?? null;
  const isVa = role === "va";
  const isAdmin = role === "admin" || !!adminRow;
  const isDirector = role === "director" || !!directorRow;
  if (!isVa && !isAdmin && !isDirector) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limitResult = await checkRateLimit(
    `va-generate-template:${user.id}`,
    RATE_LIMITS.vaTemplateGenerator
  );
  if (!limitResult.success) {
    const retryAfter = Math.max(
      1,
      limitResult.reset - Math.floor(Date.now() / 1000)
    );
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: {
    taskFor?: string;
    addOn?: string;
    context?: string;
    ticketId?: string;
    ideasFromAssistant?: unknown;
    downloadBranded?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const taskFor =
    typeof body.taskFor === "string" ? body.taskFor.trim() : "";
  if (!taskFor) {
    return NextResponse.json(
      { error: "taskFor is required" },
      { status: 400 }
    );
  }
  const downloadBranded = body.downloadBranded === true;
  const addOn =
    typeof body.addOn === "string" ? body.addOn.trim() : undefined;
  const context =
    typeof body.context === "string" ? body.context.trim() : undefined;
  const ticketId =
    typeof body.ticketId === "string" ? body.ticketId.trim() : undefined;
  const rawIdeas = body.ideasFromAssistant;
  const ideasFromAssistant: string[] = Array.isArray(rawIdeas)
    ? rawIdeas
        .filter((item): item is string => typeof item === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  let vaDisplayName: string | null = null;
  let memberDisplayName: string | null = null;
  if (ticketId) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("member_id, assigned_va_id")
      .eq("id", ticketId)
      .single();
    if (ticket?.assigned_va_id === user.id) {
      const { data: vaProfile } = await supabase
        .from("va_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      vaDisplayName = vaProfile?.display_name?.trim() ?? "VA";
      if (ticket.member_id) {
        const { data: memberProfile } = await supabase
          .from("profiles")
          .select("preferred_name, full_name")
          .eq("id", ticket.member_id)
          .single();
        memberDisplayName = getMemberDisplayNameForMacro(
          (memberProfile as { preferred_name?: string | null } | null)?.preferred_name,
          (memberProfile as { full_name?: string | null } | null)?.full_name
        );
      }
    }
  }

  let userMessage = addOn
    ? `Template for: ${taskFor}\nOptional add-on: ${addOn}`
    : `Template for: ${taskFor}\nOptional add-on: None`;

  if (context) {
    userMessage += `\n\nContext to include in the template:\n${context}`;
  }

  if (ideasFromAssistant.length > 0) {
    const ideasBlock = ideasFromAssistant.map((idea) => `- ${idea}`).join("\n");
    userMessage += `\n\nThe VA has already run "Get ideas" for this task. Use these ideas to inform the template structure and content (incorporate or reflect where relevant):\n${ideasBlock}`;
  }

  const systemPrompt = `${VA_TEMPLATE_BRAND_GUIDE}\n\n${buildOutputInstructions(!!context)}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: err || "Anthropic API error" },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const block = data.content?.find((c) => c.type === "text");
    let raw = block?.text?.trim() ?? "";
    // Strip markdown code fence if present
    raw = raw.replace(/^```(?:json|markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();

    const templateRe = /\nTEMPLATE:\s*\n/i;
    const titleRe = /^TITLE:\s*\n/im;
    const templateMatch = raw.match(templateRe);
    const titleMatch = raw.match(titleRe);

    let title = "";
    let template = "";

    if (titleMatch && templateMatch && (templateMatch.index ?? 0) > (titleMatch.index ?? 0)) {
      const afterTitle = (titleMatch.index ?? 0) + titleMatch[0].length;
      const templateStart = (templateMatch.index ?? 0) + templateMatch[0].length;
      title = raw
        .slice(afterTitle, templateMatch.index)
        .trim()
        .split("\n")[0]
        .trim();
      template = raw.slice(templateStart).trim();
    } else {
      // Fallback: try JSON parse (model might ignore format)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as {
            title?: string;
            template?: string;
          };
          title = typeof parsed.title === "string" ? parsed.title : "";
          template = typeof parsed.template === "string" ? parsed.template : "";
        } catch {
          return NextResponse.json(
            { error: "Could not parse AI response" },
            { status: 502 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Could not parse AI response" },
          { status: 502 }
        );
      }
    }

    if (!title) title = "Template";
    if (!template) {
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 502 }
      );
    }

    if (vaDisplayName != null) {
      template = template.replace(/\{\{VA NAME\}\}/g, vaDisplayName);
    }
    if (memberDisplayName != null) {
      template = template.replace(/\{\{Member-name\}\}/g, memberDisplayName);
    }

    if (downloadBranded) {
      const markdownWithTitle = template.trimStart().startsWith("# ")
        ? template
        : `# ${title}\n\n${template}`;
      const docInput = markdownToBrandedDocInput(markdownWithTitle, {
        preparedBy: vaDisplayName ?? undefined,
        preparedFor: memberDisplayName ?? undefined,
      });
      const buffer = await buildBrandedDocx(docInput);
      const safeName = title.replace(/[^\w\s.-]/gi, "").trim() || "template";
      const filename = `${safeName.replace(/\s+/g, "_")}-branded.docx`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    return NextResponse.json({ title, template });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
