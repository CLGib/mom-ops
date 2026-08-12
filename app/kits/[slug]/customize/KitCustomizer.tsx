"use client";

import { useState } from "react";
import type { KitInputField, KitUploads } from "@/lib/kits";

type Props = {
  slug: string;
  fields: KitInputField[];
  prefill: Record<string, string>;
  allowUploads?: KitUploads;
  submitLabel?: string;
};

type Result = { title: string; previewHtml: string; docxBase64: string; filename: string };

export default function KitCustomizer({ slug, fields, prefill, allowUploads, submitLabel }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.name] = prefill[f.name] ?? "";
    return init;
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function setField(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  // Multi-select ("check all that apply") stores selections as a single joined string.
  const MULTI_SEP = " | ";
  function selectedSet(v?: string): Set<string> {
    return new Set((v ? v.split(MULTI_SEP) : []).filter(Boolean));
  }
  function toggleMulti(name: string, option: string) {
    setValues((prev) => {
      const set = selectedSet(prev[name]);
      if (set.has(option)) set.delete(option);
      else set.add(option);
      return { ...prev, [name]: [...set].join(MULTI_SEP) };
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (allowUploads && files.length > 0) {
        const fd = new FormData();
        fd.append("inputs", JSON.stringify(values));
        for (const f of files) fd.append("files", f);
        res = await fetch(`/api/kits/${slug}/generate`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
      } else {
        res = await fetch(`/api/kits/${slug}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ inputs: values }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data as Result);
      // Scroll the result into view.
      setTimeout(() => {
        document.getElementById("kit-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result?.docxBase64) return;
    const byteChars = atob(result.docxBase64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename || "kit.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="kit-customizer">
      <form onSubmit={handleGenerate} className="kit-customizer-form card">
        {fields.map((f) => (
          <div key={f.name} className="form-group">
            <label htmlFor={`kf-${f.name}`}>
              {f.label}
              {f.required ? " *" : ""}
            </label>
            {f.type === "multiselect" ? (
              <div className="chip-group">
                {(f.options ?? []).map((o) => {
                  const on = selectedSet(values[f.name]).has(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      className={`chip${on ? " chip--on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleMulti(f.name, o)}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            ) : f.type === "textarea" ? (
              <textarea
                id={`kf-${f.name}`}
                className="input"
                value={values[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: "100%", boxSizing: "border-box", minHeight: 90 }}
              />
            ) : f.type === "select" ? (
              <select
                id={`kf-${f.name}`}
                className="input"
                value={values[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              >
                <option value="">Choose…</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`kf-${f.name}`}
                type={f.type === "number" ? "number" : "text"}
                className="input"
                value={values[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            )}
            {f.help && (
              <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
                {f.help}
              </p>
            )}
          </div>
        ))}

        {allowUploads && (
          <div className="form-group">
            <label htmlFor="kf-uploads">{allowUploads.label}</label>
            <input
              id="kf-uploads"
              type="file"
              multiple
              accept={allowUploads.accept.join(",")}
              className="input"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            {allowUploads.help && (
              <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
                {allowUploads.help}
              </p>
            )}
            {files.length > 0 && (
              <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
                {files.length} file{files.length !== 1 ? "s" : ""} attached: {files.map((f) => f.name).join(", ")}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="form-note" style={{ color: "var(--color-error, #b91c1c)" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
          {loading
            ? "Your assistant is building it…"
            : result
              ? "Regenerate"
              : submitLabel ?? "Generate my document →"}
        </button>
        {loading && (
          <p className="form-note" style={{ marginTop: "var(--space-sm)" }} role="status">
            Tailoring the whole playbook to you. This usually takes a minute or two.
          </p>
        )}
      </form>

      {result && (
        <div id="kit-result" className="kit-result">
          <div className="kit-result-header">
            <h2 className="section-heading" style={{ margin: 0 }}>
              {result.title}
            </h2>
            {result.docxBase64 && (
              <button type="button" onClick={handleDownload} className="btn btn-primary">
                Download .docx
              </button>
            )}
          </div>
          <div
            className="kit-doc"
            dangerouslySetInnerHTML={{ __html: result.previewHtml }}
          />
        </div>
      )}
    </div>
  );
}
