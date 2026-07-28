const FAQ_ITEMS = [
  {
    question: "Is this just ChatGPT with extra steps?",
    answer:
      "No. ChatGPT is a chat box. Mom Ops is the system around the AI: a library of ready-made helpers for the family work you actually do, household memory so you don't repeat yourself, optional human support when a draft needs a real second pair of eyes, and a design tuned to how families actually run. The AI is the engine. Mom Ops is the car.",
  },
  {
    question: "Do I need to know anything about AI to use this?",
    answer:
      "No. The AI is infrastructure — you never see it unless you want to. You bring in a helper and get a result. If you're curious, the whole vocabulary is two words: a prompt is the instructions that guide the AI, a helper is a specialized assistant focused on one kind of family work.",
  },
  {
    question: "Is it really free to start?",
    answer:
      "Yes. Your first helper is completely free — no credit card required. After that, membership is $29.95/month for unlimited AI helpers, and you can cancel anytime.",
  },
  {
    question: "What's included in the membership?",
    answer:
      "Unlimited AI helpers for $29.95/month — no credit counting, no caps to plan around. Human concierge support (calls, bookings, bigger projects) is available as a paid add-on you request only when you want it. We monitor usage quietly to prevent abuse, but you'll never see a meter.",
  },
  {
    question: "What kind of helpers are there?",
    answer:
      "Things like a Meal Plan Helper, Summer Camp Research Helper, Birthday Party Helper, Teacher Gift Helper, Travel Packing Helper, School Email Helper, Family Calendar Helper, and a Routine Setup Helper. Bring in as many as you need.",
  },
  {
    question: "Is it AI or a real person doing the work?",
    answer:
      "Your AI assistant does the work — planning, drafting, organizing, research — instantly, and it's unlimited and included. For the parts that need a real person (the calls, the bookings, a bigger project), our human concierge is available as a paid add-on you can request anytime.",
  },
  {
    question: "Do I have to be a mom to use Mom Ops?",
    answer:
      "No. Mom Ops was built by moms because we understand the mental load — the invisible planning, remembering, coordinating, and anticipating that keeps a household running. But anyone carrying that load belongs here.",
  },
  {
    question: "What's the turnaround?",
    answer:
      "AI helpers usually come back in about a minute — a finished deliverable, right on your dashboard. Human concierge requests are delivered within one business day. Larger projects may take longer; we'll always communicate clearly.",
  },
  {
    question: "What is your refund policy?",
    answer:
      "Money-back guarantee: If you sign up and don't love your first helper, request a refund. No hassle.",
  },
  {
    question: "Is there a long-term commitment?",
    answer:
      "No. Your membership is month-to-month. You can cancel anytime.",
  },
  {
    question: "What's out of scope?",
    answer:
      "We handle structured household and family operations support — research, coordination, planning, drafting, design, recurring systems. We don't provide legal, medical, or financial advice, or emotional coaching, or urgent same-day services.",
  },
  {
    question: "How do I actually bring in a helper?",
    answer:
      "Right from your dashboard: pick a helper or describe what you need in a sentence, and you'll have a finished result in about a minute. Prefer email? You can send us your task instead. If we ever need access to something, we'll send a secure share link.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="section">
      <div className="container">
        <h2 className="section-title">FAQ</h2>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="faq-item">
              <summary className="faq-question">{item.question}</summary>
              <div className="faq-answer">
                {item.answer.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
