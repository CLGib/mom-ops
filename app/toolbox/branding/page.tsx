import BrandingAssistantClient from "./BrandingAssistantClient";

export const dynamic = "force-dynamic";

export default function BrandingPage() {
  return (
    <main className="app-shell">
      <h1 className="page-title">AI Branding Assistant</h1>
      <BrandingAssistantClient />
    </main>
  );
}
