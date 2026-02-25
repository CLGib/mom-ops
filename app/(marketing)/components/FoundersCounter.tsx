"use client";

type Props = { claimed: number };

export default function FoundersCounter({ claimed }: Props) {
  const isFull = claimed >= 50;
  const displayClaimed = Math.min(50, Math.max(0, claimed));
  const pct = (displayClaimed / 50) * 100;

  return (
    <div className="founders-counter">
      <p className="founders-counter-text">
        {isFull
          ? "Founding Member spots are full"
          : `${displayClaimed} of 50 Founding Member spots claimed`}
      </p>
      <div className="founders-progress-wrap" role="progressbar" aria-valuenow={displayClaimed} aria-valuemin={0} aria-valuemax={50} aria-label="Founding Member spots claimed">
        <div
          className="founders-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
