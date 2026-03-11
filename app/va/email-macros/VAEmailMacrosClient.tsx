"use client";

import { useState, useMemo, useEffect } from "react";

export type VAEmailMacroRecord = {
  id: string;
  name: string;
  body: string;
  category: string | null;
  created_at: string;
  created_by?: string | null;
};

type Props = {
  initialMacros: VAEmailMacroRecord[];
  currentUserId: string;
  loadError?: string | null;
};

export default function VAEmailMacrosClient({ initialMacros, currentUserId, loadError }: Props) {
  const [macros, setMacros] = useState<VAEmailMacroRecord[]>(initialMacros);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VAEmailMacroRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return macros;
    return macros.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.body?.toLowerCase().includes(q)) ||
        (m.category?.toLowerCase().includes(q))
    );
  }, [macros, search]);

  async function refetch() {
    const res = await fetch("/api/va/email-macros", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setMacros(data.macros ?? []);
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(m: VAEmailMacroRecord) {
    setEditing(m);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this macro?")) return;
    const res = await fetch(`/api/va/email-macros/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setMacros((prev) => prev.filter((m) => m.id !== id));
  }

  const isOwnMacro = (m: VAEmailMacroRecord) => m.created_by != null && m.created_by === currentUserId;

  return (
    <>
      {loadError && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--color-error, #b91c1c)" }}>
          Could not load macros: {loadError}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center", marginBottom: "var(--space-lg)" }}>
        <input
          type="search"
          className="input"
          placeholder="Search by name, body, or category"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "14rem" }}
          aria-label="Search macros"
        />
        <button type="button" onClick={openCreate} className="btn btn-primary">
          Create my macro
        </button>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {macros.length === 0
            ? "No macros yet. Preset macros from your team will appear here, and you can create your own above."
            : "No macros match your search."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {(["Preset macros", "My macros"] as const).map((section) => {
            const list =
              section === "My macros"
                ? filtered.filter((m) => isOwnMacro(m))
                : filtered.filter((m) => !isOwnMacro(m));
            if (list.length === 0) return null;
            return (
              <section key={section} className="card" style={{ padding: "var(--space-md)" }}>
                <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-md)" }}>
                  {section}
                </h2>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                  {list.map((m) => (
                    <li key={m.id}>
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-sm)" }}>
                        <div style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>{m.name}</div>
                        {isOwnMacro(m) && (
                          <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                            <button
                              type="button"
                              onClick={() => openEdit(m)}
                              className="btn btn-secondary"
                              style={{ fontSize: "0.875rem" }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              className="btn"
                              style={{ fontSize: "0.875rem", color: "var(--color-error, #b91c1c)" }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: "var(--space-sm)",
                          background: "var(--color-bg-subtle, #f5f5f5)",
                          borderRadius: 4,
                          fontSize: "0.875rem",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: 1.5,
                        }}
                      >
                        {m.body}
                      </pre>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <CreateEditMacroModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={refetch}
        editMacro={editing}
      />
    </>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editMacro: VAEmailMacroRecord | null;
};

function CreateEditMacroModal({ open, onClose, onSaved, editMacro }: ModalProps) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editMacro;

  useEffect(() => {
    if (open) {
      setError(null);
      if (editMacro) {
        setName(editMacro.name);
        setBody(editMacro.body);
        setCategory(editMacro.category ?? "");
      } else {
        setName("");
        setBody("");
        setCategory("");
      }
    }
  }, [open, editMacro]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    const b = body.trim();
    if (!n || !b) {
      setError("Name and body are required.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/va/email-macros/${editMacro.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: n, body: b, category: category.trim() || null }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      } else {
        const res = await fetch("/api/va/email-macros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: n, body: b, category: category.trim() || null }),
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
      aria-labelledby="va-macro-modal-title"
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
        <h2 id="va-macro-modal-title" className="section-heading" style={{ marginTop: 0 }}>
          {isEdit ? "Edit my macro" : "Create my macro"}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <p style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-sm)" }}>{error}</p>
          )}
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>
            Name
          </label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acknowledgment + ETA"
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>
            Category (optional)
          </label>
          <input
            type="text"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Acknowledgments"
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>
            Body (plain text inserted into reply)
          </label>
          <p className="form-note" style={{ marginBottom: "var(--space-xs)", fontSize: "0.8125rem" }}>
            Use <code style={{ padding: "1px 4px", background: "var(--color-bg-subtle)", borderRadius: 4 }}>{`{{member-name}}`}</code> for the member&apos;s name and <code style={{ padding: "1px 4px", background: "var(--color-bg-subtle)", borderRadius: 4 }}>{`{{va-name}}`}</code> for your name; they auto-fill when you insert the macro on a task.
          </p>
          <textarea
            className="input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {{member-name}}! I got your request. - {{va-name}}"
            required
            rows={8}
            style={{ width: "100%", marginBottom: "var(--space-lg)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
