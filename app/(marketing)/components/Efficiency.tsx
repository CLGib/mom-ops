export default function Efficiency() {
  return (
    <section id="efficiency" className="section">
      <div className="container container--wide">
        <h2 className="section-title">A Different Kind of Efficiency</h2>
        <div className="efficiency-grid">
          <div className="efficiency-copy">
            <p className="section-lead">
              Yes, you can sit with ChatGPT for an hour and build the invitation
              yourself.
            </p>
            <p className="section-lead">
              Or you can send one email and have it done.
            </p>
            <p className="section-body efficiency-tagline">
              Mom Ops isn&apos;t about ideas.
              <br />
              It&apos;s about execution.
            </p>
          </div>
          <div className="efficiency-image-wrap">
            <img
              src="/assets/chatgpt-example.png"
              alt="ChatGPT conversation example: structured party planning with steps and bullet points."
              width={600}
              height={500}
              className="efficiency-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
