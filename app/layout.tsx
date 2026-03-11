import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";
import { AirbrakeProvider } from "./components/AirbrakeProvider";
import { Hotjar } from "./components/Hotjar";
import { MetaPixel } from "./components/MetaPixel";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {process.env.NODE_ENV === "production" && <Hotjar />}
        <MetaPixel />
        <AirbrakeProvider>{children}</AirbrakeProvider>
      </body>
    </html>
  );
}
