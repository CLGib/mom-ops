const FAQ_ITEMS = [
  {
    question: "Is this just ChatGPT with extra steps?",
    answer:
      "No. ChatGPT is a chat box. Mom Ops is the system around the AI: ready-made playbooks for the family work you actually do, household memory so you don't repeat yourself, optional human support when a draft needs a real second pair of eyes, and a design tuned to how families actually run. The AI is the engine. Mom Ops is the car.",
  },
  {
    question: "Do I need to know anything about AI to use this?",
    answer:
      "No. The AI is infrastructure — you never see it unless you want to. You pick a playbook and get a result. If you're curious, the vocabulary is three words: a prompt is the instructions that guide the AI, a playbook is a repeatable system for a family task, an agent is a specialized helper focused on one area.",
  },
  {
    question: "What kind of help is included?",
    answer:
      "Membership includes 35 playbook credits each month — enough to run several playbooks or one or two deeper projects. Things like weekly meal planning, summer camp research, birthday party planning, teacher gifts, travel packing, school emails, family calendar coordination, and recurring household systems.",
  },
  {
    question: "How do playbook credits work?",
    answer:
      "Your $29.95/month membership includes 35 playbook credits. Unused monthly credits roll over up to 3 months. You can add more (10, 30, or 50 credits) in the member portal — credits you purchase never expire. Each playbook uses a set number of credits based on scope; you'll see how many before we begin. No hourly billing.",
  },
  {
    question: "Is it AI or a real person doing the work?",
    answer:
      "Both, by design. The AI handles planning, drafting, organizing, and follow-through. Human support handles refinement, coordination, accountability, and the parts that need a real person — especially when a draft needs polish or nuance. You don't have to choose; you get as much of either as you want.",
  },
  {
    question: "Do I have to be a mom to use Mom Ops?",
    answer:
      "No. Mom Ops was built by moms because we understand the mental load — the invisible planning, remembering, coordinating, and anticipating that keeps a household running. But anyone carrying that load belongs here.",
  },
  {
    question: "What's the turnaround?",
    answer:
      "AI-only playbooks come back fast. Anything that involves human support has a standard 1 business day turnaround. Larger projects may take longer; we'll communicate clearly when that's the case.",
  },
  {
    question: "What is your refund policy?",
    answer:
      "Money-back guarantee: If you sign up and don't love your first playbook, request a refund. No hassle.",
  },
  {
    question: "Is there a long-term commitment?",
    answer:
      "No. Your membership is month-to-month. You can cancel anytime. Monthly playbook credits roll over up to 3 months. Credits you purchase never expire.",
  },
  {
    question: "What's out of scope?",
    answer:
      "We handle structured household and family operations support — research, coordination, planning, drafting, design, recurring systems. We don't provide legal, medical, or financial advice, or emotional coaching, or urgent same-day services.",
  },
  {
    question: "How do I actually start a playbook?",
    answer:
      "Email us what you need — no dashboard required. We'll match it to the right playbook (or build the right one), confirm the credit cost, and get to work. If we need access to something, we'll send a secure share link.",
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
