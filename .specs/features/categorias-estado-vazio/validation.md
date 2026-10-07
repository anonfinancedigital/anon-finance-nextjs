# Categorias: Estado Vazio e Hierarquia Validation

## Validation: PASS (re-verification iteration 1 of 3; all ACs have evidence, no non-equivalent surviving mutant)

**Verdict**: PASS

**Date**: 2026-10-07
**Spec**: `.specs/features/categorias-estado-vazio/spec.md`
**Diff range**: `88a5144..28733d1`. Feature commits: 3ffb731..405abd3 (11) plus fix commit 28733d1. The interleaved `feat(apice)` commits belong to a concurrent feature and are out of scope
**Verifier**: independent sub-agent (author ≠ verifier)

History:
- **Iteration 0 (405abd3)**: FAIL. Mutant M9 survived because the case "sum > 100% with 2+ rows" was not asserted.
- **Iteration 1 (28733d1)**: two fixes.
  - F1: new test `src/lib/domain/allocation-view.test.ts:47-55`, `expect(allocationView(2, 105_000_000)).toMatchObject({ showSumWarning: true, showAdjust: true, saveHint: "Some 100% para salvar", progressValue: 100, progressText: "105,00% de 100% alocado" })`. M9 is now killed.
  - F2: ESV-07 AC2 reworded to "WHERE a receita base vem preenchida do mês e o campo está em edição com o valor inicial". Runtime observation R-I matches the new wording exactly.

Production code did not change between 405abd3 and 28733d1: the only categorias changes are the test file and the spec/tasks. All runtime observations below therefore still apply.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `src/lib/domain/allocation-view.ts`, 7 unit tests |
| T2 | ✅ Done | `src/components/allocation-progress.tsx` |
| T3 | ✅ Done | `src/components/sum-warning.tsx` |
| T4 | ✅ Done | `src/components/adjust-sum-bar.tsx` (`showWarning` prop) |
| T5 | ✅ Done | `src/components/reference-income-card.tsx` |
| T6 | ✅ Done | `src/app/(app)/categorias/page.tsx` |
| T7-T10 | ✅ Done | `src/components/category-editor.tsx` |
| T11 | ✅ Done | `e2e/categories.spec.ts:12,184,284,295` regex selectors (only change in the file) |

---

## How runtime evidence was obtained

The real HEAD (405abd3) was built (`npm run build`) and served with `next start --port 3200` against the private DB `orcamento_esv_test` (BETTER_AUTH_URL overridden to :3200). A throwaway Playwright script (in a scratch git worktree, removed afterwards) used `e2e/helpers.ts` (`resetDatabase`, `seedCategories`, `seedTransaction`, `login`), drove `/categorias` in Chromium at 1280×900 and 390×900, and logged DOM state: texts, element presence, `role=progressbar` attributes, `data-variant`, `title`, `aria-describedby` target, computed font size and color, and `getBoundingClientRect` left/right. The observations are labelled R-xx below. The dev server on :3000 and the dev data were not touched.

| Obs | State | Observed |
| --- | ----- | -------- |
| R-A | 0 categories, no income | empty text present; button `Adicionar primeira categoria` `data-variant="default"`, inside the empty card; no header row, no Soma, no `A soma deve ser 100%`, no select label, no `Rebalancear`, no `Salvar`; progressbar `aria-valuenow="0"`, `aria-valuemax="100"`, visible text `0% de 100% alocado`; no `.text-destructive` text anywhere in the form |
| R-B | after clicking `Adicionar primeira categoria` | empty text gone; table card with 1 row; Soma `0,00%` / `—` |
| R-B2 | after removing that row | empty state back (text + primary button), no Soma/Salvar |
| R-C | 1 row at 40% | warning `A soma deve ser 100%. Atual: 40,00%`, first child `<svg aria-hidden="true">`, color lab(60.9 60.9 28.1) (destructive red); no select or `Rebalancear`; Salvar `disabled`, `title="Some 100% para salvar"`, `aria-describedby` → `Some 100% para salvar`; progress `aria-valuenow="40"`, text `40,00% de 100% alocado` |
| R-G | 1 row, percent cleared with Ctrl+A/Backspace | progress `0` / `0% de 100% alocado`; warning `Atual: 0,00% (-R$ 5.000,00)` shown |
| R-D | 2 rows at 70% | warning + `Acrescentar a diferença em` select + `Rebalancear` present |
| R-E | 2 rows at 100% | no warning, no select/Rebalancear; Salvar enabled, `title` null, no `aria-describedby` |
| R-F | 2 rows at 105% | `aria-valuenow="100"`, indicator `translateX(0%)`, text `105,00% de 100% alocado`; warning + `Descontar…` select + Rebalancear |
| R-H | save at 100% with an empty name | `role="alert"` `Corrija os nomes das categorias`, first child `<svg>`, destructive color |
| R-K | headers (1280px) | `COR`, `CATEGORIA`, `ALOCAÇÃO (%)`, `VALOR PREVISTO (R$)`, `É INVESTIMENTO?`, `SUBCATEGORIAS`, `AÇÕES`, all `font-size: 12px` |
| R-S | Soma row alignment | 1280px: `category-sum` l/r 655/767 = row-1 percent column 655/767; `category-amount-sum` 779/923 = row-1 amount column 779/923. 390px: 33/145 = 33/145 and 157/301 = 157/301 |
| R-W | block widths | 1280px: income card, progress block, table or empty card, adjust bar all left 266 / right 1232 (0, 1, 2 rows; adjust bar measured in R-D and R-F); 390px: 16/374 for all present blocks |
| R-I | income | no month income: field with `R$` prefix, help `Informe para ver os valores em R$.`; month income 5.000 seeded: summary mode `Base de cálculo mensal`; after `Editar base`: field with `R$` and `Preenchido com a receita do mês; edite para simular.`; after typing 4000: no help; after clearing: `Informe para ver os valores em R$.` and Soma R$ `—` |
| R-P | page | `Defina quanto da receita do mês vai para cada categoria. A soma deve ser 100%.` present; `Alocação total obrigatória` absent |

---

## Spec-Anchored Acceptance Criteria

Only `allocationView` has automated tests (`src/lib/domain/allocation-view.test.ts`). UI ACs have no automated test (AD-005/AD-008), so the evidence for them is the implementing code `file:line` plus the runtime observation.

### P1: Estado vazio orientado (ESV-01, ESV-02)

| AC | Spec-defined outcome | Evidence (`file:line` + expression) | Result |
| -- | -------------------- | ----------------------------------- | ------ |
| 1 | exact empty text in place of the table | `src/components/category-editor.tsx:277-278` `view.empty ? <EmptyAllocation …/>`; `:144` text; `src/lib/domain/allocation-view.test.ts:6` `empty: true` for `(0, 0)`; R-A | ✅ PASS (runtime) |
| 2 | primary button `Adicionar primeira categoria` inside the empty block | `category-editor.tsx:146-148` `<Button type="button" onClick={onAdd}>` (default variant); R-A `data-variant="default"`, inside the card | ✅ PASS (runtime) |
| 3 | no headers, Soma, sum warning, select, Rebalancear, Salvar | `category-editor.tsx:277-418` (table branch only when not empty), `:420` `view.showSumWarning &&`, `:421` `view.showAdjust &&`, `:447` `view.showSave &&`; `allocation-view.test.ts:6-13` `showSumWarning: false, showAdjust: false, showSave: false`; R-A | ✅ PASS (runtime) |
| 4 | button creates one empty row and the table replaces the empty state | `category-editor.tsx:233-244` `add()` appends `{ name: "", percent: "" … }`; `:278` `onAdd={add}`; R-B | ✅ PASS (runtime) |
| 5 | removing the last row brings the empty state back | `category-editor.tsx:227-228` `remove()` filters rows; `:188` `allocationView(rows.length, …)`; R-B2 | ✅ PASS (runtime) |
| 6 | `role="progressbar"`, `aria-valuenow` 0, text `0% de 100% alocado` | `src/components/allocation-progress.tsx:8` `<Progress value={value} aria-label={text} …>`; `category-editor.tsx:275`; `allocation-view.test.ts:12-13` `progressValue: 0`, `progressText: "0% de 100% alocado"`; R-A | ✅ PASS (runtime) |

### P1: Validação e controles (ESV-03, ESV-04)

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| 1 | 1+ rows and sum ≠ 100% → red `A soma deve ser 100%. Atual: X` preceded by an alert icon | `src/components/sum-warning.tsx:7-10` `text-destructive`, `<AlertCircleIcon aria-hidden="true">` then text; `category-editor.tsx:420`; `allocation-view.test.ts:20` `showSumWarning: true` for `(1, 40_000_000)`, `:49` `showSumWarning: true` for `(2, 105_000_000)`, `:59` for `(1, 0)`; R-C, R-G, R-F | ✅ PASS (runtime) |
| 2 | exactly 1 row → no select, no Rebalancear | `allocation-view.ts:24` `showAdjust: rowCount >= 2 && !complete`; `allocation-view.test.ts:21` `showAdjust: false` for 1 row; `category-editor.tsx:421`; R-C | ✅ PASS (runtime) |
| 3 | 2+ rows and sum ≠ 100% → select + Rebalancear | `allocation-view.test.ts:30` `allocationView(2, 40_000_000).showAdjust).toBe(true)`, `:50` `showAdjust: true` for `(2, 105_000_000)`; `category-editor.tsx:421-434`; R-D, R-F | ✅ PASS (runtime) |
| 4 | 1+ rows → `{soma} de 100% alocado`, `aria-valuenow` = sum clamped 0..100 | `allocation-view.ts:27-28`; `allocation-view.test.ts:24-25` (40 / `40,00% …`), `:38` (`100,00% …`), `:43-44` and `:52-53` (100 / `105,00% …`), `:64` (`99,999999% …`); R-C, R-E, R-F | ✅ PASS (runtime) |
| 5 | sum = 100% and 1+ rows → no warning | `allocation-view.test.ts:35` `view.showSumWarning).toBe(false)` at `(2, 100_000_000)`; R-E | ✅ PASS (runtime) |
| 6 | save error in red with an alert icon | `category-editor.tsx:435-439` `role="alert"` `text-destructive` with `<AlertCircleIcon aria-hidden="true">`; R-H | ✅ PASS (runtime) |

### P2: Hierarquia e posição das ações (ESV-05)

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| 1 | `Adicionar categoria` inside the table card, after the last row, before Soma | `category-editor.tsx:398-402` (button), `:403` (Soma row), both inside the card at `:280`; R-B/R-C `inTableCard`, after the last row's remove button and before the Soma row in document order | ✅ PASS (runtime) |
| 2 | 1+ rows and sum ≠ 100% → Salvar disabled with `title="Some 100% para salvar"` | `category-editor.tsx:451-453` `disabled={!sumOk \|\| pending}`, `title={view.saveHint ?? undefined}`, `aria-describedby`; `:458-461` sr-only span; `allocation-view.test.ts:23` `saveHint: "Some 100% para salvar"` (1 row, 40%), `:51` same value for `(2, 105_000_000)`; R-C, R-F | ✅ PASS (runtime) |
| 3 | sum = 100% → Salvar enabled, no blocking `title` | `allocation-view.test.ts:37` `view.saveHint).toBeNull()`; `category-editor.tsx:451-452`; R-E | ✅ PASS (runtime) |

### P2: Linha Soma e cabeçalhos (ESV-06)

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| 1 | `Soma` under Categoria, % under Alocação, R$ under Valor Previsto, same widths | `category-editor.tsx:403-416` (`w-9` spacer, `min-w-40 flex-1` Soma, `COL_PERCENT`, `COL_AMOUNT`, trailing empty `COL_INVESTMENT`/`COL_COUNT`/`COL_ACTION` cells); R-S: left/right equal to the row columns at 1280px and 390px | ✅ PASS (runtime) |
| 2 | no valid reference income → `—` | `category-editor.tsx:410` `incomeCents === null ? "—" : formatBRL(amountSum)`; R-B, R-C, R-I (after clearing) | ✅ PASS (runtime) |
| 3 | first header `COR`, last `AÇÕES`, same font size | `category-editor.tsx:285` `COR`, `:291` `AÇÕES` (no `text-[10px]`), font from the row at `:283` `text-xs`; R-K all 12px | ✅ PASS (runtime) |
| 4 | investment column `É INVESTIMENTO?` | `category-editor.tsx:289`; R-K | ✅ PASS (runtime) |

### P3: Receita base, instrução, contraste, grade (ESV-07, ESV-08)

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| ESV-07/1 | `R$` prefix on the field while editing | `src/components/reference-income-card.tsx:70` `<InputAffix prefix="R$">`; R-A, R-I | ✅ PASS (runtime) |
| ESV-07/2 (reworded in 28733d1) | income prefilled from the month **and the field in edit mode with the initial value** → `Preenchido com a receita do mês; edite para simular.` under the field | `reference-income-card.tsx:52-57` `value === initialValue && initialValue !== ""`; `category-editor.tsx:274` `initialValue={initialIncome}`. R-I: summary mode shows no field and no help; after `Editar base` (field, initial value) the help is shown; after typing 4000 it is gone. This matches the new wording | ✅ PASS (runtime) |
| ESV-07/3 | empty field → `Informe para ver os valores em R$.` | `reference-income-card.tsx:53-54`; R-A, R-I | ✅ PASS (runtime) |
| ESV-08/4 | one instruction sentence, no `Alocação total obrigatória…` subtitle | `src/app/(app)/categorias/page.tsx:22-24`; R-P | ✅ PASS (runtime) |
| ESV-08/5 | `text-muted-foreground` ≥ 4.5:1 on the page background in the dark theme | `src/app/globals.css:132` `--muted-foreground: oklch(0.7 0.02 270)` vs `:119` `--background: oklch(0.15 0.015 270)` → **7.36:1**; vs `:121` `--card: oklch(0.2 0.02 270)` → **6.77:1**. Light: `:81` `oklch(0.45 0.02 270)` vs `:68` → **7.14:1**, vs `:70` `--card` white → **7.45:1**. Computed OKLCH → linear sRGB → WCAG relative luminance; browser-resolved colors (lab L 65.1 vs 3.0 dark) agree | ✅ PASS (measured) |
| ESV-08/6 | income card, indicator, table card, adjust bar share left and right edges | `category-editor.tsx:142` and `:280` `w-full`, `reference-income-card.tsx:47,77` (no `max-w-md`), form `space-y-4` `:268`; R-W 266/1232 for all four (1280px), 16/374 (390px) | ✅ PASS (runtime) |

### Edge Cases

| Edge case | Evidence | Result |
| --------- | -------- | ------ |
| sum > 100% → bar capped at 100%, text keeps the real sum | `allocation-view.ts:27`; `allocation-view.test.ts:43-44`, `:52-53` (2 rows, the case reachable in the UI); R-F (`aria-valuenow="100"`, `translateX(0%)`, `105,00% de 100% alocado`) | ✅ PASS (runtime) |
| cleared percent on a single row → `0% de 100% alocado` + warning | `allocation-view.test.ts:48-50`; R-G | ✅ PASS (runtime) |
| server returns an empty list after save → empty state | `category-editor.tsx:179-183` (`categories !== shown` → `setRows(categories.map(toRow))`), `:188`, `:277` | ✅ code evidence only. Not reachable through the UI: Salvar is not rendered with 0 rows (`:447`), so no save can return an empty set |

**Status**: all 25 ACs and 3 edge cases have evidence. The ESV-07/2 spec-precision note was resolved by the rewording in 28733d1. No open gap.

---

## Not runtime-verified

- Edge case 3 (server returns an empty list after save): code evidence only. It cannot be triggered from the UI, so it was not observed.
- ESV-08/5 contrast: computed from the tokens and cross-checked against browser-resolved colors. This is a measurement, not a visual inspection.

Every other AC was observed in a running build (see R-xx). None of the UI ACs has an automated test (AD-005/AD-008), so a future regression would only be caught by a manual check.

---

## Discrimination Sensor

Scratch: iteration 0 used `git worktree add --detach <scratchpad>/wt 405abd3`; iteration 1 used `<scratchpad>/wt2` at `28733d1`. Both had `node_modules` symlinked. Each mutation was applied to a copy of `src/lib/domain/allocation-view.ts` in the worktree, then `npx vitest run --project unit src/lib/domain/allocation-view.test.ts` was run there.

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| M1 | `src/lib/domain/allocation-view.ts:24` | `showAdjust: rowCount >= 2` → `>= 1` | ✅ Killed (1 failed) |
| M2 | `src/lib/domain/allocation-view.ts:28` | `sumMicro === 0 ? "0%"` → `"0,00%"` | ✅ Killed (2 failed) |
| M3 | `src/lib/domain/allocation-view.ts:27` | removed the upper clamp `Math.min(100, …)` | ✅ Killed (1 failed) |
| M4 | `src/lib/domain/allocation-view.ts:26` | `saveHint: showSave && !complete` → `!complete` | ✅ Killed (1 failed) |
| M5 | `src/lib/domain/allocation-view.ts:23` | `showSumWarning: rowCount >= 1 && !complete` → `!complete` | ✅ Killed (1 failed) |
| M6 | `src/lib/domain/allocation-view.ts:20` | `showSave = rowCount >= 1` → `>= 0` | ✅ Killed (1 failed) |
| M7 | `src/lib/domain/allocation-view.ts:22` | `empty: rowCount === 0` → `<= 1` | ✅ Killed (1 failed) |
| M8 | `src/lib/domain/allocation-view.ts:27` | removed the lower clamp `Math.max(0, …)` | ⚪ Survived in both iterations, equivalent: `parsePercent` rejects values < 0,000001 (`src/lib/domain/percent.ts:35`), so `sumMicro` is never negative |
| M9 | `src/lib/domain/allocation-view.ts:19` | `complete = sumMicro === TOTAL_MICRO` → `>= TOTAL_MICRO` | Iteration 0: ❌ survived. Iteration 1 (28733d1): ✅ **killed** (1 failed / 7 passed of 8; killed by `allocation-view.test.ts:47-55`). Unmutated: 8/8 pass |

**Sensor depth**: lightweight+ (9 mutations).
**Sensor outcome**: 8 killed, 1 equivalent (M8), 0 non-equivalent survivors.

Isolation: after each iteration I ran `git worktree remove --force` + `git worktree prune`. `src/lib/domain/allocation-view.ts` and `.test.ts` have no diff against HEAD in the real tree. The real tree's porcelain changed between baseline and after-check in both iterations, but only because a concurrent `apice-clareza` session committed and created files at the same time (iteration 1: untracked `src/lib/validation/goal-draft.ts` and `.test.ts`). Those files are not from this sensor: every mutation was confined to the scratch worktree.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / no scope creep | ✅ Only the task files changed (the 9 `src`/`e2e` files listed in tasks.md) |
| Surgical changes | ✅ The e2e diff is exactly the 4 selector lines (12, 184, 284, 295). The unrelated uncommitted files were not touched by the feature commits |
| Matches patterns | ✅ Reuses `Progress`, `InputAffix`, `sumWarning`, `COL_*` |
| No abstraction for single use | ✅ `EmptyAllocation` is a small local function. `SumWarning` is shared by the editor and `AdjustSumBar` |
| Soma row trailing empty cells (`category-editor.tsx:413-415`) | ✅ Justified for ESV-06/1: without them `flex-1` on `Soma` would push the % and R$ cells right. R-S confirms exact alignment |
| `w-full` on blocks (`:142`, `:280`) | ✅ Harmless. They are block children of `space-y-4`, so `w-full` is redundant but consistent with ESV-08/6. The real alignment fix was dropping `max-w-md` from the income card |
| Spec-anchored asserted values | ✅ `toEqual` on whole objects for `(0,0)` and `(1,40%)`. Exact strings for the progress text |
| Per-layer coverage (domain 1:1) | ✅ All `allocationView` branches asserted, including sum > 100% with 2+ rows (`:47-55`) |
| Every test maps to an AC / edge case / Done-when | ✅ All 8 tests map to T1 Done-when items, ESV-03/1, ESV-04/3 and ESV-05/2 |
| Guidelines | `AGENTS.md`, tasks.md Test Coverage Matrix (AD-005/AD-008) followed |

Side observations, not attributed to this feature: in the runtime harness, Playwright `fill("")` / `fill("20")` on an already-formatted percent field sometimes left a stale or concatenated value. Keyboard input behaved correctly. This comes from the pre-existing `percentFieldText` focus/format logic, which is outside this diff.

---

## Gate Check

- **Gate command** (Build): `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- typecheck: exit 0. lint: exit 0. build: exit 0 (12 routes)
- **unit**: 25 files, **730 passed**, 0 failed, 0 skipped
- **integration** (`DATABASE_URL=…/orcamento_esv_test`): 18 files, **500 passed**, 0 failed, 0 skipped
- **Test count before feature**: 723 unit (measured at `88a5144` in the scratch worktree)
- **Test count after feature**: 730 unit
- **Delta**: +7 (`allocation-view.test.ts`). No test removed or weakened
- Iteration 0 gate ran on the working tree at 405abd3 plus the unrelated uncommitted files listed at session start
- **Iteration 1 (28733d1)**:
  - typecheck exit 0, lint exit 0.
  - test:unit: **775 passed**, 0 failed, both on the working tree and on a clean worktree at 28733d1.
  - The expected figure was 731, i.e. 730 + 1. The extra 44 tests come from the concurrent `feat(apice)` commits interleaved in `405abd3..28733d1`. In that range the only categorias change to tests is 28733d1, which adds 1 test: `allocation-view.test.ts` goes from 7 to 8. No categorias test was removed.
  - build and test:int were not re-run: 28733d1 changes only a unit test and spec/tasks text, with no production code. Iteration 0 results (build OK, 500/500 integration) still apply

---

## Fix Plans

Iteration 0 Fix 1 (assert sum > 100% with 2+ rows) was applied in 28733d1 and verified: M9 is killed. No open fix plans.

---

## Ranked Gaps

None blocking. Informational:

1. **Edge case 3 is code-evidence only**: "server returns an empty list after save" cannot be reached from the UI, because Salvar is not rendered with 0 rows. Evidence: `src/components/category-editor.tsx:179-183`, `:188`, `:277`.
2. **No automated UI coverage** (AD-005/AD-008): every UI AC rests on the runtime observations in this report (R-xx), taken once against 405abd3. Production code is unchanged since then.

---

## Requirement Traceability Update

| Requirement | New Status |
| ----------- | ---------- |
| ESV-01 | ✅ Verified (runtime) |
| ESV-02 | ✅ Verified (runtime) |
| ESV-03 | ✅ Verified (runtime + unit) |
| ESV-04 | ✅ Verified (runtime + unit) |
| ESV-05 | ✅ Verified (runtime + unit) |
| ESV-06 | ✅ Verified (runtime) |
| ESV-07 | ✅ Verified (runtime; AC2 reworded in 28733d1) |
| ESV-08 | ✅ Verified (runtime + contrast measured) |

---

## Summary

**Overall**: ✅ Ready. Re-verification iteration 1 of 3.

**Spec-anchored check**: 25/25 ACs + 3/3 edge cases have evidence (24 ACs and 2 edge cases runtime-observed; ESV-08/5 measured; edge case 3 code-only). No open spec-precision gap.
**Sensor**: 9 mutations: 8 killed, 1 equivalent (M8), 0 non-equivalent survivors.
**Gate**: typecheck/lint OK; 775 unit passed (+1 categorias test; the rest are concurrent apice tests). Iteration 0: build OK, 500 integration passed.
