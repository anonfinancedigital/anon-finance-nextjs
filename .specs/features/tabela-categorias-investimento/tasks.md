# Tabela de Categorias: Percentual Limpo e Investimento Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/tabela-categorias-investimento/design.md`
**Status**: Draft

Antes de qualquer comando: `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`. Testes de integração usam um banco `*_test` privado via `DATABASE_URL`. A árvore tem `docs/backlog.md` modificado: cada commit adiciona só os arquivos da própria task (`git add <arquivos>`, nunca `-A`). Antes de escrever código Next, ler o guia relevante em `node_modules/next/dist/docs/` (AGENTS.md).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (ler docs do Next antes de código Next), `.specs/STATE.md` AD-005 (e2e suspenso), `vitest.config.ts` (projetos `unit` e `integration`, sem threshold).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain (`src/lib/domain`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation`) | unit | Campo novo: padrão, valor válido e inválido | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repository (`src/lib/db/repos`) | integration | Gravar, reler e atualizar a flag | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Schema / migração (`src/lib/db/schema.ts`, `drizzle/`) | integration | Coluna nova com padrão `false` nas linhas existentes | `src/lib/db/*.int.test.ts` | `npm run test:int` |
| Páginas e componentes (UI) | none | Gate de build apenas; e2e suspenso (AD-005) | - | build gate |

## Gate Check Commands

> Generated from codebase (`package.json`) - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com unit | `npm run test:unit` |
| Full | Tasks com integration | `npm run test:unit && npm run test:int` |
| Build | Fim de fase e tasks de schema/UI | `npm run build && npm run lint && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Domínio

```
T1 → T2
```

### Phase 2: Persistência

```
T3 → T4 → T5
```

### Phase 3: Interface

```
T6 → T7
```

---

## Task Breakdown

### T1: Formatador `formatPercentCompact`

**What**: Função que formata micro-percent com até 1 casa decimal e sem ",0" (31.931.878 → "31,9%"; 30.000.000 → "30%"); `formatPercent` permanece intacto.
**Where**: `src/lib/domain/percent.ts`
**Depends on**: None
**Reuses**: `formatShare`, `MICRO_PER_PERCENT`
**Requirement**: CATINV-01, CATINV-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Testes cobrem 31.931.878 → "31,9%", 30.000.000 → "30%", 12.500.000 → "12,5%", 100.000.000 → "100%"
- [x] Teste confirma que `formatPercent(31_931_878)` continua "31,931878%" e `formatPercent(12_500_000)` "12,5%"
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: testes existentes de `percent.test.ts` + os novos passam (sem remoções)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(percent): add compact percent formatter`

---

### T2: Resumo distingue despesa estourada de investimento acima da meta

**What**: `Category.isInvestment?`, `overspent`/`overspentCents` só para despesa e `exceeded`/`exceededCents` para investimento em `buildMonthlySummary`.
**Where**: `src/lib/domain/budget.ts`
**Depends on**: T1
**Reuses**: cálculo atual de `overspent`
**Requirement**: CATINV-04, CATINV-05, CATINV-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Despesa com gasto > meta: `overspent` true, `overspentCents` = gasto − meta, `exceeded` false
- [x] Investimento com gasto > meta: `overspent` false, `overspentCents` 0, `exceeded` true, `exceededCents` = gasto − meta
- [x] Investimento com gasto = meta e abaixo da meta: `exceeded` false, `exceededCents` 0
- [x] Investimento com meta 0 e gasto 5000: `exceeded` true, `exceededCents` 5000
- [x] `isInvestment` omitido equivale a despesa
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: testes existentes de `budget.test.ts` + os novos passam (sem remoções)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(budget): split overspent expenses from exceeded investments`

---

### T3: Coluna `is_investment` e migração

**What**: Coluna `is_investment boolean not null default false` em `category`, com a migração `0010` gerada pelo drizzle-kit.
**Where**: `src/lib/db/schema.ts`
**Depends on**: None (a fase 1 já está concluída)
**Reuses**: migrações `drizzle/0009_*.sql` e `meta/_journal.json`
**Requirement**: CATINV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `drizzle/0010_*.sql`, `meta/0010_snapshot.json` e `_journal.json` gerados com `npx drizzle-kit generate`
- [ ] Teste de integração: categoria inserida sem a flag lê `isInvestment` false
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: testes existentes + o novo passam (sem remoções)

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add is_investment column to category`

---

### T4: Repositório lê e grava a flag

**What**: `isInvestment` em `columns`, `CategoryItem` (opcional, padrão false) e no `update`/`insert` de `replaceSet`; `listForMonth` devolve a flag.
**Where**: `src/lib/db/repos/categories.ts`
**Depends on**: T3
**Reuses**: caminho de `color` no mesmo arquivo
**Requirement**: CATINV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `replaceSet` com `isInvestment: true` e `listForMonth` devolvem true
- [ ] Reenviar a categoria com `isInvestment: false` volta para false
- [ ] Item sem o campo grava false
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: testes existentes + os novos passam (sem remoções)

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): persist the investment flag`

---

### T5: Validação aceita `isInvestment`

**What**: `isInvestment: z.boolean().default(false)` no item de `categorySetSchema`, repassado pela action sem mudança de código.
**Where**: `src/lib/validation/category.ts`
**Depends on**: T4
**Reuses**: schema `item` existente
**Requirement**: CATINV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Item sem o campo resulta em `isInvestment` false
- [ ] `true` e `false` passam e chegam à saída
- [ ] Valor não booleano (ex.: "sim") é rejeitado
- [ ] Teste de integração da action confirma gravação ponta a ponta (`src/actions/categories.int.test.ts`)
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: testes existentes + os novos passam (sem remoções)

**Tests**: unit
**Gate**: full

**Commit**: `feat(validation): accept the investment flag on categories`

---

### T6: Checkbox "Investimento / aporte" no editor

**What**: Estado `isInvestment` na linha, checkbox por categoria e envio no `save`.
**Where**: `src/components/category-editor.tsx`
**Depends on**: None (a fase 2 já está concluída)
**Reuses**: `Checkbox`, `Label`, `update(i, patch)`
**Requirement**: CATINV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Categoria nova começa desmarcada; categoria salva como investimento reabre marcada
- [ ] Marcar e salvar persiste a flag
- [ ] Gate check passes: `npm run build && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add investment checkbox to the editor`

---

### T7: Tabela com percentual compacto e excesso de investimento

**What**: Percentual via `formatPercentCompact` e texto verde "Excedeu a meta em R$ X" quando `exceeded`; despesas inalteradas.
**Where**: `src/components/summary-table.tsx`
**Depends on**: T6
**Reuses**: `text-income`, `formatBRL`
**Requirement**: CATINV-01, CATINV-04, CATINV-05, CATINV-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Coluna Percentual mostra "31,9%" para 31.931.878
- [ ] Investimento acima da meta: linha sem fundo vermelho, `data-overspent="false"`, texto "Excedeu a meta em R$ X" em `text-income`, sem "Estourou"
- [ ] Despesa estourada continua com `bg-destructive/5`, `data-overspent="true"` e "Estourou R$ X"
- [ ] Gráfico "Gasto × meta" sem rótulo "Estourou" para investimento (verificado na tela)
- [ ] Gate check passes: `npm run build && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(summary): compact percent and positive investment overshoot`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2
Phase 2:  T3 ------→ T4 ------→ T5
Phase 3:  T6 ------→ T7
```

Execução estritamente sequencial; 7 tasks cabem em um único lote, então roda inline sem sub-agentes. O Verifier roda ao final.

---

## Cross-Check de dependências

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None (fase 1 concluída) | início da fase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | None (fase 2 concluída) | início da fase 3 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |

## Validação de co-localização de testes

| Task | Camada | Matriz exige | Campo `Tests` | Status |
| ---- | ------ | ------------ | ------------- | ------ |
| T1 | Domain | unit | unit | ✅ OK |
| T2 | Domain | unit | unit | ✅ OK |
| T3 | Schema/migração | integration | integration | ✅ OK |
| T4 | Repository | integration | integration | ✅ OK |
| T5 | Validação | unit | unit | ✅ OK |
| T6 | UI | none | none | ✅ OK |
| T7 | UI | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| CATINV-01 | T1, T7 |
| CATINV-02 | T1 |
| CATINV-03 | T3, T4, T5, T6 |
| CATINV-04 | T2, T7 |
| CATINV-05 | T2, T7 |
| CATINV-06 | T2, T7 |
