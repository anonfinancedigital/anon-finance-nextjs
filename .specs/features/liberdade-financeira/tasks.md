# Liberdade Financeira Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/liberdade-financeira/design.md`
**Status**: Draft

**Pré-requisito da T5:** a migração `0004_recurrence.sql` e as alterações de `schema.ts` da feature de recorrência estão sem commit. Antes de gerar a migração desta feature, essa mudança deve estar commitada; senão `db:generate` mistura os dois diffs.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), e2e (Playwright) suspenso (AD-005). Sem guideline de cobertura: strong defaults aplicados, no mesmo padrão de `.specs/features/lancamento-flutuante/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs de cálculo; todo Edge Case (aniversário 29/02, n = 0, guardado ≥ alvo, guardado 0) | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Cada AC de validação: valor válido, limite inferior e superior, vazio, formato inválido, mensagem de cada rejeição | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositório (`src/lib/db/repos/*`) | integration | Leitura sem objetivo, inserir, substituir (sem segunda linha), isolamento entre usuários | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso, campo inválido sem gravar, sem sessão, falha do banco devolve `SAVE_FAILED` e mantém o anterior | `src/actions/*.int.test.ts` | `npm run test:int` |
| Schema do banco (`src/lib/db/schema.ts`) | none | - (build gate; os CHECKs são exercitados pelo teste do repositório) | - | build gate only |
| UI / páginas (`src/app/*`, `src/components/*`) | none | - (e2e suspenso, AD-005) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI, schema e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Domínio e validação

Cálculos puros e schema de entrada, sem banco nem UI.

```
T1 → T2 → T3 → T4
```

### Phase 2: Persistência e escrita

Tabela, repositório e action. A seta vinda da fase 1 marca uma dependência já concluída.

```
T4 → T5 → T6 → T7
```

### Phase 3: Interface

Resumo, formulário, página e navegação. A seta vinda da fase 2 marca uma dependência já concluída.

```
T7 → T8 → T9 → T10 → T11
```

---

## Task Breakdown

### T1: Permitir zero em parseBRL

**What**: `parseBRL` aceita o segundo parâmetro opcional `{ allowZero }`; com ele, "0" e "0,00" retornam 0 em vez de erro.
**Where**: `src/lib/domain/money.ts`
**Depends on**: None
**Reuses**: `parseBRL` existente (`money.ts:12`)
**Requirement**: LIB-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `parseBRL("0", { allowZero: true })` e `parseBRL("0,00", { allowZero: true })` retornam `{ ok: true, value: 0 }`
- [x] Sem a opção, o comportamento atual é idêntico (zero continua rejeitado; testes existentes passam sem edição)
- [x] Negativo e acima de R$ 999.999.999,99 continuam rejeitados com a opção
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos passam, nenhum existente removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): allow zero amounts in parseBRL`

---

### T2: Cálculos de alvo, idade, prazo e progresso

**What**: Criar `freedom.ts` com `ANNUAL_RATE_BP`, `targetCents`, `ageOn`, `monthsUntilRetirement` e `progressBp`.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T1
**Reuses**: `YearMonth` e `currentMonth` de `src/lib/domain/month.ts`
**Requirement**: LIB-03, LIB-04, LIB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `targetCents(1_000_000)` = 150_000_000 (R$ 10.000,00 → R$ 1.500.000,00)
- [x] `progressBp(15_000_000, 150_000_000)` = 1000 e `progressBp(0, alvo)` = 0; valor guardado acima do alvo devolve acima de 10000 (sem teto)
- [x] `ageOn` conta anos completos, antes e depois do aniversário, e trata nascimento em 29/02 como 28/02 em ano não bissexto
- [x] `monthsUntilRetirement` conta meses de calendário (aniversário no mês corrente = 0; já passado = 0, nunca negativo)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: um teste por AC e Edge Case de cálculo, todos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add financial freedom target, age and term helpers`

---

### T3: Aporte mensal necessário e resumo

**What**: Adicionar `requiredMonthlyCents` e `summarize` ao módulo `freedom.ts`.
**Where**: `src/lib/domain/freedom.ts` (modify)
**Depends on**: T2
**Reuses**: Funções da T2
**Requirement**: LIB-06, LIB-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Alvo R$ 1.500.000,00, guardado R$ 0,00 e 240 meses → 263_621 centavos (R$ 2.636,21)
- [x] Guardado cujo valor capitalizado já alcança o alvo → 0
- [x] `summarize` devolve `remainingCents = max(0, alvo − guardado)` e `monthlyCents = null` quando `months = 0` e guardado < alvo; 0 quando `months = 0` e guardado ≥ alvo
- [x] O aporte devolvido, aplicado por n meses sobre o guardado a 8% a.a. efetivos, atinge o alvo (teste de propriedade com 3 combinações)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos passam, os da T2 intactos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): compute required monthly contribution and goal summary`

---

### T4: Schema de validação do objetivo

**What**: Criar `goalSchema(now)` que converte e valida renda, guardado, nascimento e idade de aposentadoria.
**Where**: `src/lib/validation/goal.ts`
**Depends on**: T3
**Reuses**: `parseBRL` (T1), `isValidCalendarDate`, `ageOn` (T2), padrão `ctx.addIssue` de `src/lib/validation/category.ts`
**Requirement**: LIB-08, LIB-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Renda: vazia, R$ 0,00 e acima de R$ 1.000.000,00 rejeitadas; R$ 0,01 e R$ 1.000.000,00 aceitas, cada rejeição com mensagem no campo `monthlyIncome`
- [x] Guardado: vazio, negativo e acima de R$ 999.999.999,99 rejeitados; R$ 0,00 aceito
- [x] Nascimento: vazio, inválido (ex.: 31/02), futuro e com idade atual > 120 rejeitados
- [x] Idade de aposentadoria: não inteira, 0, 121 e ≤ idade atual rejeitadas; igual à idade atual + 1 aceita
- [x] Saída: `{ monthlyIncomeCents, savedCents, birthDate, retirementAge }`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: um teste por AC de validação e por limite, todos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): validate financial freedom goal`

---

### T5: Tabela financial_goal e migração

**What**: Adicionar a tabela `financial_goal` ao schema e gerar a migração correspondente.
**Where**: `src/lib/db/schema.ts` (modify)
**Depends on**: T4
**Reuses**: Padrão de tabela e `check` de `transaction` em `schema.ts`
**Requirement**: LIB-02, LIB-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Tabela com `user_id` PK referenciando `user` (`onDelete: cascade`), os quatro campos e `updated_at`, e os três CHECKs do design
- [x] `npm run db:generate` produz uma migração `0005_*.sql` que contém só `CREATE TABLE financial_goal` (nada da recorrência)
- [x] Migração aplicada no banco de teste (`npm run db:migrate`)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste removido; suíte existente verde

**Tests**: none
**Gate**: build

**Commit**: `feat(db): add financial_goal table`

---

### T6: Repositório do objetivo

**What**: Criar `goalsRepo` com `get` e `upsert`, sempre filtrando por `userId`.
**Where**: `src/lib/db/repos/goals.ts`
**Depends on**: T5
**Reuses**: Estrutura de `src/lib/db/repos/categories.ts`
**Requirement**: LIB-02, LIB-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `get` devolve `null` sem objetivo e o objetivo salvo depois do `upsert`
- [x] Segundo `upsert` do mesmo usuário substitui os valores e a tabela segue com uma linha para ele
- [x] Objetivo de um usuário não aparece na leitura de outro
- [x] Valor fora da faixa dos CHECKs é recusado pelo banco
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes novos passam, existentes intactos

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add goals repository`

---

### T7: Action saveGoal

**What**: Criar a Server Action `saveGoal`: sessão, validação, `upsert` e revalidação de `/liberdade`.
**Where**: `src/actions/goals.ts`
**Depends on**: T6
**Reuses**: `src/actions/categories.ts`, `invalidInput`, `SAVE_FAILED`, `requireSessionForAction`
**Requirement**: LIB-02, LIB-10, LIB-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Entrada válida grava e devolve `{ ok: true }`; reenviar substitui o objetivo
- [x] Entrada inválida devolve `fieldErrors` por campo e não grava nem altera a linha existente
- [x] Sem sessão devolve `UNAUTHORIZED` e não grava
- [x] Falha do banco (repo simulado com erro) devolve `SAVE_FAILED` e o objetivo anterior permanece
- [x] Grava somente para o `userId` da sessão
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes novos passam, existentes intactos

**Tests**: integration
**Gate**: full

**Commit**: `feat(actions): add saveGoal action`

---

### T8: Componente GoalSummary

**What**: Criar o componente que exibe guardado, alvo, valor que falta, barra com percentual, aporte mensal e prazo restante.
**Where**: `src/components/goal-summary.tsx`
**Depends on**: T7
**Reuses**: `Progress` de `src/components/ui/progress.tsx`, `formatBRL`, `formatShare`
**Requirement**: LIB-04, LIB-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Barra limitada a 100 com o texto do percentual real ("120,0%")
- [x] Aporte formatado em BRL; "Prazo encerrado" quando `monthlyCents` é `null`
- [x] Prazo exibido como "X anos e Y meses" (singular e zero tratados)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste removido; suíte existente verde

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add financial goal summary`

---

### T9: Componente GoalForm

**What**: Criar o formulário (renda, guardado, nascimento, idade de aposentadoria) com erro por campo, alerta de falha e botão Salvar.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T8
**Reuses**: `src/components/transaction-form.tsx` (padrão `useTransition` e `fieldErrors`), `Input`, `Label`, `Button`
**Requirement**: LIB-02, LIB-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Quatro campos rotulados; `type="date"` para nascimento
- [x] Preenchido com os valores salvos quando `initial` existe; vazio caso contrário
- [x] Erro do servidor aparece sob o campo correspondente; falha geral em `role="alert"`
- [x] Botão desabilitado durante o envio
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste removido; suíte existente verde

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add financial goal form`

---

### T10: Página /liberdade

**What**: Criar a página que lê o objetivo, calcula o resumo e renderiza `GoalSummary` e `GoalForm`.
**Where**: `src/app/(app)/liberdade/page.tsx`
**Depends on**: T9
**Reuses**: `src/app/(app)/categorias/page.tsx`, `goalsRepo.get`, `summarize`
**Requirement**: LIB-02, LIB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem objetivo: só o formulário vazio, sem resumo
- [x] Com objetivo: resumo e formulário preenchido; `summarize` recebe `new Date()`
- [x] Título e `metadata` "Liberdade · Orçamento"; guarda de sessão com `requireSessionForPage`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste removido; suíte existente verde

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add financial freedom page`

---

### T11: Link na navegação

**What**: Adicionar o link "Liberdade" para `/liberdade` na barra principal.
**Where**: `src/app/(app)/layout.tsx` (modify)
**Depends on**: T10
**Reuses**: Botões "Resumo" e "Categorias" do mesmo `nav`
**Requirement**: LIB-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Terceiro link "Liberdade" depois de "Categorias", apontando para `/liberdade`
- [x] Verificação manual: o link navega para a aba e o formulário salva e mostra o resumo (R$ 10.000,00 de renda, R$ 150.000,00 guardado → 10,0%)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste removido; suíte existente verde

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add Liberdade link to main navigation`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T4 ------→ T5 ------→ T6 ------→ T7
Phase 3:  T7 ------→ T8 ------→ T9 ------→ T10 ------→ T11
```

Execução estritamente sequencial. São 11 tasks (acima de ~8): no Execute, oferecer sub-agentes por lote (fases 1 e 2 juntas = 7 tasks; fase 3 = 4 tasks).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: parseBRL allowZero | 1 função | ✅ Granular |
| T2: cálculos base | 1 arquivo, funções coesas | ✅ Granular |
| T3: aporte e resumo | 2 funções no mesmo arquivo | ✅ Granular |
| T4: goalSchema | 1 schema | ✅ Granular |
| T5: tabela | 1 tabela | ✅ Granular |
| T6: repo | 1 repositório | ✅ Granular |
| T7: action | 1 action | ✅ Granular |
| T8-T10: componentes e página | 1 arquivo cada | ✅ Granular |
| T11: link | 1 arquivo | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 | ✅ Match |
| T3 | T2 | T2 | ✅ Match |
| T4 | T3 | T3 | ✅ Match |
| T5 | T4 | - (fase anterior) | ✅ Match |
| T6 | T5 | T5 | ✅ Match |
| T7 | T6 | T6 | ✅ Match |
| T8 | T7 | - (fase anterior) | ✅ Match |
| T9 | T8 | T8 | ✅ Match |
| T10 | T9 | T9 | ✅ Match |
| T11 | T10 | T10 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | Domínio | unit | unit | ✅ OK |
| T3 | Domínio | unit | unit | ✅ OK |
| T4 | Validação | unit | unit | ✅ OK |
| T5 | Schema do banco | none | none | ✅ OK |
| T6 | Repositório | integration | integration | ✅ OK |
| T7 | Server Action | integration | integration | ✅ OK |
| T8 | UI | none | none | ✅ OK |
| T9 | UI | none | none | ✅ OK |
| T10 | UI / página | none | none | ✅ OK |
| T11 | UI / layout | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| LIB-01 | T11 |
| LIB-02 | T5, T6, T7, T9, T10 |
| LIB-03 | T2 |
| LIB-04 | T2, T8 |
| LIB-05 | T2, T10 |
| LIB-06 | T3 |
| LIB-07 | T3, T8 |
| LIB-08 | T1, T4 |
| LIB-09 | T4 |
| LIB-10 | T7, T9 |
| LIB-11 | T5, T6, T7 |
