export default function OnDemandFlexibilityGraphic() {
  return (
    <div
      className="va-apply-flexibility-graphic"
      style={{
        marginTop: "var(--space-lg)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
      aria-hidden
    >
      <img
        src="/assets/va-apply-flexibility.png"
        alt=""
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          verticalAlign: "middle",
        }}
        width={720}
        height={480}
      />
      <p
        className="form-note"
        style={{
          margin: 0,
          padding: "var(--space-md) var(--space-lg)",
          fontSize: "0.9rem",
          textAlign: "center",
          borderTop: "1px solid var(--border)",
        }}
      >
        Work from home. Between drop-off and pickup. On your schedule.
      </p>
    </div>
  );
}
