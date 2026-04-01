"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import EmojiPicker from "../components/EmojiPicker";

type MemberOption = { id: string; label: string; avatarUrl?: string | null };
type TaskLibraryEntry = { task: string; credits: number };

function findCreditsBySubject(tasks: TaskLibraryEntry[], subject: string): number | null {
  if (!subject?.trim()) return null;
  const s = subject.trim();
  const exact = tasks.find((t) => t.task.trim() === s);
  if (exact) return exact.credits;
  const lower = s.toLowerCase();
  const ci = tasks.find((t) => t.task.trim().toLowerCase() === lower);
  return ci ? ci.credits : null;
}

export default function VACreateTicketForm({
  members,
  taskLibrary = [],
  defaultMemberId,
  lockMember = false,
  initialSubject = "",
  initialDescription = "",
}: {
  members: MemberOption[];
  taskLibrary?: TaskLibraryEntry[];
  defaultMemberId?: string;
  lockMember?: boolean;
  /** When form remounts (e.g. outreach check-in), prefill subject. */
  initialSubject?: string;
  initialDescription?: string;
}) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(defaultMemberId ?? "");
  const [subject, setSubject] = useState(initialSubject);
  const [description, setDescription] = useState(initialDescription);
  const [creditCost, setCreditCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  function insertEmojiInDescription(emoji: string) {
    const ta = descriptionRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = description.slice(0, start) + emoji + description.slice(end);
    setDescription(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

  useEffect(() => {
    if (defaultMemberId) setMemberId(defaultMemberId);
  }, [defaultMemberId]);

  const selectedMember = members.find((m) => m.id === memberId);
  const effectiveMemberId = lockMember && defaultMemberId ? defaultMemberId : memberId;
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

  // Auto-fill credit cost from task library when subject matches
  useEffect(() => {
    if (taskLibrary.length === 0) return;
    const credits = findCreditsBySubject(taskLibrary, subject);
    if (credits != null) setCreditCost(String(credits));
  }, [subject]);

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
    const submitMemberId = effectiveMemberId || memberId;
    if (!submitMemberId || !subject.trim()) {
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
          memberId: submitMemberId,
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
      {lockMember && selectedMember ? (
        <div className="form-group">
          <label>Member</label>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            {selectedMember.avatarUrl ? (
              <img
                src={selectedMember.avatarUrl}
                alt=""
                width={32}
                height={32}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--bg-alt, #e8e6e2)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-muted, #666)",
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {(selectedMember.label ?? "?")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "?"}
              </span>
            )}
            <span>{selectedMember.label}</span>
          </div>
        </div>
      ) : (
        <div className="form-group" style={{ minWidth: "18rem", position: "relative" }} ref={memberDropdownRef}>
          <label htmlFor="va-create-member">Member</label>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", position: "relative" }}>
            {selectedMember && !memberDropdownOpen && (
              <>
                {selectedMember.avatarUrl ? (
                  <img
                    src={selectedMember.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--bg-alt, #e8e6e2)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted, #666)",
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    {(selectedMember.label ?? "?")
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "?"}
                  </span>
                )}
              </>
            )}
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
              placeholder="Search by name"
              className="input"
              style={{ flex: 1 }}
              autoComplete="off"
              required={!memberId}
            />
          </div>
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
                  {memberSearch.trim() ? "No members match." : "Type to search by name."}
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
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
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
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "var(--bg-alt, #e8e6e2)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--text-muted, #666)",
                          flexShrink: 0,
                        }}
                        aria-hidden
                      >
                        {(m.label ?? "?")
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "?"}
                      </span>
                    )}
                    <span>{m.label}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-2xs)" }}>
          <label htmlFor="va-create-description" style={{ marginBottom: 0 }}>Description (optional)</label>
          <EmojiPicker onInsert={insertEmojiInDescription} ariaLabel="Insert emoji" />
        </div>
        <textarea
          ref={descriptionRef}
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
