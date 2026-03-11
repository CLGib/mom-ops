"use client";

import { useState, useMemo, useEffect } from "react";

export type CanvaLinkRecord = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialLinks: CanvaLinkRecord[];
  currentUserId: string;
  loadError?: string | null;
};

export default function CanvaLinksClient({
  initialLinks,
  currentUserId,
  loadError,
}: Props) {
  const [links, setLinks] = useState<CanvaLinkRecord[]>(initialLinks);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CanvaLinkRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links;
    return links.filter(
      (l) =>
        l.url.toLowerCase().includes(q) ||
        (l.title?.toLowerCase().includes(q)) ||
        (l.description?.toLowerCase().includes(q))
    );
  }, [links, search]);

  async function refetch() {
    const res = await fetch("/api/va/canva-links", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links ?? []);
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(link: CanvaLinkRecord) {
    setEditing(link);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this Canva link?")) return;
    const res = await fetch(`/api/va/canva-links/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  const isOwn = (l: CanvaLinkRecord) => l.created_by === currentUserId;

  return (
    <>
      {loadError && (
        <p className="form-note" style={{ marginBottom: "var(--space-md)", color: "var(--color-error, #b91c1c)" }}>
          Could not load links: {loadError}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center", marginBottom: "var(--space-lg)" }}>
        <input
          type="search"
          className="input"
          placeholder="Search by title, description, or URL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "14rem" }}
          aria-label="Search Canva links"
        />
        <button type="button" onClick={openCreate} className="btn btn-primary">
          Add a Canva link
        </button>
      </div>
      {filtered.length === 0 ? (
        <p className="form-note">
          {links.length === 0
            ? "No Canva links yet. Add design links above so the team can reuse them."
            : "No links match your search."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {filtered.map((l) => (
            <li key={l.id} className="card" style={{ padding: "var(--space-md)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-sm)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {l.title && (
                    <div style={{ fontWeight: 600, marginBottom: "var(--space-2xs)" }}>{l.title}</div>
                  )}
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                    style={{ wordBreak: "break-all", fontSize: l.title ? "0.875rem" : "1rem" }}
                  >
                    {l.url}
                  </a>
                  {l.description && (
                    <p className="form-note" style={{ marginTop: "var(--space-xs)", marginBottom: 0 }}>
                      {l.description}
                    </p>
                  )}
                </div>
                {isOwn(l) && (
                  <div style={{ display: "flex", gap: "var(--space-xs)", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => openEdit(l)}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.875rem" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      className="btn"
                      style={{ fontSize: "0.875rem", color: "var(--color-error, #b91c1c)" }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <CreateEditLinkModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={refetch}
        editLink={editing}
      />
    </>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editLink: CanvaLinkRecord | null;
};

function CreateEditLinkModal({ open, onClose, onSaved, editLink }: ModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editLink;

  useEffect(() => {
    if (open) {
      setError(null);
      if (editLink) {
        setUrl(editLink.url);
        setTitle(editLink.title ?? "");
        setDescription(editLink.description ?? "");
      } else {
        setUrl("");
        setTitle("");
        setDescription("");
      }
    }
  }, [open, editLink]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const u = url.trim();
    if (!u) {
      setError("URL is required.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/va/canva-links/${editLink.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            url: u,
            title: title.trim() || null,
            description: description.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
      } else {
        const res = await fetch("/api/va/canva-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            url: u,
            title: title.trim() || null,
            description: description.trim() || null,
          }),
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
      aria-labelledby="canva-link-modal-title"
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
        <h2 id="canva-link-modal-title" className="section-heading" style={{ marginTop: 0 }}>
          {isEdit ? "Edit Canva link" : "Add a Canva link"}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <p style={{ color: "var(--color-error, #b91c1c)", marginBottom: "var(--space-sm)" }}>{error}</p>
          )}
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>
            Canva design URL *
          </label>
          <input
            type="url"
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.canva.com/design/..."
            required
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>
            Title (optional)
          </label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Social post template"
            style={{ width: "100%", marginBottom: "var(--space-md)" }}
          />
          <label className="form-note" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>
            Description (optional)
          </label>
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When to use this design..."
            rows={3}
            style={{ width: "100%", marginBottom: "var(--space-lg)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Add link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
