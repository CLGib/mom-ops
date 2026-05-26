import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import OfferCookieSetter from "../(marketing)/components/OfferCookieSetter";
import AuthErrorBanner from "../(marketing)/components/AuthErrorBanner";
import Header from "../(marketing)/components/Header";
import HeroFreeTrial from "../(marketing)/components/HeroFreeTrial";
import Problem from "../(marketing)/components/Problem";
import ProductPillars from "../(marketing)/components/ProductPillars";
import AIExplained from "../(marketing)/components/AIExplained";
import WhyMomOpsVsChatGPT from "../(marketing)/components/WhyMomOpsVsChatGPT";
import HelperLibraryMockup from "../(marketing)/components/HelperLibraryMockup";
import HowItWorks from "../(marketing)/components/HowItWorks";
import HybridModel from "../(marketing)/components/HybridModel";
import ExploreRealExamples from "../(marketing)/components/ExploreRealExamples";
import type { RealExample } from "../(marketing)/components/ExploreRealExamples";
import ValueMath from "../(marketing)/components/ValueMath";
import LandingReviewsSection from "../(marketing)/components/LandingReviewsSection";
import WhoItsFor from "../(marketing)/components/WhoItsFor";
import FAQ from "../(marketing)/components/FAQ";
import Footer from "../(marketing)/components/Footer";
import FreetaskSubmitForm from "./FreetaskSubmitForm";

export const metadata: Metadata = {
  title: "Mom Ops — Bring In Your First Helper Free",
  description:
    "Send us your first open loop — we'll bring in the right helper. AI-powered, human support included. We'll create your account and get started. No credit card required.",
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
              Send us your first open loop
            </h2>
            <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
              Tell us what&apos;s on your mind — we&apos;ll bring in the right
              helper, create your account, and send back the result. Your first
              helper is on us.
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
        <ProductPillars />
        <AIExplained />
        <WhyMomOpsVsChatGPT />
        <HelperLibraryMockup />
        <HowItWorks />
        <HybridModel />
        <ExploreRealExamples examples={examples} />
        <ValueMath />
        <LandingReviewsSection />
        <WhoItsFor />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
