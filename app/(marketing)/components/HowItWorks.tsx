const STEPS = [
  {
    num: "01",
    title: "Pick a helper — or just say what you need",
    body: "Choose from the library (meal planning, a school email, a birthday party, camp research) or describe your task in a sentence.",
  },
  {
    num: "02",
    title: "We already know your family",
    body: "Kids' ages, dietary notes, the basics — filled in from your profile, so you never repeat yourself.",
  },
  {
    num: "03",
    title: "Get a finished deliverable in about a minute",
    body: "Your assistant does the research, drafting, and planning and hands back something you can use right away — a plan, a draft, a list, a design.",
  },
  {
    num: "04",
    title: "Want a human? Just ask",
    body: "Hand any task to our concierge team for the calls, bookings, and personal touch — a paid add-on, delivered within one business day.",
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
