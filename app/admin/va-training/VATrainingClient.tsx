"use client";

import { useState, useEffect } from "react";

export type TrainingSectionRecord = {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  video_url?: string | null;
  video_url_2?: string | null;
  image_urls?: string | null;
  pdf_urls?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  initialSections: TrainingSectionRecord[];
  loadError?: string | null;
};

export default function VATrainingClient({ initialSections, loadError }: Props) {
  const [sections, setSections] = useState<TrainingSectionRecord[]>(initialSections);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSectionRecord | null>(null);

  async function refetch() {
    const res = await fetch("/api/va/training-sections", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setSections(data.sections ?? []);
    }
  }

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(s: TrainingSectionRecord) {
    setEditing(s);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this section? VAs will no longer see it in training.")) return;
    const res = await fetch(`/api/va/training-sections/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setSections((prev) => prev.filter((s) => s.id !== id));
  }

  async function moveUp(index: number) {
    if (index <= 0) return;
    const curr = sections[index];
    const prev = sections[index - 1];
    const newCurrOrder = prev.sort_order;
    const newPrevOrder = curr.sort_order;
    const res1 = await fetch(`/api/va/training-sections/${curr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sort_order: newCurrOrder }),
    });
    const res2 = await fetch(`/api/va/training-sections/${prev.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sort_order: newPrevOrder }),
    });
    if (res1.ok && res2.ok) refetch();
  }

  async function moveDown(index: number) {
    if (index >= sections.length - 1) return;
    const curr = sections[index];
    const next = sections[index + 1];
    const newCurrOrder = next.sort_order;
    const newNextOrder = curr.sort_order;
    const res1 = await fetch(`/api/va/training-sections/${curr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sort_order: newCurrOrder }),
    });
    const res2 = await fetch(`/api/va/training-sections/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sort_order: newNextOrder }),
    });
    if (res1.ok && res2.ok) refetch();
  }

  return (
    <>
      {loadError && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--color-error, #b91c1c)" }}>
          Could not load sections: {loadError}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center", marginBottom: "var(--space-lg)" }}>
        <button type="button" onClick={openCreate} className="btn btn-primary">
          Add section
        </button>
      </div>
      {sections.length === 0 ? (
        <p className="form-note">
          No training sections yet. Add sections so VAs see them on the Training page. Order is used as displayed.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sections.map((s, index) => (
            <li
              key={s.id}
              className="card"
              style={{
                marginBottom: "var(--space-md)",
                padding: "var(--space-md)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-sm)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-sm)" }}>
                <div>
                  <strong>{s.title}</strong>
                  <span style={{ marginLeft: "var(--space-sm)", fontSize: "0.875rem", color: "var(--text-soft, #666)" }}>
                    Order: {s.sort_order}
                    {(s.video_url || s.video_url_2) && ` · ${[s.video_url, s.video_url_2].filter(Boolean).length} video(s)`}
                    {s.image_urls && ` · ${s.image_urls.trim().split(/\n/).filter(Boolean).length} screenshot(s)`}
                    {s.pdf_urls && ` · ${s.pdf_urls.trim().split(/\n/).filter(Boolean).length} PDF(s)`}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-xs)", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.875rem" }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === sections.length - 1}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.875rem" }}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => openEdit(s)} className="btn btn-secondary" style={{ fontSize: "0.875rem" }}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="btn"
                    style={{ fontSize: "0.875rem", color: "var(--color-error, #b91c1c)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "var(--space-sm)",
                  background: "var(--color-bg-subtle, #f5f5f5)",
                  borderRadius: 4,
                  fontSize: "0.8125rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {s.content.slice(0, 300)}{s.content.length > 300 ? "…" : ""}
              </pre>
            </li>
          ))}
        </ul>
      )}
      <CreateEditSectionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={refetch}
        editSection={editing}
        nextSortOrder={sections.length > 0 ? Math.max(...sections.map((s) => s.sort_order)) + 10 : 10}
      />
    </>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editSection: TrainingSectionRecord | null;
  nextSortOrder: number;
};

function CreateEditSectionModal({ open, onClose, onSaved, editSection, nextSortOrder }: ModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoUrl2, setVideoUrl2] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [pdfUrls, setPdfUrls] = useState("");
  const [sortOrder, setSortOrder] = useState(nextSortOrder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editSection;

  useEffect(() => {
    if (open) {
      setError(null);
      if (editSection) {
        setTitle(editSection.title);
        setContent(editSection.content);
        setVideoUrl(editSection.video_url ?? "");
        setVideoUrl2(editSection.video_url_2 ?? "");
        setImageUrls(editSection.image_urls ?? "");
        setPdfUrls(editSection.pdf_urls ?? "");
        setSortOrder(editSection.sort_order);
      } else {
        setTitle("");
        setContent("");
        setVideoUrl("");
        setVideoUrl2("");
        setImageUrls("");
        setPdfUrls("");
        setSortOrder(nextSortOrder);
      }
    }
  }, [open, editSection, nextSortOrder]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/va/training-sections/${editSection.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t,
            content,
            sort_order: sortOrder,
            video_url: videoUrl.trim() || null,
            video_url_2: videoUrl2.trim() || null,
            image_urls: imageUrls.trim() || null,
            pdf_urls: pdfUrls.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      } else {
        const res = await fetch("/api/va/training-sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t,
            content,
            sort_order: sortOrder,
            video_url: videoUrl.trim() || null,
            video_url_2: videoUrl2.trim() || null,
            image_urls: imageUrls.trim() || null,
            pdf_urls: pdfUrls.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-md)",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: "42rem", maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="section-modal-title" className="section-heading" style={{ marginTop: 0 }}>
          {isEdit ? "Edit section" : "Add section"}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <p style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-sm)" }}>{error}</p>
          )}
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Title</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Company values"
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Content (plain text; line breaks preserved)</label>
          <textarea
            className="input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Section body..."
            rows={8}
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Video URL Part 1 (optional)</label>
          <input
            type="url"
            className="input"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/... or https://loom.com/..."
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Video URL Part 2 (optional)</label>
          <input
            type="url"
            className="input"
            value={videoUrl2}
            onChange={(e) => setVideoUrl2(e.target.value)}
            placeholder="https://youtube.com/... or https://loom.com/..."
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Screenshot image URLs (optional, one per line - use full URLs to hosted images)</label>
          <textarea
            className="input"
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            placeholder={"https://example.com/screenshot1.png\nhttps://example.com/screenshot2.png"}
            rows={3}
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>PDF URLs (optional, one per line - use full URLs to hosted PDFs)</label>
          <textarea
            className="input"
            value={pdfUrls}
            onChange={(e) => setPdfUrls(e.target.value)}
            placeholder={"https://example.com/guide.pdf\nhttps://example.com/checklist.pdf"}
            rows={3}
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Sort order (lower = first)</label>
          <input
            type="number"
            className="input"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            style={{ width: "100%", maxWidth: "8rem", marginBottom: "var(--space-lg)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
