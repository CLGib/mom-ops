"use client";

import { useState } from "react";
import { getAgeFromBirthday } from "@/lib/age-from-birthday";
import { updateMemberProfileFromVA, type VAMemberProfileUpdate } from "./actions";

type HouseholdMember = {
  type: string;
  name?: string;
  likes?: string;
  dislikes?: string;
  birthday?: string;
  clothing_size?: string;
  relation?: string;
};

type ImportantDate = { label: string; date: string; recurrence?: string };

type CustomFieldDefinition = {
  id: string;
  key: string;
  label: string;
  field_type: "text" | "number" | "date" | "multiline";
  sort_order: number;
};

type MemberContext = {
  member_id?: string;
  constraints?: string | null;
  preferred_brands?: string[] | null;
  communication_tone?: string | null;
  kids_count?: number | null;
  kids_ages?: number[] | null;
  partner_name?: string | null;
  household_members?: HouseholdMember[] | null;
  important_dates?: ImportantDate[] | null;
  custom_field_values?: Record<string, string | number | null> | null;
};

type Props = {
  ticketId: string;
  memberId: string;
  initial: MemberContext;
  customFieldDefinitions?: CustomFieldDefinition[];
};

export default function VAProfileEditForm({ ticketId, memberId, initial, customFieldDefinitions = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [constraints, setConstraints] = useState(initial.constraints ?? "");
  const [preferredBrands, setPreferredBrands] = useState(
    Array.isArray(initial.preferred_brands) ? initial.preferred_brands.join(", ") : ""
  );
  const [tone, setTone] = useState<"warm" | "direct" | "formal">(
    (initial.communication_tone as "warm" | "direct" | "formal") ?? "warm"
  );
  const [partnerName, setPartnerName] = useState(initial.partner_name ?? "");
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(
    Array.isArray(initial.household_members) ? initial.household_members : []
  );
  const [importantDates, setImportantDates] = useState<ImportantDate[]>(
    Array.isArray(initial.important_dates) ? initial.important_dates : []
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | null>>(
    initial.custom_field_values && typeof initial.custom_field_values === "object" ? { ...initial.custom_field_values } : {}
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setCustomFieldValue(key: string, value: string | number | null) {
    setCustomFieldValues((prev) => {
      const next = { ...prev };
      if (value === "" || value == null) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function addHouseholdMember(type: "kid" | "spouse" | "other") {
    setHouseholdMembers((prev) => [...prev, { type, name: "" }]);
  }
  function removeHouseholdMember(i: number) {
    setHouseholdMembers((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateHouseholdMember(i: number, field: keyof HouseholdMember, val: string) {
    setHouseholdMembers((prev) => {
      const arr = [...prev];
      if (!arr[i]) return prev;
      arr[i] = { ...arr[i], [field]: val };
      return arr;
    });
  }

  function addImportantDate() {
    setImportantDates((prev) => [...prev, { label: "", date: "" }]);
  }
  function removeImportantDate(i: number) {
    setImportantDates((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateImportantDate(i: number, field: keyof ImportantDate, val: string) {
    setImportantDates((prev) => {
      const arr = [...prev];
      if (!arr[i]) return prev;
      arr[i] = { ...arr[i], [field]: val };
      return arr;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    const filtered = householdMembers.filter((m) => m.type);
    const kids = filtered.filter((m) => m.type === "kid");
    const kids_ages = kids
      .map((k) => (k.birthday ? getAgeFromBirthday(k.birthday) : null))
      .filter((a): a is number => a != null);
    const updates: VAMemberProfileUpdate = {
      constraints: constraints.trim() || null,
      preferred_brands: preferredBrands.trim() ? preferredBrands.split(",").map((s) => s.trim()).filter(Boolean) : null,
      communication_tone: tone,
      kids_count: kids.length > 0 ? kids.length : null,
      kids_ages: kids_ages.length > 0 ? kids_ages : null,
      partner_name: partnerName.trim() || null,
      household_members: filtered.length > 0 ? filtered : null,
      important_dates: importantDates.length > 0 ? importantDates : null,
      custom_field_values: Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
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
              <label>Important people (kids, spouse, other)</label>
              <p className="form-note" style={{ marginBottom: "var(--space-xs)", fontSize: "0.85rem" }}>Add birthday so age is calculated automatically.</p>
              {householdMembers.map((m, i) => (
                <div key={i} className="card" style={{ padding: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2xs)" }}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{m.type}</span>
                    <button type="button" onClick={() => removeHouseholdMember(i)} className="btn" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>Remove</button>
                  </div>
                  <div style={{ display: "grid", gap: "var(--space-2xs)", gridTemplateColumns: "1fr 1fr" }}>
                    <input className="input" placeholder="Name" value={m.name ?? ""} onChange={(e) => updateHouseholdMember(i, "name", e.target.value)} />
                    <input className="input" type="date" placeholder="Birthday" value={m.birthday ?? ""} onChange={(e) => updateHouseholdMember(i, "birthday", e.target.value)} />
                    {m.type === "kid" && <input className="input" placeholder="Clothing size" value={m.clothing_size ?? ""} onChange={(e) => updateHouseholdMember(i, "clothing_size", e.target.value)} style={{ gridColumn: "1 / -1" }} />}
                    {m.type === "other" && <input className="input" placeholder="Relation" value={m.relation ?? ""} onChange={(e) => updateHouseholdMember(i, "relation", e.target.value)} style={{ gridColumn: "1 / -1" }} />}
                  </div>
                  {m.birthday && m.type === "kid" && getAgeFromBirthday(m.birthday) != null && <span style={{ fontSize: "0.85rem", color: "var(--text-muted, #666)" }}>Age: {getAgeFromBirthday(m.birthday)}</span>}
                </div>
              ))}
              <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", marginTop: "var(--space-xs)" }}>
                <button type="button" onClick={() => addHouseholdMember("kid")} className="btn">Add kid</button>
                <button type="button" onClick={() => addHouseholdMember("spouse")} className="btn">Add spouse</button>
                <button type="button" onClick={() => addHouseholdMember("other")} className="btn">Add other</button>
              </div>
            </div>
            <div className="form-group">
              <label>Important dates</label>
              {importantDates.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: "var(--space-xs)", marginBottom: "var(--space-2xs)", flexWrap: "wrap" }}>
                  <input className="input" placeholder="Label (e.g. Anniversary)" value={d.label} onChange={(e) => updateImportantDate(i, "label", e.target.value)} style={{ minWidth: 120 }} />
                  <input className="input" type="date" value={d.date} onChange={(e) => updateImportantDate(i, "date", e.target.value)} style={{ width: 140 }} />
                  <input className="input" placeholder="Recurrence" value={d.recurrence ?? ""} onChange={(e) => updateImportantDate(i, "recurrence", e.target.value)} style={{ minWidth: 80 }} />
                  <button type="button" onClick={() => removeImportantDate(i)} className="btn" style={{ padding: "0.25rem 0.5rem" }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addImportantDate} className="btn" style={{ marginTop: "var(--space-xs)" }}>Add date</button>
            </div>
            {customFieldDefinitions.length > 0 && (
              <div className="form-group">
                <label>Additional details</label>
                {customFieldDefinitions.map((def) => (
                  <div key={def.id} style={{ marginBottom: "var(--space-xs)" }}>
                    <label htmlFor={`va-custom-${def.key}`} style={{ fontSize: "0.9rem", display: "block", marginBottom: "var(--space-2xs)" }}>{def.label}</label>
                    {def.field_type === "multiline" ? (
                      <textarea
                        id={`va-custom-${def.key}`}
                        className="input"
                        rows={2}
                        value={customFieldValues[def.key] != null ? String(customFieldValues[def.key]) : ""}
                        onChange={(e) => setCustomFieldValue(def.key, e.target.value.trim() || null)}
                        style={{ width: "100%" }}
                      />
                    ) : def.field_type === "number" ? (
                      <input
                        id={`va-custom-${def.key}`}
                        type="number"
                        className="input"
                        value={customFieldValues[def.key] != null ? Number(customFieldValues[def.key]) : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustomFieldValue(def.key, v === "" ? null : (parseFloat(v) ?? null));
                        }}
                        style={{ width: "100%", maxWidth: 200 }}
                      />
                    ) : def.field_type === "date" ? (
                      <input
                        id={`va-custom-${def.key}`}
                        type="date"
                        className="input"
                        value={customFieldValues[def.key] != null ? String(customFieldValues[def.key]) : ""}
                        onChange={(e) => setCustomFieldValue(def.key, e.target.value || null)}
                        style={{ width: "100%", maxWidth: 200 }}
                      />
                    ) : (
                      <input
                        id={`va-custom-${def.key}`}
                        type="text"
                        className="input"
                        value={customFieldValues[def.key] != null ? String(customFieldValues[def.key]) : ""}
                        onChange={(e) => setCustomFieldValue(def.key, e.target.value.trim() || null)}
                        style={{ width: "100%", maxWidth: 320 }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
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
