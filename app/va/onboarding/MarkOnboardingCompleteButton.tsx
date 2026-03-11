"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  alreadyComplete: boolean;
  effectiveDate?: string | null;
  contractStartDate?: string | null;
};

export default function MarkOnboardingCompleteButton({ alreadyComplete, effectiveDate, contractStartDate }: Props) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkRead() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }
    const { data: existing } = await supabase
      .from("va_profiles")
      .select("user_id, display_name, effective_date, contract_start_date")
      .eq("user_id", user.id)
      .single();

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (existing) {
      const updates: Record<string, unknown> = {
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      };
      if (!existing.effective_date) updates.effective_date = today;
      if (!existing.contract_start_date) updates.contract_start_date = today;
      const { error: updateError } = await supabase
        .from("va_profiles")
        .update(updates)
        .eq("user_id", user.id);
      setLoading(false);
      if (updateError) {
        setError(updateError.message || "Could not save.");
        return;
      }
    } else {
      const displayName = user.email?.split("@")[0] || "VA";
      const { error: insertError } = await supabase.from("va_profiles").insert({
        user_id: user.id,
        display_name: displayName,
        onboarding_complete: true,
        effective_date: today,
        contract_start_date: today,
      });
      setLoading(false);
      if (insertError) {
        setError(insertError.message || "Could not save.");
        return;
      }
    }
    router.refresh();
  }

  if (alreadyComplete) {
    return (
      <div className="card" style={{ maxWidth: "720px", marginTop: "var(--space-xl)" }}>
        <p style={{ margin: 0, color: "var(--color-success, green)", fontWeight: 500 }}>
          You have completed onboarding. Next: complete <strong>Training</strong>. Once training is done, you can claim tasks from the Dashboard or Tasks page.
        </p>
        <p style={{ margin: "var(--space-sm) 0 0" }}>
          <Link href="/va/training" className="btn btn-primary">
            Go to Training
          </Link>
        </p>
        {(effectiveDate || contractStartDate) && (
          <p style={{ margin: "var(--space-sm) 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Effective Date: {effectiveDate ?? "-"}. Contract Start Date: {contractStartDate ?? "-"}. (Set when you checked and completed onboarding.)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "720px", marginTop: "var(--space-xl)" }}>
      <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
        Confirm completion
      </h2>
      <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-sm)", marginBottom: "var(--space-md)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: "0.25rem" }}
        />
        <span>
          I understand and agree to operate at Mom Ops standard: reduce mental load, go one step beyond, and never provide medical, legal, or financial advice.
        </span>
      </label>
      {error && (
        <p className="form-error" style={{ marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleMarkRead}
        disabled={!agreed || loading}
        className="btn btn-primary"
      >
        {loading ? "Saving…" : "Mark as Read"}
      </button>
    </div>
  );
}
