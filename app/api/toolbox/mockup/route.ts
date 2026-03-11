import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { GoogleGenAI, Modality } from "@google/genai";

const MAX_REFERENCE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

async function requireToolboxRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

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

function buildPrompt(description: string, layoutStyle: string, backgroundStyle: string): string {
  return `Create a high-quality, realistic mock-up image.
Style: ${layoutStyle}.
Background: ${backgroundStyle}.
Scene description: ${description}.
Bright lighting, clean composition, Pinterest-style, professional product photography, realistic proportions.`;
}

async function fileToBase64(file: File): Promise<{ imageBytes: string; mimeType: string }> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type === "image/jpg" ? "image/jpeg" : file.type || "image/png";
  return { imageBytes: base64, mimeType };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Image generation is not configured. Set GEMINI_API_KEY (get a key at https://aistudio.google.com/app/api-keys)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const auth = await requireToolboxRole(supabase);
  if (auth.error) return auth.error;
  const { user } = auth;

  const limitResult = await checkRateLimit(
    `toolbox-mockup:${user!.id}`,
    RATE_LIMITS.vaMockupGenerator
  );
  if (!limitResult.success) {
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let description = "";
  let layoutStyle = "Flat Lay (top-down)";
  let backgroundStyle = "White";
  let customBackground = "";
  let variations = 1;
  const referenceImages: File[] = [];

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const desc = formData.get("description");
    description = typeof desc === "string" ? desc.trim() : "";
    const layout = formData.get("layoutStyle");
    layoutStyle = typeof layout === "string" ? layout.trim() || layoutStyle : layoutStyle;
    const bg = formData.get("backgroundStyle");
    backgroundStyle = typeof bg === "string" ? bg.trim() || backgroundStyle : backgroundStyle;
    const custom = formData.get("customBackground");
    customBackground = typeof custom === "string" ? custom.trim() : "";
    const v = formData.get("variations");
    if (typeof v === "string") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 5) variations = n;
    }
    const files = formData.getAll("referenceImage");
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_REFERENCE_SIZE_BYTES) {
          return NextResponse.json(
            { error: "Each reference image must be 10MB or smaller." },
            { status: 400 }
          );
        }
        const type = file.type?.toLowerCase() ?? "";
        if (!ALLOWED_TYPES.some((t) => type === t || type === "image/jpeg")) {
          return NextResponse.json(
            { error: "Reference images must be JPG or PNG." },
            { status: 400 }
          );
        }
        referenceImages.push(file);
      }
    }
  } else {
    try {
      const body = await request.json();
      description = typeof body.description === "string" ? body.description.trim() : "";
      layoutStyle = typeof body.layoutStyle === "string" ? body.layoutStyle.trim() || layoutStyle : layoutStyle;
      backgroundStyle = typeof body.backgroundStyle === "string" ? body.backgroundStyle.trim() || backgroundStyle : backgroundStyle;
      customBackground = typeof body.customBackground === "string" ? body.customBackground.trim() : "";
      const v = body.variations;
      if (typeof v === "number" && v >= 1 && v <= 5) variations = v;
      else if (typeof v === "string") {
        const n = parseInt(v, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 5) variations = n;
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
  }

  if (!description) {
    return NextResponse.json({ error: "Idea description is required." }, { status: 400 });
  }

  const backgroundLabel = backgroundStyle === "Custom" ? (customBackground || "custom") : backgroundStyle;
  const prompt = buildPrompt(description, layoutStyle, backgroundLabel);

  const ai = new GoogleGenAI({ apiKey });

  // Gemini native image generation (works with API key from AI Studio). Use model IDs from https://ai.google.dev/gemini-api/docs/models
  const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
  const FALLBACK_IMAGE_MODEL = "gemini-2.0-flash-exp";
  const configuredModel = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;

  function extractImageB64FromResponse(response: Awaited<ReturnType<typeof ai.models.generateContent>>): string[] {
    const out: string[] = [];
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return out;
    for (const part of parts) {
      const data = (part as { inlineData?: { data?: string } }).inlineData?.data;
      if (data) out.push(data);
    }
    return out;
  }

  function isModelNotFoundError(err: unknown): boolean {
    if (err && typeof err === "object") {
      const obj = err as Record<string, unknown>;
      const msg = String(obj.message ?? "").toLowerCase();
      const status = obj.status ?? obj.statusCode;
      const code = (obj.error as Record<string, unknown> | undefined)?.code ?? obj.code;
      return (
        status === 404 ||
        code === 404 ||
        msg.includes("not found") ||
        msg.includes("404") ||
        msg.includes("model")
      );
    }
    return false;
  }

  try {
    const results: { b64: string }[] = [];

    const contents: string | Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> =
      referenceImages.length === 0
        ? prompt
        : [
            { text: `Use these reference images as inspiration or context. Then generate a new image that follows the prompt.\n\nPrompt: ${prompt}` },
            ...(
              await Promise.all(
                referenceImages.map(async (file) => {
                  const { imageBytes, mimeType } = await fileToBase64(file);
                  return { inlineData: { data: imageBytes, mimeType } };
                })
              )
            ),
          ];

    let modelToUse = configuredModel;

    for (let i = 0; i < variations; i++) {
      try {
        const response = await ai.models.generateContent({
          model: modelToUse,
          contents,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });
        const b64List = extractImageB64FromResponse(response);
        for (const b64 of b64List) {
          results.push({ b64 });
        }
      } catch (callErr) {
        if (isModelNotFoundError(callErr) && modelToUse !== FALLBACK_IMAGE_MODEL) {
          modelToUse = FALLBACK_IMAGE_MODEL;
          const response = await ai.models.generateContent({
            model: modelToUse,
            contents,
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
          });
          const b64List = extractImageB64FromResponse(response);
          for (const b64 of b64List) {
            results.push({ b64 });
          }
        } else {
          throw callErr;
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          error:
            "No images were returned. The prompt may have been blocked by safety filters, or the model may be temporarily unavailable. Try a different description or try again later.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ images: results });
  } catch (err) {
    console.error("[toolbox/mockup] Gemini image generation error:", err);
    const message = getErrorMessage(err);
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}

/** Extract a user-safe error message from Gemini/API errors. */
function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const msg = typeof obj.message === "string" ? obj.message : null;
    const status = obj.status ?? obj.statusCode;
    const errorObj = obj.error;
    const code =
      obj.code ??
      (errorObj && typeof errorObj === "object" && "code" in errorObj
        ? (errorObj as Record<string, unknown>).code
        : undefined);
    if (msg) {
      const lower = msg.toLowerCase();
      if (lower.includes("api key") || lower.includes("invalid api key") || lower.includes("api_key"))
        return "Invalid or missing API key. Check GEMINI_API_KEY in your environment.";
      if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429"))
        return "Image generation quota exceeded. Try again later or check your API quota.";
      if (lower.includes("vertex") || lower.includes("only supported by the vertex"))
        return "This image feature requires Vertex AI. Using Gemini native image generation (gemini-2.0-flash-exp) with your API key instead.";
      if (lower.includes("403") || lower.includes("permission") || lower.includes("not enabled"))
        return "Image generation is not enabled for this API key or project.";
      if (lower.includes("404") || lower.includes("not found"))
        return "Image model not found. Try removing GEMINI_IMAGE_MODEL to use the default (gemini-3.1-flash-image-preview), or use a model ID from https://ai.google.dev/gemini-api/docs/models.";
      if (lower.includes("content") && lower.includes("block"))
        return "The prompt or image was blocked by safety filters. Try a different description or reference image.";
      if (msg.length < 200) return msg;
    }
    if (status === 401 || code === 401) return "Invalid API key. Check GEMINI_API_KEY.";
    if (status === 429 || code === 429) return "Too many requests. Try again later.";
    if (status === 403 || code === 403) return "Image generation not enabled for this API key.";
  }
  return "Image generation failed. Please try again. If it persists, check the server logs or GEMINI_API_KEY and GEMINI_IMAGE_MODEL.";
}
