"use client";

import { useEffect } from "react";

export default function RedirectToDashboard({ target }: { target: string }) {
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return (
    <div className="app-shell app-shell--narrow" style={{ paddingTop: "var(--space-2xl)", textAlign: "center" }}>
      <p className="text-muted">Redirecting you to your dashboard…</p>
    </div>
  );
}
