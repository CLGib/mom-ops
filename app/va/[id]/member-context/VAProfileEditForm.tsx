"use client";

import { useState } from "react";
import { updateMemberProfileFromVA, type VAMemberProfileUpdate } from "./actions";

type MemberContext = {
  member_id?: string;
  constraints?: string | null;
  preferred_brands?: string[] | null;
  communication_tone?: string | null;
  kids_count?: number | null;
  kids_ages?: number[] | null;
  partner_name?: string | null;
};

type Props = {
  ticketId: string;
  memberId: string;
  initial: MemberContext;
};

export default function VAProfileEditForm({ ticketId, memberId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [constraints, setConstraints] = useState(initial.constraints ?? "");
  const [preferredBrands, setPreferredBrands] = useState(
    Array.isArray(initial.preferred_brands) ? initial.preferred_brands.join(", ") : ""
  );
  const [tone, setTone] = useState<"warm" | "direct" | "formal">(
    (initial.communication_tone as "warm" | "direct" | "formal") ?? "warm"
  );
  const [kidsCount, setKidsCount] = useState<string>(initial.kids_count != null ? String(initial.kids_count) : "");
  const [kidsAges, setKidsAges] = useState(
    Array.isArray(initial.kids_ages) ? initial.kids_ages.join(", ") : ""
  );
  const [partnerName, setPartnerName] = useState(initial.partner_name ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    const updates: VAMemberProfileUpdate = {
      constraints: constraints.trim() || null,
      preferred_brands: preferredBrands.trim() ? preferredBrands.split(",").map((s) => s.trim()).filter(Boolean) : null,
      communication_tone: tone,
      kids_count: kidsCount === "" ? null : parseInt(kidsCount, 10),
      kids_ages: kidsAges.trim() ? kidsAges.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)) : null,
      partner_name: partnerName.trim() || null,
    };
    const { error: err } = await updateMemberProfileFromVA(memberId, ticketId, updates);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSaved(true);
  }

  return (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn btn-secondary"
        style={{ marginBottom: open ? "var(--space-md)" : 0 }}
      >
        {open ? "Hide edit form" : "Update profile from context"}
      </button>
      {open && (
        <div className="card" style={{ padding: "var(--space-md)" }}>
          <h3 className="section-heading" style={{ fontSize: "0.95rem", marginTop: 0 }}>Update member profile</h3>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
            Use this when you learn new context in conversation. Changes sync to the member&apos;s profile.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="va-edit-constraints">Constraints</label>
              <textarea id="va-edit-constraints" className="input" rows={2} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="va-edit-brands">Preferred brands (comma-separated)</label>
              <input id="va-edit-brands" className="input" value={preferredBrands} onChange={(e) => setPreferredBrands(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Communication tone</label>
              <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
                {(["warm", "direct", "formal"] as const).map((t) => (
                  <label key={t} style={{ display: "flex", alignItems: "center" }}>
                    <input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} style={{ margin: 0 }} />
                    <span style={{ marginLeft: "8px", textTransform: "capitalize" }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="va-edit-partner">Partner name</label>
              <input id="va-edit-partner" className="input" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="va-edit-kids-count">Number of kids</label>
              <input id="va-edit-kids-count" type="number" min={0} className="input" value={kidsCount} onChange={(e) => setKidsCount(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="va-edit-kids-ages">Kids ages (comma-separated)</label>
              <input id="va-edit-kids-ages" className="input" value={kidsAges} onChange={(e) => setKidsAges(e.target.value)} />
            </div>
            {error && <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>{error}</p>}
            {saved && <p role="status" className="form-note" style={{ color: "var(--color-success, #0a0)", marginBottom: "var(--space-sm)" }}>Profile updated.</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save profile updates"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
