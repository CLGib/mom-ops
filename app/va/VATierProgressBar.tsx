"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export type VATierProgressBarProps = {
  closedCount: number;
  tier1Reached: boolean;
  showTier1Celebration: boolean;
};

const TIER1_MAX = 50;
const TIER2_MAX = 100;

function getTierInfo(closedCount: number): { label: string; progressLabel: string; current: number; max: number; pct: number } {
  if (closedCount >= TIER2_MAX) {
    return {
      label: "Mission Commander",
      progressLabel: `${closedCount}+ tickets`,
      current: closedCount,
      max: TIER2_MAX,
      pct: 100,
    };
  }
  if (closedCount >= TIER1_MAX) {
    const current = closedCount - TIER1_MAX;
    const max = TIER2_MAX - TIER1_MAX;
    return {
      label: "Ops Navigator",
      progressLabel: `${closedCount} / ${TIER2_MAX} tickets`,
      current,
      max,
      pct: Math.min(100, (current / max) * 100),
    };
  }
  return {
    label: "Task Cadet",
    progressLabel: `${closedCount} / ${TIER1_MAX} tickets`,
    current: closedCount,
    max: TIER1_MAX,
    pct: (closedCount / TIER1_MAX) * 100,
  };
}

export default function VATierProgressBar({
  closedCount,
  tier1Reached,
  showTier1Celebration,
}: VATierProgressBarProps) {
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const showBanner = showTier1Celebration && !celebrationDismissed;

  useEffect(() => {
    if (!showTier1Celebration) return;
    const duration = 2_000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [showTier1Celebration]);

  const tier = getTierInfo(closedCount);
  const isTier1 = closedCount < TIER1_MAX;
  const isTier2 = closedCount >= TIER1_MAX && closedCount < TIER2_MAX;

  return (
    <div
      className="va-tier-progress"
      style={{
        marginBottom: "var(--space-md, 1rem)",
        padding: "var(--space-sm, 0.75rem) var(--space-md, 1rem)",
        background: "var(--surface, #f8fafc)",
        borderRadius: "var(--radius-md, 6px)",
        border: "1px solid var(--border, #e2e8f0)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-xs)" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
          {tier1Reached ? (
            <>
              <span aria-hidden style={{ marginRight: "0.25em" }}>🟢</span> Tier 1 — Task Cadet
              {closedCount >= TIER1_MAX && (
                <span style={{ marginLeft: "0.5em", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-muted, #64748b)" }}>
                  · {tier.progressLabel}
                </span>
              )}
            </>
          ) : (
            <>🟢 Tier 1 — Task Cadet · {tier.progressLabel}</>
          )}
        </span>
        {tier1Reached && isTier2 && (
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted, #64748b)" }}>
            Next: 🔵 Ops Navigator at 100 tickets
          </span>
        )}
        {closedCount >= TIER2_MAX && (
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted, #64748b)" }}>
            🟣 Tier 3 — Mission Commander
          </span>
        )}
      </div>
      {isTier1 && (
        <div
          className="founders-progress-wrap"
          role="progressbar"
          aria-valuenow={tier.current}
          aria-valuemin={0}
          aria-valuemax={tier.max}
          aria-label={`Progress to Tier 1: ${tier.current} of ${tier.max} tickets`}
          style={{
            height: 8,
            background: "var(--border, #e2e8f0)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            className="founders-progress-fill"
            style={{
              width: `${tier.pct}%`,
              height: "100%",
              background: "var(--accent, #3b82f6)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
      {isTier2 && closedCount < TIER2_MAX && (
        <div
          className="founders-progress-wrap"
          role="progressbar"
          aria-valuenow={tier.current}
          aria-valuemin={0}
          aria-valuemax={tier.max}
          aria-label={`Progress to Tier 2: ${tier.current + TIER1_MAX} of ${TIER2_MAX} tickets`}
          style={{
            height: 8,
            background: "var(--border, #e2e8f0)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            className="founders-progress-fill"
            style={{
              width: `${tier.pct}%`,
              height: "100%",
              background: "var(--accent, #3b82f6)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      {showBanner && (
        <div
          role="alert"
          style={{
            marginTop: "var(--space-sm)",
            padding: "var(--space-sm) var(--space-md)",
            background: "var(--color-success-subtle, #dcfce7)",
            border: "1px solid var(--color-success, #22c55e)",
            borderRadius: "var(--radius-md, 6px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-sm)",
          }}
        >
          <div>
            <strong>You hit 50 tickets!</strong> $5 bonus added. Chrissy will reach out with next steps.
          </div>
          <button
            type="button"
            onClick={() => setCelebrationDismissed(true)}
            aria-label="Dismiss"
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.15rem",
              fontSize: "1.25rem",
              lineHeight: 1,
              opacity: 0.8,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
