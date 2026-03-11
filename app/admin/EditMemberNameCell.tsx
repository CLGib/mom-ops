"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  memberId: string;
  fullName: string | null;
  preferredName: string | null;
  displayLabel: string;
};

export default function EditMemberNameCell({
  memberId,
  fullName,
  preferredName,
  displayLabel,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(fullName ?? "");
  const [preferred, setPreferred] = useState(preferredName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/member-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId,
          full_name: full.trim() || null,
          preferred_name: preferred.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) ?? "Failed to update name");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFull(fullName ?? "");
    setPreferred(preferredName ?? "");
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <td style={{ padding: "var(--space-sm)", verticalAlign: "top" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          <input
            type="text"
            className="input"
            placeholder="Full name"
            value={full}
            onChange={(e) => setFull(e.target.value)}
            style={{ fontSize: "0.875rem", padding: "4px 8px" }}
            aria-label="Full name"
          />
          <input
            type="text"
            className="input"
            placeholder="Preferred name"
            value={preferred}
            onChange={(e) => setPreferred(e.target.value)}
            style={{ fontSize: "0.875rem", padding: "4px 8px" }}
            aria-label="Preferred name"
          />
          {error && (
            <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", margin: 0, fontSize: "0.8rem" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ fontSize: "0.875rem" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
              style={{ fontSize: "0.875rem" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    );
  }

  return (
    <td style={{ padding: "var(--space-sm)" }}>
      <span style={{ marginRight: "var(--space-xs)" }}>{displayLabel}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn btn-secondary"
        style={{ fontSize: "0.75rem", padding: "2px 6px" }}
        aria-label="Edit name"
      >
        Edit
      </button>
    </td>
  );
}
