"use client";

export type ToolboxTemplateRecord = {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  created_by: string;
  author: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  template: ToolboxTemplateRecord;
  currentUserId: string;
  onEdit: (template: ToolboxTemplateRecord) => void;
  onDelete: (id: string) => void;
};

export default function ToolboxTemplateCard({ template, currentUserId, onEdit, onDelete }: Props) {
  const isOwner = template.created_by === currentUserId;

  async function handleDownload() {
    const res = await fetch(`/api/toolbox/templates/${template.id}/download`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.url) {
      const a = document.createElement("a");
      a.href = data.url;
      a.download = data.file_name ?? template.file_name;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  function handleDelete() {
    if (confirm("Delete this template? The file will be removed. This cannot be undone.")) {
      onDelete(template.id);
    }
  }

  return (
    <article
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        marginBottom: "var(--space-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
        <h2 className="section-heading" style={{ margin: 0, flex: 1 }}>
          {template.title}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", alignItems: "center" }}>
          <button type="button" onClick={handleDownload} className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
            Download
          </button>
          {isOwner && (
            <>
              <button type="button" onClick={() => onEdit(template)} className="btn btn-secondary">
                Edit
              </button>
              <button type="button" onClick={handleDelete} className="btn btn-secondary" style={{ color: "var(--error, #b91c1c)" }}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      {template.author && (
        <p className="form-note" style={{ marginTop: 0, marginBottom: "var(--space-xs)" }}>
          Author: {template.author}
        </p>
      )}
      {template.description && (
        <p className="form-note" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
          {template.description}
        </p>
      )}
      <p style={{ fontSize: "0.8125rem", color: "var(--color-muted, #666)", margin: 0 }}>
        File: {template.file_name}
      </p>
    </article>
  );
}
