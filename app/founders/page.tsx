import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutRedirect from "../(marketing)/components/CheckoutRedirect";
import Header from "../(marketing)/components/Header";
import { FoundersCountProvider } from "../(marketing)/components/FoundersCountContext";
import FoundersHero from "../(marketing)/components/FoundersHero";
import FoundersCTA from "../(marketing)/components/FoundersCTA";
import FoundersLiveCount from "../(marketing)/components/FoundersLiveCount";
import Problem from "../(marketing)/components/Problem";
import ProductPillars from "../(marketing)/components/ProductPillars";
import AIExplained from "../(marketing)/components/AIExplained";
import WhyMomOpsVsChatGPT from "../(marketing)/components/WhyMomOpsVsChatGPT";
import HelperLibraryMockup from "../(marketing)/components/HelperLibraryMockup";
import HowItWorks from "../(marketing)/components/HowItWorks";
import HybridModel from "../(marketing)/components/HybridModel";
import ValueMath from "../(marketing)/components/ValueMath";
import LandingReviewsSection from "../(marketing)/components/LandingReviewsSection";
import WhoItsFor from "../(marketing)/components/WhoItsFor";
import FAQ from "../(marketing)/components/FAQ";
import Footer from "../(marketing)/components/Footer";

export const metadata: Metadata = {
  title: "Founding Members — Mom Ops | Lock in $15.95/month (First 50)",
  description:
    "Be a founding member of the family operating system. Unlimited Mom Ops access at $15.95/month locked in for life. First 50 only. Early access to new helpers as we roll them out.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FoundersPage() {
  return (
    <>
      <Suspense fallback={null}>
        <CheckoutRedirect />
      </Suspense>
      <Header />
      <main>
        <FoundersCountProvider initialClaimed={0}>
          <FoundersLiveCount />
          <FoundersHero />
          <Problem />
          <ProductPillars />
          <AIExplained />
          <WhyMomOpsVsChatGPT />
          <HelperLibraryMockup />
          <HowItWorks />
          <HybridModel />
          <ValueMath />
          <LandingReviewsSection />
          <WhoItsFor />
          <FoundersCTA />
        </FoundersCountProvider>
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
