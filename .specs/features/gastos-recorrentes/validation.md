## Validation: gastos-recorrentes - PASS

**Verdict**: PASS. Re-verification, iteration 2 of 3. Both gaps from iteration 1 are closed. The Build gate is green at HEAD `73accda`. All 5 sensor mutants were killed, including the M9 mutant that survived before. Every AC has `file:line` evidence. 6 UI criteria rest on code inspection only, because e2e is suspended under AD-005. This is an accepted limitation, not a gap.

**Date**: 2026-10-05
**Spec**: `.specs/features/gastos-recorrentes/spec.md`
**Diff range**: feature commits c961831 e7b143e 8d4c9cc 6fa3bf2 80f49ab 4cc84cd e34710f 3513edd 9a8f188 31e69da 40bd08d b583b0c 00e8e73 ff35f85 b395ca3, plus the fix commit 73accda. Verified at HEAD `73accda`. Commits from other features in between were ignored, except a7530ea (percent-micro), which settles iteration 1's schema/test mismatch.
**Verifier**: independent sub-agent (author != verifier). It used an isolated `git worktree` of HEAD with a hard-linked copy of `node_modules` (`cp -al`; Turbopack accepts it, while it rejects a symlink) and a private database, `orcamento_verify2_test`. Both were removed afterwards.

---

## Iteration 1 gaps: resolution

| Gap (iteration 1) | Resolution | Evidence |
| ----------------- | ---------- | -------- |
| Gate blocker: `percentMicro` in `src/actions/transactions.int.test.ts` vs `percentBp` in schema | a7530ea committed percent-micro. Schema, repo and tests now agree | typecheck exit 0; `test:int` 235/235 at HEAD |
| M9 survived: a split segment loses `description`/`subcategoryId` | 73accda adds a test that asserts the full payload of a split segment | `src/lib/db/repos/transactions.int.test.ts:786-829`. M9 now killed |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T13 | ✅ Done | All Done-when boxes checked in `tasks.md`. Tests exist as described |
| T14-T15 | ✅ Done | UI tasks have no tests (AD-005). Verified by code inspection |
| Fix 1 (gate) | ✅ Resolved | By a7530ea, the percent-micro feature commit |
| Fix 2 (split payload) | ✅ Done | 73accda |

---

## Spec-Anchored Acceptance Criteria

Evidence type: **T** = test assertion. **C** = code inspection only, because e2e is suspended (AD-005). The integration and unit test files below changed since b395ca3 only through line-for-line `percentBp` → `percentMicro` swaps and the test appended at line 786, so test line numbers from iteration 1 still hold. UI line numbers in `transaction-form.tsx` moved (61e3043) and are updated here.

### P1: Marcar como recorrente (RECUR-01..05)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 options, default "Não recorrente" (RECUR-01) | 3 options, "Não recorrente" default | C: `src/components/transaction-form.tsx:197-199` labels "Não recorrente"/"Sempre"/"Até mês/ano"; `:56` `recurrence: "none"`; `:207` `checked={(values.recurrence ?? "none") === option}` | ✅ C only |
| AC2 month field only for "Até mês/ano" (RECUR-01) | field visible only in `until` | C: `src/components/transaction-form.tsx:215` `values.recurrence === "until" &&`, `:220` `type="month"` | ✅ C only |
| AC3 "Sempre" stores one recurring row, no end (RECUR-02) | 1 row, recurring, end null | T: `src/lib/db/repos/transactions.int.test.ts:56-64` `$count == 1`, `toMatchObject({recurring: true, recurrenceDay: 15, seriesId: tx.id, recurrenceEnd: null})`; `src/actions/transactions.int.test.ts:183-185` | ✅ |
| AC4 "Até mês/ano" stores end month (RECUR-02) | recurring, end = final month | T: `src/lib/db/repos/transactions.int.test.ts:75-80` `recurrenceEnd: "2027-03-01"`; `src/actions/transactions.int.test.ts:196-198` `recurrenceEnd: "2026-12-01"` | ✅ |
| AC5 later month lists occurrence with same kind, amount, category, description, original day (RECUR-03) | 15/10 → 15/11, R$ 100,00 | T: `src/lib/db/repos/transactions.int.test.ts:170-182` `objectContaining({kind:"expense", date:"2026-11-15", amountCents:10000, categoryId: conforto, description:"Aluguel", month:"2026-11"})` | ✅ |
| AC6 listed between start and end month, inclusive (RECUR-03) | present Oct..Dec | T: `src/lib/db/repos/transactions.int.test.ts:199-200` `ids(2026,10)` / `ids(2026,12)` `toEqual([tx.id])`; `src/lib/domain/recurrence.test.ts:76` | ✅ |
| AC7 not in list or summary after end month (RECUR-03) | absent in list and totals | T: `src/lib/db/repos/transactions.int.test.ts:201` `ids(2027,1) toEqual([])`; `:686` `spentIn(2027-01) toBe(0)`; `src/lib/domain/recurrence.test.ts:82` | ✅ |
| AC8 not in list or summary before start month (RECUR-03) | absent in Sep/2026 | T: `src/lib/db/repos/transactions.int.test.ts:198` `ids(2026,9) toEqual([])`; `:675` `spentIn(2026-09) toBe(0)`; `src/lib/domain/recurrence.test.ts:71` | ✅ |
| AC9 recurring expense adds to category spend with single expenses (RECUR-04) | 10000 + 2500 = 12500 | T: `src/lib/db/repos/transactions.int.test.ts:714` `toBe(12500)`; `:715` `toBe(10700)` | ✅ |
| AC10 recurring income adds to month income; goals use it (RECUR-04) | 500000 + 1000 = 501000 | T: `src/lib/db/repos/transactions.int.test.ts:705-706` `toBe(500000)` / `toBe(501000)`. Goal step: C: `src/app/(app)/page.tsx:35` `buildMonthlySummary({ categories, ...totals })` | ✅ (goal step C only) |
| AC11 missing day → last day of month (RECUR-03) | 31/01 → 28/02/2026 | T: `src/lib/db/repos/transactions.int.test.ts:189` `toBe("2026-02-28")`; `src/lib/domain/recurrence.test.ts:55-57` | ✅ |
| AC12 "Recorrente" indicator (RECUR-05) | badge on every recurring row and occurrence | C: `src/components/transaction-list.tsx:87-90` `data-testid="recurring-badge"` "Recorrente". Data: T `src/lib/db/repos/transactions.int.test.ts:211-214` `[recurring.id, true, ...]`, `[single.id, false, ...]` | ✅ C only (UI) |

### P1: Validar a recorrência (RECUR-06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 no end month | "Informe o mês final" on `recurrenceEnd` | T: `src/lib/validation/transaction.test.ts:175-180` `toEqual({recurrenceEnd: ["Informe o mês final"]})`; `src/actions/transactions.int.test.ts:211,221` | ✅ |
| AC2 end before date month | "O mês final deve ser igual ou posterior ao mês do lançamento" | T: `src/lib/validation/transaction.test.ts:184-186`; `src/actions/transactions.int.test.ts:213-215,221` (09/2026 for 15/10/2026, the spec's Independent Test) | ✅ |
| AC3 invalid month (2000-01..2100-12) | "Mês final inválido" | T: `src/lib/validation/transaction.test.ts:196-201` (2026-13, 1999-12, 2101-01, "dezembro", 2026-1, 2026-00); `:205-209` 2100-12 accepted; `src/actions/transactions.int.test.ts:217` | ✅ (2000-01 lower bound acceptance not asserted, minor) |
| AC4 "none"/"forever" ignore end month | stored without end | T: `src/lib/validation/transaction.test.ts:212-218` `recurrenceEndMonth toBeNull()`; `src/actions/transactions.int.test.ts:231` `recurrenceEnd: null` | ✅ |

### P1: Editar uma ocorrência (RECUR-07, RECUR-08)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 edit loads the occurrence's data and current recurrence (RECUR-07) | form shows occurrence date, option and end month | C: `src/components/transaction-list.tsx:135-145` `defaultDate={editing.date}`, `month={editing.month}`, `date: editing.date`, `recurrence: !editing.recurring ? "none" : ...` | ✅ C only |
| AC2 M and later get kind, amount, category, description, day, recurrence (RECUR-07) | all fields from M on | T: `src/lib/db/repos/transactions.int.test.ts:814-815` Dec and Jan `toEqual(["expense", conforto, streaming, "Streaming", "2026-12-20"/"2027-01-20"])`; `:828` category change on a second split `toEqual(["expense", lazer, null, "Cinema", "2027-02-20"])`; amount `:320-326` `[[10000],[10000],[12000],[12000],[12000]]`; `src/actions/transactions.int.test.ts:391-392` | ✅ (was ❌ in iteration 1) |
| AC3 months before M unchanged (RECUR-07) | Oct, Nov keep R$ 100,00 and original fields | T: `src/lib/db/repos/transactions.int.test.ts:321-322`; `:816` Nov `toEqual(["expense", conforto, restaurante, "Aluguel", "2026-11-15"])`; `src/actions/transactions.int.test.ts:389-390` | ✅ |
| AC4 edit M then N (RECUR-08) | M..N-1 = M's edit, N.. = N's edit | T: `src/lib/db/repos/transactions.int.test.ts:336-342` `[[10000],[12000],[12000],[15000],[15000]]`; `src/lib/domain/recurrence.test.ts:244-250` | ✅ |
| AC5 edit M after N (RECUR-08) | M.. = M's edit, overrides N | T: `src/lib/db/repos/transactions.int.test.ts:346-352` `[[10000],[13000],[13000],[13000],[13000]]`; `src/lib/domain/recurrence.test.ts:262` | ✅ |
| AC6 edit to "Não recorrente" (RECUR-08) | M single row; later months empty | T: `src/lib/db/repos/transactions.int.test.ts:382-388` `[10000, true]`, `[11000, false]`, `listIn(2027-01) toEqual([])`; `src/actions/transactions.int.test.ts:422-424` | ✅ |
| AC7 date month changed (RECUR-07) | "A data deve estar no mês da ocorrência" on `date` | T: `src/actions/transactions.int.test.ts:404-410` `fieldErrors: { date: "A data deve estar no mês da ocorrência" }`, `$count 1` | ✅ |
| AC8 edit at series start changes whole series (RECUR-07) | in place, 1 row | T: `src/lib/db/repos/transactions.int.test.ts:362-372` `$count 1`, `objectContaining({amountCents: 9000, categoryId: lazer, description: "Aluguel novo"})` | ✅ |

### P2: Excluir uma ocorrência (RECUR-09)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 delete M removes M and later | Dec.. empty | T: `src/lib/db/repos/transactions.int.test.ts:508-513` `[[500000],[500000],[],[]]`; `src/actions/transactions.int.test.ts:558-559` | ✅ |
| AC2 earlier months kept | Oct, Nov keep the income | T: same lines; `src/actions/transactions.int.test.ts:556-557` | ✅ |
| AC3 delete at series start removes all months | 0 rows | T: `src/lib/db/repos/transactions.int.test.ts:522-523` `$count 0`, `[[],[],[]]`; `src/actions/transactions.int.test.ts:567` | ✅ |
| UI: recurring delete text + month passed | "Excluir esta e as próximas ocorrências?"; `deleteTransaction(id, month)` | C: `src/components/transaction-list.tsx:163`, `:64` | ✅ C only |

**Status**: ✅ All 28 criterion rows covered. 0 gaps. 6 rows rest on code inspection only (AD-005, accepted limitation):

1. RECUR-01 AC1: options and default (`transaction-form.tsx:56,197-199,207`)
2. RECUR-01 AC2: month field only for "Até mês/ano" (`transaction-form.tsx:215-220`)
3. RECUR-05 AC12: "Recorrente" badge (`transaction-list.tsx:87-90`)
4. RECUR-07 AC1: edit form loads the occurrence (`transaction-list.tsx:135-145`)
5. RECUR-09 UI: confirmation text and month passed to delete (`transaction-list.tsx:64,163`)
6. RECUR-04 AC10, goal step: the summary uses the totals (`src/app/(app)/page.tsx:35`)

---

## Edge Cases

- [x] 31/01/2026 → 28/02/2026: `src/lib/db/repos/transactions.int.test.ts:189` `toBe("2026-02-28")`. Day 31 is kept after an edit of the 28/02 occurrence: `:398-400` `["2026-03-31", 20000]`.
- [x] End month = date month → only the original: `src/lib/validation/transaction.test.ts:189-193`; `src/lib/db/schema.int.test.ts:343`; `src/lib/domain/recurrence.test.ts:82`. Composite evidence. No single test lists month M+1 for such a series. The applicableInMonth end bound is discriminated (M17 killed).
- [x] Category with a recurring expense cannot be deleted: `src/lib/db/repos/transactions.int.test.ts:580-584` `toEqual({ok: false, error: "Esta categoria tem 1 gasto e não pode ser excluída"})`.

---

## Payload / Conjunction Check

| Field | Asserted on value? | Evidence |
| ----- | ------------------ | -------- |
| `recurring`, `recurrence_day`, `recurrence_end` | ✅ | `src/lib/db/repos/transactions.int.test.ts:58-60,77-79,111`; truncation `:549-551` |
| `series_id` | ✅ | `:60`; split keeps the series: `src/lib/domain/recurrence.test.ts:205` |
| `kind`, `categoryId`, `subcategoryId`, `description`, day on a split segment | ✅ | `src/lib/db/repos/transactions.int.test.ts:814-816,828` (M9 and M16 killed) |
| `Occurrence` fields | ✅ | `src/lib/db/repos/transactions.int.test.ts:170-182`, `:211-214` |

---

## Cross-Cutting Requirements (code inspection)

| Requirement | Finding | Evidence |
| ----------- | ------- | -------- |
| AD-004: every month read uses `applicableInMonth` | ✅ | `src/lib/db/repos/transactions.ts:274` (`listByMonth`), `:307` (`monthTotals`); only caller `src/app/(app)/page.tsx:32-33` |
| Month lock only on stored recurring rows | ✅ | `src/actions/transactions.ts:92` `stored.recurring && monthKey(data.date) !== occurrenceMonth` |
| Category deletion blocked | ✅ | `src/lib/db/repos/categories.ts:91-97` |

---

## Discrimination Sensor

The sensor ran in the isolated worktree of HEAD `73accda` with the private DB. Each mutant ran against `src/lib/db/repos/transactions.int.test.ts` and `src/actions/transactions.int.test.ts` (106 tests) and was reverted with `git checkout` in the scratch.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M9 (re-run) | `src/lib/db/repos/transactions.ts:212` | split insert sets `description: null, subcategoryId: null` | ✅ Killed (1 int: `transactions.int.test.ts:786`) |
| M16 | `src/lib/db/repos/transactions.ts:212` | split insert drops the edited day (`recurrenceDay` forced to 1) | ✅ Killed (2 int) |
| M17 | `src/lib/db/repos/transactions.ts:84` | `applicableInMonth` end bound `gte` → `gt` (end month excluded) | ✅ Killed (14 int). The first attempt crashed because `gt` was not imported. It was re-run with the import added, so the kill is behavioral |
| M18 | `src/lib/db/repos/transactions.ts:236` | `deleteFrom` truncates at month M instead of M-1 | ✅ Killed (2 int) |
| M19 | `src/lib/db/repos/transactions.ts:83` | recurring start bound `lt(date, endExclusive)` → `lt(date, range.start)` (start month excluded) | ✅ Killed (18 int) |

Iteration 1 mutants M1-M8 and M10-M15 were killed against code that 73accda does not change (73accda only adds a test).

**Sensor depth**: expanded (data-integrity path; 15 mutants in iteration 1, plus 5 here)
**Result**: 5/5 killed - PASS ✅
**Isolation**: the real tree's `git status --porcelain` matched the pre-sensor baseline after cleanup.

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` (Build level, from `tasks.md`). Ran on HEAD `73accda` with Node v20.20.2 in the isolated worktree with the private DB `orcamento_verify2_test`.
- **typecheck**: ✅ exit 0
- **lint**: ✅ exit 0
- **build**: ✅ exit 0 (`next build`, with `node_modules` hard-linked via `cp -al`)
- **test:unit**: ✅ 324 passed, 0 failed, 0 skipped (12 files)
- **test:int**: ✅ 235 passed, 0 failed, 0 skipped (11 files)
- **Test count delta**: integration 234 → 235 (+1 from 73accda). The unit count grew from other features (296 → 324). No test was removed or weakened.
- **Skipped tests**: none.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ 73accda touches only the test file. The b583b0c contamination is moot now that a7530ea landed |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ messages, dates, amounts and month sets match the spec verbatim |
| Per-layer Coverage Expectation met | ✅ domain 1:1; repo split payload now covered |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md`, `tasks.md` Test Coverage Matrix | ✅ |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| RECUR-01 | Pending | ✅ Verified (code inspection only, AD-005) |
| RECUR-02 | Pending | ✅ Verified |
| RECUR-03 | Pending | ✅ Verified |
| RECUR-04 | Pending | ✅ Verified (goal step by code inspection) |
| RECUR-05 | Pending | ✅ Verified (code inspection only, AD-005) |
| RECUR-06 | Pending | ✅ Verified |
| RECUR-07 | ❌ Needs Fix | ✅ Verified |
| RECUR-08 | Pending | ✅ Verified |
| RECUR-09 | Pending | ✅ Verified (UI by code inspection) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 28/28 criterion rows match the spec outcome; 0 gaps; 6 rows by code inspection only (AD-005, accepted limitation)
**Sensor**: 5/5 killed (M9 re-run plus 4 new)
**Gate**: typecheck, lint and build pass; unit 324/324; integration 235/235

**Minor notes (not blocking)**: the acceptance of the RECUR-06 AC3 lower bound 2000-01 is not asserted. The "end month = date month" edge case rests on composite evidence. Changing `kind` on a split segment is not exercised.

**Next steps**: none. The feature is done.
