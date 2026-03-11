import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { buildBrandedDocx, type BrandedDocInput } from "@/lib/build-branded-docx";
import { markdownToBrandedDocInput } from "@/lib/markdown-to-branded-blocks";
import { VA_TEMPLATE_BRAND_GUIDE } from "@/lib/va-template-brand-guide";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ALLOWED_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ALLOWED_CSV = "text/csv";
const ALLOWED_EXT = [".docx", ".xlsx", ".csv"];

async function requireToolboxRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { user: null as null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

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
    return { user: null as null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^\w\s.-]/gi, "").trim() || "document";
  const withoutExt = base.replace(/\.(docx|xlsx|csv)$/i, "");
  return `${withoutExt}-branded.docx`;
}

function sanitizeCustomDocumentName(name: string): string {
  const safe = name.replace(/[^\w\s.-]/gi, "").trim() || "document";
  return safe.toLowerCase().endsWith(".docx") ? safe : `${safe}.docx`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  const limitResult = await checkRateLimit(
    `toolbox-brand-document:${user!.id}`,
    RATE_LIMITS.vaBrandingAssistant
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

  let content = "";
  let preparedBy: string | undefined;
  let preparedFor: string | undefined;
  let useAi = false;
  let outputFilename = "mom-ops-branded.docx";
  let isSheet = false;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (file instanceof File) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "File must be 10MB or smaller." },
          { status: 400 }
        );
      }
      const type = (file.type ?? "").toLowerCase();
      const name = (file.name ?? "").toLowerCase();
      const ext = name.endsWith(".docx")
        ? ".docx"
        : name.endsWith(".xlsx")
          ? ".xlsx"
          : name.endsWith(".csv")
            ? ".csv"
            : "";
      if (
        !(
          type === ALLOWED_DOCX ||
          type === ALLOWED_XLSX ||
          type === ALLOWED_CSV ||
          ALLOWED_EXT.some((e) => name.endsWith(e))
        )
      ) {
        return NextResponse.json(
          { error: "Allowed formats: .docx, .xlsx, .csv" },
          { status: 400 }
        );
      }
      outputFilename = sanitizeFilename(file.name ?? "document.docx");
      const buffer = Buffer.from(await file.arrayBuffer());

      if (ext === ".docx" || type === ALLOWED_DOCX) {
        try {
          const result = await mammoth.extractRawText({ buffer });
          content = (result as { value?: string }).value ?? "";
        } catch (e) {
          return NextResponse.json(
            { error: "Could not read the Word document. It may be corrupted." },
            { status: 400 }
          );
        }
      } else {
        isSheet = true;
        try {
          const wb = XLSX.read(buffer, { type: "buffer" });
          const first = wb.SheetNames[0];
          if (!first) {
            return NextResponse.json(
              { error: "Spreadsheet has no sheets." },
              { status: 400 }
            );
          }
          const sheet = wb.Sheets[first];
          const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
            defval: "",
          }) as string[][];
          if (data.length === 0) {
            return NextResponse.json(
              { error: "Spreadsheet sheet is empty." },
              { status: 400 }
            );
          }
          const headers = data[0]?.map((c) => String(c ?? "")) ?? [];
          const rows = data.slice(1).map((row) =>
            (Array.isArray(row) ? row : []).map((c) => String(c ?? ""))
          );
          if (headers.length > 0) {
            content = JSON.stringify({ title: first, headers, rows });
          }
        } catch (e) {
          return NextResponse.json(
            { error: "Could not read the spreadsheet." },
            { status: 400 }
          );
        }
      }
    }
    const useAiVal = formData.get("useAi");
    useAi = useAiVal === "true" || useAiVal === "1";
    const docName = formData.get("documentName");
    if (typeof docName === "string" && docName.trim()) {
      outputFilename = sanitizeCustomDocumentName(docName.trim());
    }
    const by = formData.get("preparedBy");
    preparedBy = typeof by === "string" ? by.trim() || undefined : undefined;
    const for_ = formData.get("preparedFor");
    preparedFor = typeof for_ === "string" ? for_.trim() || undefined : undefined;

    const pasted = formData.get("content");
    if (typeof pasted === "string" && pasted.trim() && !content) {
      content = pasted.trim();
    }
  } else {
    try {
      const body = await request.json();
      content = typeof body.content === "string" ? body.content.trim() : "";
      useAi = body.useAi === true;
      if (typeof body.documentName === "string" && body.documentName.trim()) {
        outputFilename = sanitizeCustomDocumentName(body.documentName.trim());
      }
      preparedBy = typeof body.preparedBy === "string" ? body.preparedBy.trim() || undefined : undefined;
      preparedFor = typeof body.preparedFor === "string" ? body.preparedFor.trim() || undefined : undefined;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  }

  if (!content) {
    return NextResponse.json(
      { error: "Provide a file upload or paste content." },
      { status: 400 }
    );
  }

  let docInput: BrandedDocInput;

  if (isSheet && content.startsWith("{")) {
    try {
      const { title, headers, rows } = JSON.parse(content) as {
        title?: string;
        headers: string[];
        rows: string[][];
      };
      docInput = {
        title: title ?? "Spreadsheet",
        preparedBy,
        preparedFor,
        blocks: [{ type: "table", headers: headers ?? [], rows: rows ?? [] }],
      };
    } catch {
      docInput = markdownToBrandedDocInput(content, {
        preparedBy,
        preparedFor,
      });
    }
  } else if (useAi && process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4",
          max_tokens: 4096,
          system: `${VA_TEMPLATE_BRAND_GUIDE}\n\nConvert the user's content into clean Markdown that follows the brand guide: use ## for sections, ### for subsections, - for bullets, > for callouts, and markdown tables with |. Preserve {{placeholders}}. Output only the markdown, no explanation.`,
          messages: [
            {
              role: "user",
              content: `Convert this into clean Mom Ops–style Markdown:\n\n${content.slice(0, 50000)}`,
            },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: err || "AI structuring failed." },
          { status: 502 }
        );
      }
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const block = data.content?.find((c) => c.type === "text");
      const aiMarkdown = block?.text?.trim() ?? content;
      docInput = markdownToBrandedDocInput(aiMarkdown, {
        preparedBy,
        preparedFor,
      });
    } catch (e) {
      return NextResponse.json(
        { error: "AI structuring failed. Try without “Use AI” or try again." },
        { status: 502 }
      );
    }
  } else {
    docInput = markdownToBrandedDocInput(content, {
      preparedBy,
      preparedFor,
    });
  }

  try {
    const buffer = await buildBrandedDocx(docInput);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    console.error("[brand-document] buildBrandedDocx error:", e);
    return NextResponse.json(
      { error: "Failed to build branded document. Please try again." },
      { status: 500 }
    );
  }
}
