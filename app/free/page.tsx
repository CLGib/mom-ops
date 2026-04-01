import type { Metadata } from "next";
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
import CTAFreeTrial from "../(marketing)/components/CTAFreeTrial";
import FAQ from "../(marketing)/components/FAQ";
import Footer from "../(marketing)/components/Footer";

export const metadata: Metadata = {
  title: "Mom Ops - Try Your First Task Free",
  description:
    "Real virtual assistant support for moms. Sign up free and get your first task free — 35 credits to try us. No credit card required.",
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
        <CTAFreeTrial />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
