import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../(marketing)/components/Header";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/member?checkout=success");
  }

  return (
    <>
      <Header />
      <main className="app-shell app-shell--narrow">
        <h1 className="page-title">Payment successful</h1>
        <p className="section-lead">
          Check your email for a link to access your dashboard. Click it to sign in or set your password.
        </p>
        <p className="form-note" style={{ marginTop: "var(--space-md)" }}>
          Already have an account? <Link href="/login" className="link">Log in</Link>
        </p>
      </main>
    </>
  );
}
