"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export type UpliftState = {
  u: boolean;
  p: boolean;
  l: boolean;
  i: boolean;
  f: boolean;
  t: boolean;
  completedAt?: string | null;
};

const UPLIFT_ITEMS: { key: keyof Omit<UpliftState, "completedAt">; label: string; description: string; href?: string }[] = [
  { key: "u", label: "Update the Member Profile", description: "I updated the member profile with any new information." },
  { key: "p", label: "Plan the Smartest Path", description: "I searched past tickets and the VA toolbox to see if I can reuse any past work." },
  { key: "l", label: "Level It Up", description: "I've not only done the task (fact-checked it), but I've gone one level above the ask." },
  { key: "i", label: "Inform Using VIP", description: "I've communicated and delivered the task to the member." },
  { key: "f", label: "Forward the Loop", description: "Before closing the ticket and debiting credits, I've suggested the next logical step or offered to help in another way." },
  { key: "t", label: "Track & Teach", description: "If I've created anything new or useful, I've documented it in the template library to help other VAs.", href: "https://themomops.com/toolbox/templates" },
];

type Props = {
  ticketId: string;
  initialState: UpliftState | null;
};

function fireConfetti() {
  const count = 200;
  const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  }
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export default function VAUpliftChecklist({ ticketId, initialState }: Props) {
  const router = useRouter();
  const [state, setState] = useState<UpliftState>(() => ({
    u: initialState?.u ?? false,
    p: initialState?.p ?? false,
    l: initialState?.l ?? false,
    i: initialState?.i ?? false,
    f: initialState?.f ?? false,
    t: initialState?.t ?? false,
    completedAt: initialState?.completedAt ?? null,
  }));
  const [saving, setSaving] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState(false);
  const hasFiredConfetti = useRef(false);

  const checkedCount = [state.u, state.p, state.l, state.i, state.f, state.t].filter(Boolean).length;

  const saveChecklist = useCallback(
    async (updates: Partial<UpliftState>, prevCheckedCount?: number) => {
      const beforeCount = prevCheckedCount ?? [state.u, state.p, state.l, state.i, state.f, state.t].filter(Boolean).length;
      const wasAllChecked = beforeCount === 6;

      setSaving(true);
      try {
        const res = await fetch("/api/va/uplift-checklist", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ticketId, ...updates }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to save");
        }
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          u: data.u ?? prev.u,
          p: data.p ?? prev.p,
          l: data.l ?? prev.l,
          i: data.i ?? prev.i,
          f: data.f ?? prev.f,
          t: data.t ?? prev.t,
          completedAt: data.completedAt ?? prev.completedAt,
        }));

        const nowAllChecked = data.u && data.p && data.l && data.i && data.f && data.t;
        if (nowAllChecked && !wasAllChecked && !hasFiredConfetti.current) {
          hasFiredConfetti.current = true;
          fireConfetti();
          setCelebrationMessage(true);
          setTimeout(() => setCelebrationMessage(false), 5000);
        }

        router.refresh();
      } catch (e) {
        console.error("[VAUpliftChecklist] save failed", e);
      } finally {
        setSaving(false);
      }
    },
    [ticketId, router, state.u, state.p, state.l, state.i, state.f, state.t]
  );

  const handleToggle = useCallback(
    (key: keyof Omit<UpliftState, "completedAt">) => {
      const prevCount = [state.u, state.p, state.l, state.i, state.f, state.t].filter(Boolean).length;
      const newValue = !state[key];
      const newState = { ...state, [key]: newValue };
      setState(newState);
      saveChecklist(newState, prevCount);
    },
    [state, saveChecklist]
  );

  const leftItems = UPLIFT_ITEMS.filter(({ key }) => key === "u" || key === "p" || key === "l");
  const rightItems = UPLIFT_ITEMS.filter(({ key }) => key === "i" || key === "f" || key === "t");

  const renderItem = ({ key, label, description, href }: (typeof UPLIFT_ITEMS)[number]) => (
    <li
      key={key}
      style={{
        padding: "2px 6px",
        borderRadius: "var(--radius)",
        backgroundColor: state[key] ? "var(--color-success-bg, rgba(107, 124, 94, 0.1))" : "transparent",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
          fontSize: "0.8125rem",
        }}
        title={description}
      >
        <input
          type="checkbox"
          checked={state[key]}
          onChange={() => handleToggle(key)}
          disabled={saving}
          style={{ margin: 0, flexShrink: 0 }}
          aria-label={`${key.toUpperCase()}: ${label}`}
        />
        <span>
          <strong>
            {key.toUpperCase()} —{" "}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                {label}
              </a>
            ) : (
              label
            )}
          </strong>
        </span>
      </label>
    </li>
  );

  return (
    <section
      className="card"
      style={{ marginBottom: "var(--space-sm)", padding: "6px 10px" }}
      aria-label="UPLIFT checklist"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
        <h2 className="section-heading" style={{ margin: 0, fontSize: "0.875rem" }}>
          UPLIFT checklist
        </h2>
        <span className="form-note" style={{ margin: 0, fontSize: "0.75rem" }}>
          {checkedCount}/6
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", listStyle: "none", padding: 0, margin: 0 }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          {leftItems.map(renderItem)}
        </ul>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          {rightItems.map(renderItem)}
        </ul>
      </div>
      {celebrationMessage && (
        <p
          style={{
            marginTop: "6px",
            marginBottom: 0,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--color-success-text, #6b7c5e)",
          }}
          role="status"
        >
          You just made someone&apos;s day
        </p>
      )}
    </section>
  );
}
