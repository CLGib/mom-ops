import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Mom Ops",
  description: "Mom Ops terms of service. Membership, credits, and acceptable use.",
};

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-semibold mb-6">Terms of Service</h1>

      <p className="mb-4">
        Mom Ops provides structured virtual assistant services for household and administrative tasks.
      </p>

      <p className="mb-4">
        Membership is billed monthly at $29.95 and includes 45 Task Credits. Unused credits roll over up to three months. Additional credits may be purchased separately.
      </p>

      <p className="mb-4">
        We do not provide legal, medical, financial, or emergency services.
      </p>

      <p className="mb-4">
        Task turnaround times are estimates and may vary depending on scope.
      </p>

      <p className="mb-4">
        By using Mom Ops, you agree to provide accurate information and use the service lawfully.
      </p>

      <p className="mb-4">
        We reserve the right to suspend accounts that violate these terms.
      </p>

      <p className="mb-4">
        For questions, contact support@themomops.com.
      </p>
    </div>
  );
}
