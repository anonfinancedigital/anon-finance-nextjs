# Categorias Novas Visíveis em Meses Anteriores Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/categorias-meses-anteriores/spec.md`
**Diff range**: `031062d~1..91abe51` (commits da feature: 031062d T1, 939dce9 T2, 91abe51 T3; o range também contém 67414e6 de `apice-meta-alcancada`, fora do escopo, ignorado)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: PASS

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | filtro `shown` removido em `src/lib/domain/budget.ts:164` |
| T2   | ✅ Done | `src/components/summary-table.tsx:90-93` |
| T3   | ✅ Done | `.specs/features/percentuais-historico/design.md:89-91` |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 mês anterior inclui categoria ativa sem vigência | linha presente, meta 0, gasto do mês | `src/lib/domain/budget.ts:164` (`categories.map`, sem filtro); `budget.test.ts:389` `expect(rows.map(r=>r.id)).toEqual(["c1","c2"])`; `:390-398` `targetCents: 0, spentCents: 0`; gasto: `:417-422` `spentCents: 2500` | ✅ PASS |
| AC2 "Sem meta" e "—" | meta "Sem meta", percentual "—" | `src/components/summary-table.tsx:90` `row.hasPercent === false ? "—" : ...`; `:92` `row.hasPercent === false ? "Sem meta" : formatBRL(...)`; `hasPercent` propagado por `...cat` (`budget.ts:172`) e definido em `src/lib/db/repos/categories.ts:90` (`hasPercent: percent !== null`), testado em `categories.int.test.ts:~464-469` (`hasPercent: false`). UI por inspeção (AD-005) | ✅ PASS (inspeção) |
| AC3 sem gasto: 0%, sem estouro/excedido | consumo 0%, `overspent`/`exceeded` false | `budget.test.ts:394-397` `overspent: false, overspentCents: 0, exceeded: false, consumedPct: 0`; UI: `summary-table.tsx:110,115` "Estourou"/"Excedeu" condicionados a `row.overspent`/`row.exceeded`; `:108` `{row.consumedPct}%` | ✅ PASS |
| AC4 com gasto: estourada = gasto, "Sem meta" mantido | `overspent` true, `overspentCents` = gasto | `budget.test.ts:417-422` `targetCents: 0, spentCents: 2500, overspent: true, overspentCents: 2500`; UI `summary-table.tsx:111-113` `Estourou {formatBRL(row.overspentCents)}` e `:92` | ✅ PASS |
| AC5 categorias com percentual inalteradas | meta, percentual e gasto iguais | `budget.test.ts:407` `toMatchObject({ targetCents: 500000, spentCents: 1000, overspent: false })`; `:432` `rows[0].targetCents` `toBe(500000)`; `:441-442` total/saldo | ✅ PASS |
| AC6 categoria excluída em M omitida de M em diante, mantida antes | ausente a partir de M, presente antes | `src/lib/db/repos/categories.int.test.ts:477-480` `expect(await names({year:2026,month:9})).toEqual(["Fica","Sai"])` / `names(OCT)` `toEqual(["Fica"])`; `:790-796` idem. Integração NÃO executada (sem DB `_test` privado); `git diff` da feature não toca `listForMonth`/repos, logo o teste existente não foi alterado | ✅ PASS (inspeção; int não rodado) |
| AC7 rosca sem fatia de gasto 0 | fatia ausente | `src/components/budget-charts.tsx:105` `.filter((s) => s.cents > 0)`; sem mudança de código (inspeção, AD-005) | ✅ PASS (inspeção) |

**Edge cases**
- [x] Categoria sem meta com gasto em mês anterior: estourada com o valor gasto (`budget.test.ts:417-422`).
- [x] Todas com percentual: mesmo conjunto de linhas (`budget.test.ts:425-433`, `hasPercent` omitido → 1 linha, meta 500000).

**Status**: ✅ All ACs covered. Nenhum spec-precision gap: os resultados da spec são valores exatos e as asserções os miram. Observação: AC2, 3 (parte UI), 4 (parte UI) e 7 não têm teste automático (AD-005); a evidência é inspeção de código.

---

## Discrimination Sensor

Scratch: `git worktree add --detach` em diretório temporário do scratchpad, `node_modules` por symlink; arquivo restaurado após cada mutante; worktree removido ao fim.

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| 1 | `src/lib/domain/budget.ts:164` | Reintroduziu o filtro `hasPercent !== false \|\| gasto > 0` | ✅ Killed (falha `keeps a category with hasPercent false and no spending...`) |
| 2 | `budget.ts:176` | `overspent: over && !investment` → `overspent: false` | ✅ Killed (5 falhas, incl. `...spending at target 0, overspent`) |
| 3 | `budget.ts:165` | `targetCents` zerado para categorias com percentual | ✅ Killed (19 falhas) |
| 4 | `budget.ts:169` | `spentCents > targetCents` → `>=` (sem meta e sem gasto vira estouro) | ✅ Killed (5 falhas, incl. `...no spending at target 0, not overspent`) |

**Sensor depth**: lightweight (4 mutações)
**Result**: 4/4 killed - PASS ✅
**Isolamento**: `git status --porcelain` da árvore real idêntico ao baseline (`?? .specs/features/data-nascimento/`, antes de criar este arquivo).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code (filtro removido, 2 células ramificadas) | ✅ |
| Surgical changes (só `budget.ts`, `budget.test.ts`, `summary-table.tsx`, design de percentuais-historico) | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation (domínio 1:1 com ACs 1,3,4,5; UI por inspeção) | ✅ |
| Todo teste mapeia a AC/edge case | ✅ (teste de total gasto = AC5) |
| Guidelines: `AGENTS.md` (AD-005 e2e suspenso), `vitest.config.ts` | ✅ |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit`
- **Result**: exit 0; 28 arquivos, 829 passed, 0 failed, 0 skipped
- **Test count before / after**: `budget.test.ts` ganhou +1 teste na feature (substituiu 1, adicionou 1: "leaves the target and spending ... unchanged"); nenhum teste removido sem substituição, asserções não enfraquecidas
- **Failures**: nenhuma

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| CATMES-01 (AC 1,3,4) | Pending | ✅ Verified |
| CATMES-02 (AC 2) | Pending | ✅ Verified (inspeção) |
| CATMES-03 (AC 5,6) | Pending | ✅ Verified (AC6 por teste int existente, não reexecutado) |
| CATMES-04 (AC 7) | Pending | ✅ Verified (inspeção) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 7/7 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 4/4 mutations killed
**Gate**: 829 passed

**Issues found (baixa severidade, sem bloqueio)**: (1) AC6 com integração não reexecutada; (2) UI de AC2/3/4/7 sem teste automático (aceito por AD-005).

**Next steps**: nenhum.
