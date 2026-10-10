# Monitoramento de erros com Sentry Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/sentry-monitoramento/design.md`
**Spec**: `.specs/features/sentry-monitoramento/spec.md`
**Status**: In Progress

**Ordem:** T1 instala o SDK e confirma a API real contra os tipos (a documentação web não confirmou três pontos); T2 cria o núcleo puro testável; a fase 2 liga servidor, navegador, tela de erro e `logActionError`; a fase 3 mexe em CSP, proxy, rotas de exemplo e build. Cada commit compila e passa o gate.

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de escrever. T4 e T5 seguem `instrumentation.md` e `instrumentation-client.md`; T6 segue a convenção `global-error` de `error.md`.

**Ambiente:** `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH` antes de qualquer `npm`. Há arquivos não rastreados (`docs/marca/`); cada commit inclui só os arquivos da task e o status do `tasks.md`. Nenhum envio real ao Sentry nos testes; o SDK fica sem DSN. Sem `git push` (bloqueio de raio de ação).

**Verificação manual (AD-005, sem e2e):** o Verifier confere por inspeção de código (`file:line`) e, com DSN no `.env`, o botão de `/sentry-example-page` gera uma issue sem e-mail, IP, cookie nem mensagem. Escopo mapeado em `AD-013`, a registrar em `STATE.md` na aprovação.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` em `src/**/*.test.ts` e `integration` em `src/**/*.int.test.ts`), AD-005 (e2e suspenso), `.specs/STATE.md`. Lição L-002 (texto exato em mensagens): as mensagens da tela de erro estão literais no design e na task T6.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Funções puras de `src/lib/**` (options, route-decision, security-headers, log) | unit | Todos os ramos; 1:1 com os AC; cada caso de borda listado na spec | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Route handler (`src/app/api/**/route.ts`) | unit | Produção responde 404; outro ambiente lança | `src/app/api/**/route.test.ts` | `npm run test:unit` |
| Componentes e páginas (`src/app/**`, `global-error`) | none | Sem teste de componente no projeto; evidência por inspeção (`file:line`) (AD-005) | - | gate de build |
| Config e instrumentação (`instrumentation*.ts`, `sentry.server.config.ts`, `next.config.ts`, `proxy.ts`, `.env.example`) | none | A lógica fica em `options.ts` (testado); o arquivo só liga | - | gate de build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks com teste unitário | `npm run test:unit` |
| Full | Sem integração nesta feature; igual ao Quick | `npm run test:unit` |
| Build | Tasks sem teste e fim de fase | `npm run typecheck && npm run lint && npm run test:unit` (T13 acrescenta `npm run build`) |

---

## Execution Plan

### Phase 1: Fundação

```
T1 → T2
```

### Phase 2: Captura

```
T3 → T4 → T5 → T6 → T7
```

### Phase 3: Rotas, CSP e build

```
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

---

## Task Breakdown

### T1: Instalar o SDK e confirmar a API real

**What**: Instalar `@sentry/nextjs`, ler os tipos do pacote e corrigir no `design.md` os nomes de opção que a documentação web não confirmou.
**Where**: `package.json`
**Depends on**: None
**Reuses**: `design.md` seção Risks & Concerns
**Requirement**: SENTRY-12, SENTRY-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `@sentry/nextjs` em `dependencies` e `package-lock.json` atualizado
- [x] `design.md` Risks registra, a partir dos tipos instalados: nome da opção que apaga `.map` após o upload, existência de `dataCollection`, assinatura de `captureRequestError`, e se o upload funciona com Turbopack
- [x] Discrepância com o design vira ajuste no `design.md` antes da T2
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `chore(sentry): add the Next.js SDK`

**Status**: ✅ Done

---

### T2: Criar o módulo de opções e scrubbing

**What**: Criar `options.ts` com `sentryInitOptions`, `scrubEvent`, `scrubTransaction` e `sentryBuildOptions`, mais o teste.
**Where**: `src/lib/sentry/options.ts`
**Depends on**: T1
**Reuses**: padrão de funções puras de `src/lib/security-headers.ts`
**Requirement**: SENTRY-03, SENTRY-04, SENTRY-05, SENTRY-11, SENTRY-13, SENTRY-15, SENTRY-16, SENTRY-17, SENTRY-18, SENTRY-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `enabled` falso sem DSN; `sendDefaultPii` falso; `dataCollection` com todas as categorias desligadas; `maxBreadcrumbs` 0 e `beforeBreadcrumb` nulo
- [x] `tracesSampleRate` 0.1 com `NODE_ENV=production` e 0 nos demais
- [x] `scrubEvent` com evento contendo e-mail, cookie, mensagem, breadcrumb, `request`, `user`, `extra` devolve só tipo, stack trace, rota sem query, release, ambiente e `tags`; evento sem `exception` não lança; falha interna devolve `null`
- [x] `scrubTransaction` remove `?mes=2026-10` e `#x` do nome e remove `request`
- [x] `sentryBuildOptions` traz org `anon-finance`, projeto `javascript-nextjs` e `tunnelRoute` `/monitoring`; sem token não há upload e o build não falha; token só vem do argumento
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 10 ou mais testes novos passam, nenhum removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(sentry): add the options and scrubbing module`

**Status**: ✅ Done

---

### T3: Init do servidor

**What**: Criar a config do servidor que chama `Sentry.init` com `sentryInitOptions` e `SENTRY_DSN`.
**Where**: `src/sentry.server.config.ts`
**Depends on**: None (fase 1 concluída)
**Reuses**: Sentry options
**Requirement**: SENTRY-01, SENTRY-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Chama `Sentry.init(sentryInitOptions({ dsn: process.env.SENTRY_DSN, nodeEnv: process.env.NODE_ENV }))` e nada mais
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(sentry): initialize Sentry on the server`

**Status**: ✅ Done

---

### T4: Registrar a instrumentação e o hook de erro

**What**: Criar `instrumentation.ts` com `register` (importa a config só em `nodejs`) e `onRequestError = Sentry.captureRequestError`.
**Where**: `src/instrumentation.ts`
**Depends on**: T3
**Reuses**: `node_modules/next/dist/docs/.../instrumentation.md`
**Requirement**: SENTRY-01, SENTRY-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `register` importa `./sentry.server.config` apenas com `NEXT_RUNTIME === "nodejs"`
- [x] `onRequestError` exportado
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(sentry): report unhandled request errors`

**Status**: ✅ Done

---

### T5: Init do navegador

**What**: Criar `instrumentation-client.ts` com `Sentry.init` (sem Replay nem Feedback) e `onRouterTransitionStart`.
**Where**: `src/instrumentation-client.ts`
**Depends on**: T4
**Reuses**: Sentry options
**Requirement**: SENTRY-07, SENTRY-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Usa `NEXT_PUBLIC_SENTRY_DSN` e `sentryInitOptions`
- [x] Nenhuma integração de Replay ou Feedback importada
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(sentry): initialize Sentry in the browser`

**Status**: ✅ Done

---

### T6: Tela de erro global

**What**: Criar `global-error.tsx` que captura o erro e mostra recuperação em pt-BR sem exibir a mensagem.
**Where**: `src/app/global-error.tsx`
**Depends on**: T5
**Reuses**: `src/components/ui/button.tsx`, `src/lib/brand.ts`
**Requirement**: SENTRY-07, SENTRY-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `useEffect` chama `Sentry.captureException(error)`
- [x] Mostra "Tentar novamente" que chama `reset()` e não renderiza `error.message`
- [x] Define `<html lang="pt-BR">` e `<body>` próprios
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(sentry): add the global error screen`

**Status**: ✅ Done (SPEC_DEVIATION: usa `retry()` em vez de `reset()`, conforme `error.md` do Next 16.3)

---

### T7: Reportar falhas de Server Action

**What**: Fazer `logActionError` enviar ao Sentry uma exceção sintética com as tags `action` e `code`, mantendo o `console.error`.
**Where**: `src/lib/log.ts`
**Depends on**: T6
**Reuses**: extração de `code` já existente; `src/lib/log.test.ts`
**Requirement**: SENTRY-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `captureException` recebe `new Error("server_action_failed")` e `tags` `{ action, code }`; o erro original nunca é passado
- [x] Os 3 testes existentes continuam passando sem alteração
- [x] Teste novo afirma as tags e que `detail` e `message` do erro original não aparecem nos argumentos
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 3 existentes mais 2 novos ou mais passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(sentry): report failed server actions by action and code`

**Status**: ✅ Done

---

### T8: Liberar o túnel no CSP estático

**What**: Adicionar `/monitoring/:path*` a `PATHS_OUTSIDE_PROXY` e ao teste.
**Where**: `src/lib/security-headers.ts`
**Depends on**: None (fase 2 concluída)
**Reuses**: `security-headers.test.ts`
**Requirement**: SENTRY-08, SENTRY-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `securityHeaderRules` inclui o CSP estático para `/monitoring/:path*`
- [x] Teste afirma que `buildCsp(nonce, false)` ainda contém `connect-src 'self'` e nenhum host externo
- [x] Gate check passes: `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(sentry): serve the tunnel route with the static CSP`

**Status**: ✅ Done

---

### T9: Excluir o túnel do proxy

**What**: Acrescentar `monitoring` ao matcher do proxy, igual a `api/auth`.
**Where**: `src/proxy.ts`
**Depends on**: T8
**Reuses**: matcher atual
**Requirement**: SENTRY-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O matcher exclui `monitoring` (ao lado de `api/auth`), e a lista em `PATHS_OUTSIDE_PROXY` concorda
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(sentry): keep the tunnel route outside the proxy`

---

### T10: Tornar públicas as rotas de exemplo

**What**: Incluir `/sentry-example-page` e `/api/sentry-example-api` em `PUBLIC_PATHS` e cobrir no teste.
**Where**: `src/lib/route-decision.ts`
**Depends on**: T9
**Reuses**: `route-decision.test.ts`
**Requirement**: SENTRY-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `decideRoute` sem sessão devolve `next` com `noStore` falso para as duas rotas
- [ ] Os testes existentes continuam passando
- [ ] Gate check passes: `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(sentry): let the example routes skip the login redirect`

---

### T11: Rota de API de exemplo

**What**: Criar o route handler que lança erro de servidor fora de produção e responde 404 em produção, com teste.
**Where**: `src/app/api/sentry-example-api/route.ts`
**Depends on**: T10
**Reuses**: `src/app/api/auth`
**Requirement**: SENTRY-20, SENTRY-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com `NODE_ENV=production` responde 404 sem lançar
- [ ] Com outro valor lança o erro de exemplo
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: 2 testes novos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(sentry): add the example API route`

---

### T12: Página de exemplo

**What**: Criar a página com dois botões (erro de cliente e de servidor) que chama `notFound()` em produção.
**Where**: `src/app/sentry-example-page/page.tsx`
**Depends on**: T11
**Reuses**: `Button`, `Card`
**Requirement**: SENTRY-20, SENTRY-21, SENTRY-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Em produção chama `notFound()`; fora dela mostra os dois botões
- [ ] Textos em pt-BR
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(sentry): add the example page`

---

### T13: Envolver o next.config com o Sentry

**What**: Aplicar `withSentryConfig(nextConfig, sentryBuildOptions(...))` com upload de source maps e remoção dos `.map` após o envio.
**Where**: `next.config.ts`
**Depends on**: T12
**Reuses**: `sentryBuildOptions`
**Requirement**: SENTRY-12, SENTRY-13, SENTRY-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `next build` termina com sucesso sem `SENTRY_AUTH_TOKEN`
- [ ] Opção que apaga `.map` após upload usa o nome confirmado na T1
- [ ] `headers()` de segurança continua exportado igual
- [ ] Gate check passes: `npm run build && npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(sentry): upload source maps and tunnel browser events`

---

### T14: Documentar as variáveis de ambiente

**What**: Adicionar `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` ao `.env.example`, sem valores.
**Where**: `.env.example`
**Depends on**: T13
**Reuses**: `.env.example` atual
**Requirement**: SENTRY-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] As três variáveis aparecem com comentário e sem valor (o DSN real fica só no `.env` e na Vercel)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `docs(sentry): document the Sentry environment variables`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2
Phase 2:  T3 ------→ T4 ------→ T5 ------→ T6 ------→ T7
Phase 3:  T8 ------→ T9 ------→ T10 -----→ T11 -----→ T12 -----→ T13 -----→ T14
```
