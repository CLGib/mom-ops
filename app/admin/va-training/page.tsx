import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VATrainingClient from "./VATrainingClient";

export const dynamic = "force-dynamic";

type SectionRow = {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  video_url: string | null;
  video_url_2: string | null;
  image_urls: string | null;
  pdf_urls: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AdminVATrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/va-training"));

  const [
    { data: adminRow },
    { data: directorRow },
  ] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("directors").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!adminRow && !directorRow) redirect("/no-access");

  const { data: sections, error } = await supabase
    .from("va_training_sections")
    .select("id, title, content, sort_order, video_url, video_url_2, image_urls, pdf_urls, created_at, updated_at")
    .order("sort_order", { ascending: true });

  const rows: SectionRow[] = (sections ?? []).map((s) => ({
    id: s.id,
    title: s.title ?? "",
    content: s.content ?? "",
    sort_order: s.sort_order ?? 0,
    video_url: s.video_url ?? null,
    video_url_2: s.video_url_2 ?? null,
    image_urls: s.image_urls ?? null,
    pdf_urls: s.pdf_urls ?? null,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

  return (
    <main className="app-shell">
      <h1 className="page-title">VA Training (SOPs)</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Manage training sections that VAs see after onboarding. VAs must complete training before they can claim tasks. Add, edit, reorder, or delete sections.
      </p>
      <VATrainingClient initialSections={rows} loadError={error?.message ?? null} />
    </main>
  );
}
