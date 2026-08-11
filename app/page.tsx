import type { Metadata } from "next";
import SiteHeader from "./(marketing)/components/SiteHeader";
import HeroContent from "./(marketing)/components/HeroContent";
import WhatYoullFind from "./(marketing)/components/WhatYoullFind";
import HolyCow from "./(marketing)/components/HolyCow";
import NoCatch from "./(marketing)/components/NoCatch";
import Experiments from "./(marketing)/components/Experiments";
import Story from "./(marketing)/components/Story";
import PoemSection from "./(marketing)/components/PoemSection";
import FollowMyBrain from "./(marketing)/components/FollowMyBrain";
import NewsletterCTA from "./(marketing)/components/NewsletterCTA";
import SiteFooter from "./(marketing)/components/SiteFooter";

export const metadata: Metadata = {
  title: "Mom Ops: Come watch a curious mom build cool things",
  description:
    "I help normal people build extraordinary things without needing to be extraordinary themselves. Honest breakdowns of how I build businesses, websites, systems, and AI workflows, and steal everything that works. One email a week.",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroContent />
        <WhatYoullFind />
        <HolyCow />
        <NoCatch />
        <Experiments />
        <Story />
        <PoemSection />
        <FollowMyBrain />
        <NewsletterCTA />
      </main>
      <SiteFooter />
    </>
  );
}
