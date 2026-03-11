"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { ticketId: string; ticketSubject?: string };

type QuickstartLink = { label: string; url: string };
type Result =
  | { tips?: string[]; steps?: string[]; links?: QuickstartLink[]; ideas?: string[]; suggestedCredit?: number; reason?: string }
  | null;

function StarburstIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 21l2.5-7.5L15 11l-7.5 2.5L5 21z" />
      <path d="M19 21l2.5-7.5-7.5 2.5L19 21z" />
    </svg>
  );
}

function PaperPlaneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function PriceTagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2zM7 7h.01" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export default function VAAssistantPanel({ ticketId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [mode, setMode] = useState<"tips" | "quickstart" | "suggestCredit" | null>(null);
  const [applyingCost, setApplyingCost] = useState(false);
  const [instructions, setInstructions] = useState("");

  function clearResult() {
    setResult(null);
    setError(null);
    setMode(null);
  }

  async function run(m: "tips" | "quickstart" | "suggestCredit") {
    setError(null);
    setResult(null);
    setMode(m);
    setLoading(true);
    try {
      const res = await fetch("/api/va/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          mode: m,
          instructions: instructions.trim() || undefined,
        }),
      });
      const text = await res.text();
      let data: {
        error?: string;
        tips?: string[];
        steps?: string[];
        links?: QuickstartLink[];
        ideas?: string[];
        suggestedCredit?: number;
        reason?: string;
      } = {};
      if (text.length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          const isOverload = res.status === 503 || res.status === 529;
          setError(res.ok ? "Invalid response from server" : isOverload ? "The AI service is temporarily busy. Please try again in a minute." : `Request failed (${res.status})`);
          return;
        }
      }
      if (!res.ok) {
        const isOverload = res.status === 503 || res.status === 529;
        const message = isOverload
          ? (data?.error ?? "The AI service is temporarily busy. Please try again in a minute.")
          : (data?.error ?? `Request failed (${res.status})`);
        setError(message);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function applySuggestedCost() {
    const credit = result?.suggestedCredit;
    if (credit == null || credit < 0) return;
    setApplyingCost(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ credit_cost: credit })
        .eq("id", ticketId);
      if (updateError) {
        setError(updateError.message ?? "Failed to update cost.");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply cost.");
    } finally {
      setApplyingCost(false);
    }
  }

  const showRevert = result != null || error != null;

  return (
    <section className="va-assistant-bar">
      <div className="va-assistant-bar__header">
        <StarburstIcon className="va-assistant-bar__icon va-assistant-bar__icon--gold" />
        <span className="va-assistant-bar__title">AI Assistant</span>
        <span className="va-assistant-bar__subtitle">Ideas & templates</span>
      </div>
      <div className="va-assistant-bar__row">
        <input
          id="assistant-instructions"
          type="text"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Focus on budget, keep it short..."
          className="va-assistant-bar__input input"
          disabled={loading}
          aria-label="Extra instructions for AI (optional)"
        />
        <button
          type="button"
          className="va-assistant-bar__send btn btn-primary"
          disabled={loading}
          onClick={() => run("tips")}
          aria-label="Get ideas"
          title="Get ideas"
        >
          <PaperPlaneIcon />
        </button>
        <button
          type="button"
          className="va-assistant-bar__action"
          disabled={loading}
          onClick={() => run("tips")}
        >
          <LightbulbIcon className="va-assistant-bar__action-icon" />
          {loading && mode === "tips" ? "Thinking…" : "Get ideas"}
        </button>
        <button
          type="button"
          className="va-assistant-bar__action"
          disabled={loading}
          onClick={() => run("quickstart")}
        >
          <PencilIcon className="va-assistant-bar__action-icon" />
          {loading && mode === "quickstart" ? "Thinking…" : "Get started"}
        </button>
        <button
          type="button"
          className="va-assistant-bar__action"
          disabled={loading}
          onClick={() => run("suggestCredit")}
        >
          <PriceTagIcon className="va-assistant-bar__action-icon" />
          {loading && mode === "suggestCredit" ? "Thinking…" : "Suggest cost"}
        </button>
        {showRevert && (
          <button
            type="button"
            className="va-assistant-bar__revert"
            disabled={loading}
            onClick={clearResult}
            aria-label="Clear AI output and write your own reply"
          >
            Don&apos;t use AI
          </button>
        )}
      </div>
      <div className="va-assistant-bar__quick-links">
        <a
          href="/toolbox/mockup"
          target="_blank"
          rel="noopener noreferrer"
          className="va-assistant-bar__quick-link"
          aria-label="Open Mock-Up Generator in new tab"
          title="Mock-Up Generator"
        >
          <ImageIcon className="va-assistant-bar__quick-link-icon" />
          Mock-up
        </a>
        <a
          href="/toolbox/templates"
          target="_blank"
          rel="noopener noreferrer"
          className="va-assistant-bar__quick-link"
          aria-label="Open Template Builder in new tab"
          title="Template Builder"
        >
          <FileTextIcon className="va-assistant-bar__quick-link-icon" />
          Templates
        </a>
        <a
          href="/toolbox#how-to-videos"
          target="_blank"
          rel="noopener noreferrer"
          className="va-assistant-bar__quick-link"
          aria-label="Open How-to videos in new tab"
          title="How-to videos"
        >
          <PlayIcon className="va-assistant-bar__quick-link-icon" />
          How-to videos
        </a>
      </div>
      <p className="va-assistant-bar__disclaimer">
        AI is to help you get ideas. You still must review and are responsible for fully answering the member&apos;s needs.
      </p>
      {error && (
        <p className="va-assistant-bar__error">
          {error}
        </p>
      )}
      {result?.suggestedCredit != null && (
        <div className="va-assistant-bar__result">
          <h3 className="section-heading" style={{ fontSize: "0.9375rem", marginBottom: "var(--space-xs)" }}>
            Suggested credit cost
          </h3>
          <p style={{ fontSize: "0.9rem", marginBottom: "var(--space-xs)" }}>
            <strong>Suggested: {result.suggestedCredit} credits</strong>
            {result.reason && (
              <span style={{ display: "block", marginTop: "var(--space-2xs)", fontWeight: "normal", color: "var(--text-soft, #666)" }}>
                {result.reason}
              </span>
            )}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: "var(--space-sm)" }}
            disabled={applyingCost}
            onClick={applySuggestedCost}
          >
            {applyingCost ? "Applying…" : "Apply to cost"}
          </button>
        </div>
      )}
      {result?.tips && result.tips.length > 0 && (
        <div className="va-assistant-bar__result">
          <h3 className="section-heading" style={{ fontSize: "0.9375rem", marginBottom: "var(--space-xs)" }}>
            Ideas to go one step further
          </h3>
          <ul className="va-assistant-bar__list va-assistant-bar__list--bullets">
            {result.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
      {(result?.steps?.length ?? 0) > 0 && (
        <div className="va-assistant-bar__result">
          <h3 className="section-heading" style={{ fontSize: "0.9375rem", marginBottom: "var(--space-xs)" }}>
            Quick start guide
          </h3>
          <ol className="va-assistant-bar__list va-assistant-bar__list--steps">
            {result!.steps!.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {result?.links && result.links.length > 0 && (
            <div style={{ marginTop: "var(--space-sm)" }}>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Useful links</h4>
              <ul className="va-assistant-bar__list va-assistant-bar__list--bullets">
                {result.links.map((link, i) => (
                  <li key={i}>
                    {link.url && link.url !== "#" ? (
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="link">
                        {link.label}
                      </a>
                    ) : (
                      link.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result?.ideas && result.ideas.length > 0 && (
            <div style={{ marginTop: "var(--space-sm)" }}>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "var(--space-2xs)" }}>Ideas</h4>
              <ul className="va-assistant-bar__list va-assistant-bar__list--bullets">
                {result.ideas.map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
