# Hospedagem gratuita Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/hospedagem-gratuita/spec.md`
**Design**: skipped (mudanças diretas, sem decisão de arquitetura nova)
**Status**: Draft

Antes de escrever código de rota ou de deploy, ler o guia de route handlers em `node_modules/next/dist/docs/` (regra do AGENTS.md).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (e2e suspenso, AD-005; unit/integration obrigatórios), `vitest.config.ts` (projetos `unit` e `integration`), `package.json` scripts.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / função pura (`src/lib/**`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Route handler (`src/app/api/**`) | unit | Status, corpo e cabeçalho; ausência de import do banco | `src/app/api/**/route.test.ts` | `npm run test:unit` |
| Server Action (`src/actions/**`) | integration | Caminho feliz + cada ramo de falha do spec, contra banco de teste | `src/actions/**/*.int.test.ts` | `npm run test:int` |
| Workflow do GitHub Actions (`.github/workflows/**`) | unit | Um teste por AC estrutural (cron, gatilhos, flags, retenção, segredos), lendo o arquivo | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Config / wiring (`src/lib/db/client.ts`) | none | - (gate de build apenas) | - | gate de build |
| Docs | none | - | - | gate de build |
| UI / e2e | none | Suspenso (AD-005) | - | - |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Integration tests usam um banco `*_test` privado via `DATABASE_URL` e Node 20 no PATH (memória do projeto).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run test:unit` |
| Full | Tasks com teste de integração | `npm run test:unit && npm run test:int` |
| Build | Fim de fase, wiring e docs | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Pool e health check

```
T1 → T2 → T3 → T4
```

### Phase 2: URL pública do link de recuperação

```
T5 → T6
```

### Phase 3: Backup e docs

```
T7 → T8
```

---

## Task Breakdown

### T1: Função pura de opções do pool

**What**: Criar `poolOptions(env)` que devolve `connectionString`, `max` (3 com `VERCEL` não vazio, senão 10) e `idleTimeoutMillis` 10000.
**Where**: `src/lib/db/pool-options.ts`
**Depends on**: None
**Reuses**: Padrão de função pura de `src/lib/sentry/options.ts`
**Requirement**: HOSTING-01, HOSTING-02, HOSTING-03, HOSTING-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `poolOptions({ VERCEL: "1" }).max` é 3; com `{}` e com `{ VERCEL: "" }` é 10
- [x] `idleTimeoutMillis` é 10000 nos dois casos
- [x] `connectionString` vem de `DATABASE_URL`
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 4 testes novos passam, nenhum removido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(db): derive pool options from the runtime environment`
**Status**: Done

---

### T2: Usar as opções no pool

**What**: Trocar `new Pool({ connectionString })` por `new Pool(poolOptions(process.env))`.
**Where**: `src/lib/db/client.ts` (modify)
**Depends on**: T1
**Reuses**: `poolOptions` de T1
**Requirement**: HOSTING-01, HOSTING-02, HOSTING-03, HOSTING-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `client.ts` não define mais opções literais do pool
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: suíte existente intacta, nenhum teste removido

**Tests**: none
**Gate**: build
**Commit**: `feat(db): cap pool connections on Vercel`
**Status**: Done

---

### T3: `/api/health` como rota pública

**What**: Incluir `/api/health` em `PUBLIC_PATHS` e cobrir a decisão de rota.
**Where**: `src/lib/route-decision.ts` (modify)
**Depends on**: T2
**Reuses**: Testes existentes de `decideRoute` em `route-decision.test.ts`
**Requirement**: HOSTING-06, HOSTING-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `decideRoute("/api/health", false)` devolve `{ action: "next", noStore: false }`
- [x] `decideRoute("/api/healthz", false)` e `decideRoute("/api/health-x", false)` redirecionam para `/login`
- [x] Uma rota protegida existente (`/transacoes`) continua redirecionando anônimos para `/login`
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 3 testes novos passam, nenhum removido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(health): let the proxy pass /api/health without a session`
**Status**: Done

---

### T4: Handler do health check

**What**: Criar `GET` que responde 200, `{"status":"ok"}`, `Cache-Control: no-store`, sem importar o banco.
**Where**: `src/app/api/health/route.ts`
**Depends on**: T3
**Reuses**: `src/app/api/sentry-example-api/route.ts` e seu `route.test.ts`
**Requirement**: HOSTING-05, HOSTING-07, HOSTING-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Guia de route handlers em `node_modules/next/dist/docs/` lido antes de escrever
- [x] `GET` devolve status 200, corpo `{"status":"ok"}`, `Content-Type` JSON e `Cache-Control: no-store`
- [x] Teste prova que `@/lib/db/client` não é carregado (mock que falha se importado) e que query string não muda a resposta
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 3 testes novos passam, nenhum removido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(health): add a public health endpoint that skips the database`
**Status**: Done

---

### T5: Validação pura de `BETTER_AUTH_URL`

**What**: Criar `resolveBaseUrl(raw, nodeEnv)` que devolve a URL sem barra final ou `null` quando inválida (em produção: vazia, não parseável ou fora de `https:`; fora dela: qualquer `http:`/`https:` válida).
**Where**: `src/lib/base-url.ts`
**Depends on**: None
**Reuses**: Estilo de `src/lib/mailer.ts`
**Requirement**: HOSTING-10, HOSTING-13, HOSTING-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Produção: `https://app.vercel.app` válida; `http://app.vercel.app`, `""`, `undefined` e `app` devolvem `null`
- [ ] Produção: `https://app.vercel.app/` devolve `https://app.vercel.app` (sem barra dupla ao montar o link)
- [ ] Fora de produção: `http://localhost:3000` válida
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: 8 testes novos passam, nenhum removido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(auth): validate the public base URL for reset links`

---

### T6: Ação de recuperação usa a URL validada

**What**: Em `requestPasswordResetAction`, quando `resolveBaseUrl` devolve `null`, não enviar o e-mail, chamar `logActionError("requestPasswordResetAction: baseUrl", ...)` e devolver `{ ok: true }`; senão montar o link na URL validada.
**Where**: `src/actions/password-reset.ts` (modify)
**Depends on**: T5
**Reuses**: Mocks e helpers de `src/actions/password-reset.int.test.ts`
**Requirement**: HOSTING-10, HOSTING-11, HOSTING-12, HOSTING-13, HOSTING-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Produção com URL `http://` ou vazia: `sendMail` não é chamado, `logActionError` recebe `requestPasswordResetAction: baseUrl`, retorno é `{ ok: true }`
- [ ] Produção com `https://` válida: `sendMail` é chamado com link começando nessa URL
- [ ] Fora de produção com `http://localhost:3100`: `sendMail` é chamado
- [ ] Testes existentes da ação seguem verdes
- [ ] Gate check passes: `npm run test:unit && npm run test:int` (banco `*_test` privado)
- [ ] Test count: 4 testes novos passam, nenhum removido

**Tests**: integration
**Gate**: full
**Commit**: `fix(auth): skip the reset e-mail when the public URL is invalid`

---

### T7: Workflow de backup

**What**: Criar o workflow com cron `0 5 * * *` e `workflow_dispatch`, `pg_dump` custom + `age` em fluxo, falha em arquivo vazio, upload com `retention-days: 30`, cliente `postgresql-client-18` por variável no topo.
**Where**: `.github/workflows/backup.yml`
**Depends on**: None
**Reuses**: Rascunho da seção 7.3 de `docs/hospedagem-gratuita.md`
**Requirement**: HOSTING-15, HOSTING-16, HOSTING-17, HOSTING-18, HOSTING-19, HOSTING-20, HOSTING-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Teste lê o arquivo e confere: cron, `workflow_dispatch`, `set -euo pipefail`, `pg_dump --format=custom --no-owner`, `age -r`, `retention-days: 30`, nome `orcamento-<UTC>.dump.age`
- [ ] Teste confere verificação de arquivo vazio (`-s`) antes do upload
- [ ] Teste confere que a versão do cliente vem de uma variável única no topo (`PG_VERSION: 18`)
- [ ] Teste confere que nenhum `echo`/`cat` imprime segredo e que nenhum arquivo em claro é gravado ou enviado
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: 7 testes novos passam, nenhum removido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(backup): add a daily encrypted pg_dump workflow`

---

### T8: Atualizar o doc de hospedagem

**What**: Ajustar `docs/hospedagem-gratuita.md` ao que foi decidido: backup como artifact (retenção 30 dias), Postgres 18, e as seções 2 e 5 refletindo o que já está feito.
**Where**: `docs/hospedagem-gratuita.md` (modify)
**Depends on**: T7
**Reuses**: Texto atual do doc
**Requirement**: HOSTING-17, HOSTING-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Seção 7.3 descreve `upload-artifact` com 30 dias e `postgresql-client-18`; secrets de R2 saem da lista da 7.2
- [ ] Seção 2 deixa de listar pool, health e workflow de backup como pendentes
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: suíte intacta, nenhum teste removido

**Tests**: none
**Gate**: build
**Commit**: `docs(hosting): align the hosting plan with the implemented backup and health check`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6
Phase 3:  T7 → T8
```

Oito tarefas cabem em um único lote: execução inline, sem sub-agentes. O Verifier roda ao final.

---

## Cross-check e validação

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1 | None | início da fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | None (a fase 2 começa após a fase 1) | início da fase 2 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | None (a fase 3 começa após a fase 2) | início da fase 3 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |

| Task | Layer | Matrix exige | Task diz | Status |
| ---- | ----- | ------------ | -------- | ------ |
| T1 | função pura | unit | unit | ✅ |
| T2 | config / wiring | none | none | ✅ |
| T3 | função pura | unit | unit | ✅ |
| T4 | route handler | unit | unit | ✅ |
| T5 | função pura | unit | unit | ✅ |
| T6 | Server Action | integration | integration | ✅ |
| T7 | workflow | unit | unit | ✅ |
| T8 | docs | none | none | ✅ |
