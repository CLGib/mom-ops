const STEPS = [
  {
    num: "01",
    title: "Join + Get Task Credits",
    body: "Sign up for $29.95/month.\nYou'll receive 45 Task Credits to get started.\nNo hourly billing. No surprise invoices.",
  },
  {
    num: "02",
    title: "Email Your Task",
    body: "No dashboard required.\nSimply email your request.\nAttach files. If we need access, we'll send a secure link.\nDelegation should be easy—even on the go.",
  },
  {
    num: "03",
    title: "We Assign a Mom VA",
    body: "A real mom virtual assistant takes your task.\nStandard turnaround: 1 business day.\nYou can request the same VA when available.",
  },
  {
    num: "04",
    title: "Review + Refine",
    body: "Receive your completed work by email.\nNeed an edit? You can request revisions within scope.\nOptionally say thanks with a $1 coffee—100% goes directly to your VA.",
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
        <div className="how-it-works-example">
          <p className="how-it-works-example-label">Real example</p>
          <figure className="example-email-figure">
            <img
              src="/assets/example-email.png"
              alt="Example task email: a request for a printable 8.5 x 11 piano recital flyer with event details, tone, and deliverables."
              width={720}
              height={400}
            />
            <figcaption>
              Just email your request. Event details, tone, and what you
              need—we take it from there.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
