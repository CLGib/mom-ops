import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "va-profile-images";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeBio(bio: string | null): string | null {
  if (bio == null || typeof bio !== "string") return null;
  const t = bio.trim().slice(0, 240);
  return t || null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleRes = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleRes.data?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const vaId = formData.get("vaId") as string | null;
  const displayName = formData.get("display_name") as string | null;
  const bioRaw = formData.get("bio") as string | null;
  const avatar = formData.get("avatar") as File | null;
  const workRequiresReviewRaw = formData.get("work_requires_review") as string | null;
  const paymentPerCreditRaw = formData.get("payment_per_credit") as string | null;

  if (!vaId) {
    return NextResponse.json({ error: "vaId is required" }, { status: 400 });
  }
  // Toggle-only: just work_requires_review (no display_name)
  const workRequiresReview =
    workRequiresReviewRaw === "true" ? true : workRequiresReviewRaw === "false" ? false : null;
  if (workRequiresReview !== null && displayName == null && !bioRaw && !avatar) {
    const { error: updateErr } = await supabase
      .from("va_profiles")
      .update({ work_requires_review: workRequiresReview, updated_at: new Date().toISOString() })
      .eq("user_id", vaId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (!displayName?.trim()) {
    return NextResponse.json({ error: "display_name is required when updating profile" }, { status: 400 });
  }

  // Use service to read VA's role so RLS does not 403 (admin check is user_roles; RLS uses admins table)
  const service = createServiceClient();
  const { data: vaRoleRow } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", vaId)
    .maybeSingle();
  if (vaRoleRow?.role !== "va") {
    return NextResponse.json({ error: "vaId must be a user with VA role" }, { status: 400 });
  }

  const display_name = displayName.trim();
  const bio = sanitizeBio(bioRaw);

  let profileImageUrl: string | null = null;

  const { data: existing } = await supabase
    .from("va_profiles")
    .select("profile_image_url")
    .eq("user_id", vaId)
    .single();

  if (avatar && avatar.size > 0) {
    if (!ALLOWED_TYPES.includes(avatar.type)) {
      return NextResponse.json({ error: "Image must be JPEG, PNG, or WebP" }, { status: 400 });
    }
    if (avatar.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 2MB or smaller" }, { status: 400 });
    }
    const path = `${vaId}.jpg`;
    const serviceSupabase = createServiceClient();
    const { error: bucketError } = await serviceSupabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (bucketError && !String(bucketError.message || "").toLowerCase().includes("already exists")) {
      return NextResponse.json({ error: bucketError.message || "Could not ensure bucket exists" }, { status: 500 });
    }
    const { error: uploadError } = await serviceSupabase.storage
      .from(BUCKET)
      .upload(path, avatar, { contentType: "image/jpeg", upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message || "Upload failed" }, { status: 500 });
    }
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (baseUrl) profileImageUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  } else if (existing?.profile_image_url) {
    profileImageUrl = existing.profile_image_url;
  }

  let payment_per_credit: number | undefined;
  if (paymentPerCreditRaw != null && paymentPerCreditRaw !== "") {
    const parsed = parseFloat(paymentPerCreditRaw);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 100) {
      payment_per_credit = parsed;
    }
  }

  const upsertPayload: {
    user_id: string;
    display_name: string;
    bio: string | null;
    profile_image_url: string | null;
    updated_at: string;
    work_requires_review?: boolean;
    payment_per_credit?: number;
  } = {
    user_id: vaId,
    display_name,
    bio,
    profile_image_url: profileImageUrl,
    updated_at: new Date().toISOString(),
  };
  if (workRequiresReview !== null) upsertPayload.work_requires_review = workRequiresReview;
  if (payment_per_credit !== undefined) upsertPayload.payment_per_credit = payment_per_credit;
  const { error: upsertError } = await supabase.from("va_profiles").upsert(upsertPayload, {
    onConflict: "user_id",
  });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** PATCH: update work_requires_review and/or training_complete (admin only). */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleRes = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (roleRes.data?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { vaId?: string; work_requires_review?: boolean; training_complete?: boolean; payment_per_credit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { vaId, work_requires_review, training_complete, payment_per_credit } = body;
  if (!vaId) {
    return NextResponse.json({ error: "vaId is required" }, { status: 400 });
  }
  const hasUpdate =
    typeof work_requires_review === "boolean" ||
    typeof training_complete === "boolean" ||
    (typeof payment_per_credit === "number" && payment_per_credit > 0 && payment_per_credit <= 100);
  if (!hasUpdate) {
    return NextResponse.json(
      { error: "At least one of work_requires_review (boolean), training_complete (boolean), or payment_per_credit (number 0-100) is required" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data: vaRoleRow } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", vaId)
    .maybeSingle();
  if (vaRoleRow?.role !== "va") {
    return NextResponse.json({ error: "vaId must be a user with VA role" }, { status: 400 });
  }

  const updates: {
    work_requires_review?: boolean;
    training_complete?: boolean;
    payment_per_credit?: number;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof work_requires_review === "boolean") updates.work_requires_review = work_requires_review;
  if (typeof training_complete === "boolean") updates.training_complete = training_complete;
  if (typeof payment_per_credit === "number" && payment_per_credit > 0 && payment_per_credit <= 100) {
    updates.payment_per_credit = payment_per_credit;
  }

  const { error } = await supabase.from("va_profiles").update(updates).eq("user_id", vaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
