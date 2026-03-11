"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const SESSION_KEY = "profile-photo-offer-shown";

export default function ProfilePhotoOfferPopover() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (typeof window === "undefined") return;
      try {
        if (sessionStorage.getItem(SESSION_KEY)) {
          setLoading(false);
          return;
        }
        const res = await fetch("/api/member/profile-photo-offer/eligibility", {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.eligible === true) {
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  }, []);

  if (!open || loading) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-photo-offer-title"
      aria-describedby="profile-photo-offer-body"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-md)",
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.4)",
        overflow: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && handleDismiss()}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflow: "auto",
          padding: "var(--space-xl)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="profile-photo-offer-title"
          style={{
            margin: "0 0 var(--space-sm)",
            fontSize: "1.25rem",
            fontWeight: 600,
          }}
        >
          Add a profile photo
        </h2>
        <p
          id="profile-photo-offer-body"
          className="form-note"
          style={{
            margin: "0 0 var(--space-lg)",
            color: "var(--text-muted, #5c5955)",
          }}
        >
          Add a profile photo and get <strong>5 extra credits</strong>.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-sm)",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            className="btn btn-secondary"
          >
            Dismiss
          </button>
          <Link
            href="/member/profile"
            className="btn btn-primary"
            onClick={handleDismiss}
          >
            Add photo
          </Link>
        </div>
      </div>
    </div>
  );
}
