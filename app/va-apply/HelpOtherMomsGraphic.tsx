export default function HelpOtherMomsGraphic() {
  return (
    <div
      className="va-apply-help-moms-graphic"
      style={{
        padding: "var(--space-lg)",
        background: "var(--bg-alt)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
      aria-hidden
    >
      <p className="form-note" style={{ margin: "0 0 var(--space-sm)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Example of a real task
      </p>
      <blockquote
        style={{
          margin: 0,
          padding: 0,
          fontStyle: "normal",
          fontSize: "0.9375rem",
          lineHeight: 1.6,
          color: "var(--text)",
          whiteSpace: "pre-wrap",
        }}
      >
        Can you make me a shoppable list for Easter baskets? I need ideas for my son (toddler), my husband, and two godchildren. We want things that go in a reusable basket, outdoor/spring vibes, a treat or two but not all candy. Roughly $40 for my son, $20 for my husband, about $20–30 each for the godchildren. Prefer Target or Amazon.
      </blockquote>
      <p className="form-note" style={{ marginTop: "var(--space-sm)", fontSize: "0.85rem" }}>
        You&apos;d research options, build the list with links, and deliver something she can use right away.
      </p>
    </div>
  );
}
