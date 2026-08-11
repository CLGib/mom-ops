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
              build businesses faster than I ever thought possible. And now
              I&apos;m sharing everything I learn along the way.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/chrissy.jpg"
            alt="Chrissy"
            style={{
              width: "100%",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              objectFit: "cover",
              aspectRatio: "910 / 1024",
              display: "block",
            }}
          />
        </div>
      </div>
    </section>
  );
}
