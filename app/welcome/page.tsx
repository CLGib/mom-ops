import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import styles from "./welcome.module.css";

export const metadata: Metadata = {
  title: "Welcome to Peak + Mom Ops | PBI Peak",
  description:
    "A Peak partnership welcome experience that explains how Mom Ops works and helps members start onboarding quickly.",
};

const LOAD_AREAS = [
  { title: "Kids", body: "Schedules, forms, sign-ups, and the activity logistics that pile up." },
  { title: "Travel", body: "Bookings, itineraries, and packing coordination handled end to end." },
  { title: "Occasions", body: "Gifting, parties, and event prep so nothing slips through." },
  { title: "Research", body: "Decisions made faster with clear, trusted recommendations." },
] as const;

const CREDIT_EXAMPLES = [
  "Run the Weekly Meal Plan playbook every week, with grocery coordination.",
  "Run the Summer Camp Research playbook for vetted options and a clear recommendation.",
  "Run the Travel Planning playbook for a family trip — bookings and logistics organized.",
  "Run the Vacation Planning playbook with itinerary support, reservations, and packing lists.",
  "Run the Occasions playbook for gifts and events handled ahead of deadlines.",
] as const;

const FAQ_ITEMS = [
  {
    question: "What's actually included?",
    answer:
      "Unlimited Mom Ops access while you're a Peak member. Use it as much as you need; we handle the rest.",
  },
  {
    question: "What if I am not sure what to hand over first?",
    answer:
      "That is normal. Onboarding helps you pick the highest-impact playbook so your first week creates real momentum.",
  },
  {
    question: "Will I run out in a heavy month?",
    answer:
      "No. Heavy months are exactly when this matters most — use it as much as you need.",
  },
] as const;

export default async function PeakWelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=" + encodeURIComponent("/welcome"));
  }

  const userEmail = user.email?.trim().toLowerCase() ?? "";
  const invitedByMetadata = user.app_metadata?.pbi_peak_invited === true;

  let invitedByRecord = false;
  if (userEmail) {
    try {
      const service = createServiceClient();
      const { data: inviteRow } = await service
        .from("member_invites")
        .select("id")
        .eq("email", userEmail)
        .limit(1)
        .maybeSingle();
      invitedByRecord = Boolean(inviteRow?.id);
    } catch {
      invitedByRecord = false;
    }
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = roleRow?.role === "admin";
  const hasInviteAccess = invitedByMetadata || invitedByRecord || isAdmin;
  if (!hasInviteAccess) {
    redirect("/member");
  }

  const primaryHref = user ? "/member/onboarding" : "/login?next=%2Fwelcome";
  const primaryLabel = user ? "Start onboarding" : "Log in to get started";
  const secondaryHref = user ? "/member" : "/signup?next=%2Fwelcome";
  const secondaryLabel = user ? "Go to My Ops Hub" : "Create account";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.lockup}>
          <span className={styles.lockupBrand}>Mom Ops</span>
          <span className={styles.lockupX}>×</span>
          <span className={styles.lockupBrandPbi}>PBI Peak</span>
        </div>

        <h1 className={styles.heroTitle}>
          Mental load,
          <em className={styles.heroTitleEm}> lifted.</em>
        </h1>

        <div className={styles.heroFlourish} aria-hidden="true">
          <span className={styles.heroFlourishLine} />
          <span className={styles.heroFlourishDot} />
          <span className={styles.heroFlourishLine} />
        </div>
      </section>

      <section className={styles.creditFeature}>
        <div className={styles.creditCard}>
          <p className={styles.creditEyebrow}>Included with your partnership</p>
          <div className={styles.creditNumberRow}>
            <span className={styles.creditNumber}>Unlimited</span>
            <div className={styles.creditDetail}>
              <span className={styles.creditDetailTop}>Mom Ops</span>
              <span className={styles.creditDetailBottom}>access</span>
            </div>
          </div>
          <p className={styles.creditNote}>
            Use it as much as you need. AI-powered, human-supported,
            designed to close open loops.
          </p>
        </div>
      </section>

      <section className={styles.creditExamples}>
        <p className={styles.sectionEyebrow}>What you can have us run</p>
        <div className={styles.creditExamplesList}>
          {CREDIT_EXAMPLES.map((example) => (
            <p key={example} className={styles.creditExampleItem}>
              {example}
            </p>
          ))}
        </div>
      </section>

      <section className={styles.lift}>
        <p className={styles.sectionEyebrow}>What we lift</p>
        <h2 className={styles.sectionTitle}>The work that lives in your head.</h2>
        <div className={styles.liftGrid}>
          {LOAD_AREAS.map((item, i) => (
            <article key={item.title} className={styles.liftItem}>
              <span className={styles.liftIndex}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={styles.liftItemTitle}>{item.title}</h3>
              <p className={styles.liftItemBody}>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.faq}>
        <p className={styles.sectionEyebrow}>Quick answers</p>
        <h2 className={styles.sectionTitle}>Things you might be wondering.</h2>
        <div className={styles.faqList}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>{item.question}</summary>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready when you are.</h2>
        <p className={styles.ctaSub}>
          Onboarding takes about 10 minutes. Your first week is designed to
          create momentum on the area that matters most.
        </p>
        <div className={styles.ctaButtons}>
          <Link href={primaryHref} className={styles.btnPrimary}>
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className={styles.btnSecondary}>
            {secondaryLabel}
          </Link>
        </div>
        <a
          href="https://photographybusinessinstitute.com/"
          className={styles.ctaLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit Photography Business Institute →
        </a>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLockup}>
          <span>Mom Ops</span>
          <span className={styles.footerLockupX}>×</span>
          <span>PBI Peak</span>
        </div>
        <p className={styles.footerNote}>
          More presence at home. Better focus for the business you are building.
        </p>
      </footer>
    </main>
  );
}
