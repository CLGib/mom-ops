const STEPS = [
  {
    num: "01",
    title: "Pick a helper",
    body: "Choose what you want handled this week — meal planning, a school email, a birthday party, a research project.",
  },
  {
    num: "02",
    title: "Tell us about your family once",
    body: "Kids' ages, dietary notes, the basics. The system remembers, so you don't repeat yourself next time.",
  },
  {
    num: "03",
    title: "We bring the helper in",
    body: "AI handles the planning, drafting, and follow-through. Optional human support polishes when you want it.",
  },
  {
    num: "04",
    title: "Get the deliverable",
    body: "A clean output by email — a plan, a draft, a list, a design. Request revisions within scope.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section how-it-works">
      <div className="container">
        <h2 className="section-title">How it works</h2>
        <div className="timeline">
          {STEPS.map((step, i) => (
            <span key={step.num} style={{ display: "contents" }}>
              <div className="timeline-step">
                <span className="timeline-num" aria-hidden>
                  {step.num}
                </span>
                <h3 className="timeline-title">{step.title}</h3>
                <p className="timeline-body">{step.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <span className="timeline-connector" aria-hidden />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
