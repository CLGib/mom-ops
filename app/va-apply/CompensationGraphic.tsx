export default function CompensationGraphic() {
  return (
    <div
      className="va-apply-compensation-graphic"
      style={{
        padding: "var(--space-lg)",
        background: "var(--accent-soft-bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
      }}
      aria-hidden
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text)" }}>$359</span>
        <span className="form-note" style={{ fontSize: "0.9rem" }}>Total payout (example)</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--color-success-text)", flexShrink: 0 }}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span style={{ fontSize: "0.95rem" }}><strong>+ $102 tips</strong> — go directly to you</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--accent)", flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontSize: "0.95rem" }}><strong>20% per credit</strong> + tips</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--accent)", flexShrink: 0 }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span style={{ fontSize: "0.95rem" }}>Bonuses for great reviews & on-time delivery</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginTop: "var(--space-xs)", paddingTop: "var(--space-sm)", borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>4.9 out of 5</span>
        <span className="form-note" style={{ fontSize: "0.85rem" }}>— member ratings</span>
      </div>
    </div>
  );
}
