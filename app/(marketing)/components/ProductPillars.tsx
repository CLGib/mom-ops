const PILLARS = [
  {
    title: "Helpers",
    body: "A library of specialized helpers, each focused on one kind of family work: meal planning, school emails, birthday parties, summer camp research, travel logistics.",
  },
  {
    title: "Household Memory",
    body: "Tell us about your family once. Kids' ages, dietary notes, the basics. Every helper you bring in already knows, so you don't repeat yourself.",
  },
  {
    title: "Human Support (optional)",
    body: "When you want a real person to finish the job, edit the draft, or handle the nuance, our concierge layer is one click away.",
  },
];

export default function ProductPillars() {
  return (
    <section id="pillars" className="section">
      <div className="container">
        <h2 className="section-title">
          What if your family had an operating system?
        </h2>
        <p className="section-lead">
          Mom Ops is three things stacked into one calm membership.
        </p>
        <div className="credits-card-grid" style={{ marginTop: "var(--space-lg)" }}>
          {PILLARS.map((p) => (
            <article key={p.title} className="credits-card">
              <h3 className="credits-card-title">{p.title}</h3>
              <p className="credits-card-description">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
