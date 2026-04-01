import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import CheckoutRedirect from "./(marketing)/components/CheckoutRedirect";
import ReferralCookieSetter from "./(marketing)/components/ReferralCookieSetter";
import AuthErrorBanner from "./(marketing)/components/AuthErrorBanner";
import Header from "./(marketing)/components/Header";
import Hero from "./(marketing)/components/Hero";
import RealHumanSection from "./(marketing)/components/RealHumanSection";
import LandingReviewsSection from "./(marketing)/components/LandingReviewsSection";
import Problem from "./(marketing)/components/Problem";
import Solution from "./(marketing)/components/Solution";
import HowItWorks from "./(marketing)/components/HowItWorks";
import Credits from "./(marketing)/components/Credits";
import ExploreRealExamples from "./(marketing)/components/ExploreRealExamples";
import type { RealExample } from "./(marketing)/components/ExploreRealExamples";
import Affordable from "./(marketing)/components/Affordable";
import Specialist from "./(marketing)/components/Specialist";
import Coffee from "./(marketing)/components/Coffee";
import WhoItsFor from "./(marketing)/components/WhoItsFor";
import Efficiency from "./(marketing)/components/Efficiency";
import CTA from "./(marketing)/components/CTA";
import FAQ from "./(marketing)/components/FAQ";
import Footer from "./(marketing)/components/Footer";

export const metadata: Metadata = {
  title: "Mom Ops - A Virtual Assistant for Your To-Do List",
  description:
    "Mom Ops helps busy moms offload everyday tasks like planning birthday parties, researching summer camps, grocery planning, and more. Try your first task free.",
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
        <CTA />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
