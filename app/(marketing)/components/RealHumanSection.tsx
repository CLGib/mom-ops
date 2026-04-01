export default function RealHumanSection() {
  return (
    <section id="real-human" className="section">
      <div className="container">
        <div className="problem-grid">
          <div className="problem-text">
            <h2 className="section-title">
              You get a 100% real human virtual assistant.
            </h2>
            <p className="section-lead">
              We use AI the same way you might use Google - as a tool to work
              smarter and faster. But you won&apos;t get generic, copy-pasted AI
              responses.
            </p>
            <p className="section-body">The difference? Real relationships.</p>
            <p className="section-body">
              Over time, your virtual assistant learns how you think, what you prefer, and how
              you work. And your real human virtual assistant makes sure every final result
              actually reflects you.
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
