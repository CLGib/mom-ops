"use client";

import { useEffect, useRef, useState } from "react";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const ART_STYLE_OPTIONS = [
  "Whimsical watercolor",
  "Soft storybook pastel",
  "Bold cartoon",
  "Colored pencil sketch",
  "Paper-cut collage",
  "Custom",
] as const;

type ReferenceEntry = { file: File; objectUrl: string };

type FormState = {
  illustrationSummary: string;
  characterDetails: string;
  settingDetails: string;
  actionDetails: string;
  artStyle: string;
  customArtStyle: string;
  colorPalette: string;
  mood: string;
  extraNotes: string;
  variations: number;
  referenceFiles: ReferenceEntry[];
};

const initialForm: FormState = {
  illustrationSummary: "",
  characterDetails: "",
  settingDetails: "",
  actionDetails: "",
  artStyle: ART_STYLE_OPTIONS[0],
  customArtStyle: "",
  colorPalette: "Bright primary colors with soft highlights",
  mood: "Warm and playful",
  extraNotes: "",
  variations: 1,
  referenceFiles: [],
};

function isAllowedImageFile(file: File): boolean {
  const type = file.type?.toLowerCase() ?? "";
  return ALLOWED_IMAGE_TYPES.some((t) => type === t);
}

export default function BookIllustrationGeneratorClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<{ b64: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildFormData(variationOverride?: number): FormData {
    const fd = new FormData();
    fd.append("illustrationSummary", form.illustrationSummary.trim());
    fd.append("characterDetails", form.characterDetails.trim());
    fd.append("settingDetails", form.settingDetails.trim());
    fd.append("actionDetails", form.actionDetails.trim());
    fd.append("artStyle", form.artStyle === "Custom" ? form.customArtStyle.trim() : form.artStyle);
    fd.append("colorPalette", form.colorPalette.trim());
    fd.append("mood", form.mood.trim());
    fd.append("extraNotes", form.extraNotes.trim());
    fd.append("variations", String(variationOverride ?? form.variations));
    for (const { file } of form.referenceFiles) {
      fd.append("referenceImage", file);
    }
    return fd;
  }

  async function generateIllustrations(payload: FormData, replaceIndex?: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/toolbox/book-illustration", {
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

  function validate(): boolean {
    if (!form.illustrationSummary.trim()) {
      setError("Scene summary is required.");
      return false;
    }
    if (!form.characterDetails.trim()) {
      setError("Character details are required.");
      return false;
    }
    if (form.artStyle === "Custom" && !form.customArtStyle.trim()) {
      setError("Custom art style is required.");
      return false;
    }
    const oversized = form.referenceFiles.find((e) => e.file.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      setError("Each reference image must be 10MB or smaller.");
      return false;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    generateIllustrations(buildFormData());
  }

  function handleRegenerateOne(index: number) {
    if (!validate()) return;
    generateIllustrations(buildFormData(1), index);
  }

  function handleRegenerateAll() {
    if (!validate()) return;
    generateIllustrations(buildFormData());
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files;
    if (!chosen?.length) return;
    addReferenceFiles(Array.from(chosen));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadImage(b64: string, index: number) {
    try {
      const blob = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `book-illustration-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 390px) 1fr", gap: "var(--space-xl)", alignItems: "start" }}>
      <section className="card" style={{ padding: "var(--space-lg)", position: "sticky", top: "var(--space-md)" }}>
        <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
          Create illustration
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Add character and scene details, then upload or paste reference photos to keep visual consistency.
        </p>
        <form onSubmit={handleSubmit} onPaste={handlePaste}>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-summary">
              Scene summary <span style={{ color: "var(--color-error, #b91c1c)" }}>*</span>
            </label>
            <textarea
              id="book-illustration-summary"
              value={form.illustrationSummary}
              onChange={(e) => updateForm("illustrationSummary", e.target.value)}
              className="form-input"
              rows={3}
              style={{ width: "100%", resize: "vertical", marginTop: "var(--space-xs)" }}
              placeholder="Two kids walking down a school hallway, admiring colorful art on the walls."
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-characters">
              Characters <span style={{ color: "var(--color-error, #b91c1c)" }}>*</span>
            </label>
            <textarea
              id="book-illustration-characters"
              value={form.characterDetails}
              onChange={(e) => updateForm("characterDetails", e.target.value)}
              className="form-input"
              rows={3}
              style={{ width: "100%", resize: "vertical", marginTop: "var(--space-xs)" }}
              placeholder="Boy with curly dark hair and tan skin in a white school shirt; blonde girl with ponytail and rainbow backpack."
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-setting">Where they are</label>
            <input
              id="book-illustration-setting"
              value={form.settingDetails}
              onChange={(e) => updateForm("settingDetails", e.target.value)}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              placeholder="Elementary school hallway with tile floors and framed student drawings."
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-action">What is happening</label>
            <input
              id="book-illustration-action"
              value={form.actionDetails}
              onChange={(e) => updateForm("actionDetails", e.target.value)}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              placeholder="Both kids are smiling and glancing back while walking toward class."
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-art-style">Art style</label>
            <select
              id="book-illustration-art-style"
              value={form.artStyle}
              onChange={(e) => updateForm("artStyle", e.target.value)}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
            >
              {ART_STYLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {form.artStyle === "Custom" && (
              <input
                value={form.customArtStyle}
                onChange={(e) => updateForm("customArtStyle", e.target.value)}
                className="form-input"
                style={{ width: "100%", marginTop: "var(--space-sm)" }}
                placeholder="Describe your preferred style"
                disabled={loading}
              />
            )}
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-palette">Color palette</label>
            <input
              id="book-illustration-palette"
              value={form.colorPalette}
              onChange={(e) => updateForm("colorPalette", e.target.value)}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-mood">Mood</label>
            <input
              id="book-illustration-mood"
              value={form.mood}
              onChange={(e) => updateForm("mood", e.target.value)}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-notes">Extra notes (optional)</label>
            <textarea
              id="book-illustration-notes"
              value={form.extraNotes}
              onChange={(e) => updateForm("extraNotes", e.target.value)}
              className="form-input"
              rows={2}
              style={{ width: "100%", resize: "vertical", marginTop: "var(--space-xs)" }}
              placeholder="Keep framing wide enough for full-body characters."
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-reference">Reference photos (optional, JPG/PNG, max 10MB each)</label>
            <p className="form-note" style={{ marginTop: "var(--space-xs)", fontSize: "0.8125rem" }}>
              Upload multiple files or paste directly (Cmd/Ctrl + V) for character consistency.
            </p>
            <input
              ref={fileInputRef}
              id="book-illustration-reference"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              multiple
              onChange={onFileChange}
              style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
              disabled={loading}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="btn btn-secondary" style={{ marginTop: "var(--space-xs)", width: "100%" }}>
              Upload reference photos
            </button>
            {form.referenceFiles.length > 0 && (
              <ul style={{ marginTop: "var(--space-sm)", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                {form.referenceFiles.map((entry, idx) => (
                  <li key={entry.objectUrl} style={{ position: "relative", width: 64, height: 64, borderRadius: "var(--radius, 6px)", overflow: "hidden", border: "1px solid var(--border, #e5e7eb)", flexShrink: 0 }}>
                    <img src={entry.objectUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => removeReferenceFile(idx)}
                      disabled={loading}
                      aria-label={`Remove ${entry.file.name}`}
                      style={{ position: "absolute", top: 2, right: 2, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: loading ? "not-allowed" : "pointer", padding: 0 }}
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="book-illustration-variations">Variations (1-5)</label>
            <input
              id="book-illustration-variations"
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
            <p role="alert" className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-md)" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.illustrationSummary.trim() || !form.characterDetails.trim()}>
              {loading ? "Generating..." : "Generate Illustration"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClearForm} disabled={loading}>
              Clear Form
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          Generated illustrations
        </h2>
        {loading && (
          <div className="card" style={{ padding: "var(--space-xl)", textAlign: "center" }}>
            <p className="form-note" style={{ margin: 0 }}>
              Generating {form.variations} illustration{form.variations !== 1 ? "s" : ""}...
            </p>
          </div>
        )}
        {!loading && images.length === 0 && (
          <p className="form-note">Generated images appear here after you click Generate Illustration.</p>
        )}
        {!loading && images.length > 0 && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <button type="button" className="btn btn-secondary" onClick={handleRegenerateAll} disabled={loading}>
                Regenerate All
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-lg)" }}>
              {images.map((img, index) => (
                <div key={index} className="card" style={{ padding: "var(--space-md)", overflow: "hidden" }}>
                  <div style={{ position: "relative", paddingBottom: "100%", backgroundColor: "var(--bg-alt, #f3f4f6)", borderRadius: "var(--radius, 6px)", overflow: "hidden" }}>
                    <img
                      src={`data:image/png;base64,${img.b64}`}
                      alt={`Book illustration ${index + 1}`}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-sm)", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-primary" onClick={() => downloadImage(img.b64, index)}>
                      Download
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => handleRegenerateOne(index)} disabled={loading}>
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
