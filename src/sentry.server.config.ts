import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/sentry/options";

Sentry.init(sentryInitOptions({ dsn: process.env.SENTRY_DSN, nodeEnv: process.env.NODE_ENV }));
