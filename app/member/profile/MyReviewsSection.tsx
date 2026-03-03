"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTaskReview, deleteTaskReview } from "../actions";
import { formatRelative } from "@/lib/format-date";

export type MyReviewRow = {
  id: string;
  task_subject: string;
  rating: number;
  comment: string | null;
  visibility: "private" | "public";
  created_at: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} star${rating === 1 ? "" : "s"}`}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--border, #e8e6e2)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function MyReviewsSection({ reviews }: { reviews: MyReviewRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(r: MyReviewRow) {
    if (!confirm("Delete this review? This can't be undone.")) return;
    setError(null);
    setDeletingId(r.id);
    const result = await deleteTaskReview(r.id);
    setDeletingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function startEdit(r: MyReviewRow) {
    setEditingId(r.id);
    setComment(r.comment ?? "");
    setVisibility(r.visibility);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    setSaving(true);
    const result = await updateTaskReview(editingId, { comment: comment.trim() || null, visibility });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  if (reviews.length === 0) {
    return (
      <section className="card" style={{ marginTop: "var(--space-lg)" }}>
        <h2 className="section-heading">My reviews</h2>
        <p className="form-note">You haven&apos;t left any task reviews yet. After you complete a task, you can rate it and optionally share it publicly on the Reviews feed.</p>
      </section>
    );
  }

  return (
    <section className="card" style={{ marginTop: "var(--space-lg)" }}>
      <h2 className="section-heading">My reviews</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        You can change the comment or visibility (Public/Private) of any review, or delete it. Private reviews never appear in the feed.
      </p>
      {error && !editingId && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {reviews.map((r) => (
          <li
            key={r.id}
            style={{
              padding: "var(--space-md) 0",
              borderBottom: "1px solid var(--border, #e8e6e2)",
            }}
          >
            {editingId === r.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{r.task_subject}</p>
                <p style={{ margin: 0, color: "var(--accent, #b8860b)" }}><Stars rating={r.rating} /></p>
                <label className="form-note">
                  Comment (optional)
                  <textarea
                    className="input"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    style={{ width: "100%", marginTop: "var(--space-xs)" }}
                  />
                </label>
                <fieldset>
                  <legend className="form-note">Visibility</legend>
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`vis-${r.id}`}
                      checked={visibility === "private"}
                      onChange={() => setVisibility("private")}
                    />
                    <span>Private</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`vis-${r.id}`}
                      checked={visibility === "public"}
                      onChange={() => setVisibility("public")}
                    />
                    <span>Public</span>
                  </label>
                </fieldset>
                {error && <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">{error}</p>}
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-sm)" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{r.task_subject}</p>
                  <p style={{ margin: "var(--space-xs) 0", color: "var(--accent, #b8860b)" }}><Stars rating={r.rating} /></p>
                  {r.comment && <p style={{ margin: "var(--space-xs) 0", color: "var(--text-muted, #5c5955)" }}>&ldquo;{r.comment}&rdquo;</p>}
                  <p className="form-note" style={{ margin: "var(--space-xs) 0 0" }}>{formatRelative(r.created_at)}</p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "var(--space-xs)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: r.visibility === "public" ? "var(--accent-soft-bg, #f8f5ed)" : "var(--bg-alt, #f2f0ec)",
                      color: r.visibility === "public" ? "var(--accent, #b8860b)" : "var(--text-muted, #5c5955)",
                    }}
                  >
                    {r.visibility === "public" ? "Public" : "Private"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => startEdit(r)} disabled={!!deletingId}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDelete(r)}
                    disabled={!!deletingId}
                    style={{ color: "var(--color-error, #b91c1c)" }}
                  >
                    {deletingId === r.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
