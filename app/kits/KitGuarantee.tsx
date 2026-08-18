/**
 * Trust signal shown on every product: a no-questions-asked money-back guarantee.
 * Refund requests route straight to Chrissy so it stays personal and low-friction.
 */
export default function KitGuarantee({
  align = "left",
}: {
  align?: "left" | "center";
}) {
  return (
    <p className="form-note kit-guarantee" style={{ textAlign: align }}>
      <strong>100% money-back guarantee.</strong> Not for you?{" "}
      <a href="mailto:chrissy@themomops.com?subject=Refund%20request" className="link">
        Request a refund
      </a>
      , NBD.
    </p>
  );
}
