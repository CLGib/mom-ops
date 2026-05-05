import BookIllustrationGeneratorClient from "./BookIllustrationGeneratorClient";

export const dynamic = "force-dynamic";

export default function BookIllustrationPage() {
  return (
    <main className="app-shell">
      <h1 className="page-title">Nana Banana Book Illustration Generator</h1>
      <BookIllustrationGeneratorClient />
    </main>
  );
}
