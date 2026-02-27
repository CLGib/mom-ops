"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "va-profile-images";
const MAX_BIO = 240;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  vaUserId: string;
  initial: {
    display_name: string;
    profile_image_url: string | null;
    bio: string;
  };
};

export default function VAProfileForm({ vaUserId, initial }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.profile_image_url);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(initial.profile_image_url);
      return;
    }
    if (!file.type.startsWith("image/") || !ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be 2MB or smaller.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      let profileImageUrl: string | null = initial.profile_image_url;

      if (avatarFile && avatarFile.size > 0) {
        const path = `${vaUserId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (uploadError) {
          setError(uploadError.message || "Image upload failed.");
          setLoading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        profileImageUrl = urlData.publicUrl;
      }

      const { error: upsertError } = await supabase
        .from("va_profiles")
        .upsert(
          {
            user_id: vaUserId,
            display_name: trimmedName,
            bio: bio.slice(0, MAX_BIO) || null,
            profile_image_url: profileImageUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        setError(upsertError.message || "Failed to save profile.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setAvatarFile(null);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 480 }}>
      {error && (
        <p className="form-error" style={{ marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-note" style={{ marginBottom: "var(--space-sm)", color: "var(--color-success, green)" }}>
          Profile saved.
        </p>
      )}

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="va-display-name" className="form-label">
          Display name (required)
        </label>
        <input
          id="va-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input"
          required
          maxLength={200}
        />
      </div>

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="va-bio" className="form-label">
          Bio (max {MAX_BIO} characters, plain text only)
        </label>
        <textarea
          id="va-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
          className="input"
          rows={3}
          maxLength={MAX_BIO}
          placeholder="Short professional bio shown to members."
        />
        <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
          {bio.length}/{MAX_BIO}
        </p>
      </div>

      <div style={{ marginBottom: "var(--space-md)" }}>
        <span className="form-label">Profile image</span>
        <p className="form-note" style={{ marginBottom: "var(--space-xs)" }}>
          Square image, max 2MB. JPEG, PNG, or WebP.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
          {avatarPreview && (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: "var(--color-border, #e5e5e5)",
              }}
            >
              <img
                src={avatarPreview}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ fontSize: "0.9rem" }}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
