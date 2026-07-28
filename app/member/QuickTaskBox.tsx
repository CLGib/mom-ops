"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createTicket } from "./actions";

const PROMPTS = [
  "Plan this week's dinners",
  "Handle a birthday party",
  "Book the appointments I keep putting off",
  "Research summer camps near me",
  "Write the email I've been dreading",
];

/** Derive a short, human task title from freeform input. */
function deriveSubject(text: string): string {
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? text.trim();
  const clean = firstLine.replace(/\s+/g, " ").trim();
  if (clean.length <= 80) return clean || "New task";
  return clean.slice(0, 77).trimEnd() + "…";
}

export default function QuickTaskBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token ?? null);
      setSessionLoaded(true);
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);

    if (!sessionLoaded) {
      setError("Loading your session — one sec, then try again.");
      return;
    }
    if (!accessToken?.trim()) {
      setError("Not logged in. Please refresh the page or log in again.");
      return;
    }

    setWorking(true);
    try {
      const subject = deriveSubject(body);
      const result = await createTicket(subject, body, accessToken);
      const ticketId = result?.ticketId;
      if (result?.error || !ticketId) {
        setError(result?.error ?? "Couldn't start your task. Please try again.");
        return;
      }

      const fulfillRes = await fetch("/api/tasks/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticketId }),
      });
      const fulfillData = await fulfillRes.json().catch(() => ({}));
      if (!fulfillRes.ok) {
        setError(
          fulfillData.error ??
            "Your assistant hit a snag finishing this. We've flagged it and will follow up."
        );
        router.refresh();
        return;
      }

      setText("");
      router.push(`/member/${ticketId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quick-task-box">
      <label htmlFor="quick-task" className="section-heading" style={{ display: "block", marginBottom: "var(--space-2xs)" }}>
        What&apos;s on your plate?
      </label>
      <p className="form-note" style={{ marginTop: 0, marginBottom: "var(--space-sm)" }}>
        Tell us in your own words. Your assistant does the thinking and hands back something you can use.
      </p>
      <textarea
        id="quick-task"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={working}
        placeholder="e.g. Plan my daughter's mermaid birthday party… or just “ugh, meal planning”"
        className="input"
        style={{ width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: 120 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)", marginTop: "var(--space-sm)" }}>
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setText(p)}
            disabled={working}
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={working || !sessionLoaded || !accessToken || !text.trim()}
        style={{ marginTop: "var(--space-md)" }}
      >
        {working ? "Your assistant is working…" : "Hand it off →"}
      </button>
      {working && (
        <p className="form-note" style={{ marginTop: "var(--space-sm)" }} role="status">
          Putting this together — usually under a minute.
        </p>
      )}
      {error && (
        <p className="form-note" style={{ color: "var(--color-error, #b91c1c)", marginTop: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
