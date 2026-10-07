# Categorias Novas Visíveis em Meses Anteriores Validation

**Date**: 2026-10-07 (re-verificação após revisão da spec: ACs 3, 4, novo AC 8, CATMES-05; T4-T6)
**Spec**: `.specs/features/categorias-meses-anteriores/spec.md`
**Diff range**: `031062d~1..eb8d378` (commits da feature: 031062d T1, 939dce9 T2, 91abe51 T3, f03de78 T4, e4ff502 T5, eb8d378 T6; ignorados 67414e6, 84280a1, 113b5b0 de `apice-*` e alterações não commitadas de outras features)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: PASS

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | filtro removido |
| T2   | ✅ Done | "Sem meta" e "—" |
| T3   | ✅ Done | design de percentuais-historico |
| T4   | ✅ Done | `budget.ts:166-182` |
| T5   | ✅ Done | `categories.ts` (`deleted`) |
| T6   | ✅ Done | `summary-table.tsx:95-115` |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 categoria ativa sem vigência aparece | linha presente, meta 0, gasto do mês | `budget.ts:170` (`shown.map`; filtro só para `deleted`); `budget.test.ts:389` `expect(rows.map(r=>r.id)).toEqual(["c1","c2"])`, `:392-393` `targetCents: 0, spentCents: 0`; `categories-summary.int.test.ts:~102-107` `["A","B","C"]`, `targetCents: 0` | ✅ PASS |
| AC2 "Sem meta" / "—" | meta "Sem meta", percentual "—" | `summary-table.tsx:90` `row.hasPercent === false ? "—" : ...`; `:92` `"Sem meta"`; `hasPercent` vem de `categories.ts` (`hasPercent: percent !== null`), `categories.int.test.ts:~468` `hasPercent: false`. UI por inspeção (AD-005) | ✅ PASS (inspeção) |
| AC3 sem meta nunca estoura/excede; restante e consumo "—" | `overspent`/`exceeded` false, `overspentCents` 0; "—" em restante e consumo | `budget.ts:171,182` `const over = !noTarget && spentCents > targetCents`; `budget.test.ts:420-424` `overspent: false, overspentCents: 0, exceeded: false, exceededCents: 0, consumedPct: 0` (com gasto 2500); `:394-397` sem gasto; `categories-summary.int.test.ts` `overspent: false, overspentCents: 0` com gasto 7000; UI `summary-table.tsx:100` `row.hasPercent === false ? "—" : formatRemaining(row)`, `:103-104` `—` no lugar de barra/%, "Estourou"/"Excedeu" (`:116,121`) dependem de flags sempre falsas | ✅ PASS |
| AC4 gasto na coluna Gasto e no total | gasto exibido e somado | `summary-table.tsx:94` `formatBRL(row.spentCents)` incondicional; `budget.test.ts:434-435` `expect(summary.spentCents).toBe(3500)`, `balanceCents` `496500`; `categories-summary.int.test.ts` `expect(sep.spentCents).toBe(7000)` | ✅ PASS |
| AC5 categorias com percentual inalteradas | meta/percentual/gasto iguais | `budget.test.ts:407` `{ targetCents: 500000, spentCents: 1000, overspent: false }`; `:464` `rows[0].targetCents` `toBe(500000)` (deleted com percentual mantém); `:474` | ✅ PASS |
| AC6 excluída em M omitida de M em diante, mantida antes | ausente de M, presente antes | `categories.int.test.ts:471-481` `names(2026-09)` `["Fica","Sai"]`, `names(OCT)` `["Fica"]`; `:~782-797`; `budget.test.ts:457-465` mantém `deleted` com percentual. Rodado: 504 int passed | ✅ PASS |
| AC7 rosca sem fatia de gasto 0 | fatia ausente | `budget-charts.tsx:105` `.filter((s) => s.cents > 0)` (inalterado, inspeção) | ✅ PASS (inspeção) |
| AC8 excluída sem percentual e sem gasto omitida | ausente de `rows` | `budget.ts:167-169` `!(cat.deleted && cat.hasPercent === false && gasto === 0)`; `budget.test.ts:444` `expect(rows.map(r=>r.id)).toEqual(["c1"])`; flag vem do repo: `categories.ts` `deleted: deletedFrom !== null`, `categories.int.test.ts:~484-495` `[["Fica", false],["Sai", true]]` e `"deletedFrom" in c` falso | ✅ PASS |

**Edge cases**
- [x] Excluída sem meta com gasto: linha com valor e meta 0 (`budget.test.ts:453-454` `["c1","c2"]`, `{ targetCents: 0, spentCents: 2500, overspent: false }`); UI mostra "Sem meta" (`summary-table.tsx:92`).
- [x] Todas com percentual: mesmo conjunto (`budget.test.ts:473-474`).

**Status**: ✅ All ACs covered; 0 spec-precision gaps. AC2, UI de AC3/4 e AC7 sem teste automático (AD-005), evidência por inspeção.

---

## Discrimination Sensor

Scratch: `git worktree add --detach` em eb8d378 no scratchpad, node_modules por symlink, arquivo restaurado após cada mutante, worktree removido. Mutante 5 rodou integração com o DB privado `orcamento_catmes_test`.

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| 1 | `budget.ts:168` | Removeu o filtro de `deleted` (`() => true`) | ✅ Killed (`omits a deleted category with hasPercent false and no spending`) |
| 2 | `budget.ts:182` | `over` volta a ignorar `noTarget` | ✅ Killed (2 falhas, incl. `never marks ... as overspent`) |
| 3 | `budget.ts:174` | `consumedPct` deixa de zerar sem meta | ✅ Killed (`never marks ... even with spending`) |
| 4 | `budget.ts:168` | Filtro omite `deleted` mesmo com percentual (tira `hasPercent === false`) | ✅ Killed (`keeps a deleted category that has a percent in force`) |
| 5 | `categories.ts` | `deleted: deletedFrom !== null` → `false` | ✅ Killed (int `flags a category deleted after the month shown as deleted`) |

**Sensor depth**: lightweight (5 mutações)
**Result**: 5/5 killed - PASS ✅
**Isolamento**: `git status --porcelain` da árvore real idêntico ao baseline (`?? apice-folga-meta/`, `?? data-nascimento/`).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical (budget.ts, categories.ts, summary-table.tsx, testes) | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ |
| Coverage Expectation (domínio 1:1 com ACs; repo por integração; UI por inspeção) | ✅ |
| Todo teste mapeia a AC/edge case | ✅ |
| Guidelines: `AGENTS.md` (AD-005), `vitest.config.ts`; DB privado `*_test` | ✅ |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit`: exit 0; 28 arquivos, 833 passed, 0 failed, 0 skipped
- **Integração** (`DATABASE_URL=...localhost:5433/orcamento_catmes_test`, `npm run test:int`): 18 arquivos, 504 passed, 0 failed
- **Test count**: unit 829 → 833 (+4 na revisão); nenhum teste removido; asserção "overspent" do sem-meta alterada deliberadamente pela spec revisada (AC3), não é enfraquecimento

---

## Requirement Traceability Update

| Requirement | New |
| ----------- | --- |
| CATMES-01 (AC 1,3,4) | ✅ Verified |
| CATMES-02 (AC 2) | ✅ Verified (inspeção) |
| CATMES-03 (AC 5,6) | ✅ Verified |
| CATMES-04 (AC 7) | ✅ Verified (inspeção) |
| CATMES-05 (AC 8) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 8/8 ACs, 0 spec-precision gaps
**Sensor**: 5/5 killed
**Gate**: 833 unit + 504 int passed

**Issues (baixa severidade)**: UI de AC2/3/4/7 sem teste automático (AD-005). Nenhum teste de integração liga `deleted` ao `buildMonthlySummary` ponta a ponta (cada metade é testada em separado).

**Next steps**: nenhum.
