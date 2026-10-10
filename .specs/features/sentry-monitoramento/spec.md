# Monitoramento de erros com Sentry Specification

## Problem Statement

Hoje um erro em produção só aparece como `console.error(action, code)` (`src/lib/log.ts`), sem agregação, alerta nem stack trace. O app cifra os dados financeiros no navegador (AD-011) e o CSP permite só `connect-src 'self'`, então a integração precisa dar visibilidade de erros e desempenho sem enviar dados do usuário nem abrir o CSP para terceiros.

## Goals

- [ ] Erros não tratados do servidor e do navegador chegam ao projeto `anon-finance-nextjs` (org `anon-finance`) do Sentry com stack trace legível (source maps).
- [ ] Nenhum evento enviado contém dado pessoal ou financeiro: e-mail, IP, cookies, headers, corpo de requisição, mensagens de erro, breadcrumbs, valores decifrados.
- [ ] O navegador nunca fala direto com o domínio do Sentry: `connect-src` continua `'self'`.
- [ ] Sem DSN configurado (dev, testes), o Sentry fica desligado e o app funciona igual.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Session Replay | Gravaria telas com dados decifrados; contradiz AD-011 |
| Atualizar `/privacidade` para citar o Sentry | Decidido pelo usuário: a página fica como está |
| Alertas, dashboards e regras de issue no Sentry | Configuração da conta Sentry, não do código |
| Feedback widget, logs e métricas do Sentry | Não pedido |
| Substituir `logActionError` | Continua logando no console; só passa a também reportar o código (SENTRY-12) |
| Teste e2e | Suspenso (AD-005) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Escopo de captura | Servidor e navegador | Escolha do usuário | y |
| Dados do usuário | Nenhum: `sendDefaultPii` falso, sem `setUser` | Escolha do usuário; segue o espírito de `logActionError` | y |
| Extras | Source maps, tracing e página de exemplo | Escolha do usuário | y |
| Aviso em `/privacidade` | Não alterar | Escolha do usuário | y |
| Como o navegador envia eventos sem mudar o CSP | `tunnelRoute: "/monitoring"` do `withSentryConfig`; o navegador posta em `/monitoring` (mesma origem) e o servidor repassa ao Sentry | Mantém `connect-src 'self'` e evita bloqueio por ad-blockers | n |
| Rota `/monitoring` e o proxy | Pública (sem login), pois erros ocorrem também em `/login` e `/cadastro` | O proxy hoje redireciona anônimos para login | n |
| Scrubbing | Um `beforeSend` (servidor e navegador) mantém só: tipo da exceção, stack trace, rota (sem query string), release, ambiente e `tags`. Remove `message`, `exception.values[].value`, breadcrumbs, `request`, `user`, `extra`, `contexts` exceto runtime/os/browser | Mensagens de erro podem conter valores decifrados ou dados de formulário | n |
| Taxa de tracing | 10% em produção, 0 fora dela | Valor comum do Sentry; limita volume e custo | n |
| Nome das variáveis | `NEXT_PUBLIC_SENTRY_DSN` (navegador) e `SENTRY_DSN` (servidor) com o mesmo valor; `SENTRY_AUTH_TOKEN` só no build | O navegador só lê variáveis `NEXT_PUBLIC_` | n |
| Página de exemplo | `/sentry-example-page` existe só fora de produção; em produção responde 404 | O wizard a deixa pública; um botão que dispara erro em produção gera ruído | n |
| Nonce do CSP e SDK | O SDK não injeta script inline; se o build exigir, o nonce do proxy é reaproveitado | A verificar no Design contra `node_modules/next/dist/docs` e o SDK instalado | n |
| Verificação | Config e scrubbing em funções puras com teste unitário; UI por inspeção de código (AD-005) | Regra do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Erros do servidor chegam ao Sentry sem dados sensíveis ⭐ MVP

**User Story**: As a mantenedor, I want unhandled server errors reported to Sentry so that I find failures in production without reading logs.

**Why P1**: É o ganho central e a base do scrubbing.

**Acceptance Criteria**:

1. WHEN `SENTRY_DSN` is set and a Server Component, route handler or Server Action throws an unhandled error THEN the system SHALL send one event to Sentry with the exception type and stack trace.
2. WHEN the Next.js request error hook runs (`onRequestError`) THEN the system SHALL forward the error to Sentry.
3. IF `SENTRY_DSN` is empty or unset THEN the system SHALL initialize no Sentry client and send no network request to Sentry.
4. The system SHALL disable all automatic user-data collection on the server and browser runtimes (`dataCollection.userInfo` false and every other category off; `sendDefaultPii` does not exist in @sentry/nextjs 11.6.0). The proxy runs on Node in Next 16 and the app has no `runtime = "edge"` route, so no Edge config is created.
5. WHEN an event is about to be sent THEN the system SHALL remove `message`, every `exception.values[].value`, `breadcrumbs`, `request`, `user` and `extra`, and keep only exception type, stack trace, route without query string, release, environment and `tags`.
6. IF a failed Server Action is logged by `logActionError` THEN the system SHALL also report an event whose only error content is the action name and the error `code`, with no message or other property of the error; both travel as event `tags` (`action`, `code`).

**Independent Test**: Chamar o scrubber com um evento contendo e-mail, cookie, mensagem e breadcrumb e conferir que a saída só tem os campos mantidos.

---

### P1: Erros do navegador chegam ao Sentry pelo mesmo domínio ⭐ MVP

**User Story**: As a mantenedor, I want browser errors reported without opening the CSP so that the privacy posture of the app stays intact.

**Why P1**: O usuário pediu navegador; o CSP restrito é uma garantia do projeto (SIGILO-28).

**Acceptance Criteria**:

1. WHEN `NEXT_PUBLIC_SENTRY_DSN` is set and a client component throws an unhandled error or a render error reaches the global error boundary THEN the system SHALL send one scrubbed event through `/monitoring`.
2. The system SHALL keep `connect-src` equal to `'self'` in the CSP built by `buildCsp`.
3. WHEN an anonymous visitor's browser posts to `/monitoring` THEN the system SHALL answer without redirecting to `/login` (the path is excluded from the proxy matcher).
4. WHEN a render error reaches `global-error` THEN the system SHALL show a recovery screen in pt-BR with a "Tentar novamente" button and SHALL NOT show the error message.
5. The system SHALL NOT enable Session Replay or capture of console output, DOM breadcrumbs or network breadcrumbs.

**Independent Test**: `buildCsp(nonce, false)` ainda contém `connect-src 'self'` e nenhum domínio `sentry.io`; `decideRoute("/monitoring", false)` devolve `next`.

---

### P2: Stack traces legíveis via source maps

**User Story**: As a mantenedor, I want readable stack traces so that I find the failing line.

**Why P2**: Sem isso os traces vêm minificados, mas a captura funciona.

**Acceptance Criteria**:

1. WHEN `next build` runs with `SENTRY_AUTH_TOKEN`, org `anon-finance` and project `anon-finance-nextjs` THEN the system SHALL upload the source maps to Sentry.
2. IF `SENTRY_AUTH_TOKEN` is missing THEN the build SHALL finish successfully without uploading and without failing.
3. WHEN source maps are uploaded THEN the system SHALL NOT serve `.map` files publicly from the app.
4. The system SHALL read org, project and token only from environment variables, never from committed files.

**Independent Test**: A função que monta as opções de `withSentryConfig` devolve `silent`/sem upload quando o token falta, e inclui org e projeto quando ele existe.

---

### P2: Tracing de desempenho com amostragem

**User Story**: As a mantenedor, I want sampled performance traces so that I see slow pages and actions.

**Why P2**: Pedido, mas não bloqueia a captura de erros.

**Acceptance Criteria**:

1. WHILE `NODE_ENV` is `production`, the system SHALL set `tracesSampleRate` to 0.1 on server and browser.
2. WHILE `NODE_ENV` is not `production`, the system SHALL set `tracesSampleRate` to 0.
3. WHEN a transaction is about to be sent THEN the system SHALL strip the query string and fragment from its URL and name.
4. The system SHALL NOT attach request bodies, cookies or headers to transactions.

**Independent Test**: A função de configuração devolve 0.1 com `NODE_ENV=production` e 0 nos demais valores; o scrubber de transação remove `?mes=2026-10` da URL.

---

### P3: Página de exemplo para validar a integração

**User Story**: As a mantenedor, I want a page that triggers a test error so that I confirm Sentry works after deploy or setup.

**Why P3**: Conveniência de verificação; o wizard a gera.

**Acceptance Criteria**:

1. WHILE `NODE_ENV` is not `production`, WHEN a visitor opens `/sentry-example-page` THEN the system SHALL render a page with buttons that throw a client error and a server error.
2. WHILE `NODE_ENV` is `production`, WHEN a request opens `/sentry-example-page` or its API route THEN the system SHALL respond 404.
3. WHILE `NODE_ENV` is not `production`, the page SHALL be reachable without login.

**Independent Test**: A função de decisão de rota trata `/sentry-example-page` como pública fora de produção; em produção o handler responde 404.

---

## Edge Cases

- IF the Sentry service is unreachable or rejects an event THEN the system SHALL keep serving the request normally and SHALL NOT surface any error to the user.
- IF `NEXT_PUBLIC_SENTRY_DSN` is set but `SENTRY_DSN` is not (or the reverse) THEN the system SHALL initialize only the runtime whose DSN is set.
- IF an event arrives at `beforeSend` with a malformed shape (no `exception`) THEN the system SHALL still drop the sensitive fields and SHALL NOT throw.
- WHEN the error is an expected validation failure returned as an `ActionResult` THEN the system SHALL NOT send an event.
- The system SHALL NOT run Sentry initialization in the Vitest unit and integration projects.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SENTRY-01 | P1: servidor — captura de erro não tratado | - | Verified |
| SENTRY-02 | P1: servidor — `onRequestError` | - | Verified |
| SENTRY-03 | P1: servidor — desligado sem DSN | - | Verified |
| SENTRY-04 | P1: servidor — `sendDefaultPii` falso | - | Verified |
| SENTRY-05 | P1: servidor — scrubbing do evento | - | Verified |
| SENTRY-06 | P1: servidor — `logActionError` reporta só ação e código | - | Verified |
| SENTRY-07 | P1: navegador — captura via `/monitoring` | - | Verified |
| SENTRY-08 | P1: navegador — `connect-src 'self'` preservado | - | Verified |
| SENTRY-09 | P1: navegador — `/monitoring` pública | - | Verified |
| SENTRY-10 | P1: navegador — tela `global-error` em pt-BR | - | Verified |
| SENTRY-11 | P1: navegador — sem Replay nem breadcrumbs de console/DOM/rede | - | Verified |
| SENTRY-12 | P2: source maps enviados no build | - | Verified |
| SENTRY-13 | P2: build não falha sem token | - | Verified |
| SENTRY-14 | P2: `.map` não servido publicamente | - | Verified |
| SENTRY-15 | P2: credenciais só em variáveis de ambiente | - | Verified |
| SENTRY-16 | P2: taxa de tracing 0.1 em produção | - | Verified |
| SENTRY-17 | P2: taxa de tracing 0 fora de produção | - | Verified |
| SENTRY-18 | P2: transação sem query string nem fragmento | - | Verified |
| SENTRY-19 | P2: transação sem corpo, cookies nem headers | - | Verified |
| SENTRY-20 | P3: página de exemplo fora de produção | - | Verified |
| SENTRY-21 | P3: página de exemplo responde 404 em produção | - | Verified |
| SENTRY-22 | P3: página de exemplo pública fora de produção | - | Verified |

**Coverage:** 22 total, 22 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Com DSN configurado, o botão de erro da página de exemplo gera uma issue no Sentry com stack trace legível, sem e-mail, IP, cookie nem mensagem.
- [ ] `buildCsp` continua sem nenhum domínio externo.
- [ ] `npm run typecheck`, `npm run lint`, `test:unit` e `test:int` passam sem DSN definido.
- [ ] `next build` termina com sucesso com e sem `SENTRY_AUTH_TOKEN`.
