import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user, error: null as null };
}

/** GET: List all landing real examples (admin only). */
export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  const { data: rows, error } = await supabase
    .from("landing_real_examples")
    .select("id, title, request_text, deliverable_images, deliverable_pdf, caption, thumbnail_url, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const examples = (rows ?? []).map((r) => {
    const rawImages = r.deliverable_images;
    const deliverableImages =
      Array.isArray(rawImages) && rawImages.length > 0
        ? rawImages.filter((u): u is string => typeof u === "string" && u.trim() !== "")
        : null;
    return {
      id: r.id,
      title: r.title ?? "",
      requestText: r.request_text ?? "",
      deliverableImages,
      deliverablePdf: r.deliverable_pdf ?? null,
      caption: r.caption ?? null,
      thumbnailUrl: r.thumbnail_url ?? null,
      sortOrder: r.sort_order ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return NextResponse.json({ examples });
}

/** POST: Create a new landing real example (admin only). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (auth.error) return auth.error;

  let body: {
    title?: string;
    requestText?: string;
    deliverableImages?: string[];
    deliverablePdf?: string;
    caption?: string;
    thumbnailUrl?: string | null;
    sortOrder?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const requestText = typeof body.requestText === "string" ? body.requestText.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const deliverableImages =
    Array.isArray(body.deliverableImages) && body.deliverableImages.length > 0
      ? body.deliverableImages.filter((u): u is string => typeof u === "string" && u.trim() !== "").slice(0, 5)
      : null;
  const deliverablePdf =
    typeof body.deliverablePdf === "string" && body.deliverablePdf.trim() !== ""
      ? body.deliverablePdf.trim()
      : null;

  if (!deliverableImages && !deliverablePdf) {
    return NextResponse.json(
      { error: "Provide either deliverableImages (1–5 URLs) or deliverablePdf (one URL)" },
      { status: 400 }
    );
  }

  const caption = typeof body.caption === "string" ? body.caption.trim() || null : null;
  const thumbnailUrl = typeof body.thumbnailUrl === "string" ? body.thumbnailUrl.trim() || null : null;
  const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;

  const insert: {
    title: string;
    request_text: string;
    deliverable_images: string[] | null;
    deliverable_pdf: string | null;
    caption?: string | null;
    thumbnail_url?: string | null;
    sort_order: number;
  } = {
    title,
    request_text: requestText,
    deliverable_images: deliverableImages ?? null,
    deliverable_pdf: deliverablePdf ?? null,
    sort_order: sortOrder,
  };
  if (caption != null) insert.caption = caption;
  if (thumbnailUrl != null) insert.thumbnail_url = thumbnailUrl;

  const { data: row, error } = await supabase
    .from("landing_real_examples")
    .insert(insert)
    .select("id, title, request_text, deliverable_images, deliverable_pdf, caption, thumbnail_url, sort_order, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: row.id,
    title: row.title ?? "",
    requestText: row.request_text ?? "",
    deliverableImages: row.deliverable_images ?? null,
    deliverablePdf: row.deliverable_pdf ?? null,
    caption: row.caption ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
