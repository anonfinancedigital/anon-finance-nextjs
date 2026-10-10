import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/sentry/options";

// Sem integrações de Replay nem Feedback; o envio passa pelo túnel /monitoring (next.config).
Sentry.init(
  sentryInitOptions({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    nodeEnv: process.env.NODE_ENV,
  }),
);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
