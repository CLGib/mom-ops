import { Suspense } from "react";
import AuthForm from "./AuthForm";

export default function LoginPage() {
  return (
    <div className="app-shell app-shell--narrow">
      <h1 className="page-title">Mom Ops</h1>
      <div className="card">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
