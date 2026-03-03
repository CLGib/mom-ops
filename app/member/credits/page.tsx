import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreditPackageButton from "./CreditPackageButton";

export const dynamic = "force-dynamic";

export default async function MemberCreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=" + encodeURIComponent("/member/credits"));
  }

  return (
    <main className="app-shell">
      <h1 className="page-title">Purchase Task Credits</h1>
      <p className="section-lead" style={{ marginBottom: "var(--space-xl)" }}>
        Add more Task Credits to your account. Purchased credits never expire.
      </p>

      <div className="token-cards" style={{ marginBottom: "var(--space-2xl)" }}>
        <CreditPackageButton packageKey="10" label="10 Task Credits" price="$15" />
        <CreditPackageButton packageKey="30" label="30 Task Credits" price="$39" />
        <CreditPackageButton packageKey="50" label="50 Task Credits" price="$59" />
      </div>

      <p className="form-note">
        <Link href="/member" className="link">
          Back to My Ops Hub
        </Link>
      </p>
    </main>
  );
}
