import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../(marketing)/components/SiteHeader";
import SiteFooter from "../../(marketing)/components/SiteFooter";
import { getKit, getAllKits, formatKitPrice } from "@/lib/kits";
import KitBuyButton from "./KitBuyButton";
import TheRegulars from "../../(marketing)/components/TheRegulars";

export function generateStaticParams() {
  return getAllKits().map((k) => ({ slug: k.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const kit = getKit(slug);
  if (!kit) return { title: "Kit · Mom Ops" };
  return { title: `${kit.title} · Mom Ops`, description: kit.blurb };
}

export default async function KitDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kit = getKit(slug);
  if (!kit) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container">
            <Link href="/kits" className="back-link">
              ← All kits
            </Link>
            <h1 className="section-title" style={{ marginTop: "var(--space-sm)" }}>
              {kit.title}
            </h1>
            <p className="section-lead">{kit.blurb}</p>

            <div className="card kit-detail-card">
              <h2 className="section-heading">What&apos;s inside</h2>
              <ul className="kit-included">
                {kit.whatsIncluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="kit-detail-buy">
                <div>
                  <span className="kit-card-price">{formatKitPrice(kit.priceCents)}</span>
                  <span className="form-note" style={{ display: "block" }}>
                    One-time. Customized to you by AI. Yours to download.
                  </span>
                </div>
                <KitBuyButton slug={kit.slug} label={`Buy this kit for ${formatKitPrice(kit.priceCents)}`} />
              </div>
            </div>

            <div className="card card--highlight kit-how">
              <h2 className="section-heading">How it works</h2>
              <ol className="kit-how-steps">
                <li>Grab it ({formatKitPrice(kit.priceCents)}).</li>
                <li>Answer a few quick questions{kit.allowUploads ? " (and upload anything that helps)" : ""}.</li>
                <li>Your assistant tailors it to you, and you get a document to keep.</li>
              </ol>
              <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>
                Buy once and it lives in your{" "}
                <Link href="/my-stuff" className="link">My Stuff</Link> library, ready to run anytime.
              </p>
            </div>

            <div style={{ marginTop: "var(--space-xl)" }}>
              <p className="form-note" style={{ textAlign: "center", marginBottom: "var(--space-sm)" }}>
                Or get this and everything else I build:
              </p>
              <TheRegulars bare />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
