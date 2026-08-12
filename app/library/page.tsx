import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "../(marketing)/components/SiteHeader";
import SiteFooter from "../(marketing)/components/SiteFooter";
import TheRegulars from "../(marketing)/components/TheRegulars";
import { getKit } from "@/lib/kits";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Stuff · Mom Ops",
};

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/library");
  }

  const [{ data: purchases }, { data: profile }] = await Promise.all([
    supabase.from("kit_purchases").select("kit_id, created_at").eq("member_id", user.id),
    supabase.from("profiles").select("subscription_status, preferred_name, full_name").eq("id", user.id).maybeSingle(),
  ]);

  const isSupporter = profile?.subscription_status === "active";
  const name =
    (profile?.preferred_name as string) || (profile?.full_name as string) || "";

  // Owned products = purchased kits (deduped). Supporters own everything anyway.
  const ownedSlugs = [...new Set((purchases ?? []).map((p) => p.kit_id))];
  const owned = ownedSlugs.map((slug) => getKit(slug)).filter((k): k is NonNullable<typeof k> => !!k);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: 760 }}>
            <h1 className="section-title">{name ? `Your stuff, ${name}` : "Your stuff"}</h1>

            {isSupporter ? (
              <p className="section-lead">
                <span className="note-type note-type--skill" style={{ marginRight: "0.5rem" }}>
                  The Regulars
                </span>
                You have all-access. Everything I build is yours.
              </p>
            ) : (
              <p className="section-lead">Everything you have picked up, in one place.</p>
            )}

            {owned.length === 0 && !isSupporter ? (
              <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
                Nothing here yet. Grab a tool and it will show up here to run anytime.
              </p>
            ) : (
              <ul className="notes-list" style={{ marginTop: "var(--space-lg)" }}>
                {owned.map((kit) => (
                  <li key={kit.slug}>
                    <div className="note-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", flexWrap: "wrap" }}>
                      <span>
                        <span className="note-row-title" style={{ marginBottom: 0 }}>{kit.title}</span>
                      </span>
                      <Link href={`/kits/${kit.slug}/customize`} className="btn btn-primary">
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!isSupporter && (
              <div style={{ marginTop: "var(--space-2xl)" }}>
                <TheRegulars bare />
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
