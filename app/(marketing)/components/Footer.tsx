import CheckoutButton from "./CheckoutButton";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <a href="#" className="logo">
              Mom Ops, LLC
            </a>
            <p className="footer-product">
              An operating system for modern family life. Built by moms.
            </p>
          </div>
          <div className="footer-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#playbooks">Playbooks</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="mailto:support@themomops.com">Contact</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="https://www.instagram.com/momopsassist/?hl=en" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://www.facebook.com/profile.php?id=61585808027157" target="_blank" rel="noopener noreferrer">Facebook</a>
            <CheckoutButton className="footer-cta-button">
              Get Started
            </CheckoutButton>
          </div>
        </div>
        <p className="footer-copy">
          Customer service:{" "}
          <a href="mailto:support@themomops.com" className="footer-contact-email">
            support@themomops.com
          </a>
        </p>
        <p className="footer-copy">&copy; Mom Ops, LLC. All rights reserved.</p>
      </div>
    </footer>
  );
}
