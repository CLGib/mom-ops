"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  vaUserId: string;
  initial: {
    payment_method: string | null;
    payment_account: string | null;
    legal_name: string | null;
    email_address: string | null;
    effective_date: string | null;
    contract_start_date: string | null;
    address: string | null;
    mobile_phone: string | null;
  };
};

export default function VAPaymentContractForm({ vaUserId, initial }: Props) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<string>(initial.payment_method ?? "");
  const [paymentAccount, setPaymentAccount] = useState(initial.payment_account ?? "");
  const [legalName, setLegalName] = useState(initial.legal_name ?? "");
  const [emailAddress, setEmailAddress] = useState(initial.email_address ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [mobilePhone, setMobilePhone] = useState(initial.mobile_phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const effectiveDate = initial.effective_date;
  const contractStartDate = initial.contract_start_date;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (paymentMethod && !["paypal", "wise"].includes(paymentMethod)) {
      setError("Please choose PayPal or Wise.");
      return;
    }
    if (paymentMethod && !paymentAccount.trim()) {
      setError(paymentMethod === "paypal" ? "PayPal email is required." : "Wise account details are required.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("va_profiles")
      .update({
        payment_method: paymentMethod ? paymentMethod : null,
        payment_account: paymentAccount.trim() || null,
        legal_name: legalName.trim() || null,
        email_address: emailAddress.trim() || null,
        address: address.trim() || null,
        mobile_phone: mobilePhone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", vaUserId);

    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Failed to save.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <section className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-md)" }}>
          Mom Ops Virtual Assistant Services
        </h2>

        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>1. Overview</h3>
          <p style={{ marginBottom: "var(--space-sm)", lineHeight: 1.5 }}>
            Mom Ops engages Contractor to provide remote Virtual Assistant services in support of Mom Ops members. Contractor will execute assigned tasks with care, discretion, and attention to context, in alignment with Mom Ops company values and operating standards.
          </p>
          <p style={{ marginBottom: 0, lineHeight: 1.5 }}>
            Contractor understands that Mom Ops provides human-powered task support. AI tools may be used to improve efficiency, but all deliverables must reflect human review, judgment, and personalization.
          </p>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-md) 0" }} />

        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>2. Scope of Services</h3>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Contractor may be assigned tasks including, but not limited to:
          </p>
          <ul style={{ marginBottom: "var(--space-sm)", paddingLeft: "1.25rem", lineHeight: 1.6 }}>
            <li>Research and comparison tasks</li>
            <li>Vendor communication writing</li>
            <li>Document drafting and formatting</li>
            <li>Family logistics coordination</li>
            <li>Follow-ups and task completion tracking</li>
            <li>Platform-based member communication</li>
          </ul>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            All tasks will be assigned through the Mom Ops task management system.
          </p>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Contractor agrees to:
          </p>
          <ul style={{ marginBottom: 0, paddingLeft: "1.25rem", lineHeight: 1.6 }}>
            <li>Review member context before beginning work</li>
            <li>Avoid asking members for information already provided</li>
            <li>Remove decisions rather than create more</li>
            <li>Communicate clearly and professionally</li>
          </ul>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-md) 0" }} />

        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>3. Independent Contractor Relationship</h3>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Contractor is engaged as an independent contractor and is not an employee of Mom Ops.
          </p>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Contractor:
          </p>
          <ul style={{ marginBottom: 0, paddingLeft: "1.25rem", lineHeight: 1.6 }}>
            <li>Controls their own schedule</li>
            <li>Supplies their own equipment unless otherwise stated</li>
            <li>Is responsible for their own taxes and compliance</li>
            <li>May provide services to other clients</li>
          </ul>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-md) 0" }} />

        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>4. Compensation Structure</h3>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Compensation will be governed by the active VA compensation model in effect at the time of onboarding.
          </p>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Unless otherwise agreed in writing:
          </p>
          <ul style={{ marginBottom: 0, paddingLeft: "1.25rem", lineHeight: 1.6 }}>
            <li>Payment is issued based on approved task credits</li>
            <li>Tips are paid at 98% to the Contractor (2% are processor fees)</li>
            <li>Payments are issued on the designated pay schedule</li>
          </ul>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-md) 0" }} />

        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>5. Confidentiality & Data Protection</h3>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Contractor agrees to maintain strict confidentiality of:
          </p>
          <ul style={{ marginBottom: 0, paddingLeft: "1.25rem", lineHeight: 1.6 }}>
            <li>Member data</li>
            <li>Internal processes</li>
            <li>Business systems</li>
            <li>Financial information</li>
            <li>Documents and attachments</li>
          </ul>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-md) 0" }} />

        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>6. Tools & Technology</h3>
          <p style={{ marginBottom: 0, lineHeight: 1.5 }}>
            Contractor may be provided access to certain tools under the Mom Ops Tech Bonus framework.
          </p>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-md) 0" }} />

        <section style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>7. Term & Effective Date</h3>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            This Agreement becomes effective on the Effective Date listed during onboarding.
          </p>
          <p style={{ marginBottom: "var(--space-xs)", lineHeight: 1.5 }}>
            Services begin upon task assignment following onboarding completion.
          </p>
          <p style={{ marginBottom: 0, lineHeight: 1.5 }}>
            Either party may terminate this Agreement at any time with written notice.
          </p>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border, #e5e5e5)", margin: "var(--space-md) 0" }} />

        <section style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-xs)" }}>8. Modifications</h3>
          <p style={{ marginBottom: 0, lineHeight: 1.5 }}>
            Mom Ops may update policies, operating procedures, or compensation models as the business evolves. Continued acceptance of tasks constitutes agreement to current policies.
          </p>
        </section>
      </section>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 480 }}>
        <h2 className="section-heading" style={{ marginTop: 0, marginBottom: "var(--space-md)" }}>
          Payment & contract
        </h2>
        <p className="form-note" style={{ marginBottom: "var(--space-md)" }}>
          Choose where to get paid and provide your details. Effective Date and Contract Start Date are set when you complete onboarding.
        </p>

      {error && (
        <p className="form-error" style={{ marginBottom: "var(--space-sm)" }} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-note" style={{ marginBottom: "var(--space-sm)", color: "var(--color-success, green)" }}>
          Saved.
        </p>
      )}

      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="va-payment-method">Where to get paid</label>
        <select
          id="va-payment-method"
          className="input"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="">Select...</option>
          <option value="paypal">PayPal</option>
          <option value="wise">Wise</option>
        </select>
      </div>

      {paymentMethod === "paypal" && (
        <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
          <label htmlFor="va-payment-account">PayPal email</label>
          <input
            id="va-payment-account"
            type="email"
            value={paymentAccount}
            onChange={(e) => setPaymentAccount(e.target.value)}
            className="input"
            placeholder="your@paypal.email"
          />
        </div>
      )}

      {paymentMethod === "wise" && (
        <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
          <label htmlFor="va-payment-account">Wise account (email or account details)</label>
          <input
            id="va-payment-account"
            type="text"
            value={paymentAccount}
            onChange={(e) => setPaymentAccount(e.target.value)}
            className="input"
            placeholder="Email or Wise account identifier"
          />
        </div>
      )}

      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="va-legal-name">Legal name</label>
        <input
          id="va-legal-name"
          type="text"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          className="input"
          placeholder="Full legal name"
        />
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="va-email-address">Email address</label>
        <input
          id="va-email-address"
          type="email"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          className="input"
          placeholder="e.g. jrlopezzdesigns@gmail.com"
        />
        <p className="form-note" style={{ marginTop: "var(--space-2xs)" }}>
          For contract and payment correspondence.
        </p>
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="va-address">Address</label>
        <textarea
          id="va-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input"
          rows={2}
          placeholder="Street, city, state, postal code"
        />
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label htmlFor="va-mobile-phone">Mobile phone</label>
        <input
          id="va-mobile-phone"
          type="tel"
          value={mobilePhone}
          onChange={(e) => setMobilePhone(e.target.value)}
          className="input"
          placeholder="+1 234 555 0123"
        />
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label>Effective date</label>
        <div className="input" style={{ background: "var(--color-muted-bg, #f5f5f5)", color: "var(--text-muted)" }}>
          {effectiveDate ? effectiveDate : "Auto-populated when you complete onboarding"}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
        <label>Contract start date</label>
        <div className="input" style={{ background: "var(--color-muted-bg, #f5f5f5)", color: "var(--text-muted)" }}>
          {contractStartDate ? contractStartDate : "Auto-populated when you complete onboarding"}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save payment & contract info"}
      </button>
    </form>
    </div>
  );
}
