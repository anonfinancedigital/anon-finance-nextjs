// Tudo que decide o que sai do app para o Sentry. Só tipos do SDK são importados,
// então o módulo roda no Vitest sem inicializar o Sentry.
import type { ErrorEvent, Event, NodeOptions } from "@sentry/nextjs";
import type { SentryBuildOptions } from "@sentry/nextjs/config";

// O pacote não reexporta este tipo; derivamos da assinatura pública.
export type TransactionEvent = Parameters<NonNullable<NodeOptions["beforeSendTransaction"]>>[0];

const KEPT_CONTEXTS = ["runtime", "os", "browser"] as const;

// Campos técnicos que o envelope precisa para aceitar o evento; nenhum carrega dado do usuário.
const ENVELOPE_FIELDS = [
  "event_id",
  "timestamp",
  "platform",
  "level",
  "type",
  "sdk",
  "debug_meta",
  "release",
  "environment",
  "tags",
] as const;

const stripQuery = (value: string): string => value.split(/[?#]/)[0];

type Exception = NonNullable<NonNullable<Event["exception"]>["values"]>[number];

function scrubException(ex: Exception): Exception {
  const frames = ex.stacktrace?.frames?.map((frame) => {
    const copy = { ...frame };
    delete copy.vars;
    return copy;
  });
  return {
    type: ex.type,
    ...(ex.mechanism
      ? { mechanism: { type: ex.mechanism.type, handled: ex.mechanism.handled } }
      : {}),
    ...(frames ? { stacktrace: { frames } } : {}),
  };
}

// Falha fechado: qualquer erro interno descarta o evento em vez de deixá-lo passar.
export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  try {
    const out: Record<string, unknown> = {};
    for (const key of ENVELOPE_FIELDS) {
      if (event[key] !== undefined) out[key] = event[key];
    }
    if (event.transaction) out.transaction = stripQuery(event.transaction);

    const contexts: Record<string, unknown> = {};
    for (const key of KEPT_CONTEXTS) {
      if (event.contexts?.[key]) contexts[key] = event.contexts[key];
    }
    if (Object.keys(contexts).length > 0) out.contexts = contexts;

    const values = event.exception?.values;
    if (values) out.exception = { values: values.map(scrubException) };

    return out as unknown as ErrorEvent;
  } catch {
    return null;
  }
}

export function scrubTransaction(event: TransactionEvent): TransactionEvent | null {
  try {
    const out: TransactionEvent = { ...event };
    delete out.request;
    delete out.user;
    delete out.breadcrumbs;
    delete out.extra;
    if (out.transaction) out.transaction = stripQuery(out.transaction);
    if (out.spans) {
      out.spans = out.spans.map((span) => {
        // `data` leva atributos como `url.full`, que podem trazer query string.
        const copy = { ...span, data: {} };
        if (copy.description) copy.description = stripQuery(copy.description);
        return copy;
      });
    }
    if (out.contexts?.trace) {
      const trace = { ...out.contexts.trace };
      delete trace.data;
      out.contexts = { ...out.contexts, trace };
    }
    return out;
  } catch {
    return null;
  }
}

export function sentryInitOptions(env: { dsn?: string; nodeEnv?: string }): NodeOptions {
  return {
    dsn: env.dsn,
    enabled: Boolean(env.dsn),
    // O SDK 11 não tem `sendDefaultPii`; `dataCollection` o substitui (SPEC_DEVIATION em SENTRY-04, ver design.md).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    // No SDK 11 o padrão é `stream`, que ignora `beforeSendTransaction`; sem isto o scrubTransaction não roda.
    traceLifecycle: "static",
    tracesSampleRate: env.nodeEnv === "production" ? 0.1 : 0,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubTransaction,
  };
}

// O token só vem do argumento, nunca de process.env aqui.
export function sentryBuildOptions(env: { token?: string; ci?: boolean }): SentryBuildOptions {
  return {
    org: "anon-finance",
    project: "anon-finance-nextjs",
    tunnelRoute: "/monitoring",
    silent: !env.ci,
    telemetry: false,
    authToken: env.token,
    sourcemaps: {
      ...(env.token ? {} : { disable: "disable-upload" as const }),
      deleteSourcemapsAfterUpload: true,
    },
  };
}
