import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MemberSpecialistProfilePage({
  params,
}: {
  params: Promise<{ vaId: string }>;
}) {
  const { vaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent(`/member/specialist/${vaId}`));

  const { data: vaProfile } = await supabase
    .from("va_profiles")
    .select("display_name, profile_image_url, bio, onboarding_complete")
    .eq("user_id", vaId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_name")
    .eq("id", vaId)
    .single();

  const displayName =
    vaProfile?.display_name?.trim() ||
    profile?.preferred_name?.trim() ||
    profile?.full_name?.trim() ||
    "Specialist";

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", vaId)
    .single();

  if (roleRow?.role !== "va") notFound();

  const requestUrl = `/member?requested_va_id=${encodeURIComponent(vaId)}&from_specialist=1`;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "var(--space-lg)" }}>
      <p style={{ marginBottom: "var(--space-md)" }}>
        <Link href="/member/reviews" className="link">
          ← Back to Reviews
        </Link>
      </p>
      <div className="card" style={{ padding: "var(--space-xl)" }}>
        <div style={{ display: "flex", gap: "var(--space-lg)", alignItems: "flex-start", flexWrap: "wrap" }}>
          {vaProfile?.profile_image_url ? (
            <img
              src={vaProfile.profile_image_url}
              alt=""
              width={120}
              height={120}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "var(--accent-soft-bg, #f8f5ed)",
                color: "var(--accent, #b8860b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                fontWeight: 600,
              }}
              aria-hidden
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title" style={{ marginTop: 0, marginBottom: "var(--space-xs)" }}>
              {displayName}
            </h1>
            <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
              Specialist
            </p>
            {vaProfile?.bio && (
              <p style={{ margin: "0 0 var(--space-lg)", color: "var(--text-muted, #5c5955)", lineHeight: 1.5 }}>
                {vaProfile.bio}
              </p>
            )}
            <Link href={requestUrl} className="btn btn-primary">
              Have This Specialist Do This For Me
            </Link>
            <p className="form-note" style={{ marginTop: "var(--space-sm)" }}>
              You&apos;ll be taken to submit a task. If {displayName} is available, we&apos;ll route it to them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
