"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { submitOnboarding } from "./actions";
import posthog from "posthog-js";

export type HelpOption = string;

export type HouseholdMember = {
  type: "kid" | "spouse" | "other";
  name?: string;
  likes?: string;
  dislikes?: string;
  birthday?: string;
  clothing_size?: string;
  relation?: string;
};

type Props = {
  memberId: string;
  helpOptions: HelpOption[];
  goalsOptions?: HelpOption[];
};

export type OnboardingAnswers = {
  helpWanted?: string[];
  goalsToWorkOn?: string[];
  tone?: "warm" | "direct" | "formal";
  kidsCount?: number | null;
  kidsAges?: (number | string)[];
  householdMembers?: HouseholdMember[];
  constraints?: string[];
  constraintsOther?: string | null;
  preferredBrands?: string[];
  preferredBrandsOther?: string | null;
  upcoming?: string | null;
  timezone?: string | null;
  city?: string | null;
  state?: string | null;
  task_submission_preference?: "email" | "portal" | "either" | null;
  typical_turnaround?: "standard" | "rush_when_possible" | null;
};

const CONSTRAINT_OPTIONS = [
  "No glitter",
  "No weekday evenings",
  "Budget-conscious",
  "Eco-friendly preferred",
  "No peanuts/nuts",
  "Vegetarian",
  "No artificial colors",
] as const;

const PREFERRED_BRAND_OPTIONS = [
  "Target",
  "Amazon",
  "Walmart",
  "Costco",
  "Trader Joe's",
  "Whole Foods",
  "Carters",
  "Old Navy",
  "Gap",
  "H&M",
] as const;

const TIMEZONE_OPTIONS = [
  { value: "", label: "Select (optional)" },
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Phoenix", label: "Arizona" },
];

export default function OnboardingSurvey({ memberId, helpOptions, goalsOptions = [] }: Props) {
  const router = useRouter();
  const [helpWanted, setHelpWanted] = useState<string[]>([]);
  const [goalsToWorkOn, setGoalsToWorkOn] = useState<string[]>([]);
  const [tone, setTone] = useState<"warm" | "direct" | "formal">("warm");
  const [kidsCount, setKidsCount] = useState<number | "">("");
  const [kidsAgesRaw, setKidsAgesRaw] = useState("");
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [constraintsOther, setConstraintsOther] = useState("");
  const [preferredBrands, setPreferredBrands] = useState<string[]>([]);
  const [preferredBrandsOther, setPreferredBrandsOther] = useState("");
  const [upcoming, setUpcoming] = useState("");
  const [timezone, setTimezone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [taskSubmissionPreference, setTaskSubmissionPreference] = useState<"email" | "portal" | "either">("either");
  const [typicalTurnaround, setTypicalTurnaround] = useState<"standard" | "rush_when_possible">("standard");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function toggleHelp(opt: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  function addHouseholdMember(type: HouseholdMember["type"]) {
    setHouseholdMembers((prev) => [...prev, { type }]);
  }
  function removeHouseholdMember(i: number) {
    setHouseholdMembers((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateHouseholdMember(i: number, field: keyof HouseholdMember, value: string) {
    setHouseholdMembers((prev) => {
      const arr = [...prev];
      if (!arr[i]) return prev;
      arr[i] = { ...arr[i], [field]: value || undefined };
      return arr;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const kidsAges = kidsAgesRaw.trim()
      ? kidsAgesRaw.split(",").map((s) => {
          const n = parseInt(s.trim(), 10);
          return Number.isNaN(n) ? s.trim() : n;
        })
      : undefined;
    const answers: OnboardingAnswers = {
      helpWanted: helpWanted.length > 0 ? helpWanted : undefined,
      goalsToWorkOn: goalsToWorkOn.length > 0 ? goalsToWorkOn : undefined,
      tone,
      kidsCount: kidsCount === "" ? null : kidsCount,
      kidsAges: kidsAges?.length ? kidsAges : undefined,
      householdMembers: householdMembers.length > 0 ? householdMembers : undefined,
      constraints: constraints.length > 0 ? constraints : undefined,
      constraintsOther: constraintsOther.trim() || null,
      preferredBrands: preferredBrands.length > 0 ? preferredBrands : undefined,
      preferredBrandsOther: preferredBrandsOther.trim() || null,
      upcoming: upcoming.trim() || null,
      timezone: timezone.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      task_submission_preference: taskSubmissionPreference,
      typical_turnaround: typicalTurnaround,
    };
    const { error: submitErr } = await submitOnboarding(answers);
    if (submitErr) {
      setError(submitErr);
      setSubmitting(false);
      return;
    }
    posthog.capture("onboarding_completed", {
      tone,
      has_kids: kidsCount !== "" && kidsCount !== null && kidsCount > 0,
      task_submission_preference: taskSubmissionPreference,
      typical_turnaround: typicalTurnaround,
      help_categories_count: helpWanted.length,
    });
    setDone(true);
    setSubmitting(false);
    router.refresh();
    router.push("/member");
  }

  if (done) {
    return (
      <p role="status" className="form-note" style={{ color: "var(--color-success, #0a0)" }}>
        Thanks! Redirecting you to My Ops Hub…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Your answers help your specialist personalize support and reduce back-and-forth.
      </p>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ fontSize: "1rem", marginTop: 0 }}>About you</h2>
        <div className="form-group">
          <label>What kind of help do you want most often? (multi-select)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {helpOptions.map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={helpWanted.includes(opt)}
                  onChange={() => toggleHelp(opt, setHelpWanted)}
                  style={{ flexShrink: 0, margin: 0 }}
                />
                <span style={{ marginLeft: "12px" }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>
        {goalsOptions.length > 0 && (
          <div className="form-group">
            <label>What would you like to work on? (select all that apply)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              {goalsOptions.map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={goalsToWorkOn.includes(opt)}
                    onChange={() => toggleHelp(opt, setGoalsToWorkOn)}
                    style={{ flexShrink: 0, margin: 0 }}
                  />
                  <span style={{ marginLeft: "12px" }}>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="kids_count">Number of kids (optional)</label>
          <input
            id="kids_count"
            type="number"
            min={0}
            className="input"
            value={kidsCount === "" ? "" : kidsCount}
            onChange={(e) => setKidsCount(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="kids_ages">Kids ages (optional, comma-separated e.g. 5, 8)</label>
          <input
            id="kids_ages"
            className="input"
            value={kidsAgesRaw}
            onChange={(e) => setKidsAgesRaw(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Kids, spouse &amp; other important people (optional)</label>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)", fontSize: "0.85rem" }}>
            Add mini profiles for birthday reminders and personalization.
          </p>
          {householdMembers.map((m, i) => (
            <div key={i} className="card" style={{ padding: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-xs)" }}>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{m.type}</span>
                <button type="button" onClick={() => removeHouseholdMember(i)} className="btn" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>Remove</button>
              </div>
              <div style={{ display: "grid", gap: "var(--space-xs)", gridTemplateColumns: "1fr 1fr" }}>
                <input className="input" placeholder="Name" value={m.name ?? ""} onChange={(e) => updateHouseholdMember(i, "name", e.target.value)} />
                {m.type === "kid" && <input className="input" placeholder="Clothing size" value={m.clothing_size ?? ""} onChange={(e) => updateHouseholdMember(i, "clothing_size", e.target.value)} />}
                {m.type === "other" && <input className="input" placeholder="Relation (e.g. grandmother)" value={m.relation ?? ""} onChange={(e) => updateHouseholdMember(i, "relation", e.target.value)} />}
              </div>
              <input className="input" placeholder="Likes" value={m.likes ?? ""} onChange={(e) => updateHouseholdMember(i, "likes", e.target.value)} style={{ marginTop: "var(--space-xs)" }} />
              <input className="input" placeholder="Dislikes" value={m.dislikes ?? ""} onChange={(e) => updateHouseholdMember(i, "dislikes", e.target.value)} style={{ marginTop: "var(--space-xs)" }} />
              <input className="input" type="date" placeholder="Birthday" value={m.birthday ?? ""} onChange={(e) => updateHouseholdMember(i, "birthday", e.target.value)} style={{ marginTop: "var(--space-xs)", width: "100%" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginTop: "var(--space-xs)" }}>
            <button type="button" onClick={() => addHouseholdMember("kid")} className="btn">Add kid</button>
            <button type="button" onClick={() => addHouseholdMember("spouse")} className="btn">Add spouse</button>
            <button type="button" onClick={() => addHouseholdMember("other")} className="btn">Add other (family, friend)</button>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ fontSize: "1rem", marginTop: 0 }}>Communication style</h2>
        <div className="form-group">
          <label>Preferred communication tone</label>
          <p className="form-note" style={{ marginBottom: "var(--space-xs)", fontSize: "0.85rem" }}>
            Warm = friendly and supportive · Direct = concise and to the point · Formal = professional
          </p>
          <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
            {(["warm", "direct", "formal"] as const).map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center" }}>
                <input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} style={{ flexShrink: 0, margin: 0 }} />
                <span style={{ marginLeft: "12px", textTransform: "capitalize" }}>{t}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ fontSize: "1rem", marginTop: 0 }}>Preferences &amp; constraints</h2>
        <div className="form-group">
          <label>Any constraints we should know? (select all that apply)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {CONSTRAINT_OPTIONS.map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={constraints.includes(opt)}
                  onChange={() => setConstraints((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]))}
                  style={{ flexShrink: 0, margin: 0 }}
                />
                <span style={{ marginLeft: "12px" }}>{opt}</span>
              </label>
            ))}
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={constraints.includes("Other")}
                onChange={() => setConstraints((prev) => (prev.includes("Other") ? prev.filter((o) => o !== "Other") : [...prev, "Other"]))}
                style={{ flexShrink: 0, margin: 0 }}
              />
              <span style={{ marginLeft: "12px" }}>Other</span>
            </label>
            {constraints.includes("Other") && (
              <input
                className="input"
                placeholder="Describe other constraints"
                value={constraintsOther}
                onChange={(e) => setConstraintsOther(e.target.value)}
                style={{ marginLeft: "28px", maxWidth: 320 }}
              />
            )}
          </div>
        </div>
        <div className="form-group">
          <label>Preferred brands (select all that apply)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
            {PREFERRED_BRAND_OPTIONS.map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={preferredBrands.includes(opt)}
                  onChange={() => setPreferredBrands((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]))}
                  style={{ flexShrink: 0, margin: 0 }}
                />
                <span style={{ marginLeft: "8px" }}>{opt}</span>
              </label>
            ))}
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={preferredBrands.includes("Other")}
                onChange={() => setPreferredBrands((prev) => (prev.includes("Other") ? prev.filter((o) => o !== "Other") : [...prev, "Other"]))}
                style={{ flexShrink: 0, margin: 0 }}
              />
              <span style={{ marginLeft: "8px" }}>Other</span>
            </label>
            {preferredBrands.includes("Other") && (
              <input
                className="input"
                placeholder="Other brands (comma-separated)"
                value={preferredBrandsOther}
                onChange={(e) => setPreferredBrandsOther(e.target.value)}
                style={{ marginLeft: "8px", minWidth: 180 }}
              />
            )}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="upcoming">Anything coming up in the next 30 days we should prep for?</label>
          <textarea id="upcoming" className="input" rows={2} value={upcoming} onChange={(e) => setUpcoming(e.target.value)} />
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="section-heading" style={{ fontSize: "1rem", marginTop: 0 }}>How you work</h2>
        <div className="form-group">
          <label htmlFor="timezone">Timezone (optional)</label>
          <select id="timezone" className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONE_OPTIONS.map((o) => (
              <option key={o.value || "empty"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="city">City (optional)</label>
          <input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="state">State (optional)</label>
          <input id="state" className="input" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="task_submission">How do you prefer to submit tasks?</label>
          <select id="task_submission" className="input" value={taskSubmissionPreference} onChange={(e) => setTaskSubmissionPreference(e.target.value as "email" | "portal" | "either")}>
            <option value="either">Either (email or portal)</option>
            <option value="email">Email</option>
            <option value="portal">Portal</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="turnaround">Typical turnaround preference</label>
          <select id="turnaround" className="input" value={typicalTurnaround} onChange={(e) => setTypicalTurnaround(e.target.value as "standard" | "rush_when_possible")}>
            <option value="standard">Standard</option>
            <option value="rush_when_possible">Rush when possible</option>
          </select>
        </div>
      </section>

      {error && (
        <p role="alert" className="form-note" style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)" }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save and finish"}
        </button>
        <Link href="/member" className="btn">Skip for now</Link>
      </div>
    </form>
  );
}
