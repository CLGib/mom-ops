import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              margin: 0,
            }}
          >
            I build things. Then I tell you exactly how I built them.
          </p>
          <div className="footer-links">
            <a href="/#newsletter">Newsletter</a>
            <a href="mailto:chrissy@themomops.com">Say hi</a>
            <Link href="/login">Member login</Link>
          </div>
        </div>
        <p className="footer-copy">© {2026} Mom Ops LLC. Built with curiosity and duct tape.</p>
      </div>
    </footer>
  );
}
