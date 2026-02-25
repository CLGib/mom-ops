"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { submitOnboarding } from "./actions";

export type HelpOption = string;

type Props = {
  memberId: string;
  helpOptions: HelpOption[];
};

export type OnboardingAnswers = {
  helpWanted?: string[];
  tone?: "warm" | "direct" | "formal";
  kidsCount?: number | null;
  kidsAges?: (number | string)[];
  constraints?: string | null;
  upcoming?: string | null;
};

export default function OnboardingSurvey({ memberId, helpOptions }: Props) {
  const router = useRouter();
  const [helpWanted, setHelpWanted] = useState<string[]>([]);
  const [tone, setTone] = useState<"warm" | "direct" | "formal">("warm");
  const [kidsCount, setKidsCount] = useState<number | "">("");
  const [kidsAgesRaw, setKidsAgesRaw] = useState("");
  const [constraints, setConstraints] = useState("");
  const [upcoming, setUpcoming] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function toggleHelp(opt: string) {
    setHelpWanted((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
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
      tone,
      kidsCount: kidsCount === "" ? null : kidsCount,
      kidsAges: kidsAges?.length ? kidsAges : undefined,
      constraints: constraints.trim() || null,
      upcoming: upcoming.trim() || null,
    };
    const { error: submitErr } = await submitOnboarding(answers);
    if (submitErr) {
      setError(submitErr);
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
    router.refresh();
    router.push("/member");
  }

  if (done) {
    return (
      <p role="status" className="form-note" style={{ color: "var(--color-success, #0a0)" }}>
        Thanks! Redirecting you to your dashboard…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>What kind of help do you want most often? (multi-select)</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          {helpOptions.map((opt) => (
            <label key={opt} style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={helpWanted.includes(opt)}
                onChange={() => toggleHelp(opt)}
                style={{ flexShrink: 0, margin: 0 }}
              />
              <span style={{ marginLeft: "12px" }}>{opt}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label>Preferred communication tone</label>
        <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
          {(["warm", "direct", "formal"] as const).map((t) => (
            <label key={t} style={{ display: "flex", alignItems: "center" }}>
              <input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} style={{ flexShrink: 0, margin: 0 }} />
              <span style={{ marginLeft: "12px", textTransform: "capitalize" }}>{t}</span>
            </label>
          ))}
        </div>
      </div>
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
        <label htmlFor="constraints">Any constraints we should know?</label>
        <textarea id="constraints" className="input" rows={2} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="upcoming">Anything coming up in the next 30 days we should prep for?</label>
        <textarea id="upcoming" className="input" rows={2} value={upcoming} onChange={(e) => setUpcoming(e.target.value)} />
      </div>
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
