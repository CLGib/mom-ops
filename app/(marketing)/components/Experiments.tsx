// TODO: point each `href` at the real project/post once it exists.
// For now they anchor to the newsletter so nothing dead-ends.
const EXPERIMENTS = [
  { title: "Building a children's memory company", cta: "Follow along", href: "#newsletter" },
  { title: "Helping companies rebuild their websites", cta: "Lessons learned", href: "#newsletter" },
  { title: "Learning content marketing", cta: "What's working", href: "#newsletter" },
  { title: "Building AI workflows", cta: "Steal my prompts", href: "#newsletter" },
  { title: "Getting healthier", cta: "Honest updates", href: "#newsletter" },
];

export default function Experiments() {
  return (
    <section id="experiments" className="section">
      <div className="container">
        <h2 className="section-title">Current experiments</h2>
        <p className="section-lead">
          What&apos;s on the workbench right now. Some will work. Some
          won&apos;t. You get to watch either way.
        </p>
        <div className="experiment-grid">
          {EXPERIMENTS.map((e) => (
            <article key={e.title} className="card experiment-card">
              <span className="experiment-status" aria-hidden>
                <span className="experiment-dot" /> Live
              </span>
              <h3 className="experiment-title">{e.title}</h3>
              <a href={e.href} className="experiment-cta">
                {e.cta} &rarr;
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
