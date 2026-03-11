"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ToolboxTemplateRecord } from "./ToolboxTemplateCard";

const BUCKET = "va-toolbox-templates";
const ALLOWED_EXT = [".docx", ".xlsx", ".pdf", ".csv"];
const MAX_SIZE_MB = 25;

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTemplate: ToolboxTemplateRecord | null;
};

function getExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export default function CreateEditTemplateModal({ open, onClose, onSaved, editTemplate }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editTemplate;

  function handleFile(f: File | null) {
    if (f && ALLOWED_EXT.includes(getExtension(f.name))) setFile(f);
    else if (!f) setFile(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave() {
    setDragActive(false);
  }

  useEffect(() => {
    if (open) {
      setError(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (editTemplate) {
        setTitle(editTemplate.title);
        setDescription(editTemplate.description ?? "");
      } else {
        setTitle("");
        setDescription("");
      }
    }
  }, [open, editTemplate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Title is required.");
      return;
    }

    if (!isEdit && !file) {
      setError("Please select a file (DOCX, XLSX, or PDF).");
      return;
    }

    if (file) {
      const ext = getExtension(file.name);
      if (!ALLOWED_EXT.includes(ext)) {
        setError("Allowed formats: .docx, .xlsx, .pdf, .csv");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_SIZE_MB} MB.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/toolbox/templates/${editTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t,
            description: description.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
        onSaved();
        onClose();
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");

        const ext = getExtension(file!.name);
        const path = `${user.id}/${crypto.randomUUID()}${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file!, { contentType: file!.type, upsert: false });

        if (uploadErr) throw new Error(uploadErr.message);

        const res = await fetch("/api/toolbox/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t,
            description: description.trim() || null,
            file_path: path,
            file_name: file!.name,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
        onSaved();
        onClose();
      }
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
      aria-labelledby="toolbox-template-modal-title"
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
        style={{
          width: "100%",
          maxWidth: "36rem",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="toolbox-template-modal-title" className="section-heading" style={{ marginTop: 0 }}>
          {isEdit ? "Edit template" : "Add template"}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <p style={{ color: "var(--error, #b91c1c)", marginBottom: "var(--space-sm)" }}>
              {error}
            </p>
          )}
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Title
          </label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Report Template"
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
            Description (optional)
          </label>
          <textarea
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this template is for..."
            rows={3}
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          {!isEdit && (
            <>
              <label className="form-label" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
                File (DOCX, XLSX, PDF, or CSV)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.xlsx,.pdf,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,text/csv"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clip: "rect(0,0,0,0)" }}
                aria-label="Choose template file"
              />
              <div
                role="button"
                tabIndex={0}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                style={{
                  marginBottom: "var(--space-md)",
                  padding: "var(--space-lg)",
                  border: "2px dashed " + (dragActive ? "var(--primary, #6366f1)" : "var(--border, #e5e7eb)"),
                  borderRadius: "var(--radius-md, 8px)",
                  backgroundColor: dragActive ? "var(--primary-light, rgba(99, 102, 241, 0.08))" : "var(--surface, #f9fafb)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
              >
                {file ? (
                  <p style={{ margin: 0, fontWeight: 500, color: "var(--text, #111827)" }}>
                    {file.name}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "var(--text-muted, #6b7280)", fontSize: "0.9375rem" }}>
                    Click or drag a file here to upload
                  </p>
                )}
                {file && (
                  <p style={{ margin: "var(--space-xs) 0 0", fontSize: "0.8125rem", color: "var(--text-muted, #6b7280)" }}>
                    {(file.size / 1024).toFixed(1)} KB · Click or drop to replace
                  </p>
                )}
              </div>
            </>
          )}
          {isEdit && (
            <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
              To replace the file, delete this template and create a new one.
            </p>
          )}
          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Add template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
