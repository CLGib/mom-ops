import type { Metadata } from "next";
import Link from "next/link";
import Header from "../(marketing)/components/Header";
import Footer from "../(marketing)/components/Footer";
import FounderImage from "./FounderImage";

export const metadata: Metadata = {
  title: "Meet the Founder | Mom Ops",
  description:
    "The story behind Mom Ops: from nanny to tech to mom to building systems that help families run smoothly.",
};

export default function FounderPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: "var(--space-2xl)", paddingBottom: "var(--space-2xl)", maxWidth: 640 }}>
        <Link href="/" className="back-link" style={{ marginBottom: "var(--space-lg)" }}>
          ← Back to home
        </Link>
        <h1 className="page-title" style={{ marginBottom: "var(--space-lg)" }}>
          Meet the Founder
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-lg)",
            marginBottom: "var(--space-xl)",
          }}
        >
          <FounderImage />
        </div>
        <div style={{ lineHeight: 1.7, fontSize: "1rem" }}>
          <p style={{ marginBottom: "var(--space-md)" }}>
            Mom Ops started from a simple observation: moms are already system builders. We run households, 
            coordinate schedules, and keep chaos at bay. Some of us also spent years in tech, in caregiving, 
            or both—nanny work, then product and operations, then parenthood.
          </p>
          <p style={{ marginBottom: "var(--space-md)" }}>
            The gap wasn’t more ideas or more apps. It was reliable, structured support from people who 
            get it. So we built Mom Ops: virtual assistant support by moms, for moms. Clear tasks, clear 
            expectations, and a calm place to get things done.
          </p>
          <p style={{ marginBottom: 0 }}>
            No fluff. No social feed. Just execution.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
