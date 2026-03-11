"use client";

import { useState, useRef, useEffect } from "react";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const LAYOUT_OPTIONS = [
  "Flat Lay (top-down)",
  "Lifestyle Scene",
  "Collage",
  "Minimal White Background",
  "Seasonal Themed",
] as const;

const BACKGROUND_OPTIONS = [
  "White",
  "Pastel",
  "Rustic Wood",
  "Kitchen Counter",
  "Outdoor Spring",
  "Custom",
] as const;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

function isAllowedImageFile(file: File): boolean {
  const type = file.type?.toLowerCase() ?? "";
  return ALLOWED_IMAGE_TYPES.some((t) => type === t);
}

type ReferenceEntry = { file: File; objectUrl: string };

type FormState = {
  description: string;
  layoutStyle: string;
  backgroundStyle: string;
  customBackground: string;
  variations: number;
  referenceFiles: ReferenceEntry[];
};

const initialForm: FormState = {
  description: "",
  layoutStyle: LAYOUT_OPTIONS[0],
  backgroundStyle: BACKGROUND_OPTIONS[0],
  customBackground: "",
  variations: 1,
  referenceFiles: [],
};

export default function MockUpGeneratorClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<{ b64: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.append("description", form.description.trim());
    fd.append("layoutStyle", form.layoutStyle);
    fd.append("backgroundStyle", form.backgroundStyle);
    if (form.backgroundStyle === "Custom") {
      fd.append("customBackground", form.customBackground.trim());
    }
    fd.append("variations", String(form.variations));
    for (const { file } of form.referenceFiles) {
      fd.append("referenceImage", file);
    }
    return fd;
  }

  async function generateMockups(payload: FormData, replaceIndex?: number) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/toolbox/mockup", {
        method: "POST",
        body: payload,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Image generation failed. Please try again.");
        return;
      }
      const newImages = (data.images ?? []) as { b64: string }[];
      if (replaceIndex !== undefined && newImages.length > 0) {
        setImages((prev) => {
          const next = [...prev];
          next[replaceIndex] = newImages[0];
          return next;
        });
      } else {
        setImages(newImages);
      }
    } catch {
      setError("Image generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const desc = form.description.trim();
    if (!desc) {
      setError("Idea description is required.");
      return;
    }
    const oversized = form.referenceFiles.find((e) => e.file.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      setError("Each reference image must be 10MB or smaller.");
      return;
    }
    setError(null);
    generateMockups(buildFormData());
  }

  function handleRegenerateOne(index: number) {
    const desc = form.description.trim();
    if (!desc) {
      setError("Idea description is required.");
      return;
    }
    const fd = new FormData();
    fd.append("description", desc);
    fd.append("layoutStyle", form.layoutStyle);
    fd.append("backgroundStyle", form.backgroundStyle);
    if (form.backgroundStyle === "Custom") {
      fd.append("customBackground", form.customBackground.trim());
    }
    fd.append("variations", "1");
    for (const { file } of form.referenceFiles) {
      fd.append("referenceImage", file);
    }
    generateMockups(fd, index);
  }

  function handleRegenerateAll() {
    const desc = form.description.trim();
    if (!desc) {
      setError("Idea description is required.");
      return;
    }
    generateMockups(buildFormData());
  }

  function handleClearForm() {
    form.referenceFiles.forEach((e) => URL.revokeObjectURL(e.objectUrl));
    setForm(initialForm);
    setImages([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const referenceFilesRef = useRef(form.referenceFiles);
  referenceFilesRef.current = form.referenceFiles;
  useEffect(() => {
    return () => {
      referenceFilesRef.current.forEach((e) => URL.revokeObjectURL(e.objectUrl));
    };
  }, []);

  function addReferenceFiles(filesToAdd: File[]): boolean {
    let hasError = false;
    const next: ReferenceEntry[] = [...form.referenceFiles];
    for (const file of filesToAdd) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError("Each reference image must be 10MB or smaller.");
        hasError = true;
        break;
      }
      if (!isAllowedImageFile(file)) {
        setError("Reference images must be JPG or PNG.");
        hasError = true;
        break;
      }
      next.push({ file, objectUrl: URL.createObjectURL(file) });
    }
    if (!hasError && next.length > form.referenceFiles.length) {
      setError(null);
      updateForm("referenceFiles", next);
    }
    return !hasError;
  }

  function removeReferenceFile(index: number) {
    setForm((prev) => {
      const entry = prev.referenceFiles[index];
      if (entry) URL.revokeObjectURL(entry.objectUrl);
      return {
        ...prev,
        referenceFiles: prev.referenceFiles.filter((_, i) => i !== index),
      };
    });
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file && isAllowedImageFile(file)) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addReferenceFiles(files);
    }
  }

  function downloadImage(b64: string, index: number) {
    try {
      const blob = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mockup-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files;
    if (!chosen?.length) return;
    const files = Array.from(chosen);
    addReferenceFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 360px) 1fr",
        gap: "var(--space-xl)",
        alignItems: "start",
      }}
    >
      {/* Left panel: form */}
      <section className="card" style={{ padding: "var(--space-lg)", position: "sticky", top: "var(--space-md)" }}>
        <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
          Create mock-up
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Describe your idea and optionally add reference images (paste or upload). Choose layout and background style, then generate.
        </p>
        <form onSubmit={handleSubmit} onPaste={handlePaste}>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="mockup-description">
              Idea description <span style={{ color: "var(--color-error, #b91c1c)" }}>*</span>
            </label>
            <textarea
              id="mockup-description"
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              placeholder="Easter basket for toddler girl with pastel eggs, small plush bunny, pink shredded paper, mini chocolate bars. Flat lay style."
              className="form-input"
              rows={4}
              style={{ width: "100%", resize: "vertical", marginTop: "var(--space-xs)" }}
              disabled={loading}
              aria-describedby={error ? "mockup-error" : undefined}
            />
          </div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="mockup-reference">Reference images (optional, JPG or PNG, max 10MB each)</label>
            <p className="form-note" style={{ marginTop: "var(--space-xs)", fontSize: "0.8125rem" }}>
              Upload multiple or paste an image (Ctrl+V / Cmd+V) while focused here.
            </p>
            <input
              ref={fileInputRef}
              id="mockup-reference"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              multiple
              onChange={onFileChange}
              style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
              disabled={loading}
              aria-label="Choose reference images"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              style={{
                marginTop: "var(--space-xs)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-sm)",
                width: "100%",
                minHeight: 88,
                padding: "var(--space-md)",
                border: "2px dashed var(--border, #d1d5db)",
                borderRadius: "var(--radius, 6px)",
                background: "var(--bg-alt, #f9fafb)",
                color: "var(--text-muted, #6b7280)",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "border-color 0.15s, background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (loading) return;
                e.currentTarget.style.borderColor = "var(--color-primary, #6366f1)";
                e.currentTarget.style.background = "var(--bg, #fff)";
                e.currentTarget.style.color = "var(--color-primary, #6366f1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border, #d1d5db)";
                e.currentTarget.style.background = "var(--bg-alt, #f9fafb)";
                e.currentTarget.style.color = "var(--text-muted, #6b7280)";
              }}
              onFocus={(e) => {
                if (loading) return;
                e.currentTarget.style.borderColor = "var(--color-primary, #6366f1)";
                e.currentTarget.style.outline = "2px solid var(--color-primary, #6366f1)";
                e.currentTarget.style.outlineOffset = "2px";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border, #d1d5db)";
                e.currentTarget.style.outline = "none";
              }}
            >
              <span aria-hidden style={{ fontSize: "1.5rem", lineHeight: 1 }}>📤</span>
              <span>Click here to upload images</span>
            </button>
            {form.referenceFiles.length > 0 && (
              <ul style={{ marginTop: "var(--space-sm)", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                {form.referenceFiles.map((entry, idx) => (
                  <li
                    key={entry.objectUrl}
                    style={{
                      position: "relative",
                      width: 64,
                      height: 64,
                      borderRadius: "var(--radius, 6px)",
                      overflow: "hidden",
                      border: "1px solid var(--border, #e5e7eb)",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={entry.objectUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeReferenceFile(idx)}
                      disabled={loading}
                      aria-label={`Remove ${entry.file.name}`}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        fontSize: "0.875rem",
                        lineHeight: 1,
                        cursor: loading ? "not-allowed" : "pointer",
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="mockup-layout">Layout style</label>
            <select
              id="mockup-layout"
              value={form.layoutStyle}
              onChange={(e) => updateForm("layoutStyle", e.target.value)}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
            >
              {LAYOUT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="mockup-background">Background style</label>
            <select
              id="mockup-background"
              value={form.backgroundStyle}
              onChange={(e) => updateForm("backgroundStyle", e.target.value)}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
            >
              {BACKGROUND_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {form.backgroundStyle === "Custom" && (
              <input
                type="text"
                value={form.customBackground}
                onChange={(e) => updateForm("customBackground", e.target.value)}
                placeholder="Describe your custom background"
                className="form-input"
                style={{ width: "100%", marginTop: "var(--space-sm)" }}
                disabled={loading}
              />
            )}
          </div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="mockup-variations">Number of variations (1–5)</label>
            <input
              id="mockup-variations"
              type="number"
              min={1}
              max={5}
              value={form.variations}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n)) updateForm("variations", Math.max(1, Math.min(5, n)));
              }}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
            />
          </div>
          {error && (
            <p id="mockup-error" role="alert" className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-md)" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.description.trim()}
            >
              {loading ? "Generating…" : "Generate Mock-Up"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearForm}
              disabled={loading}
            >
              Clear Form
            </button>
          </div>
        </form>
      </section>

      {/* Right panel: results */}
      <section>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          Generated mock-ups
        </h2>
        {loading && (
          <div className="card" style={{ padding: "var(--space-xl)", textAlign: "center" }}>
            <p className="form-note" style={{ margin: 0 }}>
              Generating {form.variations} mock-up{form.variations !== 1 ? "s" : ""}…
            </p>
            <div
              className="mockup-spinner"
              style={{
                marginTop: "var(--space-md)",
                width: 32,
                height: 32,
                marginLeft: "auto",
                marginRight: "auto",
              }}
              aria-hidden
            />
          </div>
        )}
        {!loading && images.length === 0 && (
          <p className="form-note">
            Your generated images will appear here. Fill in the description and click Generate Mock-Up.
          </p>
        )}
        {!loading && images.length > 0 && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRegenerateAll}
                disabled={loading}
              >
                Regenerate All
              </button>
              <span className="form-note" style={{ alignSelf: "center" }}>
                Edit the form on the left and click Generate Mock-Up to create new variations.
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--space-lg)",
              }}
            >
              {images.map((img, index) => (
                <div key={index} className="card" style={{ padding: "var(--space-md)", overflow: "hidden" }}>
                  <div style={{ position: "relative", paddingBottom: "100%", backgroundColor: "var(--bg-alt, #f3f4f6)", borderRadius: "var(--radius, 6px)", overflow: "hidden" }}>
                    <img
                      src={`data:image/png;base64,${img.b64}`}
                      alt={`Mock-up ${index + 1}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-sm)", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => downloadImage(img.b64, index)}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleRegenerateOne(index)}
                      disabled={loading}
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
