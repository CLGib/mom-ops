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
        Membership is month-to-month and you may cancel anytime. You may cancel your membership at any time through your account portal or by emailing support@themomops.com. Cancellation applies to the next billing cycle. No prorated refunds are provided.
      </p>

      <h2 id="money-back-guarantee" className="text-xl font-semibold mt-8 mb-2">
        Money-Back Guarantee
      </h2>
      <p className="mb-4">
        If you are not satisfied with your first completed task, you may request a refund of your first monthly membership fee within 7 days of task delivery. Refunds apply to the membership fee only and do not apply to additional credit purchases. Limit one refund per member.
      </p>

      <p className="mb-4">
        If you dispute a charge, please contact us first at support@themomops.com so we can resolve the issue promptly.
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
