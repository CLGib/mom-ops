import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "../../../(marketing)/components/SiteHeader";
import SiteFooter from "../../../(marketing)/components/SiteFooter";
import { getKit } from "@/lib/kits";
import { ownsKit } from "@/lib/kit-access";
import KitCustomizer from "./KitCustomizer";

export const dynamic = "force-dynamic";

export default async function KitCustomizePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kit = getKit(slug);
  if (!kit) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/kits/${slug}/customize`)}`);
  }

  const entitled = await ownsKit(user.id, kit.slug);
  if (!entitled) {
    return (
      <>
        <SiteHeader />
        <main>
          <section className="section">
            <div className="container" style={{ maxWidth: 560, textAlign: "center" }}>
              <h1 className="section-title">You don&apos;t own this kit yet</h1>
              <p className="section-lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
                Grab the {kit.title} and you can customize it as many times as you like.
              </p>
              <Link href={`/kits/${kit.slug}`} className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>
                See the kit
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Prefill from profile where the kit field declares a profileKey.
  const profileKeys = kit.inputFields.map((f) => f.profileKey).filter(Boolean) as string[];
  const prefill: Record<string, string> = {};
  if (profileKeys.length > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(profileKeys.join(", "))
      .eq("id", user.id)
      .maybeSingle();
    const profileRec = profile as unknown as Record<string, unknown> | null;
    if (profileRec) {
      for (const f of kit.inputFields) {
        if (f.profileKey && profileRec[f.profileKey] != null) {
          prefill[f.name] = String(profileRec[f.profileKey]);
        }
      }
    }
  }

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
            <p className="section-lead">
              Tap the boxes that fit, add a detail or two, and drop in anything you&apos;ve
              got. Takes a few minutes. You can tweak and regenerate as many times as you like.
            </p>
            <KitCustomizer
              slug={kit.slug}
              fields={kit.inputFields}
              prefill={prefill}
              allowUploads={kit.allowUploads}
              submitLabel={kit.ctaLabel}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
