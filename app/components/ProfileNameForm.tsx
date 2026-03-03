"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberPublicProfile } from "../member/actions";

type Props = {
  initialFullName: string | null;
  initialPreferredName: string | null;
};

export default function ProfileNameForm({ initialFullName, initialPreferredName }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [preferredName, setPreferredName] = useState(initialPreferredName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const result = await updateMemberPublicProfile({
      full_name: fullName.trim() || null,
      preferred_name: preferredName.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "var(--space-lg)" }}>
      <h2 className="section-heading">Name</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        Update your full name and preferred name (used across the app).
      </p>
      <div className="form-group" style={{ marginBottom: "var(--space-sm)" }}>
        <label htmlFor="profile-full-name">Full name</label>
        <input
          id="profile-full-name"
          type="text"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Smith"
        />
      </div>
      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="profile-preferred-name">Preferred name</label>
        <input
          id="profile-preferred-name"
          type="text"
          className="input"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder="Jane"
        />
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-sm)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" style={{ color: "var(--color-success, #15803d)", marginBottom: "var(--space-sm)", fontSize: "0.875rem" }}>
          Saved.
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
