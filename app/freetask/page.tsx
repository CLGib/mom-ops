import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import OfferCookieSetter from "../(marketing)/components/OfferCookieSetter";
import AuthErrorBanner from "../(marketing)/components/AuthErrorBanner";
import Header from "../(marketing)/components/Header";
import HeroFreeTrial from "../(marketing)/components/HeroFreeTrial";
import RealHumanSection from "../(marketing)/components/RealHumanSection";
import LandingReviewsSection from "../(marketing)/components/LandingReviewsSection";
import Problem from "../(marketing)/components/Problem";
import Solution from "../(marketing)/components/Solution";
import HowItWorks from "../(marketing)/components/HowItWorks";
import Credits from "../(marketing)/components/Credits";
import ExploreRealExamples from "../(marketing)/components/ExploreRealExamples";
import type { RealExample } from "../(marketing)/components/ExploreRealExamples";
import Affordable from "../(marketing)/components/Affordable";
import Specialist from "../(marketing)/components/Specialist";
import Coffee from "../(marketing)/components/Coffee";
import WhoItsFor from "../(marketing)/components/WhoItsFor";
import Efficiency from "../(marketing)/components/Efficiency";
import FAQ from "../(marketing)/components/FAQ";
import Footer from "../(marketing)/components/Footer";
import FreetaskSubmitForm from "./FreetaskSubmitForm";

export const metadata: Metadata = {
  title: "Mom Ops - Submit Your First Task Free",
  description:
    "Try the experience. Submit a task now — we'll create your account and get started. Real virtual assistant support for moms. No credit card required.",
};

export default async function FreetaskPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("landing_real_examples")
    .select("id, title, request_text, deliverable_images, deliverable_pdf, caption, thumbnail_url")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  const examples: RealExample[] = (rows ?? []).map((r) => {
    const rawImages = r.deliverable_images;
    const deliverableImages =
      Array.isArray(rawImages) && rawImages.length > 0
        ? rawImages.filter((u): u is string => typeof u === "string" && u.trim() !== "")
        : undefined;
    return {
      id: r.id,
      title: r.title ?? "",
      requestText: r.request_text ?? "",
      thumbnailUrl: r.thumbnail_url ?? undefined,
      deliverableImages: deliverableImages ?? undefined,
      deliverablePdf: r.deliverable_pdf ?? undefined,
      caption: r.caption ?? undefined,
    };
  });

  return (
    <>
      <Suspense fallback={null}>
        <OfferCookieSetter />
        <AuthErrorBanner />
      </Suspense>
      <Header />
      <main>
        <HeroFreeTrial />
        <section id="submit-task" className="section">
          <div className="container">
            <h2 className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
              Submit a task
            </h2>
            <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
              We&apos;ll create your account and submit this task. Your first task is free.
            </p>
            <div className="card member-submit-card" style={{ maxWidth: 560 }}>
              <FreetaskSubmitForm />
            </div>
            <p className="form-note" style={{ marginTop: "var(--space-md)", textAlign: "center" }}>
              Already have an account?{" "}
              <Link href="/login?next=/member" className="link">
                Log in
              </Link>
            </p>
          </div>
        </section>
        <Problem />
        <Solution />
        <ExploreRealExamples examples={examples} />
        <HowItWorks />
        <Credits />
        <RealHumanSection />
        <LandingReviewsSection />
        <Affordable />
        <Specialist />
        <Coffee />
        <WhoItsFor />
        <Efficiency />
        <section id="cta" className="section cta-section">
          <div className="container">
            <p className="section-lead">
              Need more credits?{" "}
              <Link href="/member/credits" className="link" style={{ fontWeight: 600 }}>
                Purchase more in your dashboard
              </Link>{" "}
              after you sign in.
            </p>
          </div>
        </section>
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
