export default function ValueMath() {
  return (
    <section id="pricing" className="section section-alt">
      <div className="container">
        <h2 className="section-title">
          $29.95/month. The family-ready system, already built.
        </h2>
        <p className="section-lead">
          Unlimited AI helpers. No credit counting, no usage anxiety. Cancel
          anytime &mdash; and your first helper is free, no credit card to start.
        </p>
        <p
          className="section-body"
          style={{ marginTop: "var(--space-md)" }}
        >
          AI helpers are unlimited and included in your membership. Need a real
          person to make the calls, handle a booking, or take on a bigger
          project? Human concierge support is available as a paid add-on &mdash;
          so you only pay for it when you actually want it.
        </p>
        <div
          style={{
            display: "grid",
            gap: "var(--space-md)",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginTop: "var(--space-lg)",
          }}
        >
          <div className="card" style={{ textAlign: "center" }}>
            <h4
              style={{
                fontSize: "0.875rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                marginBottom: "var(--space-xs)",
              }}
            >
              Membership
            </h4>
            <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
              $29.95
            </p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>per month</p>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <h4
              style={{
                fontSize: "0.875rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                marginBottom: "var(--space-xs)",
              }}
            >
              AI helpers
            </h4>
            <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
              Unlimited
            </p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              included &middot; no counting
            </p>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <h4
              style={{
                fontSize: "0.875rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                marginBottom: "var(--space-xs)",
              }}
            >
              Human concierge
            </h4>
            <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
              Add-on
            </p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              paid, when you want it
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
