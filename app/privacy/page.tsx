import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Mom Ops, LLC",
  description: "Mom Ops, LLC privacy policy. How we collect, use, and protect your information.",
};

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-semibold mb-6">Privacy Policy</h1>

      <p className="mb-4">
        Mom Ops, LLC respects your privacy. We collect only the information necessary to provide our virtual assistant services, including account information, submitted task details, and payment information processed securely through Stripe.
      </p>

      <p className="mb-4">
        We do not sell or share your personal information with third parties except as required to provide services (e.g., Stripe for payments).
      </p>

      <p className="mb-4">
        Task content is used solely to fulfill your request. Our team members are bound by confidentiality.
      </p>

      <p className="mb-4">
        You may request deletion of your account and associated data at any time by emailing support@themomops.com.
      </p>

      <p className="mb-4">
        For questions, contact support@themomops.com.
      </p>
    </div>
  );
}
