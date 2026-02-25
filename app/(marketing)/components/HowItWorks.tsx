const STEPS = [
  {
    num: "01",
    title: "Join + Get Task Credits",
    body: "Sign up for $29.95/month.\nYou'll receive 45 Task Credits to get started.\nNo hourly billing. No surprise invoices.",
  },
  {
    num: "02",
    title: "Email Your Task",
    body: "No dashboard required.\nSimply email your request.\nAttach files. If we need access, we'll send a secure link.\nDelegation should be easy, even on the go.",
  },
  {
    num: "03",
    title: "We Assign a Mom Virtual Assistant",
    body: "A real mom virtual assistant takes your task.\nStandard turnaround: 1 business day.\nYou can request the same VA when available.",
  },
  {
    num: "04",
    title: "Review + Refine",
    body: "Receive your completed work by email.\nNeed an edit? You can request revisions within scope.\nOptionally say thanks with a $1 coffee; 100% goes directly to your Virtual Assistant.",
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
        <div className="how-it-works-example transformation-block">
          <p className="how-it-works-example-label">Real example</p>
          <div className="transformation-single">
            <img
              src="/assets/example-request-deliverable.png"
              alt="Your request: email with event details and tone for a piano recital flyer. Final deliverable: polished Melodies in May invitation with soft spring colors, ready to print or share."
              width={900}
              height={600}
              className="transformation-single-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
