import Link from "next/link";
import { getAllKits, formatKitPrice } from "@/lib/kits";

export default function KitsPromo() {
  const kits = getAllKits().slice(0, 3);
  if (kits.length === 0) return null;
  return (
    <section id="kits" className="section section-alt">
      <div className="container">
        <h2 className="section-title">Or skip the build. Grab the Op.</h2>
        <p className="section-lead">
          Sometimes you don&apos;t want the tutorial. You just want the thing,
          done. Kits are my done-for-you playbooks, customized to <em>you</em> by AI
          in about a minute. You could build it yourself for a $200/mo AI sub, a Canva
          plan, and a few hours of QA. Or grab it for the price of a latte.
        </p>
        <div className="kits-grid">
          {kits.map((kit) => (
            <article key={kit.slug} className="card kit-card">
              <h3 className="kit-card-title">{kit.title}</h3>
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
        <p style={{ marginTop: "var(--space-lg)" }}>
          <Link href="/kits" className="btn btn-secondary">
            Browse all kits
          </Link>
        </p>
      </div>
    </section>
  );
}
