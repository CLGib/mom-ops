import CheckoutButton from "./CheckoutButton";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <a href="#" className="logo">
              Mom Ops
            </a>
            <p className="footer-product">
              Structured virtual assistant support for moms.
            </p>
          </div>
          <div className="footer-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#credits">Task Credits</a>
            <a href="#faq">FAQ</a>
            <CheckoutButton className="footer-cta-button">
              Get Started
            </CheckoutButton>
          </div>
        </div>
        <p className="footer-copy">&copy; Mom Ops. All rights reserved.</p>
      </div>
    </footer>
  );
}
