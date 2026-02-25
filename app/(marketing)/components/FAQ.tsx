const FAQ_ITEMS = [
  {
    question: "What is the turnaround time for tasks?",
    answer:
      "Standard turnaround is 1 business day. Some tasks may take longer depending on scope; we'll communicate clearly if that's the case.",
  },
  {
    question: "How do Task Credits work?",
    answer:
      "Your $29.95/month membership includes 45 Task Credits. Unused monthly credits roll over up to 3 months. You can add more (10, 30, or 50 Task Credits) in the member portal - credits you purchase never expire. Each task uses a set number of credits based on scope; you'll see how many before we begin. No hourly billing.",
  },
  {
    question: "Who actually does my tasks?",
    answer:
      "Every task is completed by a real person - a specialist who is also a mom and understands household and family context. We're not a texting service or an on-demand concierge; we're structured virtual assistant support.",
  },
  {
    question: "Can I request the same specialist?",
    answer:
      "Yes. After your first task, you can request the same specialist for future work when they're available. We do our best to honor that preference.",
  },
  {
    question: "What is the coffee contribution?",
    answer:
      "When your task is complete, you'll have the option to add a $1 contribution. 100% goes directly to the mom who handled your work. It's completely optional - just a simple way to say thanks and support another mom providing for her family.",
  },
  {
    question: "What is your refund policy?",
    answer:
      "Money-back guarantee: If you sign up and don't love your first task, request a refund. No hassle.",
  },
  {
    question: "Is there a long-term commitment?",
    answer:
      "No. Your membership is month-to-month. You can cancel anytime. Monthly Task Credits roll over up to 3 months. Credits you purchase never expire.",
  },
  {
    question: "What if my task is out of scope?",
    answer:
      "We'll let you know and suggest alternatives when possible. Our scope is household and family administrative support - research, coordination, design, planning - not legal, medical, or financial advice, or emotional coaching.",
  },
  {
    question: "How do I submit a task?",
    answer:
      "Simply email your task to our team. No dashboard or app - just send us what you need, attach any files, and we'll take it from there. If we need access to something (like Canva), we'll send you a secure share link.",
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
              <p className="faq-answer">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
