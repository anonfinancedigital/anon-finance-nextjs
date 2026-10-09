import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  experimental: {
    // The default is 1MB; the encrypted migration payload needs more.
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders({ NODE_ENV: process.env.NODE_ENV }) }];
  },
};

export default nextConfig;
