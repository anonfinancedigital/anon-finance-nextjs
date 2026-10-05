# Ritmo sem Investimentos Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/ritmo-sem-investimento/spec.md`
**Diff range**: 0d607e4^..HEAD (spending-pace.ts + test, spending-pace-chart.tsx, budget-charts.tsx, app/(app)/page.tsx)
**Verifier**: independent sub-agent (author != verifier)
**Verdict**: PASS

## Task Completion

No tasks.md (medium scope). All 5 requirements implemented.

## Spec-Anchored Acceptance Criteria

Unit-testable ACs (PACE-01..03) are backed by assertions. The project has no component tests (AD-005 in .specs/STATE.md), so UI ACs (PACE-04, PACE-05) are verified by CODE INSPECTION only, not by an executed test.

| AC | Spec outcome | `file:line` + evidence | Result |
| -- | ------------ | ---------------------- | ------ |
| PACE-01 AC1: exclude investment expenses and targets from curve and ideal (off) | investment spend 0 in consumption curve | `spending-pace.test.ts:230` `expect(spent(consumption)[4]).toBe(0)`; `:232` total `[4]` `toBe(300000)`; impl `spending-pace.ts:81-82` | PASS |
| PACE-01 AC3: no-category expense is consumption | counted | `spending-pace.test.ts:257` `expect(spent(consumption)[29]).toBe(5000)`; impl `spending-pace.ts:82` (`categoryId === null`) | PASS |
| Edge: category without isInvestment is non-investment | counted | `spending-pace.test.ts:266` `toBe(700)`; impl `spending-pace.ts:75` (`=== true`) | PASS |
| PACE-02 AC2: R$3.000 on day 5, consumption below ideal -> no "Acima do ritmo ideal" | `aboveIdeal` false | `spending-pace.test.ts:229` `expect(consumption.aboveIdeal).toBe(false)`; UI label bound to `pace.aboveIdeal` at `spending-pace-chart.tsx:53` | PASS |
| PACE-02 AC4: ideal = straight-line of non-investment targets | 300000 consumption vs 600000 total | `spending-pace.test.ts:247-248` `idealCents).toBe(300000)` / `.toBe(600000)`; impl `spending-pace.ts:81` | PASS |
| PACE-03 AC5: only-investment month -> "Sem gastos no mês" | `hasSpending` false (consumption) | `spending-pace.test.ts:275` `expect(consumption.hasSpending).toBe(false)`, `:276` total true; render `spending-pace-chart.tsx:55,121` (UI by inspection) | PASS |
| PACE-03 AC6: zero consumption target -> no ideal line | `hasReference` false | `spending-pace.test.ts:288` `toBe(false)`, `:289` total `toBe(true)`; render guard `spending-pace-chart.tsx:62,94` (inspection) | PASS |
| PACE-04 AC1: control "Incluir investimentos" in card header, off on load | label + `useState(false)` | `spending-pace-chart.tsx:31` `useState(false)`; `:42-51` `action=` Switch with `aria-label` and text "Incluir investimentos" (inspection, AD-005) | PASS (inspection) |
| PACE-04 AC4: reset to off on month change | remount on month | `page.tsx:122` `key={`${month.year}-${month.month}`}` on BudgetCharts, which owns the chart state (`budget-charts.tsx:166`) (inspection) | PASS (inspection) |
| PACE-05 AC2/AC3: on -> total series; off -> consumption series | switch selects series | `spending-pace-chart.tsx:32` `includeInvestments ? paces.total : paces.consumption`; total view targets/occurrences `spending-pace.ts:84`, tests `:232,:236-242,:248` (inspection for the toggle) | PASS (inspection) |
| PACE-05 AC5: label from displayed series | `pace.aboveIdeal` of the chosen pace | `spending-pace-chart.tsx:32,53`; total flags at `spending-pace.test.ts:242` `toBe(true)` | PASS (inspection) |
| Edge: only consumption -> same curve with control on | equal curves | `spending-pace.test.ts:294` `expect(spent(consumption)).toEqual(spent(total))` | PASS |
| Edge: no expenses at all -> "Sem gastos no mês" | hasSpending false | `spending-pace.test.ts:150` `expect(pace.hasSpending).toBe(false)` (pre-existing) + `spending-pace-chart.tsx:121` | PASS |

**Status**: all ACs covered; UI ACs by inspection only (no component test, per AD-005).

## Gate

- `npx vitest run --project unit`: 17 files, 550 tests passed, 0 failed.
- `npx tsc --noEmit`: no errors.
- Wiring checked: `summary.rows` has `id`, `targetCents`, `isInvestment?` (budget.ts:77,85); transactions carry `categoryId` (transactions.ts:60); `page.tsx:45-50` passes them to `buildSpendingPaceViews`.

## Discrimination Sensor

Isolated git worktree in scratchpad (node_modules symlinked), removed afterwards; `git status --porcelain` before/after identical (` M docs/backlog.md`); no stash used.

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| 1 | `spending-pace.ts:82` | Inverted investment occurrence filter | Killed (4 failed) |
| 2 | `spending-pace.ts:82` | Uncategorized expenses excluded from consumption | Killed (1 failed) |
| 3 | `spending-pace.ts:81` | Consumption ideal uses all targets | Killed (2 failed) |
| 4 | `spending-pace.ts:75` | `isInvestment === true` -> `!== true` | Killed (5 failed) |
| 5 | `spending-pace.ts:84` | Total view filters out investment expenses | Killed (3 failed) |

**Sensor depth**: lightweight. **Result**: 5/5 killed - PASS.

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical / no scope creep | OK (diff confined to pace, card, wiring) |
| Every test maps to a spec requirement | OK (PACE-01..03 tagged) |

## Gaps (non-blocking)

1. UI ACs PACE-04/05 (toggle default off, reset on month change, label from displayed series) have no executed test; covered by inspection only (AD-005).
2. No test asserts that the total view with the same data reproduces the previous (pre-feature) `buildSpendingPace` output directly (Success Criterion 2); indirectly covered by `:232,:248`.
