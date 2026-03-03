import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Asset = {
  name: string;
  description: string;
  downloadHref?: string;
  googleDocsHref?: string;
};

const BRAND_ASSETS: Asset[] = [
  { name: "Mom Ops logo (PNG)", description: "Primary logo for branded materials.", downloadHref: "#" },
  { name: "Transparent logo", description: "Logo with transparent background for overlays.", downloadHref: "#" },
  { name: "Brand color guide", description: "Hex codes and usage for Mom Ops colors.", downloadHref: "#" },
  { name: "Typography guide", description: "Fonts and hierarchy for consistent branding.", downloadHref: "#" },
];

const DOCUMENT_TEMPLATES: Asset[] = [
  { name: "Google Doc template (branded)", description: "Starter document with Mom Ops header and formatting.", downloadHref: "#", googleDocsHref: "#" },
  { name: "Meal plan template", description: "Weekly meal plan layout for member deliverables.", downloadHref: "#", googleDocsHref: "#" },
  { name: "Weekly planner template", description: "Structured weekly planner template.", downloadHref: "#", googleDocsHref: "#" },
  { name: "Nutrition sheet template", description: "Nutrition tracking or info sheet template.", downloadHref: "#", googleDocsHref: "#" },
];

const SPREADSHEET_TEMPLATES: Asset[] = [
  { name: "Grocery list sheet", description: "Organized grocery list spreadsheet.", downloadHref: "#", googleDocsHref: "#" },
  { name: "Budget tracker", description: "Formatting only; no financial advice.", downloadHref: "#", googleDocsHref: "#" },
  { name: "Task organizer sheet", description: "Task and to-do organizer template.", downloadHref: "#", googleDocsHref: "#" },
];

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <div
      className="card"
      style={{
        padding: "var(--space-md)",
        marginBottom: "var(--space-sm)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
      }}
    >
      <div>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 var(--space-2xs)" }}>{asset.name}</h3>
        <p className="form-note" style={{ margin: 0 }}>{asset.description}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
        {asset.downloadHref && (
          <a href={asset.downloadHref} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Download
          </a>
        )}
        {asset.googleDocsHref && (
          <a href={asset.googleDocsHref} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
            Open in Google Docs
          </a>
        )}
      </div>
    </div>
  );
}

export default async function VAAssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/va/assets"));

  return (
    <main className="app-shell">
      <h1 className="page-title">Assets</h1>
      <p className="form-note" style={{ marginBottom: "var(--space-xl)" }}>
        Brand assets and document templates for Mom Ops deliverables. Download or open in Google Docs where applicable.
      </p>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>Brand Assets</h2>
        {BRAND_ASSETS.map((asset) => (
          <AssetCard key={asset.name} asset={asset} />
        ))}
      </section>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>Document Templates</h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Google Doc templates for meal plans, planners, and nutrition sheets.
        </p>
        {DOCUMENT_TEMPLATES.map((asset) => (
          <AssetCard key={asset.name} asset={asset} />
        ))}
      </section>

      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <h2 className="section-heading" style={{ marginBottom: "var(--space-md)" }}>Spreadsheet Templates</h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Sheets for grocery lists, budget formatting, and task organization.
        </p>
        {SPREADSHEET_TEMPLATES.map((asset) => (
          <AssetCard key={asset.name} asset={asset} />
        ))}
      </section>
    </main>
  );
}
