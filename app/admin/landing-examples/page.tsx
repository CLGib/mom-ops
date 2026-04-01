import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingExamplesClient from "./LandingExamplesClient";

export const dynamic = "force-dynamic";

export type LandingExampleRow = {
  id: string;
  title: string;
  requestText: string;
  deliverableImages: string[] | null;
  deliverablePdf: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export default async function AdminLandingExamplesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/admin/landing-examples"));

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/no-access");

  const { data: rows, error } = await supabase
    .from("landing_real_examples")
    .select("id, title, request_text, deliverable_images, deliverable_pdf, caption, thumbnail_url, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  const examples: LandingExampleRow[] = (rows ?? []).map((r) => {
    const rawImages = r.deliverable_images;
    const deliverableImages =
      Array.isArray(rawImages) && rawImages.length > 0
        ? rawImages.filter((u): u is string => typeof u === "string" && u.trim() !== "")
        : null;
    return {
      id: r.id,
      title: r.title ?? "",
      requestText: r.request_text ?? "",
      deliverableImages,
      deliverablePdf: r.deliverable_pdf ?? null,
      caption: r.caption ?? null,
      thumbnailUrl: r.thumbnail_url ?? null,
      sortOrder: r.sort_order ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
  const loadError = error?.message ?? null;

  return (
    <main className="app-shell">
      <h1 className="page-title">Explore real examples</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-lg)" }}>
        Manage the cards shown in the &quot;Explore real examples&quot; section on the homepage. Add the request
        prompt (what the member asked for) and either 1–5 image URLs (for the book flipper) or one PDF URL (for
        iframe). Use paths like <code style={{ fontSize: "0.875rem" }}>/assets/example.pdf</code> for files in{" "}
        <code style={{ fontSize: "0.875rem" }}>public/assets/</code>.
      </p>
      <LandingExamplesClient initialExamples={examples} loadError={loadError} />
    </main>
  );
}
