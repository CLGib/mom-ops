import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "../../../(marketing)/components/SiteHeader";
import SiteFooter from "../../../(marketing)/components/SiteFooter";
import { getKit } from "@/lib/kits";
import { ownsKit } from "@/lib/kit-access";

export const dynamic = "force-dynamic";

export default async function KitThanksPage({
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
  // Payment settles via webhook (usually seconds); a logged-in buyer may already be entitled.
  const entitled = user ? await ownsKit(user.id, kit.slug) : false;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container" style={{ textAlign: "center", maxWidth: 560 }}>
            <p style={{ fontSize: "2.5rem", margin: 0 }} aria-hidden>
              🎉
            </p>
            <h1 className="section-title">You&apos;ve got the {kit.title}.</h1>
            {entitled ? (
              <>
                <p className="section-lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
                  Ready to make it yours? Answer a few quick questions and your assistant
                  will tailor the whole playbook to you.
                </p>
                <Link
                  href={`/kits/${kit.slug}/customize`}
                  className="btn btn-primary btn-large"
                  style={{ marginTop: "var(--space-md)" }}
                >
                  Customize my kit →
                </Link>
              </>
            ) : (
              <>
                <p className="section-lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
                  Check your email &mdash; we just sent you a link to set up your account
                  and customize your kit. (It can take a few seconds to arrive.)
                </p>
                <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
                  Already have an account?{" "}
                  <Link href={`/login?next=/kits/${kit.slug}/customize`} className="link">
                    Log in to customize
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
