"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setRequestedVa } from "./actions";
import SpecialistRequestSelect from "../components/SpecialistRequestSelect";

type VaOption = { id: string; label: string; imageUrl?: string | null };

type Props = {
  ticketId: string;
  currentRequestedVaId: string | null;
  pastVas: VaOption[];
};

export default function RequestVaDropdown({ ticketId, currentRequestedVaId, pastVas }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(currentRequestedVaId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(vaId: string) {
    setValue(vaId);
    setError(null);
    setLoading(true);
    const result = await setRequestedVa(ticketId, vaId || null);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setValue(currentRequestedVaId ?? "");
      return;
    }
    router.refresh();
  }

  if (pastVas.length === 0) return null;

  return (
    <section style={{ marginBottom: "var(--space-lg)" }}>
      <h2 className="section-heading">Request a specialist (optional)</h2>
      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
        If they&apos;re available, we&apos;ll route your task to them.
      </p>
      {error && (
        <p className="form-error" style={{ marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      <div style={{ maxWidth: "20rem" }}>
        <SpecialistRequestSelect
          options={pastVas}
          value={value}
          onChange={handleChange}
          disabled={loading}
        />
      </div>
      {loading && <span className="form-note" style={{ marginTop: "var(--space-xs)", display: "block" }}>Saving…</span>}
    </section>
  );
}
