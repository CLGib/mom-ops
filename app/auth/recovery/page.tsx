import { Suspense } from "react";
import AuthRecoveryClient from "./AuthRecoveryClient";

export const dynamic = "force-dynamic";

export default function AuthRecoveryPage() {
  return (
    <Suspense fallback={
      <div className="app-shell app-shell--narrow">
        <h1 className="page-title">Sign in</h1>
        <div className="card">
          <p className="text-muted">Signing you in…</p>
        </div>
      </div>
    }>
      <AuthRecoveryClient />
    </Suspense>
  );
}
