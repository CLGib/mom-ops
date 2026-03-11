"use client";

import { useState } from "react";
import type { CustomFieldDefinition } from "./page";

const FIELD_TYPES: { value: CustomFieldDefinition["field_type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "multiline", label: "Multiline (textarea)" },
];

type Props = {
  initialFields: CustomFieldDefinition[];
  loadError?: string | null;
};

export default function MemberFieldsClient({ initialFields, loadError }: Props) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>(initialFields);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldDefinition["field_type"]>("text");
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setKey("");
    setLabel("");
    setFieldType("text");
    setSortOrder(fields.length);
    setActive(true);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(f: CustomFieldDefinition) {
    setEditing(f);
    setKey(f.key);
    setLabel(f.label);
    setFieldType(f.field_type);
    setSortOrder(f.sort_order);
    setActive(f.active);
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const slug = key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || undefined;
    const labelTrim = label.trim();
    if (!slug || !labelTrim) {
      setError("Key and label are required.");
      setSaving(false);
      return;
    }
    try {
      if (editing) {
        const res = await fetch(`/api/admin/member-profile-fields/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: slug, label: labelTrim, field_type: fieldType, sort_order: sortOrder, active }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Update failed");
          return;
        }
        setFields((prev) => prev.map((f) => (f.id === editing.id ? { ...f, ...data.field } : f)));
      } else {
        const res = await fetch("/api/admin/member-profile-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: slug, label: labelTrim, field_type: fieldType, sort_order: sortOrder }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Create failed");
          return;
        }
        setFields((prev) => [...prev, data.field]);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this field? Member values for this field will remain in the database but the field will no longer appear on profiles.")) return;
    const res = await fetch(`/api/admin/member-profile-fields/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setFields((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <>
      {loadError && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--color-error, #b91c1c)" }}>
          Could not load fields: {loadError}
        </p>
      )}
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <button type="button" onClick={openCreate} className="btn btn-primary">
          Add field
        </button>
      </div>
      {fields.length === 0 ? (
        <p className="form-note">No custom fields yet. Add one to show it on member profiles and in VA context.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {fields.map((f) => (
            <li
              key={f.id}
              className="card"
              style={{
                marginBottom: "var(--space-md)",
                padding: "var(--space-md)",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-sm)",
                opacity: f.active ? 1 : 0.7,
              }}
            >
              <div>
                <strong>{f.label}</strong>
                <span style={{ marginLeft: "var(--space-sm)", color: "var(--text-muted, #666)", fontSize: "0.9rem" }}>({f.key})</span>
                <span style={{ marginLeft: "var(--space-sm)", fontSize: "0.85rem" }}>{f.field_type}</span>
                {!f.active && <span style={{ marginLeft: "var(--space-xs)", fontSize: "0.85rem", color: "var(--color-warning)" }}>Inactive</span>}
              </div>
              <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                <button type="button" onClick={() => openEdit(f)} className="btn btn-secondary" style={{ padding: "0.35rem 0.75rem" }}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(f.id)} className="btn" style={{ padding: "0.35rem 0.75rem" }}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="member-field-modal-title" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card" style={{ padding: "var(--space-lg)", maxWidth: 420, width: "100%", margin: "var(--space-md)" }}>
            <h2 id="member-field-modal-title" className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-md)" }}>
              {editing ? "Edit field" : "Add field"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="mf-key">Key (slug, e.g. allergy_notes)</label>
                <input
                  id="mf-key"
                  className="input"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="allergy_notes"
                  disabled={!!editing}
                />
                {editing && <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>Key cannot be changed after creation.</p>}
              </div>
              <div className="form-group">
                <label htmlFor="mf-label">Label (shown to members)</label>
                <input id="mf-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Allergy notes" required />
              </div>
              <div className="form-group">
                <label htmlFor="mf-type">Type</label>
                <select id="mf-type" className="input" value={fieldType} onChange={(e) => setFieldType(e.target.value as CustomFieldDefinition["field_type"])}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="mf-sort">Sort order</label>
                <input id="mf-sort" type="number" className="input" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} />
              </div>
              {editing && (
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                    Active (show on profiles)
                  </label>
                </div>
              )}
              {error && <p role="alert" className="form-note" style={{ color: "var(--color-error)", marginBottom: "var(--space-sm)" }}>{error}</p>}
              <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save" : "Add"}</button>
                <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
