export default function RealHumanSection() {
  return (
    <section id="real-human" className="section">
      <div className="container">
        <div className="problem-grid">
          <div className="problem-text">
            <h2 className="section-title">
              Built by moms. Powered by AI. Backed by real humans.
            </h2>
            <p className="section-lead">
              Your assistant is instant — but it&apos;s not generic. It&apos;s
              loaded with your family&apos;s context and built by moms who
              understand the mental load, so every result actually reflects you.
            </p>
            <p className="section-body">
              It learns how you think, what you prefer, and how you like things
              done — and gets sharper the more you use it.
            </p>
            <p className="section-body">
              And you&apos;re never on your own: a real human on our team steps in
              for anything that needs a phone call, a booking, or a personal
              touch.
            </p>
          </div>
          <div className="problem-image-card">
            <img
              src="/assets/real-human-va.png"
              alt="A real person at work: laptop, notebook, and coffee on a warm wooden table - the human touch behind every task."
              width={480}
              height={360}
              className="problem-image real-human-va-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
