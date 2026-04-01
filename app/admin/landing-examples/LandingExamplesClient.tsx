"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LandingExampleRow } from "./page";

const BUCKET = "landing-examples";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_PDF_BYTES = 20 * 1024 * 1024;   // 20MB
const MAX_IMAGES = 5;

type Props = {
  initialExamples: LandingExampleRow[];
  loadError?: string | null;
};

export default function LandingExamplesClient({ initialExamples, loadError }: Props) {
  const [examples, setExamples] = useState<LandingExampleRow[]>(initialExamples);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LandingExampleRow | null>(null);

  async function refetch() {
    const res = await fetch("/api/admin/landing-examples", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setExamples(data.examples ?? []);
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(ex: LandingExampleRow) {
    setEditing(ex);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this example from the homepage? It will no longer appear in Explore real examples.")) return;
    const res = await fetch(`/api/admin/landing-examples/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setExamples((prev) => prev.filter((e) => e.id !== id));
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
    }
  }

  return (
    <>
      {loadError && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--color-error, #b91c1c)" }}>
          Could not load examples: {loadError}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center", marginBottom: "var(--space-lg)" }}>
        <button type="button" onClick={openCreate} className="btn btn-primary">
          Add example
        </button>
      </div>
      {examples.length === 0 ? (
        <p className="form-note">No examples yet. Add one to show on the homepage.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {examples.map((ex) => (
            <li
              key={ex.id}
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
                  <strong>{ex.title}</strong>
                  {ex.deliverableImages && (
                    <span style={{ marginLeft: "var(--space-sm)", fontSize: "0.875rem", color: "var(--text-soft, #666)" }}>
                      {ex.deliverableImages.length} image(s)
                    </span>
                  )}
                  {ex.deliverablePdf && (
                    <span style={{ marginLeft: "var(--space-sm)", fontSize: "0.875rem", color: "var(--text-soft, #666)" }}>
                      PDF
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                  <button type="button" onClick={() => openEdit(ex)} className="btn btn-secondary" style={{ fontSize: "0.875rem" }}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ex.id)}
                    className="btn"
                    style={{ fontSize: "0.875rem", color: "var(--color-error, #b91c1c)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--text-muted)", whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden", textOverflow: "ellipsis" }}>
                {ex.requestText.slice(0, 200)}{ex.requestText.length > 200 ? "…" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <CreateEditModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={refetch}
        editExample={editing}
      />
    </>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editExample: LandingExampleRow | null;
};

function CreateEditModal({ open, onClose, onSaved, editExample }: ModalProps) {
  const [title, setTitle] = useState("");
  const [requestText, setRequestText] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [deliverableType, setDeliverableType] = useState<"images" | "pdf">("images");
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editExample;

  async function uploadThumbnail(file: File | null) {
    if (!file) return;
    setUploadError(null);
    setUploadingThumbnail(true);
    if (!file.type.startsWith("image/")) {
      setUploadError("Thumbnail must be an image (JPEG, PNG, WebP, etc.).");
      setUploadingThumbnail(false);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Thumbnail must be 10MB or smaller.");
      setUploadingThumbnail(false);
      return;
    }
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 60);
    const path = `thumb_${crypto.randomUUID()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploadingThumbnail(false);
    if (upErr) {
      setUploadError(upErr.message ?? "Upload failed.");
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setThumbnailUrl(publicUrl);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }

  async function uploadImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploadingImages(true);
    const supabase = createClient();
    const urls: string[] = [];
    const toUpload = Array.from(files).slice(0, MAX_IMAGES).filter((f) => f.type.startsWith("image/"));
    for (const file of toUpload) {
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(`"${file.name}" is too large (max 10MB per image).`);
        setUploadingImages(false);
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 60);
      const path = `${crypto.randomUUID()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        setUploadError(upErr.message ?? "Upload failed.");
        setUploadingImages(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(publicUrl);
    }
    setImageUrlsText((prev) => (prev ? `${prev}\n${urls.join("\n")}` : urls.join("\n")).trim());
    setUploadingImages(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function uploadPdf(file: File | null) {
    if (!file) return;
    setUploadError(null);
    setUploadingPdf(true);
    if (file.size > MAX_PDF_BYTES) {
      setUploadError("PDF must be 20MB or smaller.");
      setUploadingPdf(false);
      return;
    }
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
    const path = `${crypto.randomUUID()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
    setUploadingPdf(false);
    if (upErr) {
      setUploadError(upErr.message ?? "Upload failed.");
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setPdfUrl(publicUrl);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  useEffect(() => {
    if (open) {
      setError(null);
      setUploadError(null);
      if (editExample) {
        setTitle(editExample.title);
        setRequestText(editExample.requestText);
        setThumbnailUrl(editExample.thumbnailUrl ?? "");
        if (editExample.deliverableImages && editExample.deliverableImages.length > 0) {
          setDeliverableType("images");
          setImageUrlsText(editExample.deliverableImages.join("\n"));
          setPdfUrl("");
        } else {
          setDeliverableType("pdf");
          setPdfUrl(editExample.deliverablePdf ?? "");
          setImageUrlsText("");
        }
        setCaption(editExample.caption ?? "");
        setSortOrder(editExample.sortOrder);
      } else {
        setTitle("");
        setRequestText("");
        setThumbnailUrl("");
        setDeliverableType("images");
        setImageUrlsText("");
        setPdfUrl("");
        setCaption("");
        setSortOrder(0);
      }
    }
  }, [open, editExample]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Title is required.");
      return;
    }

    const images = deliverableType === "images"
      ? imageUrlsText
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const pdf = deliverableType === "pdf" ? pdfUrl.trim() : "";

    if (deliverableType === "images" && images.length === 0) {
      setError("Upload at least one image or paste at least one image URL (max 5).");
      return;
    }
    if (deliverableType === "pdf" && !pdf) {
      setError("Upload a PDF or paste the PDF URL.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: t,
        requestText: requestText.trim(),
        deliverableImages: deliverableType === "images" ? images : null,
        deliverablePdf: deliverableType === "pdf" ? pdf : null,
        caption: caption.trim() || null,
        thumbnailUrl: thumbnailUrl.trim() || null,
        sortOrder,
      };

      if (isEdit) {
        const res = await fetch(`/api/admin/landing-examples/${editExample.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      } else {
        const res = await fetch("/api/admin/landing-examples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
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
      aria-labelledby="landing-example-modal-title"
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
        style={{ width: "100%", maxWidth: "36rem", maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="landing-example-modal-title" className="section-heading" style={{ marginTop: 0 }}>
          {isEdit ? "Edit example" : "Add example"}
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
            placeholder="e.g. Easter basket shoppable list"
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Request prompt (what the member asked for)</label>
          <textarea
            className="input"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Paste the task request / email from the member…"
            rows={5}
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Card thumbnail (optional)</label>
          <p className="form-note" style={{ marginBottom: "var(--space-xs)", fontSize: "0.8125rem" }}>
            Image shown on the example card on the homepage. If empty, the first deliverable image or a &quot;PDF&quot;/&quot;Example&quot; placeholder is used.
          </p>
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              disabled={uploadingThumbnail}
              onChange={(e) => uploadThumbnail(e.target.files?.[0] ?? null)}
              style={{ fontSize: "0.875rem" }}
              aria-label="Upload thumbnail"
            />
            {uploadingThumbnail && <span style={{ marginLeft: "var(--space-sm)", color: "var(--text-muted)" }}>Uploading…</span>}
          </div>
          <input
            type="text"
            className="input"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="Or paste thumbnail image URL"
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <fieldset style={{ marginBottom: "var(--space-md)" }}>
            <legend className="form-note" style={{ marginBottom: "var(--space-xs)" }}>Deliverable</legend>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", marginBottom: "var(--space-sm)" }}>
              <input
                type="radio"
                name="deliverableType"
                checked={deliverableType === "images"}
                onChange={() => setDeliverableType("images")}
              />
              Images (1–5 URLs) — book flipper in modal
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", marginBottom: "var(--space-sm)" }}>
              <input
                type="radio"
                name="deliverableType"
                checked={deliverableType === "pdf"}
                onChange={() => setDeliverableType("pdf")}
              />
              PDF (one URL) — iframe in modal
            </label>
          </fieldset>
          {deliverableType === "images" && (
            <>
              <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Images (1–5) — upload or paste URLs</label>
              <div style={{ marginBottom: "var(--space-sm)" }}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImages}
                  onChange={(e) => uploadImages(e.target.files)}
                  style={{ fontSize: "0.875rem" }}
                  aria-label="Upload images"
                />
                {uploadingImages && <span style={{ marginLeft: "var(--space-sm)", color: "var(--text-muted)" }}>Uploading…</span>}
              </div>
              <textarea
                className="input"
                value={imageUrlsText}
                onChange={(e) => setImageUrlsText(e.target.value)}
                placeholder="Or paste image URLs, one per line or comma-separated (max 5)"
                rows={3}
                style={{ width: "100%", marginBottom: "var(--space-md)" }}
              />
            </>
          )}
          {deliverableType === "pdf" && (
            <>
              <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>PDF — upload or paste URL</label>
              <div style={{ marginBottom: "var(--space-sm)" }}>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={uploadingPdf}
                  onChange={(e) => uploadPdf(e.target.files?.[0] ?? null)}
                  style={{ fontSize: "0.875rem" }}
                  aria-label="Upload PDF"
                />
                {uploadingPdf && <span style={{ marginLeft: "var(--space-sm)", color: "var(--text-muted)" }}>Uploading…</span>}
              </div>
              <input
                type="text"
                className="input"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="Or paste PDF URL (e.g. /assets/example.pdf)"
                style={{ width: "100%", marginBottom: "var(--space-md)" }}
              />
            </>
          )}
          {uploadError && (
            <p style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-xs)", marginBottom: "var(--space-sm)", fontSize: "0.875rem" }}>{uploadError}</p>
          )}
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Caption (optional)</label>
          <input
            type="text"
            className="input"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Short description for the deliverable"
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>Sort order (lower = first)</label>
          <input
            type="number"
            className="input"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            style={{ width: "6rem", marginBottom: "var(--space-lg)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
