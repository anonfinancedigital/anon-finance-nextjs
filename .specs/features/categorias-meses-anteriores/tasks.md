# Categorias Novas Visíveis em Meses Anteriores Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/categorias-meses-anteriores/design.md`
**Status**: Done

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
T1 → T2 → T3
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
