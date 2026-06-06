import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/serwis", destination: "/oferty", permanent: true },
      { source: "/serwis/:path*", destination: "/oferty/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
