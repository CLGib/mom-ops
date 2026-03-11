"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateMemberPublicProfile } from "../actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type Props = {
  memberId: string;
  initialDisplayName: string | null;
  initialAvatarUrl: string | null;
};

export default function PublicProfileForm({
  memberId,
  initialDisplayName,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${memberId}/avatar.${ext === "jpeg" ? "jpg" : ext}`;
    const { error: uploadError } = await supabase.storage
      .from("member-avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("member-avatars").getPublicUrl(path);
    // Append cache-busting param so the browser loads the new image after save (avoids stale cache)
    const urlToSave = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
    const result = await updateMemberPublicProfile({ avatar_url: urlToSave });
    if (result.error) {
      setError(result.error);
      setUploading(false);
      return;
    }
    setAvatarUrl(urlToSave);
    setUploading(false);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await updateMemberPublicProfile({
      display_name: displayName.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const initials = (displayName.trim() || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
      <h2 className="section-heading">Public profile</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        This name and photo appear on public reviews you share. If you leave display name blank, we use your preferred name or &quot;Anonymous&quot; in the feed.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
        <div>
          <span className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>Photo</span>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--accent-soft-bg, #f8f5ed)",
                color: "var(--accent, #b8860b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: 600,
              }}
              aria-hidden
            >
              {initials}
            </div>
          )}
          <label style={{ display: "block", marginTop: "var(--space-sm)" }}>
            <span className="btn btn-secondary" style={{ display: "inline-block", cursor: "pointer" }}>
              {uploading ? "Uploading…" : "Change photo"}
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleAvatarChange}
              disabled={uploading}
              style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
              aria-label="Upload avatar"
            />
          </label>
        </div>
        <form onSubmit={handleSubmit} style={{ flex: 1, minWidth: "16rem" }}>
          <label htmlFor="display-name" className="form-note" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Display name (optional)
          </label>
          <input
            id="display-name"
            type="text"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Name shown on public reviews"
            style={{ width: "100%", maxWidth: "20rem" }}
          />
          {error && (
            <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-xs)" }} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-sm)" }} disabled={saving}>
            {saving ? "Saving…" : "Save display name"}
          </button>
        </form>
      </div>
    </section>
  );
}
