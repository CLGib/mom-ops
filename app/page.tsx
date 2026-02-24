import type { Metadata } from "next";
import CheckoutRedirect from "./(marketing)/components/CheckoutRedirect";
import Header from "./(marketing)/components/Header";
import Hero from "./(marketing)/components/Hero";
import Problem from "./(marketing)/components/Problem";
import Solution from "./(marketing)/components/Solution";
import HowItWorks from "./(marketing)/components/HowItWorks";
import Credits from "./(marketing)/components/Credits";
import Affordable from "./(marketing)/components/Affordable";
import Specialist from "./(marketing)/components/Specialist";
import Coffee from "./(marketing)/components/Coffee";
import WhoItsFor from "./(marketing)/components/WhoItsFor";
import Efficiency from "./(marketing)/components/Efficiency";
import CTA from "./(marketing)/components/CTA";
import FAQ from "./(marketing)/components/FAQ";
import Footer from "./(marketing)/components/Footer";

export const metadata: Metadata = {
  title: "Mom Ops - Structured Virtual Assistant Support for Moms",
  description:
    "Real virtual assistant support for moms. Structured tasks, clear expectations, calm execution. $29.95/month membership.",
};

export default function HomePage() {
  return (
    <>
      <CheckoutRedirect />
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <Credits />
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
