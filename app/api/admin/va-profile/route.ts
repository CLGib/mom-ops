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

  if (!vaId || !displayName?.trim()) {
    return NextResponse.json({ error: "vaId and display_name are required" }, { status: 400 });
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

  const { error: upsertError } = await supabase.from("va_profiles").upsert(
    {
      user_id: vaId,
      display_name,
      bio,
      profile_image_url: profileImageUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
