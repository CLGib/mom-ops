"use client";

import { useRef, useState } from "react";

type Props = { ticketId: string };

type Result = { draft?: string; tips?: string[] } | null;

export default function VAAssistantPanel({ ticketId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [mode, setMode] = useState<"draft" | "tips" | null>(null);
  const [copied, setCopied] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function clearResult() {
    setResult(null);
    setError(null);
    setMode(null);
    detailsRef.current?.removeAttribute("open");
  }

  async function run(m: "draft" | "tips") {
    setError(null);
    setResult(null);
    setMode(m);
    setLoading(true);
    try {
      const res = await fetch("/api/va/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, mode: m }),
      });
      const text = await res.text();
      let data: { error?: string; draft?: string; tips?: string[] } = {};
      if (text.length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          setError(res.ok ? "Invalid response from server" : `Request failed (${res.status})`);
          return;
        }
      }
      if (!res.ok) {
        setError(data?.error ?? `Request failed (${res.status})`);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    if (!result?.draft) return;
    try {
      await navigator.clipboard.writeText(result.draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed");
    }
  }

  const showRevert = result != null || error != null;

  return (
    <section className="card" style={{ padding: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
      <details ref={detailsRef}>
        <summary style={{ fontWeight: 600, cursor: "pointer", listStyle: "none" }}>
          AI Assistant
        </summary>
        <div style={{ marginTop: "var(--space-md)" }}>
          <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
            Get a draft reply or ideas to go one step further. Use member context on the task page.
          </p>
          <p className="form-note" style={{ marginBottom: "var(--space-md)", fontStyle: "italic" }}>
            AI Assistant is to help you get ideas. You still must review and are responsible for making sure we fully answer the member&apos;s needs.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={() => run("draft")}
            >
              {loading && mode === "draft" ? "Thinking…" : "Get draft reply"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => run("tips")}
            >
              {loading && mode === "tips" ? "Thinking…" : "Get ideas / go one step further"}
            </button>
            {showRevert && (
              <button
                type="button"
                className="btn"
                disabled={loading}
                onClick={clearResult}
                style={{ marginLeft: "auto", color: "var(--text-soft, #666)", fontSize: "0.875rem" }}
                aria-label="Clear AI output and write your own reply"
              >
                Don&apos;t use AI
              </button>
            )}
          </div>

          {error && (
            <p style={{ color: "var(--color-error, #c00)", marginBottom: "var(--space-sm)", fontSize: "0.9rem" }}>
              {error}
            </p>
          )}

          {result?.draft && (
            <div style={{ marginTop: "var(--space-md)" }}>
              <h3 className="section-heading" style={{ fontSize: "0.9375rem", marginBottom: "var(--space-xs)" }}>
                Draft reply
              </h3>
              <div
                className="card"
                style={{
                  padding: "var(--space-sm)",
                  whiteSpace: "pre-wrap",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                {result.draft}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "var(--space-sm)" }}
                onClick={copyDraft}
              >
                {copied ? "Copied" : "Copy to reply"}
              </button>
            </div>
          )}

          {result?.tips && result.tips.length > 0 && (
            <div style={{ marginTop: "var(--space-md)" }}>
              <h3 className="section-heading" style={{ fontSize: "0.9375rem", marginBottom: "var(--space-xs)" }}>
                Ideas to go one step further
              </h3>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {result.tips.map((tip, i) => (
                  <li key={i} style={{ marginBottom: "var(--space-2xs)" }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
