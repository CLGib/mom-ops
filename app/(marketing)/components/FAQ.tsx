const FAQ_ITEMS = [
  {
    question: "Is this a real human or AI?",
    answer:
      "Both — and that's the point.\n\nYour assistant is AI, so it works instantly. But it's built by moms and loaded with your family's context, so you won't get generic, copy-pasted answers. It learns how you think, what you prefer, and how you like things done.\n\nAnd you're never on your own: a real human on our team steps in for anything that needs a phone call, a booking, or a personal touch.",
  },
  {
    question: "Do I have to be a mom to use Mom Ops?",
    answer:
      "No. Everyone could use an extra mom in their corner. We were built by moms and specialize in the mental load they carry, but Mom Ops is for anyone who wants life to run smoother, with systems, support, and a little less chaos.",
  },
  {
    question: "How fast do I get my task back?",
    answer:
      "Most everyday tasks come back in seconds — a finished result you can use right away. Anything that needs a real person, like a call or a booking, our concierge team handles and keeps you posted.",
  },
  {
    question: "How does pricing work?",
    answer:
      "One simple plan: $29.95/month, with unlimited everyday tasks included. No credits to count, no per-task fees, no hourly billing. Month-to-month — cancel anytime.",
  },
  {
    question: "Why not just use ChatGPT myself?",
    answer:
      "You could — if you want to sit down, write the prompt, refine it, and format the result yourself. Mom Ops already knows your family and hands back the finished thing, so you skip all of that. It's about execution, not another chat to manage.",
  },
  {
    question: "When does a real human get involved?",
    answer:
      "Whenever a task needs one. Your AI assistant handles the research, drafting, and planning instantly. For anything in the real world — a phone call, a reservation, a purchase, a personal touch — you can hand it to our concierge team.",
  },
  {
    question: "Does it remember me and my family?",
    answer:
      "Yes. It's loaded with your profile and learns your preferences over time, so you never start from scratch. You can also set up recurring tasks — like the Sunday meal plan — so the things that repeat just show up done.",
  },
  {
    question: "What is your refund policy?",
    answer:
      "Money-back guarantee: If you sign up and don't love your first task, request a refund. No hassle.",
  },
  {
    question: "Is there a long-term commitment?",
    answer:
      "No. Your membership is month-to-month, and you can cancel anytime.",
  },
  {
    question: "What if my task is out of scope?",
    answer:
      "We'll let you know and suggest alternatives when possible. Our scope is household and family administrative support - research, coordination, design, planning - not legal, medical, or financial advice, or emotional coaching.",
  },
  {
    question: "How do I submit a task?",
    answer:
      "Right from your dashboard — just type what's on your plate in a sentence. Prefer email? You can send your task to us instead. Attach any files that help, and your assistant takes it from there.",
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
