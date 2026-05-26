import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import CheckoutRedirect from "./(marketing)/components/CheckoutRedirect";
import ReferralCookieSetter from "./(marketing)/components/ReferralCookieSetter";
import AuthErrorBanner from "./(marketing)/components/AuthErrorBanner";
import Header from "./(marketing)/components/Header";
import Hero from "./(marketing)/components/Hero";
import Problem from "./(marketing)/components/Problem";
import ProductPillars from "./(marketing)/components/ProductPillars";
import AIExplained from "./(marketing)/components/AIExplained";
import WhyMomOpsVsChatGPT from "./(marketing)/components/WhyMomOpsVsChatGPT";
import HelperLibraryMockup from "./(marketing)/components/HelperLibraryMockup";
import HowItWorks from "./(marketing)/components/HowItWorks";
import HybridModel from "./(marketing)/components/HybridModel";
import ExploreRealExamples from "./(marketing)/components/ExploreRealExamples";
import type { RealExample } from "./(marketing)/components/ExploreRealExamples";
import ValueMath from "./(marketing)/components/ValueMath";
import LandingReviewsSection from "./(marketing)/components/LandingReviewsSection";
import WhoItsFor from "./(marketing)/components/WhoItsFor";
import CTA from "./(marketing)/components/CTA";
import FAQ from "./(marketing)/components/FAQ";
import Footer from "./(marketing)/components/Footer";

export const metadata: Metadata = {
  title: "Mom Ops — The Operating System for Modern Family Life",
  description:
    "A library of AI-powered helpers and optional human support — built so busy families can finally close the mental tabs they never close.",
};

export default async function HomePage() {
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
        <ReferralCookieSetter />
        <CheckoutRedirect />
        <AuthErrorBanner />
      </Suspense>
      <Header />
      <main>
        <Hero />
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
        <CTA />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
