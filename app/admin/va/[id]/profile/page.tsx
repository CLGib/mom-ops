import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EditVAProfileForm from "../../../EditVAProfileForm";

export default async function AdminVAProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: vaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin"));

  const roleRes = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (roleRes.data?.role !== "admin") notFound();

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("user_id, display_name, profile_image_url, bio, specialties, work_requires_review, payment_per_credit")
    .eq("user_id", vaId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", vaId)
    .single();

  if (!profile || profile.role !== "va") notFound();

  const initial = {
    display_name: vaProfile?.display_name ?? "",
    profile_image_url: vaProfile?.profile_image_url ?? null,
    bio: vaProfile?.bio ?? "",
    work_requires_review: vaProfile?.work_requires_review ?? true,
    payment_per_credit: vaProfile?.payment_per_credit ?? 0.2,
  };

  return (
    <main className="app-shell">
      <Link href="/admin" className="back-link">
        ← Back to CEO
      </Link>
      <h1 className="page-title">Edit VA profile</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
        VA ID: {vaId.slice(0, 8)}…
      </p>
      <EditVAProfileForm vaId={vaId} initial={initial} />
    </main>
  );
}
