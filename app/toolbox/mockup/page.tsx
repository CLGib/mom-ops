import MockUpGeneratorClient from "./MockUpGeneratorClient";

export const dynamic = "force-dynamic";

export default function MockUpPage() {
  return (
    <main className="app-shell">
      <h1 className="page-title">Nana Banana Mock-Up Generator</h1>
      <MockUpGeneratorClient />
    </main>
  );
}
