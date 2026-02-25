import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutRedirect from "../(marketing)/components/CheckoutRedirect";
import Header from "../(marketing)/components/Header";
import FoundersHero from "../(marketing)/components/FoundersHero";
import FoundersCTA from "../(marketing)/components/FoundersCTA";
import Problem from "../(marketing)/components/Problem";
import Solution from "../(marketing)/components/Solution";
import HowItWorks from "../(marketing)/components/HowItWorks";
import Credits from "../(marketing)/components/Credits";
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

function getClaimed(): number {
  const raw = process.env.FOUNDERS_CLAIMED ?? "0";
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(50, n);
}

export default function FoundersPage() {
  const claimed = getClaimed();

  return (
    <>
      <Suspense fallback={null}>
        <CheckoutRedirect />
      </Suspense>
      <Header />
      <main>
        <FoundersHero claimed={claimed} />
        <Problem />
        <Solution />
        <HowItWorks />
        <Credits />
        <Affordable />
        <Specialist />
        <Coffee />
        <WhoItsFor />
        <Efficiency />
        <FoundersCTA claimed={claimed} />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
