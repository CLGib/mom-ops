"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

type MemberOption = { id: string; label: string };

export default function VACreateTicketForm({ members }: { members: MemberOption[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [creditCost, setCreditCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  const selectedMember = members.find((m) => m.id === memberId);
  const searchLower = memberSearch.trim().toLowerCase();
  const filteredMembers = searchLower
    ? members.filter((m) => m.label.toLowerCase().includes(searchLower))
    : members;

  useEffect(() => {
    if (!memberDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [memberDropdownOpen]);

  function selectMember(m: MemberOption) {
    setMemberId(m.id);
    setMemberSearch("");
    setMemberDropdownOpen(false);
  }

  function clearMember() {
    setMemberId("");
    setMemberSearch("");
    setMemberDropdownOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!memberId || !subject.trim()) {
      setError("Select a member and enter a subject.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/va/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId,
          subject: subject.trim(),
          description: description.trim() || null,
          creditCost: creditCost ? parseInt(creditCost, 10) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create task.");
        setLoading(false);
        return;
      }
      if (data.ticketId) {
        router.push(`/va/${data.ticketId}`);
        return;
      }
      setSubject("");
      setDescription("");
      setCreditCost("");
      setMemberId("");
      setMemberSearch("");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #c00)" }} role="alert">
          {error}
        </p>
      )}
      <div className="form-group" style={{ minWidth: "18rem", position: "relative" }} ref={memberDropdownRef}>
        <label htmlFor="va-create-member">Member (email or name)</label>
        <input
          id="va-create-member"
          type="text"
          value={memberDropdownOpen ? memberSearch : selectedMember?.label ?? ""}
          onChange={(e) => {
            setMemberSearch(e.target.value);
            setMemberDropdownOpen(true);
            if (!e.target.value) setMemberId("");
          }}
          onFocus={() => setMemberDropdownOpen(true)}
          placeholder="Search by name or email"
          className="input"
          autoComplete="off"
          required={!memberId}
        />
        {selectedMember && !memberDropdownOpen && (
          <button
            type="button"
            onClick={clearMember}
            className="input"
            style={{
              position: "absolute",
              right: "0.25rem",
              top: "2rem",
              padding: "0.25rem 0.5rem",
              fontSize: "0.875rem",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-muted, #666)",
            }}
            aria-label="Clear member"
          >
            Clear
          </button>
        )}
        {memberDropdownOpen && (
          <ul
            role="listbox"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "100%",
              margin: 0,
              marginTop: 2,
              padding: "var(--space-xs)",
              listStyle: "none",
              maxHeight: 240,
              overflowY: "auto",
              background: "var(--surface, #fff)",
              border: "1px solid var(--border, #e8e6e2)",
              borderRadius: "var(--radius, 8px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 10,
            }}
          >
            {filteredMembers.length === 0 ? (
              <li className="form-note" style={{ padding: "var(--space-sm)" }}>
                {memberSearch.trim() ? "No members match." : "Type to search by name or email."}
              </li>
            ) : (
              filteredMembers.slice(0, 50).map((m) => (
                <li
                  key={m.id}
                  role="option"
                  aria-selected={m.id === memberId}
                  style={{
                    padding: "var(--space-sm) var(--space-md)",
                    cursor: "pointer",
                    borderRadius: 4,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMember(m);
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-alt, #f2f0ec)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  {m.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <div className="form-group" style={{ flex: "1 1 16rem" }}>
        <label htmlFor="va-create-subject">Subject</label>
        <input
          id="va-create-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Task subject"
          className="input"
        />
      </div>
      <div className="form-group" style={{ width: "6rem" }}>
        <label htmlFor="va-create-credits">Credit cost (optional)</label>
        <input
          id="va-create-credits"
          type="number"
          min="0"
          value={creditCost}
          onChange={(e) => setCreditCost(e.target.value)}
          className="input"
        />
      </div>
      <div className="form-group" style={{ width: "100%" }}>
        <label htmlFor="va-create-description">Description (optional)</label>
        <textarea
          id="va-create-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task details"
          className="input"
          rows={3}
        />
      </div>
      <div className="form-group">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create task"}
        </button>
      </div>
    </form>
  );
}
