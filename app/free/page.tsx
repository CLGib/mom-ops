import type { Metadata } from "next";
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
import PlaybookLibraryMockup from "../(marketing)/components/PlaybookLibraryMockup";
import HowItWorks from "../(marketing)/components/HowItWorks";
import HybridModel from "../(marketing)/components/HybridModel";
import ExploreRealExamples from "../(marketing)/components/ExploreRealExamples";
import type { RealExample } from "../(marketing)/components/ExploreRealExamples";
import ValueMath from "../(marketing)/components/ValueMath";
import LandingReviewsSection from "../(marketing)/components/LandingReviewsSection";
import WhoItsFor from "../(marketing)/components/WhoItsFor";
import CTAFreeTrial from "../(marketing)/components/CTAFreeTrial";
import FAQ from "../(marketing)/components/FAQ";
import Footer from "../(marketing)/components/Footer";

export const metadata: Metadata = {
  title: "Mom Ops — Try the Family Operating System Free",
  description:
    "AI-powered playbooks and household agents, with optional human support. Sign up free, run your first playbook on us — 35 credits to try. No credit card required.",
};

export default async function FreePage() {
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
        <Problem />
        <ProductPillars />
        <AIExplained />
        <WhyMomOpsVsChatGPT />
        <PlaybookLibraryMockup />
        <HowItWorks />
        <HybridModel />
        <ExploreRealExamples examples={examples} />
        <ValueMath />
        <LandingReviewsSection />
        <WhoItsFor />
        <CTAFreeTrial />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
