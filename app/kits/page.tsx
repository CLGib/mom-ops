import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../(marketing)/components/SiteHeader";
import SiteFooter from "../(marketing)/components/SiteFooter";
import { getAllKits, formatKitPrice } from "@/lib/kits";

export const metadata: Metadata = {
  title: "Kits — Mom Ops",
  description:
    "Done-for-you playbook kits for moms, customized to you by AI in about a minute. Skip the $200 tool stack and the hours of QA.",
};

export default function KitsPage() {
  const kits = getAllKits();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container">
            <h1 className="section-title">Grab the playbook. Pull it off.</h1>
            <p className="section-lead">
              Done-for-you kits for the stuff you want to pull off &mdash; each one
              customized to <em>you</em> by AI in about a minute. You could build it
              yourself, with a $200/mo AI subscription, a Canva plan, and a few
              hours of QA. Or grab it here.
            </p>
            <div className="kits-grid">
              {kits.map((kit) => (
                <article key={kit.slug} className="card kit-card">
                  <h2 className="kit-card-title">{kit.title}</h2>
                  <p className="kit-card-blurb">{kit.blurb}</p>
                  <div className="kit-card-footer">
                    <span className="kit-card-price">{formatKitPrice(kit.priceCents)}</span>
                    <Link href={`/kits/${kit.slug}`} className="btn btn-primary">
                      See what&apos;s inside
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <p className="form-note" style={{ marginTop: "var(--space-xl)" }}>
              More Ops coming soon. Want first dibs?{" "}
              <Link href="/#newsletter" className="link">
                Get on the list
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
