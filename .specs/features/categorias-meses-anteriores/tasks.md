# Categorias Novas Visíveis em Meses Anteriores Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/categorias-meses-anteriores/design.md`
**Status**: In progress (T4-T6 adicionadas após revisão da spec)

Antes de qualquer comando: `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`. A árvore tem alterações não commitadas de outras features (`.specs/LESSONS.md`, `e2e/transaction-form.spec.ts`, `src/components/transaction-form.tsx`, `data-nascimento`, `apice-clareza`): cada commit adiciona só os arquivos da própria task (`git add <arquivos>`, nunca `-A`).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (ler os docs do Next antes de código Next; e2e suspenso), `.specs/STATE.md` AD-005, `vitest.config.ts` (projetos `unit` e `integration`, sem threshold).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain (`src/lib/domain`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Repository (`src/lib/db/repos`) | integration | Sem mudança de código; testes existentes de `listForMonth` continuam verdes | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Componentes (UI) | none | Typecheck, lint e build; e2e suspenso (AD-005); evidência por inspeção `file:line` | - | build gate |
| Docs de spec (`.specs`) | none | - | - | - |

## Gate Check Commands

> Generated from codebase (`package.json`) - confirm before Execute. Testes de integração exigem Postgres de teste com `DATABASE_URL` privado terminando em `_test`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com unit | `npm run test:unit` |
| Full | Tasks com integration | `npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de feature | `npm run typecheck && npm run lint && npm run test:unit` |

---

## Execution Plan

### Phase 1: Resumo sem meta

```
T1 → T2 → T3 → T4 → T5 → T6
```

---

## Task Breakdown

### T1: Incluir categorias sem vigência no resumo

**What**: `buildMonthlySummary` deixa de omitir categoria com `hasPercent === false`; ela vira linha com meta 0, sem estouro quando não há gasto.
**Where**: `src/lib/domain/budget.ts`
**Test files**: `src/lib/domain/budget.test.ts`
**Depends on**: None
**Reuses**: `buildMonthlySummary`, `Category.hasPercent` (comentário atualizado)
**Requirement**: CATMES-01, CATMES-03
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O filtro `shown` é removido e `rows` contém toda categoria recebida, na ordem recebida
- [x] Teste (AC 1, 3): `hasPercent: false` sem gasto → linha presente com `targetCents` 0, `spentCents` 0, `overspent` false, `exceeded` false, `consumedPct` 0
- [x] Teste (AC 4): `hasPercent: false` com gasto 2500 → `targetCents` 0, `overspent` true, `overspentCents` 2500
- [x] Teste (AC 5): categoria com `hasPercent` omitido mantém meta e gasto iguais aos de antes (`targetCents` 500000 para 100%)
- [x] O teste antigo "omits a category with hasPercent false and no spending" é substituído pelo de AC 1 e 3; o teste do total gasto continua verde
- [x] Gate check passes: `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(resumo): show categories without a percent in past months`

---

### T2: Exibir "Sem meta" na tabela do resumo

**What**: `SummaryTable` mostra "—" no percentual e "Sem meta" na meta quando `row.hasPercent === false`.
**Where**: `src/components/summary-table.tsx`
**Test files**: nenhum (UI sem teste automático, AD-005)
**Depends on**: T1
**Reuses**: células e classes existentes (`text-muted-foreground`)
**Requirement**: CATMES-02, CATMES-04
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com `hasPercent === false`, a coluna de percentual exibe "—" e a de meta exibe "Sem meta" (AC 2); com `hasPercent` true ou omitido, o conteúdo é o atual
- [x] Sem gasto, a linha não exibe "Estourou" nem "Excedeu" (AC 3); com gasto, exibe "Estourou" com o valor gasto (AC 4), por inspeção `file:line`
- [x] `SpendingShare` (`src/components/budget-charts.tsx:103-105`) já filtra gasto 0 (AC 7), confirmado por inspeção, sem alteração de código
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): label categories without a percent as sem meta`

---

### T3: Alinhar o design de percentuais-historico

**What**: Atualizar a descrição de `buildMonthlySummary` no design de `percentuais-historico` para a regra nova (linha presente, sem meta).
**Where**: `.specs/features/percentuais-historico/design.md`
**Test files**: nenhum
**Depends on**: T2
**Reuses**: texto atual da seção `buildMonthlySummary (ajuste)`
**Requirement**: CATMES-03
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A seção `buildMonthlySummary (ajuste)` diz que `rows` inclui a categoria com `hasPercent === false`, com meta 0, e aponta para `categorias-meses-anteriores`
- [x] Nenhuma outra linha do design contradiz a regra nova
- [x] Gate check passes: `npm run test:unit`

**Tests**: none
**Gate**: quick

**Commit**: `docs(percentuais-historico): align summary rule with categorias-meses-anteriores`

---

### T4: Sem estouro em categoria sem meta e omitir excluída vazia

**What**: `buildMonthlySummary` não marca estouro/excesso em linha `hasPercent === false` e omite a categoria `deleted` sem meta e sem gasto.
**Where**: `src/lib/domain/budget.ts`
**Test files**: `src/lib/domain/budget.test.ts`
**Depends on**: T3
**Reuses**: `buildMonthlySummary`; `Category` ganha `deleted?: boolean`
**Requirement**: CATMES-01, CATMES-05
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste (AC 3): `hasPercent: false` com gasto 2500 → `overspent` false, `overspentCents` 0, `exceeded` false, `consumedPct` 0, `spentCents` 2500
- [x] Teste (AC 4): o gasto da categoria sem meta entra em `summary.spentCents`
- [x] Teste (AC 8): `hasPercent: false`, `deleted: true`, sem gasto → ausente de `rows`
- [x] Teste (AC 8, edge): `hasPercent: false`, `deleted: true`, com gasto → linha presente com `targetCents` 0
- [x] Teste: `deleted: true` com `hasPercent` omitido (tem percentual) continua presente (AC 5, 6)
- [x] O teste "keeps ... with spending at target 0, overspent" é ajustado à regra nova (AC 3)
- [x] Gate check passes: `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `fix(resumo): no overspend without a target and hide empty deleted categories`

---

### T5: Marcar categoria excluída em listForMonth

**What**: `listForMonth` devolve `deleted: true` quando a categoria tem `deleted_from` não nulo.
**Where**: `src/lib/db/repos/categories.ts`
**Test files**: `src/lib/db/repos/categories.int.test.ts`
**Depends on**: T4
**Reuses**: `columns`, teste existente "shows a deleted category before deleted_from"
**Requirement**: CATMES-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Teste (AC 8): categoria com `deleted_from` posterior ao mês vem com `deleted: true`; categoria ativa vem com `deleted` false
- [ ] `deletedFrom` não aparece no objeto devolvido
- [ ] Gate check passes: `npm run test:unit && npm run test:int` (com `DATABASE_URL` privado `*_test`)

**Tests**: integration
**Gate**: full

**Commit**: `feat(categorias): flag deleted categories in listForMonth`

---

### T6: Restante e consumo "—" na tabela sem meta

**What**: `SummaryTable` exibe "—" no restante e no consumo (sem barra, sem "Estourou") quando `row.hasPercent === false`.
**Where**: `src/components/summary-table.tsx`
**Test files**: nenhum (UI sem teste automático, AD-005)
**Depends on**: T5
**Reuses**: células existentes
**Requirement**: CATMES-02, CATMES-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com `hasPercent === false`, restante e consumo exibem "—" e não há barra nem "Estourou" (AC 3), por inspeção `file:line`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `fix(resumo): hide remaining and consumption for categories without a target`
