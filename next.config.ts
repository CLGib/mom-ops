import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
  async redirects() {
    // Enforce canonical domain: www -> apex so auth cookies are on one host
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.themomops.com" }],
        destination: "https://themomops.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
