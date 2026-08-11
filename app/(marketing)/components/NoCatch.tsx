export default function NoCatch() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <h2 className="section-title">What&apos;s the catch?</h2>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 12vw, 5rem)",
            lineHeight: 1,
            margin: "0 0 var(--space-lg)",
            color: "var(--accent)",
          }}
        >
          Nothing.
        </p>
        <p className="section-body">
          Real talk: I&apos;m running this page with one goal. It&apos;s a
          commitment to get better at something I&apos;m honestly not great at
          yet: developing content. So I&apos;m showing up with one piece of
          meaningful content, every single week.
        </p>
        <p className="section-body">
          Yep, there will be micro-products. Small stuff, to fund my wild crazy
          research, the content, and the tech stack that makes all of this go.
          But if something I make is helpful to you, grab it. If not, just hang
          out. Either way, I truly hope you gain something from what I build here.
        </p>
      </div>
    </section>
  );
}
