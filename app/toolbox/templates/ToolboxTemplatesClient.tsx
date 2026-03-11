"use client";

import { useState } from "react";
import ToolboxTemplateCard, { type ToolboxTemplateRecord } from "../ToolboxTemplateCard";
import CreateEditTemplateModal from "../CreateEditTemplateModal";

type Props = {
  initialTemplates: ToolboxTemplateRecord[];
  currentUserId: string;
};

type TemplateResult = { title: string; template: string } | null;

export default function ToolboxTemplatesClient({ initialTemplates, currentUserId }: Props) {
  const [templates, setTemplates] = useState<ToolboxTemplateRecord[]>(initialTemplates);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ToolboxTemplateRecord | null>(null);

  const [taskFor, setTaskFor] = useState("");
  const [addOn, setAddOn] = useState("");
  const [context, setContext] = useState("");
  const [downloadBranded, setDownloadBranded] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateResult, setTemplateResult] = useState<TemplateResult>(null);
  const [templateCopied, setTemplateCopied] = useState(false);

  const filteredTemplates = templates.filter((t) => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.author.toLowerCase().includes(q) ||
      t.file_name.toLowerCase().includes(q)
    );
  });

  async function handleGenerateTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTemplateError(null);
    setTemplateResult(null);
    const trimmed = taskFor.trim();
    if (!trimmed) return;
    setTemplateLoading(true);
    try {
      const res = await fetch("/api/va/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskFor: trimmed,
          addOn: addOn.trim() || undefined,
          context: context.trim() || undefined,
          downloadBranded,
        }),
      });
      if (downloadBranded) {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setTemplateError(data.error ?? "Could not generate branded document.");
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition");
        let filename = "template-branded.docx";
        if (disposition) {
          const match = disposition.match(/filename="?([^";\n]+)"?/);
          if (match?.[1]) filename = match[1].trim();
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTemplateError(data.error ?? "Could not generate template.");
        return;
      }
      setTemplateResult({
        title: data.title ?? "Template",
        template: data.template ?? "",
      });
    } catch {
      setTemplateError("Network error.");
    } finally {
      setTemplateLoading(false);
    }
  }

  function copyTemplate() {
    if (!templateResult?.template) return;
    navigator.clipboard.writeText(templateResult.template).then(
      () => {
        setTemplateCopied(true);
        setTimeout(() => setTemplateCopied(false), 2000);
      },
      () => setTemplateError("Copy failed.")
    );
  }

  function downloadTemplate() {
    if (!templateResult) return;
    const blob = new Blob([templateResult.template], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateResult.title.replace(/\s+/g, "_")}_template.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function refetchTemplates() {
    const res = await fetch("/api/toolbox/templates", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateModalOpen(true);
  }

  function openEditTemplate(template: ToolboxTemplateRecord) {
    setEditingTemplate(template);
    setTemplateModalOpen(true);
  }

  async function handleDeleteTemplate(id: string) {
    const res = await fetch(`/api/toolbox/templates/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      <div
        className="card"
        style={{
          padding: "var(--space-md)",
          marginBottom: "var(--space-xl)",
          borderLeft: "4px solid var(--color-primary, #2563eb)",
          background: "var(--color-surface-muted, #f8fafc)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9375rem" }}>
          Generate a template as Markdown (copy or .md) or check &quot;Download branded .docx&quot; to get a
          ready-to-use Word document. Once finished please upload for others to use in future!
        </p>
      </div>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-xs)" }}>
          Template Generator
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
          Get a Mom Ops-branded Markdown template to help you get started. You're responsible for the final output
          to the member.
        </p>
        <form onSubmit={handleGenerateTemplate}>
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <label htmlFor="template-task-for">What is this template for?</label>
            <input
              id="template-task-for"
              type="text"
              value={taskFor}
              onChange={(e) => setTaskFor(e.target.value)}
              placeholder="e.g. Flight option research (3 options, comparison chart, VA notes)"
              className="input"
              style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
              disabled={templateLoading}
            />
          </div>
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <label htmlFor="template-addon">Extra add-on (optional)</label>
            <input
              id="template-addon"
              type="text"
              value={addOn}
              onChange={(e) => setAddOn(e.target.value)}
              placeholder="e.g. Airport packing checklist"
              className="input"
              style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
              disabled={templateLoading}
            />
          </div>
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <label htmlFor="template-context">Context (optional)</label>
            <textarea
              id="template-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Member is traveling to Paris in June with two kids; needs kid-friendly options. If left blank, the generator will use placeholders and example content."
              className="input"
              rows={3}
              style={{ width: "100%", minWidth: 0, boxSizing: "border-box", resize: "vertical" }}
              disabled={templateLoading}
            />
          </div>
          <div style={{ marginBottom: "var(--space-sm)", display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
            <input
              id="template-download-branded"
              type="checkbox"
              checked={downloadBranded}
              onChange={(e) => setDownloadBranded(e.target.checked)}
              disabled={templateLoading}
              aria-describedby="template-download-branded-desc"
            />
            <label htmlFor="template-download-branded" id="template-download-branded-desc">
              Download as branded .docx (Mom Ops styled Word document)
            </label>
          </div>
          {templateError && (
            <p
              role="alert"
              style={{
                color: "var(--color-error, #b91c1c)",
                marginBottom: "var(--space-sm)",
                fontSize: "0.875rem",
              }}
            >
              {templateError}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={templateLoading || !taskFor.trim()}
          >
            {templateLoading
              ? downloadBranded
                ? "Generating & downloading…"
                : "Generating…"
              : downloadBranded
                ? "Generate & download branded .docx"
                : "Generate template"}
          </button>
        </form>

        {templateResult && (
          <div
            className="card"
            style={{
              marginTop: "var(--space-md)",
              padding: "var(--space-md)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>{templateResult.title}</span>
              <div style={{ display: "flex", gap: "var(--space-xs)", marginLeft: "auto" }}>
                <button type="button" className="btn btn-secondary" onClick={copyTemplate}>
                  {templateCopied ? "Copied!" : "Copy Markdown"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
                  Download .md
                </button>
              </div>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "var(--space-sm)",
                background: "var(--color-surface, #fafaf9)",
                borderRadius: 6,
                fontSize: "0.8125rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflow: "auto",
                maxHeight: "40vh",
              }}
            >
              {templateResult.template}
            </pre>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
          Uploaded templates
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          DOCX, Google Sheets (XLSX/CSV), or PDF uploads. Download and use for member tasks.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-md)",
            alignItems: "center",
            marginBottom: "var(--space-lg)",
          }}
        >
          <input
            type="search"
            className="form-input"
            placeholder="Search templates by title, description, or author"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            style={{ flex: 1, minWidth: "14rem" }}
            aria-label="Search templates"
          />
          <button type="button" onClick={openCreateTemplate} className="btn btn-primary">
            Add template
          </button>
        </div>
        {filteredTemplates.length === 0 ? (
          <p className="form-note">
            {templates.length === 0
              ? "No templates yet. Add one to get started."
              : "No templates match your search."}
          </p>
        ) : (
          <div>
            {filteredTemplates.map((template) => (
              <ToolboxTemplateCard
                key={template.id}
                template={template}
                currentUserId={currentUserId}
                onEdit={openEditTemplate}
                onDelete={handleDeleteTemplate}
              />
            ))}
          </div>
        )}
      </section>

      <CreateEditTemplateModal
        open={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSaved={refetchTemplates}
        editTemplate={editingTemplate}
      />
    </>
  );
}
