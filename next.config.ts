import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Rewrites for static Sky Lab (Stellarium engine)
  async rewrites() {
    return [
      {
        source: "/sky-lab",
        destination: "/sky-lab/index.html",
      },
      {
        source: "/sky-lab/",
        destination: "/sky-lab/index.html",
      },
      // Stellarium engine hardcodes these paths in the bundled JS
      {
        source: "/static/:path*",
        destination: "/sky-lab/static/:path*",
      },
    ];
  },
};

export default nextConfig;
