import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { sentryBuildOptions } from "./src/lib/sentry/options";
import { securityHeaderRules } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  experimental: {
    // The default is 1MB; the encrypted migration payload needs more.
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return securityHeaderRules({ NODE_ENV: process.env.NODE_ENV });
  },
};

// Sem SENTRY_AUTH_TOKEN o build não envia source maps e não falha.
export default withSentryConfig(
  nextConfig,
  sentryBuildOptions({ token: process.env.SENTRY_AUTH_TOKEN, ci: Boolean(process.env.CI) }),
);
