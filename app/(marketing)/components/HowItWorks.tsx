const STEPS = [
  {
    num: "01",
    title: "Join one simple plan",
    body: "Sign up for $29.95/month.\nUnlimited everyday tasks included.\nNo credits to count. No surprise invoices.",
  },
  {
    num: "02",
    title: "Tell us what's on your plate",
    body: "Type it in a sentence from your dashboard — or just email it.\nIn your own words. Attach files if it helps.\nNo forms, no figuring out how to ask.",
  },
  {
    num: "03",
    title: "Get it back in seconds",
    body: "Your assistant does the thinking and hands back a finished result.\nPersonalized to you and your family.\nUse it right away, or ask for tweaks.",
  },
  {
    num: "04",
    title: "Want a human? Just say so",
    body: "Some things need a real person — a phone call, a booking, a personal touch.\nHand any task to our concierge team and we'll take it the rest of the way.",
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
