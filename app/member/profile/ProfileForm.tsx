"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export type ProfileFormData = {
  full_name: string | null;
  preferred_name: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  partner_name: string | null;
  kids_count: number | null;
  kids_ages: number[] | null;
  schools: { name: string; city?: string; notes?: string }[] | null;
  activities: { name: string; schedule?: string; notes?: string }[] | null;
  preferred_stores: string[] | null;
  preferred_brands: string[] | null;
  communication_tone: "warm" | "direct" | "formal" | null;
  constraints: string | null;
  important_dates: { label: string; date: string; recurrence?: string }[] | null;
  task_submission_preference: "email" | "portal" | "either" | null;
  typical_turnaround: "standard" | "rush_when_possible" | null;
};

const TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

function computeProfileCompletion(data: ProfileFormData): number {
  let filled = 0;
  const checks = [
    data.full_name?.trim(),
    data.preferred_name?.trim(),
    data.city?.trim(),
    data.state?.trim(),
    data.timezone?.trim(),
    data.partner_name?.trim(),
    data.kids_count != null && data.kids_count >= 0,
    data.kids_ages != null && data.kids_ages.length > 0,
    data.schools != null && data.schools.length > 0,
    data.activities != null && data.activities.length > 0,
    data.preferred_stores != null && data.preferred_stores.length > 0,
    data.preferred_brands != null && data.preferred_brands.length > 0,
    data.communication_tone,
    data.constraints?.trim(),
    data.important_dates != null && data.important_dates.length > 0,
    data.task_submission_preference,
    data.typical_turnaround,
  ];
  filled = checks.filter(Boolean).length;
  return Math.min(100, Math.round((filled / checks.length) * 100));
}

type Props = {
  memberId: string;
  initial: ProfileFormData;
};

export default function ProfileForm({ memberId, initial }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ProfileFormData>(initial);

  function update<K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function addSchool() {
    setForm((prev) => ({
      ...prev,
      schools: [...(prev.schools ?? []), { name: "" }],
    }));
    setSaved(false);
  }
  function removeSchool(i: number) {
    setForm((prev) => ({
      ...prev,
      schools: prev.schools?.filter((_, idx) => idx !== i) ?? [],
    }));
    setSaved(false);
  }
  function updateSchool(i: number, field: "name" | "city" | "notes", val: string) {
    setForm((prev) => {
      const arr = [...(prev.schools ?? [])];
      if (!arr[i]) return prev;
      arr[i] = { ...arr[i], [field]: val };
      return { ...prev, schools: arr };
    });
    setSaved(false);
  }

  function addActivity() {
    setForm((prev) => ({
      ...prev,
      activities: [...(prev.activities ?? []), { name: "" }],
    }));
    setSaved(false);
  }
  function removeActivity(i: number) {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities?.filter((_, idx) => idx !== i) ?? [],
    }));
    setSaved(false);
  }
  function updateActivity(i: number, field: "name" | "schedule" | "notes", val: string) {
    setForm((prev) => {
      const arr = [...(prev.activities ?? [])];
      if (!arr[i]) return prev;
      arr[i] = { ...arr[i], [field]: val };
      return { ...prev, activities: arr };
    });
    setSaved(false);
  }

  function addImportantDate() {
    setForm((prev) => ({
      ...prev,
      important_dates: [...(prev.important_dates ?? []), { label: "", date: "" }],
    }));
    setSaved(false);
  }
  function removeImportantDate(i: number) {
    setForm((prev) => ({
      ...prev,
      important_dates: prev.important_dates?.filter((_, idx) => idx !== i) ?? [],
    }));
    setSaved(false);
  }
  function updateImportantDate(i: number, field: "label" | "date" | "recurrence", val: string) {
    setForm((prev) => {
      const arr = [...(prev.important_dates ?? [])];
      if (!arr[i]) return prev;
      arr[i] = { ...arr[i], [field]: val };
      return { ...prev, important_dates: arr };
    });
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const kidsCount = form.kids_count;
    if (kidsCount != null && kidsCount < 0) {
      setError("Kids count must be 0 or greater.");
      setSubmitting(false);
      return;
    }
    const supabase = createClient();
    const profileCompletion = computeProfileCompletion(form);
    const payload = {
      full_name: form.full_name?.trim() || null,
      preferred_name: form.preferred_name?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      timezone: form.timezone?.trim() || null,
      partner_name: form.partner_name?.trim() || null,
      kids_count: form.kids_count ?? null,
      kids_ages: form.kids_ages && form.kids_ages.length > 0 ? form.kids_ages : null,
      schools: form.schools && form.schools.length > 0 ? form.schools : null,
      activities: form.activities && form.activities.length > 0 ? form.activities : null,
      preferred_stores: form.preferred_stores && form.preferred_stores.length > 0 ? form.preferred_stores : null,
      preferred_brands: form.preferred_brands && form.preferred_brands.length > 0 ? form.preferred_brands : null,
      communication_tone: form.communication_tone ?? null,
      constraints: form.constraints?.trim() || null,
      important_dates: form.important_dates && form.important_dates.length > 0 ? form.important_dates : null,
      task_submission_preference: form.task_submission_preference ?? null,
      typical_turnaround: form.typical_turnaround ?? null,
      profile_completion: profileCompletion,
    };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", memberId);
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }
    setSaved(true);
    setSubmitting(false);
    router.refresh();
  }

  const completion = computeProfileCompletion(form);

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <label className="section-heading" style={{ display: "block", marginBottom: "var(--space-xs)" }}>
          Profile completion
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div style={{ flex: 1, maxWidth: 200, height: 8, background: "var(--color-border, #e5e5e5)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${completion}%`, height: "100%", background: "var(--accent, #b8860b)", transition: "width 0.2s" }} />
          </div>
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted, #666)" }}>{completion}%</span>
        </div>
        {completion < 100 && (
          <p className="form-note" style={{ marginTop: "var(--space-xs)" }}>
            Want better results? Add your household details. Takes 2 minutes.
          </p>
        )}
      </div>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>Basics</h2>
        <div className="form-group">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" className="input" value={form.full_name ?? ""} onChange={(e) => update("full_name", e.target.value || null)} />
        </div>
        <div className="form-group">
          <label htmlFor="preferred_name">Preferred name</label>
          <input id="preferred_name" className="input" value={form.preferred_name ?? ""} onChange={(e) => update("preferred_name", e.target.value || null)} />
        </div>
        <div className="form-group">
          <label htmlFor="city">City</label>
          <input id="city" className="input" value={form.city ?? ""} onChange={(e) => update("city", e.target.value || null)} />
        </div>
        <div className="form-group">
          <label htmlFor="state">State</label>
          <input id="state" className="input" value={form.state ?? ""} onChange={(e) => update("state", e.target.value || null)} />
        </div>
        <div className="form-group">
          <label htmlFor="timezone">Timezone</label>
          <select id="timezone" className="input" value={form.timezone ?? "America/Chicago"} onChange={(e) => update("timezone", e.target.value || null)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>Household</h2>
        <div className="form-group">
          <label htmlFor="partner_name">Partner name</label>
          <input id="partner_name" className="input" value={form.partner_name ?? ""} onChange={(e) => update("partner_name", e.target.value || null)} />
        </div>
        <div className="form-group">
          <label htmlFor="kids_count">Number of kids</label>
          <input id="kids_count" type="number" min={0} className="input" value={form.kids_count ?? ""} onChange={(e) => update("kids_count", e.target.value === "" ? null : parseInt(e.target.value, 10))} />
        </div>
        <div className="form-group">
          <label htmlFor="kids_ages">Kids ages (comma-separated, e.g. 5, 8)</label>
          <input id="kids_ages" className="input" value={form.kids_ages?.join(", ") ?? ""} onChange={(e) => {
            const val = e.target.value.trim();
            if (!val) update("kids_ages", null);
            else update("kids_ages", val.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)));
          }} />
        </div>
        <div className="form-group">
          <label>Schools</label>
          {(form.schools ?? []).map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-xs)", flexWrap: "wrap" }}>
              <input className="input" placeholder="School name" value={s.name} onChange={(e) => updateSchool(i, "name", e.target.value)} style={{ flex: 1, minWidth: 120 }} />
              <input className="input" placeholder="City" value={s.city ?? ""} onChange={(e) => updateSchool(i, "city", e.target.value)} style={{ width: 100 }} />
              <input className="input" placeholder="Notes" value={s.notes ?? ""} onChange={(e) => updateSchool(i, "notes", e.target.value)} style={{ flex: 1, minWidth: 100 }} />
              <button type="button" onClick={() => removeSchool(i)} className="btn" style={{ padding: "0.25rem 0.5rem" }}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={addSchool} className="btn" style={{ marginTop: "var(--space-xs)" }}>Add school</button>
        </div>
        <div className="form-group">
          <label>Activities</label>
          {(form.activities ?? []).map((a, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-xs)", flexWrap: "wrap" }}>
              <input className="input" placeholder="Activity name" value={a.name} onChange={(e) => updateActivity(i, "name", e.target.value)} style={{ flex: 1, minWidth: 120 }} />
              <input className="input" placeholder="Schedule" value={a.schedule ?? ""} onChange={(e) => updateActivity(i, "schedule", e.target.value)} style={{ width: 120 }} />
              <input className="input" placeholder="Notes" value={a.notes ?? ""} onChange={(e) => updateActivity(i, "notes", e.target.value)} style={{ flex: 1, minWidth: 100 }} />
              <button type="button" onClick={() => removeActivity(i)} className="btn" style={{ padding: "0.25rem 0.5rem" }}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={addActivity} className="btn" style={{ marginTop: "var(--space-xs)" }}>Add activity</button>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>Preferences</h2>
        <div className="form-group">
          <label>Communication tone</label>
          <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
            {(["warm", "direct", "formal"] as const).map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                <input type="radio" name="communication_tone" checked={form.communication_tone === t} onChange={() => update("communication_tone", t)} />
                <span style={{ textTransform: "capitalize" }}>{t}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="preferred_stores">Preferred stores (comma-separated)</label>
          <input id="preferred_stores" className="input" value={(form.preferred_stores ?? []).join(", ")} onChange={(e) => update("preferred_stores", e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null)} />
        </div>
        <div className="form-group">
          <label htmlFor="preferred_brands">Preferred brands (comma-separated)</label>
          <input id="preferred_brands" className="input" value={(form.preferred_brands ?? []).join(", ")} onChange={(e) => update("preferred_brands", e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null)} />
        </div>
        <div className="form-group">
          <label htmlFor="constraints">Constraints (e.g. no glitter, no weekday evenings)</label>
          <textarea id="constraints" className="input" rows={3} value={form.constraints ?? ""} onChange={(e) => update("constraints", e.target.value || null)} />
        </div>
        <div className="form-group">
          <label>Task submission preference</label>
          <select className="input" value={form.task_submission_preference ?? "either"} onChange={(e) => update("task_submission_preference", (e.target.value as "email" | "portal" | "either") || null)}>
            <option value="either">Either (email or portal)</option>
            <option value="email">Email</option>
            <option value="portal">Portal</option>
          </select>
        </div>
        <div className="form-group">
          <label>Typical turnaround</label>
          <select className="input" value={form.typical_turnaround ?? "standard"} onChange={(e) => update("typical_turnaround", (e.target.value as "standard" | "rush_when_possible") || null)}>
            <option value="standard">Standard</option>
            <option value="rush_when_possible">Rush when possible</option>
          </select>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>Important dates</h2>
        {(form.important_dates ?? []).map((d, i) => (
          <div key={i} style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-xs)", flexWrap: "wrap" }}>
            <input className="input" placeholder="Label (e.g. Birthday)" value={d.label} onChange={(e) => updateImportantDate(i, "label", e.target.value)} style={{ minWidth: 120 }} />
            <input className="input" type="date" value={d.date} onChange={(e) => updateImportantDate(i, "date", e.target.value)} style={{ width: 140 }} />
            <input className="input" placeholder="Recurrence (e.g. yearly)" value={d.recurrence ?? ""} onChange={(e) => updateImportantDate(i, "recurrence", e.target.value)} style={{ minWidth: 100 }} />
            <button type="button" onClick={() => removeImportantDate(i)} className="btn" style={{ padding: "0.25rem 0.5rem" }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addImportantDate} className="btn" style={{ marginTop: "var(--space-xs)" }}>Add date</button>
      </section>

      {error && (
        <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>{error}</p>
      )}
      {saved && (
        <p role="status" className="form-note" style={{ color: "var(--color-success, #0a0)", marginBottom: "var(--space-sm)" }}>Profile saved.</p>
      )}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
