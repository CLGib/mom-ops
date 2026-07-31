const HATS = [
  "Product Manager",
  "Operations",
  "Marketing",
  "Customer Success",
  "QA",
  "Project Management",
  "Content",
  "Support",
  "Strategy",
];

export default function Story() {
  return (
    <section className="section section-alt">
      <div className="container">
        <div
          style={{
            display: "grid",
            gap: "var(--space-xl)",
            gridTemplateColumns: "minmax(0, 1fr)",
            alignItems: "start",
          }}
          className="story-grid"
        >
          <div>
            <h2 className="section-title">I&apos;m Chrissy.</h2>
            <p className="section-body">
              I&apos;m a mom. I love growing things. Sometimes that&apos;s
              children. Sometimes it&apos;s companies. Sometimes it&apos;s
              vegetables. Sometimes it&apos;s completely ridiculous ideas that
              should never have worked&hellip; until they did.
            </p>
            <p className="section-body">
              Over the last decade I&apos;ve worn just about every hat
              imaginable:
            </p>
            <p
              className="section-body"
              style={{ color: "var(--text-muted)", fontStyle: "italic" }}
            >
              {HATS.join(" · ")}
            </p>
            <p className="section-body">
              Turns out I wasn&apos;t becoming an expert in one thing. I was
              becoming really good at <strong>connecting everything</strong>.
            </p>
            <p className="section-body">
              Today I use AI, curiosity, and a healthy amount of duct tape to
              build businesses faster than I ever thought possible &mdash; and
              now I&apos;m sharing everything I learn along the way.
            </p>
          </div>
          {/* TODO: replace with a real photo of Chrissy. */}
          <div
            aria-hidden
            style={{
              borderRadius: "var(--radius-lg)",
              background: "var(--accent-soft-bg)",
              border: "1px solid var(--border)",
              minHeight: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-soft)",
              fontSize: "0.875rem",
            }}
          >
            your photo here
          </div>
        </div>
      </div>
    </section>
  );
}
