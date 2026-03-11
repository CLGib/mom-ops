"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

const MAX_BIO = 240;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type Props = {
  vaId: string;
  initial: {
    display_name: string;
    profile_image_url: string | null;
    bio: string;
    work_requires_review?: boolean;
  };
};

export default function EditVAProfileForm({ vaId, initial }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [workRequiresReview, setWorkRequiresReview] = useState(initial.work_requires_review ?? true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.profile_image_url);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(initial.profile_image_url);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be 2MB or smaller.");
      return;
    }
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
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
    try {
      const formData = new FormData();
      formData.set("vaId", vaId);
      formData.set("display_name", trimmedName);
      formData.set("bio", bio.slice(0, MAX_BIO));
      formData.set("work_requires_review", workRequiresReview ? "true" : "false");
      if (avatarFile) formData.set("avatar", avatarFile);

      const res = await fetch("/api/admin/va-profile", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save profile.");
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
          className="form-input"
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
          className="form-input"
          rows={3}
          maxLength={MAX_BIO}
          placeholder="Short professional bio shown to members."
        />
        <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
          {bio.length}/{MAX_BIO}
        </p>
      </div>

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={workRequiresReview}
            onChange={(e) => setWorkRequiresReview(e.target.checked)}
          />
          <span className="form-label" style={{ marginBottom: 0 }}>Training mode (work requires review before member sees it)</span>
        </label>
        <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
          When on, this VA&apos;s messages are hidden from the member until you approve them. Turn off for full-access VAs.
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
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ fontSize: "0.9rem" }}
            />
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
