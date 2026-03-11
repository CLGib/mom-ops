"use client";

import { useState, useRef, useEffect } from "react";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPT =
  ".docx,.xlsx,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

export default function BrandingAssistantClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pastedContent, setPastedContent] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    setError(null);
    if (!chosen) {
      setFile(null);
      return;
    }
    if (chosen.size > MAX_FILE_SIZE_BYTES) {
      setError("File must be 10MB or smaller.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const name = chosen.name.toLowerCase();
    if (
      !name.endsWith(".docx") &&
      !name.endsWith(".xlsx") &&
      !name.endsWith(".csv")
    ) {
      setError("Allowed formats: .docx, .xlsx, .csv");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(chosen);
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDownloadFilename(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);

    const hasFile = file != null && file.size > 0;
    const hasPaste = pastedContent.trim().length > 0;
    if (!hasFile && !hasPaste) {
      setError("Upload a file or paste content.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (hasFile) {
        formData.append("file", file!);
      }
      if (hasPaste) {
        formData.append("content", pastedContent.trim());
      }
      formData.append("useAi", String(useAi));
      if (documentName.trim()) formData.append("documentName", documentName.trim());

      const res = await fetch("/api/toolbox/brand-document", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = "mom-ops-branded.docx";
      if (disposition) {
        const match = disposition.match(/filename="?([^";\n]+)"?/);
        if (match?.[1]) filename = match[1].trim();
      }
      setDownloadFilename(filename);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
      <section
        className="card"
        style={{
          padding: "var(--space-lg)",
          position: "sticky",
          top: "var(--space-md)",
        }}
      >
        <h2
          className="section-heading"
          style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}
        >
          Apply Mom Ops branding
        </h2>
        <p
          className="form-note"
          style={{ marginBottom: "var(--space-md)" }}
        >
          Upload a Word document (.docx) or spreadsheet (.xlsx, .csv), or paste
          markdown/text below. The assistant will apply Mom Ops branding (header,
          fonts, colors) so the file is ready to send to members. No
          need to use a separate Claude project.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="branding-file">
              Upload file (optional)
            </label>
            <p
              className="form-note"
              style={{ marginTop: "var(--space-xs)", fontSize: "0.8125rem" }}
            >
              .docx, .xlsx, or .csv, max 10MB
            </p>
            <input
              ref={fileInputRef}
              id="branding-file"
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
              aria-describedby={error ? "branding-error" : undefined}
            />
            {file && (
              <p style={{ marginTop: "var(--space-xs)", fontSize: "0.875rem" }}>
                {file.name}
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={loading}
                  className="link"
                  style={{ marginLeft: "var(--space-sm)" }}
                >
                  Remove
                </button>
              </p>
            )}
          </div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="branding-paste">
              Or paste markdown/text
            </label>
            <textarea
              id="branding-paste"
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder="Paste your content or markdown here…"
              className="form-input"
              rows={6}
              style={{
                width: "100%",
                resize: "vertical",
                marginTop: "var(--space-xs)",
              }}
              disabled={loading}
            />
          </div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="branding-document-name">
              Document name for download (optional)
            </label>
            <p
              className="form-note"
              style={{ marginTop: "var(--space-xs)", fontSize: "0.8125rem" }}
            >
              e.g. Meal Plan March 2025 — the file will download with this name plus .docx
            </p>
            <input
              id="branding-document-name"
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. Meal Plan March 2025"
              className="form-input"
              style={{ width: "100%", marginTop: "var(--space-xs)" }}
              disabled={loading}
            />
          </div>
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                disabled={loading}
              />
              <span>Use AI to improve structure and tone</span>
            </label>
            <p
              className="form-note"
              style={{ marginTop: "var(--space-xs)", fontSize: "0.8125rem" }}
            >
              Optional. Sends content to Claude to clean up sections, headings,
              and formatting before applying branding.
            </p>
          </div>
          {error && (
            <p
              id="branding-error"
              role="alert"
              style={{
                color: "var(--color-error, #b91c1c)",
                marginBottom: "var(--space-md)",
                fontSize: "0.9375rem",
              }}
            >
              {error}
            </p>
          )}
          {downloadFilename && (
            <p
              style={{
                marginBottom: "var(--space-md)",
                fontSize: "0.9375rem",
              }}
            >
              <span style={{ color: "var(--color-success, #15803d)" }}>
                Ready: {downloadFilename}
              </span>
              {downloadUrl && (
                <>
                  {" "}
                  <a
                    href={downloadUrl}
                    download={downloadFilename}
                    className="link"
                  >
                    Download again
                  </a>
                </>
              )}
            </p>
          )}
          <button
            type="submit"
            className="button button--primary"
            disabled={loading}
          >
            {loading ? "Applying branding…" : "Apply branding"}
          </button>
        </form>
      </section>
      <section className="card" style={{ padding: "var(--space-lg)" }}>
        <h2
          className="section-heading"
          style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}
        >
          How it works
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "var(--space-lg)",
            lineHeight: 1.6,
            color: "var(--text-muted, #5c5955)",
          }}
        >
          <li>
            <strong>Word (.docx):</strong> Content is extracted and rebuilt with
            Mom Ops header, fonts (Georgia/Arial), gold accents, and
            table styling.
          </li>
          <li>
            <strong>Spreadsheet (.xlsx / .csv):</strong> The first sheet is
            turned into a branded Word document with a styled table, so you can
            share it on-brand.
          </li>
          <li>
            <strong>Pasted content:</strong> Markdown or plain text is parsed and
            formatted into a branded document. Use ## for sections, - for
            bullets, and | for tables.
          </li>
          <li>
            <strong>Use AI:</strong> When enabled, content is sent to Claude to
            improve structure and tone before branding. Helpful for messy drafts.
          </li>
        </ul>
      </section>
    </div>
  );
}
