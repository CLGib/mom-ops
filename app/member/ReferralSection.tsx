"use client";

import { useState } from "react";

type Props = { referralLink: string };

export default function ReferralSection({ referralLink }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select and suggest copy
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="card" style={{ marginBottom: "var(--space-2xl)" }}>
      <h2 className="section-heading" style={{ marginBottom: "var(--space-xs)" }}>
        Invite a friend
      </h2>
      <p className="form-note" style={{ marginBottom: "var(--space-sm)" }}>
        Share your link. When your friend signs up and subscribes, you both get <strong>15 Task Credits</strong>.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
        <input
          type="text"
          readOnly
          value={referralLink}
          className="form-input"
          style={{ flex: "1", minWidth: "12rem", fontFamily: "monospace", fontSize: "0.9rem" }}
          aria-label="Referral link"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-secondary"
          style={{ whiteSpace: "nowrap" }}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </section>
  );
}
