import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutRedirect from "../(marketing)/components/CheckoutRedirect";
import Header from "../(marketing)/components/Header";
import { FoundersCountProvider } from "../(marketing)/components/FoundersCountContext";
import FoundersHero from "../(marketing)/components/FoundersHero";
import FoundersCTA from "../(marketing)/components/FoundersCTA";
import FoundersLiveCount from "../(marketing)/components/FoundersLiveCount";
import Problem from "../(marketing)/components/Problem";
import Solution from "../(marketing)/components/Solution";
import HowItWorks from "../(marketing)/components/HowItWorks";
import Credits from "../(marketing)/components/Credits";
import LandingReviewsSection from "../(marketing)/components/LandingReviewsSection";
import Affordable from "../(marketing)/components/Affordable";
import Specialist from "../(marketing)/components/Specialist";
import Coffee from "../(marketing)/components/Coffee";
import WhoItsFor from "../(marketing)/components/WhoItsFor";
import Efficiency from "../(marketing)/components/Efficiency";
import FAQ from "../(marketing)/components/FAQ";
import Footer from "../(marketing)/components/Footer";

export const metadata: Metadata = {
  title: "Founding Members - Mom Ops | Lock in $15.95/month (First 50)",
  description:
    "Join as a Founding Member: same membership at $15.95/month, locked in for life. First 50 only. Early access, input on development, opportunities to earn extra credits.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const emptyTasks: { id: string; category: string; task: string; credits: number; template: string; rank: number }[] = [];
const emptyCategories: string[] = [];

export default async function FoundersPage() {
  // Load task library from static-only module (no Supabase). If it fails (e.g. JSON missing in serverless), page still renders with empty list.
  let staticTasks = emptyTasks;
  let staticCategories = emptyCategories;
  try {
    const mod = await import("@/lib/task-library-static");
    staticTasks = mod.getTaskLibrarySync();
    staticCategories = mod.getCategoriesSync();
  } catch (e) {
    console.error("[founders] task-library-static load failed:", e);
  }

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
          <Solution />
          <HowItWorks />
          <Credits tasks={staticTasks} categories={staticCategories} />
          <LandingReviewsSection />
          <Affordable />
          <Specialist />
          <Coffee />
          <WhoItsFor />
          <Efficiency />
          <FoundersCTA />
        </FoundersCountProvider>
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
