"use client";

import Link from "next/link";

const SECTION_STYLE = {
  marginBottom: "var(--space-md)",
  border: "1px solid var(--color-border, #e5e5e5)",
  borderRadius: "var(--radius, 6px)",
  overflow: "hidden",
};

const SUMMARY_STYLE = {
  padding: "var(--space-sm) var(--space-md)",
  cursor: "pointer" as const,
  fontWeight: 600,
  fontSize: "1rem",
  listStyle: "none" as const,
  backgroundColor: "var(--accent-soft-bg, #f8f5ed)",
};

const DETAIL_CONTENT_STYLE = {
  padding: "var(--space-md)",
  paddingTop: 0,
};

export default function VAOnboardingContent() {
  return (
    <article className="va-onboarding-guide" style={{ maxWidth: "720px" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "var(--space-md)" }}>
        Mom Ops VA Onboarding Guide
      </h1>
      <p style={{ marginBottom: "var(--space-xl)", fontSize: "1.0625rem", lineHeight: 1.5 }}>
        Welcome to Mom Ops.
      </p>
      <p style={{ marginBottom: "var(--space-xl)", fontSize: "1.0625rem", lineHeight: 1.5 }}>
        You are not just completing tasks.
        <br />
        You are reducing mental load for moms.
      </p>
      <p style={{ marginBottom: "var(--space-2xl)", fontWeight: 600 }}>
        That is the standard.
      </p>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>COMPENSATION MODEL</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-md)" }}>
            <li>$0.20 USD per Task Credit completed</li>
            <li>Earn 10% more on <strong>Hot</strong> tasks — tasks that had been waiting 6+ hours when you claim them (shown in the unassigned list)</li>
            <li>98% of tips go directly to you</li>
            <li>2% is retained for payment processing fees</li>
          </ul>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-sm)" }}>Performance Bonuses</h3>
          <p style={{ marginBottom: "var(--space-sm)" }}>
            Mom Ops rewards excellence. In addition to base pay and tips:
          </p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-sm)" }}>
            <li>Random bonuses will be given for 5-star reviews</li>
            <li>Surprise bonuses may be awarded for outstanding work</li>
            <li>Strong feedback and repeat requests increase your earning potential</li>
          </ul>
          <p style={{ marginBottom: "var(--space-xs)" }}>
            The fastest way to increase your income:
          </p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
            <li>Go one step beyond the ask</li>
            <li>Reduce mental load</li>
            <li>Build rapport</li>
            <li>Deliver consistently excellent work</li>
          </ul>
          <p style={{ marginTop: "var(--space-md)", fontStyle: "italic" }}>
            Great service → Great reviews → Repeat requests → Higher tips + bonuses.
          </p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>THE MOM OPS STANDARD: REDUCE MENTAL LOAD</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>
            Your job is not to answer questions. Your job is to remove decisions.
          </p>
          <p style={{ marginBottom: "var(--space-sm)" }}>Before you start a task, open <strong>Member context</strong> (link on the task page) to see profile, onboarding survey, and quizzes. Use this to personalize your communication and avoid asking for info they&apos;ve already shared.</p>
          <p style={{ marginBottom: "var(--space-sm)" }}>Before asking a follow-up question:</p>
          <ol style={{ listStyle: "decimal", paddingLeft: "1.5rem", marginBottom: "var(--space-md)" }}>
            <li>Review past tickets.</li>
            <li>Review the member&apos;s profile and onboarding survey.</li>
            <li>Look for patterns (goals, diet, children&apos;s ages, preferences, tone).</li>
            <li>Solve as much as possible before going back to her.</li>
          </ol>
          <p>
            Every extra question adds mental load. We exist to remove it.
          </p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>GO ONE STEP BEYOND</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>
            Always deliver one level above the ask.
          </p>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            <li style={{ marginBottom: "var(--space-sm)" }}>
              <strong>If she asks for a birthday invitation:</strong>
              <br />Provide 2 to 3 design options to choose from.
            </li>
            <li style={{ marginBottom: "var(--space-sm)" }}>
              <strong>If she asks for meal planning:</strong>
              <br />Include nutritional information if her profile shows she is trying to eat healthier.
            </li>
            <li style={{ marginBottom: "var(--space-sm)" }}>
              <strong>If she asks for a packing list:</strong>
              <br />Organize it by category and include a printable version.
            </li>
            <li style={{ marginBottom: "var(--space-sm)" }}>
              <strong>If she asks for a travel itinerary:</strong>
              <br />Include weather forecast and suggested packing notes.
            </li>
          </ul>
          <p style={{ marginTop: "var(--space-md)" }}>
            Anticipate the next question before she has to ask it. That is what earns tips.
          </p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>BRANDING GUIDELINES</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-sm)" }}>
            When typing Mom Ops, there is always a space between the words.
          </p>
          <p style={{ marginBottom: "var(--space-md)" }}>
            <strong>Correct:</strong> Mom Ops &nbsp; <strong>Incorrect:</strong> MomOps
          </p>
          <p style={{ marginBottom: "var(--space-sm)" }}>Use judgment when branding.</p>
          <p style={{ marginBottom: "var(--space-xs)" }}><strong>Brand to Mom Ops when:</strong></p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-sm)" }}>
            <li>Creating meal plans</li>
            <li>Providing nutrition guides</li>
            <li>Building planners</li>
            <li>Creating organizational templates</li>
            <li>Delivering structured planning documents</li>
          </ul>
          <p style={{ marginBottom: "var(--space-xs)" }}><strong>Do NOT brand when:</strong></p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
            <li>Creating birthday invitations</li>
            <li>Designing party decorations</li>
            <li>Making something meant to appear directly from the mom</li>
          </ul>
          <p style={{ marginTop: "var(--space-md)" }}>
            If branding would feel strange or out of place, do not add it. Be smart.
          </p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>VOICE & TONE</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-sm)" }}>Mom Ops is:</p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
            <li>Warm</li>
            <li>Calm</li>
            <li>Capable</li>
            <li>Efficient</li>
            <li>Supportive</li>
            <li>Never robotic</li>
            <li>Never dramatic</li>
          </ul>
          <p style={{ marginTop: "var(--space-md)" }}>We are steady and thoughtful.</p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>WORKING WITH U.S. MOMS</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>
            There is no single &quot;type&quot; of U.S. mom. Communication varies by region, personality, and lifestyle.
          </p>
          <p style={{ marginBottom: "var(--space-md)" }}>
            Example: In the Southern U.S., many women appreciate being called &quot;ma&apos;am.&quot;
            In Northern regions, that may feel overly formal or even offensive. Check location when relevant.
          </p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>MIRROR COMMUNICATION STYLE</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>Match their tone:</p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
            <li>If they use emojis, you may use emojis.</li>
            <li>If they are concise, be concise.</li>
            <li>If they are detailed, respond thoughtfully.</li>
          </ul>
          <p style={{ marginTop: "var(--space-md)" }}>Mirroring builds rapport.</p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>EMAIL COMMUNICATION & MACROS</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>
            When replying to members, use the <strong>Email macro library</strong> as examples for tone, structure, and going one step beyond. Macros are available in two places:
          </p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-md)" }}>
            <li><strong>On a task page:</strong> Use the &quot;Insert macro&quot; button in the reply box to insert a pre-written snippet at the cursor. You can then edit it to fit the member and the task.</li>
            <li>
              <strong>Recurring outreach:</strong> Use <strong>Suggest recurring task</strong> in the reply toolbar when a member could benefit from weekly help (meal plans, routines, planning). The starter text is the same for everyone—personalize it using their profile. After you send it, use the <strong>Recurring outreach (team log)</strong> on the check-in profile or member context page so other VAs don&apos;t repeat the same pitch.
            </li>
            <li>
              <strong>Email Macro Library:</strong> Open{" "}
              <Link href="/va/email-macros" className="link">Email Macros</Link>
              {" from the sidebar to browse all macros as reference. Use them to model warm, clear, low-friction communication; always personalize and adapt. Do not copy verbatim."}
            </li>
          </ul>
          <p style={{ marginBottom: "var(--space-sm)" }}>These templates reflect Mom Ops voice: warm, calm, capable. Mirror the member&apos;s style and add a human touch where appropriate.</p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>RELATIONSHIP BUILDING</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>
            We want members to request YOU again. When a mom reuses the same VA: trust increases, task volume increases, tips increase, income becomes more stable.
          </p>
          <p style={{ marginBottom: "var(--space-sm)" }}>Ways to build rapport:</p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-md)" }}>
            <li>Remember personal details.</li>
            <li>Reference past conversations.</li>
            <li>Offer brief thoughtful follow-ups.</li>
          </ul>
          <p style={{ marginBottom: "var(--space-sm)" }}>
            Example: &quot;Hope the soccer game went well this weekend! I&apos;ve got your grocery list ready.&quot;
          </p>
          <p>Small human touches build loyalty.</p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>WHAT WE CANNOT DO</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>
            If a request involves medical advice, legal advice, or financial advice, you must cancel the request.
          </p>
          <p style={{ marginBottom: "var(--space-md)" }}>
            If you are unsure: Ask Chrissy before proceeding. Never guess in these categories.
          </p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>ASSET LIBRARY EXPECTATIONS</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-sm)" }}>All deliverables should be:</p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-md)" }}>
            <li>Clean</li>
            <li>Organized</li>
            <li>Easy to read</li>
            <li>Decision-light</li>
            <li>Thoughtfully structured</li>
          </ul>
          <p style={{ marginBottom: "var(--space-sm)" }}>When appropriate:</p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-md)" }}>
            <li>Include printable versions</li>
            <li>Provide options</li>
            <li>Add summaries</li>
            <li>Highlight key decisions</li>
          </ul>
          <p>Make it easy for her to say: &quot;Yes, this works.&quot;</p>
        </div>
      </details>

      <details style={SECTION_STYLE}>
        <summary style={SUMMARY_STYLE}>FINAL STANDARD</summary>
        <div style={DETAIL_CONTENT_STYLE}>
          <p style={{ marginBottom: "var(--space-md)" }}>Before submitting a task, ask yourself:</p>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem", marginBottom: "var(--space-md)" }}>
            <li>Did I reduce her mental load?</li>
            <li>Did I anticipate her next need?</li>
            <li>Did I match her communication style?</li>
            <li>Did I add value beyond the minimum?</li>
          </ul>
          <p>If yes, you are operating at Mom Ops standard.</p>
        </div>
      </details>
    </article>
  );
}
