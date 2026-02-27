"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MemberOption = { id: string; label: string };

export default function AdminCreateTicketForm({ members }: { members: MemberOption[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/admin/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId,
          subject: subject.trim(),
          description: description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create ticket.");
        setLoading(false);
        return;
      }
      if (data.ticketId) {
        router.push(`/admin/${data.ticketId}`);
        return;
      }
      setSubject("");
      setDescription("");
      setMemberId("");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-row" style={{ flexWrap: "wrap", gap: "var(--space-md)" }}>
      {error && (
        <p className="form-error" style={{ width: "100%" }} role="alert">
          {error}
        </p>
      )}
      <div className="form-group" style={{ minWidth: "14rem" }}>
        <label htmlFor="admin-create-member">Member (email)</label>
        <select
          id="admin-create-member"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          required
          className="input"
        >
          <option value="">Select member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ flex: "1 1 16rem" }}>
        <label htmlFor="admin-create-subject">Subject</label>
        <input
          id="admin-create-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Task subject"
          className="input"
        />
      </div>
      <div className="form-group" style={{ width: "100%" }}>
        <label htmlFor="admin-create-description">Description (optional)</label>
        <textarea
          id="admin-create-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task details"
          className="input"
          rows={3}
        />
      </div>
      <div className="form-group">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create ticket"}
        </button>
      </div>
    </form>
  );
}
