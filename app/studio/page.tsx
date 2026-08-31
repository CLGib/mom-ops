import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isNewsletterOwner } from "@/lib/newsletter";
import { getAllNotes } from "@/lib/notes";
import SiteHeader from "../(marketing)/components/SiteHeader";
import SiteFooter from "../(marketing)/components/SiteFooter";
import StudioSender from "./StudioSender";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio · Mom Ops" };

async function activeSubscriberCount(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;
  const db = createServiceClient(url, key);
  const { count } = await db
    .from("subscribers")
    .select("*", { count: "exact", head: true })
    .is("unsubscribed_at", null);
  return count ?? 0;
}

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio");
  if (!isNewsletterOwner(user.email)) redirect("/");

  const notes = getAllNotes().map((n) => ({
    slug: n.slug,
    title: n.title,
    date: n.date,
    summary: n.summary,
  }));
  const subscriberCount = await activeSubscriberCount();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: 640 }}>
            <h1 className="section-title">Studio</h1>
            <p className="section-lead">
              Send this week&apos;s Notebook post to your newsletter list. One click, and
              it goes out through your own pipeline with a working unsubscribe link.
            </p>
            {notes.length === 0 ? (
              <p className="form-note">No published notes yet. Publish one, then come back.</p>
            ) : (
              <StudioSender notes={notes} subscriberCount={subscriberCount} />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
