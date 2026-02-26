import type { Metadata } from "next";
import { DM_Serif_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./landing.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-display",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://themomops.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mom Ops",
  description: "Virtual assistant support built by moms. Systems, support, and a little less chaos.",
  openGraph: {
    images: ["/assets/got-this.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/assets/got-this.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${sourceSans.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
