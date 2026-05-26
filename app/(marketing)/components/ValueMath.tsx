export default function ValueMath() {
  return (
    <section id="pricing" className="section section-alt">
      <div className="container">
        <h2 className="section-title">
          $29.95/month. The family-ready system, already built.
        </h2>
        <p className="section-lead">
          Membership includes 35 playbook credits each month. Roll over up to
          three. Add more anytime. Cancel anytime.
        </p>
        <p
          className="section-body"
          style={{ marginTop: "var(--space-md)" }}
        >
          You&apos;re not paying for full-time staff, idle hours, or agency
          overhead. You&apos;re paying for the system that turns one membership
          into the work of a small team &mdash; with optional human support
          when you want it.
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
              Included
            </h4>
            <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>35</p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              playbook credits / month
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
              Commitment
            </h4>
            <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
              None
            </p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              cancel anytime
            </p>
          </div>
        </div>
        <p
          className="section-body section-body--tight"
          style={{
            marginTop: "var(--space-lg)",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          Need more in a heavy month? Add credit packs (10 / 30 / 50) in your
          member portal &mdash; purchased credits never expire.
        </p>
      </div>
    </section>
  );
}
