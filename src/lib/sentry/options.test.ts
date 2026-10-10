import type { ErrorEvent } from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type TransactionEvent,
  scrubEvent,
  scrubTransaction,
  sentryBuildOptions,
  sentryInitOptions,
} from "./options";

const EMAIL = "maria@example.com";
const COOKIE = "session=abc123secret";
const MESSAGE = "Saldo de R$ 1.234,56 inválido";

const fullEvent = (): ErrorEvent =>
  ({
    type: undefined,
    event_id: "e1",
    timestamp: 1,
    platform: "javascript",
    level: "error",
    message: MESSAGE,
    release: "rel-1",
    environment: "production",
    server_name: "host-interno",
    transaction: "/dashboard?mes=2026-10#x",
    tags: { action: "createAccount", code: "invalid" },
    user: { email: EMAIL, ip_address: "10.0.0.9" },
    extra: { form: { email: EMAIL } },
    breadcrumbs: [{ message: `clicou em ${EMAIL}` }],
    request: {
      url: "https://app.test/dashboard?mes=2026-10",
      cookies: { session: COOKIE },
      headers: { cookie: COOKIE },
      data: { email: EMAIL },
    },
    contexts: {
      runtime: { name: "node", version: "20" },
      os: { name: "Linux" },
      browser: { name: "Chrome" },
      device: { model: "Pixel" },
      culture: { locale: "pt-BR" },
      state: { email: EMAIL },
    },
    exception: {
      values: [
        {
          type: "TypeError",
          value: `falhou para ${EMAIL} com ${MESSAGE}`,
          stacktrace: {
            frames: [
              {
                filename: "app/page.js",
                function: "render",
                lineno: 10,
                vars: { email: EMAIL },
              },
            ],
          },
        },
      ],
    },
  }) as unknown as ErrorEvent;

describe("sentryInitOptions", () => {
  it("stays disabled without a DSN", () => {
    expect(sentryInitOptions({ nodeEnv: "production" }).enabled).toBe(false);
    expect(sentryInitOptions({ dsn: "", nodeEnv: "production" }).enabled).toBe(false);
  });

  it("enables with a DSN and passes it through", () => {
    const opts = sentryInitOptions({ dsn: "https://k@o.ingest.sentry.io/1", nodeEnv: "production" });
    expect(opts.enabled).toBe(true);
    expect(opts.dsn).toBe("https://k@o.ingest.sentry.io/1");
  });

  it("turns every data collection category off", () => {
    const dc = sentryInitOptions({}).dataCollection;
    expect(dc).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      httpBodies: [],
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    });
  });

  it("collects no breadcrumbs", () => {
    const opts = sentryInitOptions({});
    expect(opts.maxBreadcrumbs).toBe(0);
    expect(opts.beforeBreadcrumb?.({ message: "x" })).toBeNull();
  });

  it("samples 10% of traces in production and none elsewhere", () => {
    expect(sentryInitOptions({ nodeEnv: "production" }).tracesSampleRate).toBe(0.1);
    expect(sentryInitOptions({ nodeEnv: "development" }).tracesSampleRate).toBe(0);
    expect(sentryInitOptions({ nodeEnv: "test" }).tracesSampleRate).toBe(0);
    expect(sentryInitOptions({}).tracesSampleRate).toBe(0);
  });

  it("wires the scrubbers", () => {
    const opts = sentryInitOptions({});
    expect(opts.beforeSend).toBe(scrubEvent);
    expect(opts.beforeSendTransaction).toBe(scrubTransaction);
  });
});

describe("scrubEvent", () => {
  it("keeps only exception type, stack trace, route without query, release, environment and tags", () => {
    const out = scrubEvent(fullEvent());
    expect(out).not.toBeNull();
    expect(out?.transaction).toBe("/dashboard");
    expect(out?.release).toBe("rel-1");
    expect(out?.environment).toBe("production");
    expect(out?.tags).toEqual({ action: "createAccount", code: "invalid" });
    expect(out?.exception?.values).toHaveLength(1);
    const value = out?.exception?.values?.[0];
    expect(value?.type).toBe("TypeError");
    expect(value?.value).toBeUndefined();
    expect(value?.stacktrace?.frames?.[0]).toMatchObject({
      filename: "app/page.js",
      function: "render",
      lineno: 10,
    });
  });

  it("removes message, breadcrumbs, request, user, extra and local variables", () => {
    const out = scrubEvent(fullEvent());
    expect(out).not.toHaveProperty("message");
    expect(out).not.toHaveProperty("breadcrumbs");
    expect(out).not.toHaveProperty("request");
    expect(out).not.toHaveProperty("user");
    expect(out).not.toHaveProperty("extra");
    expect(out?.exception?.values?.[0]?.stacktrace?.frames?.[0]).not.toHaveProperty("vars");
  });

  it("leaves no trace of e-mail, cookie or message text anywhere in the output", () => {
    const serialized = JSON.stringify(scrubEvent(fullEvent()));
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain("abc123secret");
    expect(serialized).not.toContain("R$ 1.234,56");
    expect(serialized).not.toContain("10.0.0.9");
    expect(serialized).not.toContain("host-interno");
  });

  it("keeps only the runtime, os and browser contexts", () => {
    const out = scrubEvent(fullEvent());
    expect(Object.keys(out?.contexts ?? {}).sort()).toEqual(["browser", "os", "runtime"]);
  });

  it("does not throw on an event without exception and still drops sensitive fields", () => {
    const event = { message: MESSAGE, user: { email: EMAIL }, tags: { a: "b" } } as unknown as ErrorEvent;
    const out = scrubEvent(event);
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty("message");
    expect(out).not.toHaveProperty("user");
    expect(out?.tags).toEqual({ a: "b" });
  });

  it("fails closed: returns null when scrubbing throws", () => {
    const event = fullEvent();
    Object.defineProperty(event, "exception", {
      get() {
        throw new Error("boom");
      },
    });
    expect(scrubEvent(event)).toBeNull();
  });
});

describe("scrubTransaction", () => {
  const tx = (): TransactionEvent =>
    ({
      type: "transaction",
      transaction: "/dashboard?mes=2026-10#x",
      request: {
        url: "https://app.test/dashboard?mes=2026-10#x",
        cookies: { session: COOKIE },
        headers: { cookie: COOKIE },
        data: { email: EMAIL },
      },
      user: { email: EMAIL },
      tags: { a: "b" },
    }) as unknown as TransactionEvent;

  it("strips query string and fragment from the name", () => {
    expect(scrubTransaction(tx())?.transaction).toBe("/dashboard");
  });

  it("removes request (url, cookies, headers and body) and user", () => {
    const out = scrubTransaction(tx());
    expect(out).not.toHaveProperty("request");
    expect(out).not.toHaveProperty("user");
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain("mes=2026-10");
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain("abc123secret");
  });

  it("strips query string and fragment from the root span name", () => {
    const event = tx();
    (event as unknown as { spans: unknown[] }).spans = [
      { description: "GET /api/x?mes=2026-10#y", span_id: "s" },
    ];
    const out = scrubTransaction(event);
    expect(JSON.stringify(out)).not.toContain("mes=2026-10");
  });
});

describe("sentryBuildOptions", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("carries org, project and the tunnel route", () => {
    const opts = sentryBuildOptions({ token: "t" });
    expect(opts.org).toBe("anon-finance");
    expect(opts.project).toBe("anon-finance-nextjs");
    expect(opts.tunnelRoute).toBe("/monitoring");
  });

  it("uploads and deletes the maps afterwards when a token is given", () => {
    const opts = sentryBuildOptions({ token: "t" });
    expect(opts.authToken).toBe("t");
    expect(opts.sourcemaps?.disable).toBeUndefined();
    expect(opts.sourcemaps?.deleteSourcemapsAfterUpload).toBe(true);
  });

  it("does not upload and does not fail without a token", () => {
    const opts = sentryBuildOptions({});
    expect(opts.authToken).toBeUndefined();
    expect(opts.sourcemaps?.disable).toBe("disable-upload");
  });

  it("takes the token only from the argument, never from the environment", () => {
    vi.stubEnv("SENTRY_AUTH_TOKEN", "from-env");
    const opts = sentryBuildOptions({});
    expect(opts.authToken).toBeUndefined();
    expect(JSON.stringify(opts)).not.toContain("from-env");
  });

  it("is quiet outside CI and verbose in CI", () => {
    expect(sentryBuildOptions({}).silent).toBe(true);
    expect(sentryBuildOptions({ ci: true }).silent).toBe(false);
  });
});
