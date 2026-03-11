"use client";

import { useState, useMemo } from "react";
import { formatInCentral } from "@/lib/format-date";
import { isAllowedFeedbackAttachmentUrl } from "@/lib/feedback-attachment-url";

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  qa: "QA",
  done: "Done",
  wont_fix: "Won't Fix / Declined",
};

type Card = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  requestor_role?: string;
  requestor_email?: string | null;
  owner_id?: string | null;
  attachment_url?: string | null;
  created_at: string;
};

type Props = {
  initialCards: Card[];
  ownerOptions: { id: string; label: string }[];
  statuses: string[];
};

export default function FeatureBugBoard({ initialCards, ownerOptions, statuses }: Props) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ card_id: string; notes: { id: string; note_text: string; created_at: string }[] } | null>(null);
  const [newNote, setNewNote] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map: Record<string, Card[]> = {};
    statuses.forEach((s) => (map[s] = []));
    cards.forEach((c) => {
      if (map[c.status]) map[c.status].push(c);
      else map[c.status] = [c];
    });
    return map;
  }, [cards, statuses]);

  async function updateCard(id: string, updates: { status?: string; owner_id?: string | null; title?: string; description?: string | null }) {
    setUpdating(id);
    const res = await fetch(`/api/admin/feature-bug/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    setUpdating(null);
    if (!res.ok) return;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return { ...c, ...updates };
      })
    );
  }

  async function deleteCard(id: string) {
    if (!confirm("Delete this card?")) return;
    const res = await fetch(`/api/admin/feature-bug/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function loadNotes(cardId: string) {
    const res = await fetch(`/api/admin/feature-bug/${cardId}/notes`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (data.notes) setNotes({ card_id: cardId, notes: data.notes });
  }

  async function addNote(cardId: string) {
    const text = newNote.trim();
    if (!text) return;
    const res = await fetch(`/api/admin/feature-bug/${cardId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ note_text: text }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.note && notes?.card_id === cardId) {
      setNotes({ ...notes, notes: [...notes.notes, data.note] });
      setNewNote("");
    }
  }

  const selectedCard = selectedId ? cards.find((c) => c.id === selectedId) : null;

  return (
    <div style={{ display: "flex", gap: "var(--space-md)", overflowX: "auto", paddingBottom: "var(--space-md)" }}>
      {statuses.map((status) => (
        <div
          key={status}
          className="card"
          style={{
            minWidth: 260,
            maxWidth: 280,
            padding: "var(--space-sm)",
            background: "var(--color-muted-bg, #f8f8f8)",
          }}
        >
          <h3 style={{ fontSize: "0.9rem", margin: "0 0 var(--space-sm)", fontWeight: 600 }}>
            {STATUS_LABELS[status] ?? status}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {(byStatus[status] ?? []).map((card) => (
              <div
                key={card.id}
                className="card"
                style={{
                  padding: "var(--space-sm)",
                  background: "var(--surface, #fff)",
                  border: "1px solid var(--color-border, #e5e5e5)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-xs)" }}>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-muted, #666)" }}>
                    {card.type === "bug" ? "Bug" : "Feature"}
                  </span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}
                      onClick={() => {
                        setSelectedId(card.id);
                        loadNotes(card.id);
                      }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", color: "var(--color-error, #c00)" }}
                      onClick={() => deleteCard(card.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={{ fontWeight: 600, margin: "var(--space-2xs) 0", fontSize: "0.9rem" }}>{card.title}</p>
                <p className="ticket-meta" style={{ fontSize: "0.75rem", marginBottom: "var(--space-xs)" }}>
                  {card.requestor_email ?? card.requestor_role ?? "-"} · {formatInCentral(card.created_at)}
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: "0.7rem" }}>Status</label>
                  <select
                    className="input"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                    value={card.status}
                    onChange={(e) => updateCard(card.id, { status: e.target.value })}
                    disabled={updating === card.id}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, marginTop: "var(--space-xs)" }}>
                  <label style={{ fontSize: "0.7rem" }}>Owner</label>
                  <select
                    className="input"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                    value={card.owner_id ?? ""}
                    onChange={(e) => updateCard(card.id, { owner_id: e.target.value || null })}
                    disabled={updating === card.id}
                  >
                    <option value="">-</option>
                    {ownerOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedCard && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "var(--space-lg)",
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 480, maxHeight: "90vh", overflow: "auto", padding: "var(--space-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-md)" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{selectedCard.title}</h2>
              <button type="button" className="btn" onClick={() => setSelectedId(null)}>Close</button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "var(--space-sm)" }}>
              {selectedCard.type === "bug" ? "Bug" : "Feature"} · {selectedCard.requestor_email ?? selectedCard.requestor_role ?? "-"} · {formatInCentral(selectedCard.created_at)}
            </p>
            {selectedCard.description && (
              <div style={{ marginBottom: "var(--space-md)", whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{selectedCard.description}</div>
            )}
            {selectedCard.attachment_url && (
              <div style={{ marginBottom: "var(--space-md)" }}>
                <h3 style={{ fontSize: "0.9rem", marginBottom: "var(--space-xs)" }}>Screenshot / attachment</h3>
                {isAllowedFeedbackAttachmentUrl(selectedCard.attachment_url) ? (
                  /\.(png|jpe?g|gif|webp)$/i.test(selectedCard.attachment_url) ? (
                    <a href={selectedCard.attachment_url} target="_blank" rel="noopener noreferrer" className="link">
                      <img src={selectedCard.attachment_url} alt="Attachment" style={{ maxWidth: "100%", maxHeight: 300, border: "1px solid var(--color-border)", borderRadius: 4 }} />
                    </a>
                  ) : (
                    <a href={selectedCard.attachment_url} target="_blank" rel="noopener noreferrer" className="link">View attachment</a>
                  )
                ) : (
                  <span className="text-muted" style={{ fontSize: "0.85rem" }}>Attachment URL is not from trusted storage and is not displayed.</span>
                )}
              </div>
            )}
            <h3 style={{ fontSize: "0.9rem", marginBottom: "var(--space-xs)" }}>Internal notes</h3>
            {notes?.card_id === selectedCard.id && (
              <>
                <ul style={{ margin: "0 0 var(--space-sm)", paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                  {notes.notes.map((n) => (
                    <li key={n.id} style={{ marginBottom: "var(--space-2xs)" }}>
                      {n.note_text}
                      <span className="ticket-meta" style={{ marginLeft: "var(--space-xs)", fontSize: "0.75rem" }}>{formatInCentral(n.created_at)}</span>
                    </li>
                  ))}
                </ul>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Add a note…"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ width: "100%", marginBottom: "var(--space-xs)" }}
                />
                <button type="button" className="btn btn-primary" onClick={() => addNote(selectedCard.id)}>Add note</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
