# Orçamento Doméstico Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/orcamento-domestico/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Repositório sem código nem testes. Guidelines found: none - strong defaults applied; ferramentas e camadas vêm da seção "Testing Strategy" do `design.md`. Confirmar antes do Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Todo campo: válido, cada regra de rejeição e mensagem | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) + constraints do schema | integration | Caminhos de consulta principais, escopo por `userId`, constraints do banco e caminhos de erro | `src/lib/db/**/*.int.test.ts` | `npm run test:int` |
| Auth (`src/lib/auth-guard.ts`, `src/actions/auth.ts`, seed) | integration | Sucesso, credenciais inválidas, bloqueio, sem sessão | `src/**/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Toda action: sucesso + cada erro de validação + sem sessão + erro de banco + `revalidatePath` chamado | `src/actions/*.int.test.ts` | `npm run test:int` |
| UI / páginas / proxy (`src/app/*`, `src/components/*`, `src/proxy.ts`) | e2e | Todo fluxo da task: caminho feliz + edge cases listados + erros visíveis | `e2e/*.spec.ts` | `npm run e2e` |
| Config / scaffold / schema do Better Auth | none | - (somente gate de build) | - | build gate only |

## Gate Check Commands

> Scripts criados em T1–T3. Confirmar antes do Execute. Integração e e2e exigem `npm run db:up` (Postgres em Docker).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de config/UI (e2e) e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int && npm run e2e` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation

```
T1 → T2 → T3
```

### Phase 2: Domain & Validation

```
T4 → T5 → T6 → T7 → T8 → T9 → T10
```

### Phase 3: Data Layer

```
T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 4: Auth

```
T17 → T18 → T19 → T20 → T21
```

### Phase 5: Server Actions

```
T22 → T23 → T24
```

### Phase 6: UI

```
T25 → T26 → T27 → T28 → T29 → T30 → T31
```

---

## Task Breakdown

### T1: Scaffold do projeto Next.js

**What**: Criar o app Next.js 16 (App Router, TypeScript strict, Tailwind v4, ESLint, `src/`), `git init`, `.gitignore`, `engines.node >=20.9`, scripts `typecheck` e `lint`, `.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) e shadcn/ui inicializado.
**Where**: `package.json`
**Depends on**: None
**Reuses**: `create-next-app`, `shadcn init`
**Requirement**: - (fundação)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run typecheck`, `npm run lint` e `npm run build` passam
- [x] Repositório git criado com o primeiro commit

**Tests**: none
**Gate**: build (sem `test:*`/`e2e`, que ainda não existem)

**Commit**: `chore: scaffold next.js app with typescript, tailwind and shadcn`

---

### T2: Configurar Vitest e Playwright

**What**: Vitest com dois projetos (`unit`: `*.test.ts`; `integration`: `*.int.test.ts`, single-thread) e Playwright (Chromium, `webServer` = `next build && next start` na porta 3100 usando `.env.test`); scripts `test:unit`, `test:int`, `e2e`.
**Where**: `vitest.config.ts`
**Depends on**: T1
**Reuses**: -
**Requirement**: - (fundação)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run test:unit` e `npm run test:int` rodam (passam com zero testes, `passWithNoTests`)
- [x] `playwright.config.ts` criado; `npx playwright install chromium` documentado no README

**Tests**: none
**Gate**: build

**Commit**: `chore: configure vitest projects and playwright`

---

### T3: Banco local e cliente Drizzle

**What**: Scripts `db:up` (`docker run postgres:17` na porta 5433 com bancos `orcamento` e `orcamento_test`), `db:generate`, `db:migrate`; `drizzle.config.ts`; `src/lib/db/client.ts` (`pg.Pool` + `drizzle`); helper de teste `src/test/db.ts` (aplica migrações e faz `TRUNCATE … CASCADE` entre testes).
**Where**: `src/lib/db/client.ts`
**Depends on**: T2
**Reuses**: `drizzle-orm/node-postgres`
**Requirement**: - (fundação, AD-002)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run db:up` sobe o Postgres; `drizzle-kit` conecta
- [x] Gate passa

**Tests**: none
**Gate**: build

**Commit**: `chore(db): add local postgres, drizzle client and test db helper`

---

### T4: Domínio de dinheiro (`parseBRL`, `formatBRL`)

**What**: Parser e formatador de BRL em centavos inteiros.
**Where**: `src/lib/domain/money.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `Intl.NumberFormat('pt-BR')`
**Requirement**: TRX-02, SUM-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] "1.234,56" → 123456; "1234,5" → 123450; "1234" → 123400
- [x] Rejeita "0", "0,00", "-5", "abc", "1,234" (3 casas), vazio e valores > 999.999.999,99; aceita exatamente 999.999.999,99 e 0,01
- [x] `formatBRL(123456)` === "R$ 1.234,56" (comparando com espaço normalizado)
- [x] Gate quick passa; ≥ 12 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add brl money parsing and formatting in cents`

---

### T5: Domínio de percentual (`parsePercent`, `formatPercent`)

**What**: Parser e formatador de percentual em pontos-base.
**Where**: `src/lib/domain/percent.ts`
**Depends on**: T4
**Reuses**: padrão `Result` de `money.ts`
**Requirement**: CAT-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] "30" → 3000; "12,5" → 1250; "0,01" → 1; "100" → 10000
- [x] Rejeita "0", "0,001", "100,01", "-1", "abc", vazio
- [x] `formatPercent(1250)` === "12,5%"; `formatPercent(3000)` === "30%"
- [x] Gate quick passa; ≥ 10 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add percent parsing in basis points`

---

### T6: Domínio de mês (`currentMonth`, `parseMonth`, `monthRange`, `isValidCalendarDate`)

**What**: Resolução do mês de referência e validação de datas do calendário.
**Where**: `src/lib/domain/month.ts`
**Depends on**: T5
**Reuses**: `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`
**Requirement**: MON-01, TRX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `currentMonth(new Date('2026-02-01T02:30:00Z'))` → jan/2026 (23:30 de 31/01 em São Paulo)
- [x] `parseMonth('2026-10')` → out/2026; `parseMonth('2026-13')`, `parseMonth('x')` e `undefined` → mês corrente
- [x] `monthRange` de dez/2026 → `{ start: '2026-12-01', endExclusive: '2027-01-01' }`
- [x] `isValidCalendarDate('2025-02-29')` false; `'2024-02-29'` true; `''` e `'2026-04-31'` false
- [x] Gate quick passa; ≥ 10 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add reference month resolution in sao paulo timezone`

---

### T7: Regra do conjunto de categorias (`validateCategorySet`)

**What**: Validar o conjunto: soma = 10000 bp, nome com 1 a 40 caracteres, nomes únicos sem diferenciar maiúsculas.
**Where**: `src/lib/domain/budget.ts`
**Depends on**: T6
**Reuses**: `formatPercent`
**Requirement**: CAT-01, CAT-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Conjunto 30/30/10/10/20 aceito
- [x] Conjunto 30/30/10/10/20/5 rejeitado com "A soma dos percentuais deve ser 100% (atual: 105%)"
- [x] Conjunto vazio rejeitado com "(atual: 0%)"
- [x] Nome vazio, nome com 41 caracteres e "Lazer"/"lazer" duplicados rejeitados com erro no campo
- [x] Gate quick passa; ≥ 7 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): validate category set sums to 100 percent`

---

### T8: Cálculo do resumo mensal (`buildMonthlySummary`)

**What**: Calcular por categoria a meta, o gasto, o restante, o estouro e o % consumido, além dos totais do mês.
**Where**: `src/lib/domain/budget.ts`
**Depends on**: T7
**Reuses**: tipos de T7
**Requirement**: SUM-01, SUM-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Receita 500000, "Conforto" 3000 bp, gasto 160000 → meta 150000, restante −10000, `overspent` true, `overspentCents` 10000
- [x] Gasto igual à meta → `overspent` false, `consumedPct` 100
- [x] Receita 0 e gasto 1 → meta 0, `overspent` true; receita 0 e gasto 0 → `overspent` false
- [x] Categoria sem gastos → gasto 0, restante = meta
- [x] Totais: receita, gasto total e saldo (receita − gasto, pode ser negativo)
- [x] Arredondamento: receita 100001 × 3333 bp → `Math.round` (33330)
- [x] Gate quick passa; ≥ 8 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): compute monthly budget summary per category`

---

### T9: Schema Zod de transação

**What**: `transactionSchema` discriminado por `kind`, reutilizando `parseBRL` e `isValidCalendarDate`; `id` UUID; `categoryId` obrigatório em `expense` e proibido em `income`; descrição opcional até 120 caracteres.
**Where**: `src/lib/validation/transaction.ts`
**Depends on**: T8
**Reuses**: `money.ts`, `month.ts`
**Requirement**: TRX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gasto válido e ganho válido aceitos
- [x] Rejeita: valor ≤ 0, valor acima do máximo, data vazia, `2025-02-29`, gasto sem categoria, descrição com 121 caracteres, `id` que não é UUID, cada um com `fieldErrors` no campo certo
- [x] Gate quick passa; ≥ 9 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): add transaction input schema`

---

### T10: Schema Zod do conjunto de categorias

**What**: `categorySetSchema` (lista de `{ id?, name, percent }`), que converte o percentual com `parsePercent` e aplica `validateCategorySet`.
**Where**: `src/lib/validation/category.ts`
**Depends on**: T9
**Reuses**: `percent.ts`, `budget.ts`
**Requirement**: CAT-01, CAT-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Conjunto válido produz `{ name, percentBp }[]`
- [x] Percentual "0", "100,01" e "12,345" rejeitados com erro no item; soma ≠ 100 rejeitada com a mensagem de T7
- [x] Gate quick passa; ≥ 5 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): add category set input schema`

---

### T11: Configuração do Better Auth e tabelas de auth

**What**: `auth.ts` com `betterAuth` (`drizzleAdapter` pg, `emailAndPassword { enabled, disableSignUp: true }`, sessão de 30 dias, plugin `nextCookies`); gerar as tabelas `user`, `session`, `account` e `verification` com o CLI do Better Auth em `src/lib/db/auth-schema.ts`; criar o route handler `src/app/api/auth/[...all]/route.ts`.
**Where**: `src/lib/auth.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: docs do Better Auth (adapter Drizzle, Next.js)
**Requirement**: AUTH-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Opções `disableSignUp` e `nextCookies` confirmadas na doc atual (sem API inventada)
- [x] Migração gerada inclui as tabelas de auth; `npm run db:migrate` aplica
- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(auth): configure better-auth with drizzle adapter`

---

### T12: Schema do domínio e migração

**What**: Tabelas `category`, `transaction` e `login_attempt` com as constraints do design (CHECK de `percent_bp` e `amount_cents`, CHECK `kind`↔`category_id`, UNIQUE `(user_id, lower(name))`, FK `RESTRICT`, índices) e a migração SQL.
**Where**: `src/lib/db/schema.ts`
**Depends on**: T11
**Reuses**: `auth-schema.ts` (FK para `user.id`)
**Requirement**: CAT-01, CAT-03, TRX-02, AUTH-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste de integração de constraints: banco rejeita `percent_bp` 0 e 10001, `amount_cents` 0, gasto sem categoria, ganho com categoria, nome duplicado com caixa diferente, delete de categoria com gasto
- [x] Gate full passa; ≥ 6 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add category, transaction and login attempt schema`

---

### T13: Repositório de categorias

**What**: `list`, `replaceSet` (transação: valida, faz upsert e apaga as removidas; bloqueia se uma removida tem gastos, informando a quantidade) e `countExpenses`.
**Where**: `src/lib/db/repos/categories.ts`
**Depends on**: T12
**Reuses**: `validateCategorySet`
**Requirement**: CAT-01, CAT-02, CAT-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `replaceSet` válido persiste; `list` devolve na ordem de criação, só do `userId` informado
- [ ] Soma ≠ 100 → erro, nada é persistido
- [ ] Remover categoria com 3 gastos → erro "Esta categoria tem 3 gastos e não pode ser excluída" e o conjunto anterior permanece intacto (rollback)
- [ ] Remover categoria sem gastos e reequilibrar para 100% → sucesso
- [ ] Gate full passa; ≥ 6 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add categories repository with atomic set replacement`

---

### T14: Repositório de transações: escrita e listagem

**What**: `create` (`ON CONFLICT (id) DO NOTHING`), `update`, `delete` e `listByMonth` (`ORDER BY date DESC, created_at DESC`), todos com escopo por `userId`.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T13
**Reuses**: `monthRange`
**Requirement**: TRX-01, TRX-03, TRX-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `create` duas vezes com o mesmo `id` → 1 linha
- [ ] `listByMonth(out/2026)` exclui as datas 2026-09-30 e 2026-11-01 e ordena de forma decrescente
- [ ] `update` muda data, valor, categoria e descrição; duas atualizações seguidas → o valor final é o da última
- [ ] `delete` remove; `update`/`delete` de outro `userId` não afetam a linha
- [ ] Gate full passa; ≥ 7 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add transactions repository with idempotent create`

---

### T15: Agregação do mês (`monthTotals`)

**What**: Uma consulta `SUM … GROUP BY` que devolve a receita do mês e o gasto por categoria.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T14
**Reuses**: `monthRange`
**Requirement**: SUM-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com 2 ganhos e 3 gastos em 2 categorias no mês, mais 1 gasto no mês seguinte → totais corretos e o gasto do outro mês fica de fora
- [ ] Mês vazio → receita 0 e mapa vazio
- [ ] Gate full passa; ≥ 3 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): aggregate monthly income and spending per category`

---

### T16: Repositório de tentativas de login

**What**: `countRecentFailures(email, since)`, `recordFailure(email)` e `clear(email)`, com o e-mail normalizado para minúsculas.
**Where**: `src/lib/db/repos/login-attempts.ts`
**Depends on**: T15
**Reuses**: -
**Requirement**: AUTH-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Falhas antigas (16 min) não contam; "A@x.com" e "a@x.com" contam juntas; `clear` zera a contagem
- [ ] Gate full passa; ≥ 4 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add login attempts repository`

---

### T17: Guarda de sessão (`requireSession`)

**What**: `requireSessionForPage()` (redireciona para `/login`) e `requireSessionForAction()` (devolve `{ ok:false, error:'UNAUTHORIZED' }`), ambos via `auth.api.getSession({ headers })`.
**Where**: `src/lib/auth-guard.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `auth.ts`
**Requirement**: AUTH-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem sessão → a versão de action devolve `UNAUTHORIZED` e a de página chama `redirect('/login')` (mock de `next/navigation` e `next/headers`)
- [ ] Com sessão válida → devolve `userId`
- [ ] Gate full passa; ≥ 3 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): add session guards for pages and actions`

---

### T18: Script de criação da conta única

**What**: `scripts/seed-user.ts` que cria (ou atualiza a senha de) o usuário a partir de `ADMIN_EMAIL` e `ADMIN_PASSWORD`, guardando a senha como hash do Better Auth; script npm `db:seed`.
**Where**: `scripts/seed-user.ts`
**Depends on**: T17
**Reuses**: hash de senha do Better Auth (confirmar o export na doc)
**Requirement**: AUTH-01, AUTH-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Após o seed, `auth.api.signInEmail` com as credenciais do env tem sucesso
- [ ] A senha armazenada em `account.password` ≠ texto puro (AUTH-01 / AC 6)
- [ ] Rodar o seed duas vezes não duplica o usuário
- [ ] Gate full passa; ≥ 3 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): add single account seed script`

---

### T19: Actions de login e logout

**What**: `signInAction` (bloqueio após 5 falhas em 15 min com "Muitas tentativas. Tente novamente em N minutos"; credenciais inválidas → "E-mail ou senha inválidos"; registra e limpa as falhas; redireciona para `/`) e `signOutAction`.
**Where**: `src/actions/auth.ts`
**Depends on**: T18
**Reuses**: `loginAttemptsRepo`, `auth.api.signInEmail`, `auth.api.signOut`
**Requirement**: AUTH-01, AUTH-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Credenciais corretas → sessão criada e redirect para `/`
- [ ] E-mail errado e senha errada → exatamente a mesma mensagem "E-mail ou senha inválidos"
- [ ] 5 falhas → a 6ª tentativa, mesmo com a senha correta, é bloqueada com a mensagem de bloqueio; após 15 min (relógio mockado) libera
- [ ] Sucesso zera as falhas
- [ ] `signOutAction` encerra a sessão (`getSession` devolve null depois)
- [ ] Gate full passa; ≥ 6 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): add sign-in with lockout and sign-out actions`

---

### T20: Página de login

**What**: `/login` com formulário de e-mail e senha ligado a `signInAction`, mostrando os erros; o `globalSetup` do Playwright migra o banco de teste e roda o seed.
**Where**: `src/app/login/page.tsx`
**Depends on**: T19
**Reuses**: shadcn `Form`, `Input`, `Button`
**Requirement**: AUTH-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: credenciais válidas → URL `/`
- [ ] e2e: senha errada → texto "E-mail ou senha inválidos" visível
- [ ] Gate build passa; ≥ 2 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(auth): add login page`

---

### T21: Proxy de rotas protegidas

**What**: `proxy.ts` que redireciona para `/login` quando não há cookie de sessão (`getSessionCookie`), exceto em `/login`, `/api/auth/*` e assets.
**Where**: `src/proxy.ts`
**Depends on**: T20
**Reuses**: `better-auth/cookies`
**Requirement**: AUTH-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: visitante sem sessão em `/` e em `/categorias` → `/login`
- [ ] e2e: `/login` acessível sem sessão
- [ ] Gate build passa; ≥ 2 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(auth): redirect unauthenticated visitors via proxy`

---

### T22: Action `saveCategories`

**What**: Action que faz `requireSessionForAction` → `categorySetSchema` → `categoriesRepo.replaceSet` → `revalidatePath('/')`, devolvendo "Não foi possível salvar. Tente novamente" em erro de banco.
**Where**: `src/actions/categories.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: guard, schema, repo
**Requirement**: CAT-01, CAT-02, CAT-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sucesso persiste e chama `revalidatePath('/')`
- [ ] Soma ≠ 100, percentual inválido, nome inválido e categoria com gastos removida → erros da spec e nada persistido
- [ ] Sem sessão → `UNAUTHORIZED` e nenhuma escrita
- [ ] Repo lançando exceção → mensagem genérica
- [ ] Gate full passa; ≥ 6 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): add save categories server action`

---

### T23: Action `createTransaction`

**What**: Criar ganho ou gasto (validação, categoria existente do usuário, idempotência por `id`, `revalidatePath('/')`).
**Where**: `src/actions/transactions.ts`
**Depends on**: T22
**Reuses**: guard, `transactionSchema`, repos
**Requirement**: TRX-01, TRX-02, TRX-04, SUM-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Gasto e ganho válidos persistem e chamam `revalidatePath('/')`
- [ ] `categoryId` inexistente ou de outro usuário → erro no campo `categoryId`
- [ ] Mesmo `id` enviado 2 vezes → 1 transação
- [ ] Sem sessão → `UNAUTHORIZED`; erro de banco → mensagem genérica
- [ ] Gate full passa; ≥ 6 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add create transaction server action`

---

### T24: Actions `updateTransaction` e `deleteTransaction`

**What**: Editar e excluir uma transação do usuário com revalidação.
**Where**: `src/actions/transactions.ts`
**Depends on**: T23
**Reuses**: guard, schema, repo
**Requirement**: TRX-03, SUM-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Editar altera os campos e revalida; excluir remove e revalida
- [ ] `id` inexistente → erro "Transação não encontrada"
- [ ] Sem sessão → `UNAUTHORIZED`; dados inválidos na edição → `fieldErrors`
- [ ] Gate full passa; ≥ 5 testes

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add update and delete transaction actions`

---

### T25: Layout da área autenticada

**What**: `(app)/layout.tsx` que chama `requireSessionForPage` e mostra a navegação (Resumo, Categorias) e o botão Sair ligado a `signOutAction`.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: None (fase anterior concluída)
**Reuses**: guard, `signOutAction`
**Requirement**: AUTH-01, AUTH-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: após o login, clicar em Sair → `/login`; voltar para `/` → `/login`
- [ ] Gate build passa; ≥ 1 teste e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(ui): add authenticated app shell with sign-out`

---

### T26: Editor de categorias

**What**: `/categorias` com `CategoryEditor` (adicionar, editar e remover linhas, soma ao vivo, salvar desabilitado se ≠ 100%, erros da action exibidos).
**Where**: `src/app/(app)/categorias/page.tsx`
**Depends on**: T25
**Reuses**: `saveCategories`, `formatPercent`, shadcn `Table`/`Input`
**Requirement**: CAT-01, CAT-02, CAT-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: criar 30/30/10/10/20 → salvo e listado após o reload
- [ ] e2e: com soma 105% → mensagem "A soma dos percentuais deve ser 100% (atual: 105%)" e salvar desabilitado
- [ ] e2e: remover uma categoria com gastos → mensagem com a quantidade de gastos
- [ ] Gate build passa; ≥ 3 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(ui): add category editor page`

---

### T27: Formulário de transação

**What**: `TransactionForm` (Client): tipo ganho/gasto, valor, data (padrão hoje), categoria (só em gasto), descrição; gera `id` ao montar; botão desabilitado durante o envio; mantém os valores em caso de erro; reutilizado para edição em um Dialog.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T26
**Reuses**: `createTransaction`, `updateTransaction`, shadcn `Form`/`Select`/`Dialog`
**Requirement**: TRX-01, TRX-02, TRX-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e (em `/`): lançar um ganho e um gasto → ambos aparecem na lista
- [ ] e2e: valor "0" → mensagem de validação e campos preservados
- [ ] e2e: duplo clique rápido em salvar → 1 transação
- [ ] e2e: sem categorias → link "Crie suas categorias primeiro"
- [ ] Gate build passa; ≥ 4 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(ui): add transaction form`

---

### T28: Lista de transações do mês

**What**: `TransactionList`: transações do mês em ordem decrescente de data, com ações de editar (Dialog com `TransactionForm`) e excluir (com confirmação); estado vazio "Nenhuma transação neste mês".
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T27
**Reuses**: `transactionsRepo.listByMonth`, `deleteTransaction`, `formatBRL`
**Requirement**: TRX-01, TRX-03, MON-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: 3 transações com datas diferentes aparecem em ordem decrescente
- [ ] e2e: editar o valor e excluir com confirmação refletem na lista
- [ ] e2e: mês sem transações → "Nenhuma transação neste mês"
- [ ] Gate build passa; ≥ 3 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(ui): add monthly transaction list with edit and delete`

---

### T29: Página de resumo

**What**: `(app)/page.tsx` com receita, gasto e saldo do mês e `SummaryTable` (percentual, meta, gasto, restante, `Progress`, destaque e rótulo "Estourou R$ X"), mais o formulário e a lista.
**Where**: `src/app/(app)/page.tsx`
**Depends on**: T28
**Reuses**: `buildMonthlySummary`, `monthTotals`, `parseMonth`, `formatBRL`
**Requirement**: SUM-01, SUM-02, SUM-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: ganho de 5.000 e "Conforto" a 30% com gasto de 1.600 → meta "R$ 1.500,00", "Estourou R$ 100,00" visível
- [ ] e2e: depois de lançar um gasto, o resumo muda sem reload manual
- [ ] e2e: mês sem receita e com gasto → metas "R$ 0,00" e a categoria marcada como estourada
- [ ] Gate build passa; ≥ 3 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(ui): add monthly summary page`

---

### T30: Seletor de mês

**What**: `MonthPicker` (anterior, próximo e seleção) que atualiza `?mes=AAAA-MM`.
**Where**: `src/components/month-picker.tsx`
**Depends on**: T29
**Reuses**: `parseMonth`, `currentMonth`
**Requirement**: MON-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: sem `?mes` mostra o mês corrente
- [ ] e2e: gastos em set e out → trocar o mês mostra totais diferentes
- [ ] e2e: reload mantém o mês da URL
- [ ] e2e: lançar um gasto com data de outro mês → aparece no mês da data, não no exibido
- [ ] Gate build passa; ≥ 4 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(ui): add month picker bound to url`

---

### T31: Gráficos do resumo

**What**: `BudgetCharts` (Client, Recharts): barras de gasto × meta por categoria, com a barra estourada em cor distinta e rótulo textual; pizza da participação no gasto; "Sem gastos no mês" quando o gasto é 0.
**Where**: `src/components/budget-charts.tsx`
**Depends on**: T30
**Reuses**: `MonthlySummary`, `recharts`
**Requirement**: CHT-01

**Tools**:

- MCP: NONE
- Skill: `dataviz`

**Done when**:

- [ ] e2e: com gastos em 3 categorias, os gráficos de barras e pizza aparecem (por `data-testid`)
- [ ] e2e: categoria estourada tem rótulo "Estourou" no gráfico
- [ ] e2e: mês sem gastos → "Sem gastos no mês" e nenhum gráfico de pizza
- [ ] Gate build passa; ≥ 3 testes e2e

**Tests**: e2e
**Gate**: build

**Commit**: `feat(ui): add budget charts`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3
Phase 2:  T4 → T5 → T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15 → T16
Phase 4:  T17 → T18 → T19 → T20 → T21
Phase 5:  T22 → T23 → T24
Phase 6:  T25 → T26 → T27 → T28 → T29 → T30 → T31
```

Execution is strictly sequential. 31 tasks → batches de phases inteiras (~7 tasks): B1 = P1+P2 (10), B2 = P3 (6), B3 = P4+P5 (8), B4 = P6 (7).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Scaffold (gerado por ferramenta) | ✅ Granular (config) |
| T2 | Config de testes | ✅ Granular |
| T3 | Cliente de banco + scripts | ⚠️ OK (coeso: infraestrutura de banco) |
| T4–T6 | 1 módulo de domínio cada | ✅ Granular |
| T7, T8 | 1 função cada, mesmo arquivo | ✅ Granular |
| T9, T10 | 1 schema cada | ✅ Granular |
| T11 | Config de auth + tabelas geradas + route handler de 2 linhas | ⚠️ OK (coeso: wiring do Better Auth) |
| T12 | 1 schema + migração gerada | ✅ Granular |
| T13–T16 | 1 repositório ou função cada | ✅ Granular |
| T17–T19 | 1 módulo cada | ✅ Granular |
| T20 | 1 página (+ globalSetup do e2e) | ⚠️ OK (o setup só é testável junto com a primeira página) |
| T21–T24 | 1 arquivo cada | ✅ Granular |
| T25–T31 | 1 componente ou página cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início P1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | None | início P2 (P1 anterior) | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | None | início P3 (P2 anterior) | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | None | início P4 (P3 anterior) | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | None | início P5 (P4 anterior) | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |
| T25 | None | início P6 (P5 anterior) | ✅ |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T26 | T26 → T27 | ✅ |
| T28 | T27 | T27 → T28 | ✅ |
| T29 | T28 | T28 → T29 | ✅ |
| T30 | T29 | T29 → T30 | ✅ |
| T31 | T30 | T30 → T31 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1–T3 | Config / scaffold | none | none | ✅ OK |
| T4–T8 | Domínio | unit | unit | ✅ OK |
| T9–T10 | Validação | unit | unit | ✅ OK |
| T11 | Config / schema do Better Auth | none | none | ✅ OK (comportamento de auth testado em T18/T19, que criam o código que o usa) |
| T12 | Schema + constraints | integration | integration | ✅ OK |
| T13–T16 | Repositórios | integration | integration | ✅ OK |
| T17–T19 | Auth | integration | integration | ✅ OK |
| T20–T21 | UI / proxy | e2e | e2e | ✅ OK |
| T22–T24 | Server Actions | integration | integration | ✅ OK |
| T25–T31 | UI / páginas | e2e | e2e | ✅ OK |
