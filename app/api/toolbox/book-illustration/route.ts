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

  const [{ data: roleRow }, { data: adminRow }, { data: directorRow }] = await Promise.all([
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

type PromptInput = {
  illustrationSummary: string;
  characterDetails: string;
  settingDetails: string;
  actionDetails: string;
  artStyle: string;
  colorPalette: string;
  mood: string;
  extraNotes: string;
};

function buildPrompt(input: PromptInput): string {
  return `Create a polished children's book illustration.

High-level scene:
${input.illustrationSummary}

Characters:
${input.characterDetails || "Not specified"}

Setting:
${input.settingDetails || "Not specified"}

What is happening in the scene:
${input.actionDetails || "Not specified"}

Requested art style:
${input.artStyle || "Whimsical children's book illustration"}

Color palette:
${input.colorPalette || "Bright, kid-friendly colors"}

Mood and tone:
${input.mood || "Warm, friendly, playful"}

Additional notes:
${input.extraNotes || "No additional notes"}

Requirements:
- The illustration should look like a cohesive page from a children's picture book.
- Keep faces and key visual traits consistent with reference photos when provided.
- Use clean composition, readable character silhouettes, and expressive body language.
- Avoid text overlays, logos, or watermarks.
- Output one complete illustration scene image.`;
}

async function fileToBase64(file: File): Promise<{ imageBytes: string; mimeType: string }> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type === "image/jpg" ? "image/jpeg" : file.type || "image/png";
  return { imageBytes: base64, mimeType };
}

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
      if (lower.includes("api key") || lower.includes("invalid api key") || lower.includes("api_key")) {
        return "Invalid or missing API key. Check GEMINI_API_KEY in your environment.";
      }
      if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429")) {
        return "Image generation quota exceeded. Try again later or check your API quota.";
      }
      if (lower.includes("403") || lower.includes("permission") || lower.includes("not enabled")) {
        return "Image generation is not enabled for this API key or project.";
      }
      if (lower.includes("404") || lower.includes("not found")) {
        return "Image model not found. Try removing GEMINI_IMAGE_MODEL to use the default model.";
      }
      if (lower.includes("content") && lower.includes("block")) {
        return "The prompt or image was blocked by safety filters. Try a different description or reference image.";
      }
      if (msg.length < 200) return msg;
    }
    if (status === 401 || code === 401) return "Invalid API key. Check GEMINI_API_KEY.";
    if (status === 429 || code === 429) return "Too many requests. Try again later.";
    if (status === 403 || code === 403) return "Image generation not enabled for this API key.";
  }
  return "Image generation failed. Please try again.";
}

function extractImageB64FromResponse(response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>): string[] {
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
    return status === 404 || code === 404 || msg.includes("not found") || msg.includes("404") || msg.includes("model");
  }
  return false;
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

  const limitResult = await checkRateLimit(`toolbox-book-illustration:${user!.id}`, RATE_LIMITS.vaBookIllustrationGenerator);
  if (!limitResult.success) {
    const retryAfter = Math.max(1, limitResult.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const referenceImages: File[] = [];
  let variations = 1;
  const promptInput: PromptInput = {
    illustrationSummary: "",
    characterDetails: "",
    settingDetails: "",
    actionDetails: "",
    artStyle: "",
    colorPalette: "",
    mood: "",
    extraNotes: "",
  };

  const formData = await request.formData();
  const getText = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  promptInput.illustrationSummary = getText("illustrationSummary");
  promptInput.characterDetails = getText("characterDetails");
  promptInput.settingDetails = getText("settingDetails");
  promptInput.actionDetails = getText("actionDetails");
  promptInput.artStyle = getText("artStyle");
  promptInput.colorPalette = getText("colorPalette");
  promptInput.mood = getText("mood");
  promptInput.extraNotes = getText("extraNotes");

  const v = formData.get("variations");
  if (typeof v === "string") {
    const parsed = parseInt(v, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) variations = parsed;
  }

  const files = formData.getAll("referenceImage");
  for (const file of files) {
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_REFERENCE_SIZE_BYTES) {
        return NextResponse.json({ error: "Each reference image must be 10MB or smaller." }, { status: 400 });
      }
      const type = file.type?.toLowerCase() ?? "";
      if (!ALLOWED_TYPES.some((t) => type === t || type === "image/jpeg")) {
        return NextResponse.json({ error: "Reference images must be JPG or PNG." }, { status: 400 });
      }
      referenceImages.push(file);
    }
  }

  if (!promptInput.illustrationSummary) {
    return NextResponse.json({ error: "Scene summary is required." }, { status: 400 });
  }
  if (!promptInput.characterDetails) {
    return NextResponse.json({ error: "Character details are required." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
  const FALLBACK_IMAGE_MODEL = "gemini-2.0-flash-exp";
  const configuredModel = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const prompt = buildPrompt(promptInput);

  const contents: string | Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> =
    referenceImages.length === 0
      ? prompt
      : [
          { text: `Use these reference images to preserve character consistency. Then generate a new illustration that follows this prompt.\n\nPrompt: ${prompt}` },
          ...(
            await Promise.all(
              referenceImages.map(async (file) => {
                const { imageBytes, mimeType } = await fileToBase64(file);
                return { inlineData: { data: imageBytes, mimeType } };
              })
            )
          ),
        ];

  try {
    const results: { b64: string }[] = [];
    let modelToUse = configuredModel;

    for (let i = 0; i < variations; i++) {
      try {
        const response = await ai.models.generateContent({
          model: modelToUse,
          contents,
          config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
        });
        for (const b64 of extractImageB64FromResponse(response)) {
          results.push({ b64 });
        }
      } catch (callErr) {
        if (isModelNotFoundError(callErr) && modelToUse !== FALLBACK_IMAGE_MODEL) {
          modelToUse = FALLBACK_IMAGE_MODEL;
          const response = await ai.models.generateContent({
            model: modelToUse,
            contents,
            config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
          });
          for (const b64 of extractImageB64FromResponse(response)) {
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
    console.error("[toolbox/book-illustration] Gemini image generation error:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 502 });
  }
}
