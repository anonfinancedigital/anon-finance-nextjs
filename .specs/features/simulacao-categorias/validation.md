# Validation: simulacao-categorias - PASS ✅

**Date**: 2026-10-04
**Spec**: `.specs/features/simulacao-categorias/spec.md`
**Diff range**: `f188d75..6a10a59` (HEAD). Feature commits: 5622310 bd78595 e9b346a 17910d8 0302e18 36854cc 1f55895 b3398ca 2f95440 6a10a59. Ignored (unrelated user commits): e4eb92f, 43c7d3f.
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero, LIGHTWEIGHT mode (user request)
**Baseline**: `git status --porcelain` at start = ` M .specs/STATE.md`, ` M e2e/categories.spec.ts`, ` M e2e/summary.spec.ts`, ` M src/components/category-editor.tsx`, plus untracked `.agents/ .claude/ .cursor/ .specs/features/gastos-recorrentes/ .specs/features/subcategorias/`. Unchanged at end (verified with `diff`).

**Result**: PASS ✅ - 19/19 P1+P2 ACs and 5/5 edge cases mapped to `file:line` evidence whose asserted value matches the spec outcome; unit+int gates green; 5/5 mutants killed. 2 spec-precision gaps and 2 notes flagged (none blocking).

> **E2E not run in this verification (user request: lightweight mode).** e2e-only ACs below are evidenced by reading the Playwright tests; the last recorded worker gate run was **e2e 42 passed**. e2e line numbers refer to the files on disk (working tree), which include uncommitted edits (see Note N1).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T10 | ✅ Done | All Done-when boxes checked in `tasks.md`, 0 unchecked |

---

## Spec-Anchored Acceptance Criteria

### P1: Valor em R$ por categoria (SIM-01..04)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 field "Receita de referência (R$)", empty on open | label exact, value "" | `e2e/categories.spec.ts:77` `getByLabel("Receita de referência (R$)", { exact: true })`; `:95` `expect(income(page)).toHaveValue("")` | ✅ |
| AC2 column "Valor (R$)" between "Percentual (%)" and actions | header order | `e2e/categories.spec.ts:98` `expect(headers.slice(valueAt-1, valueAt+2)).toEqual(["Percentual (%)", "Valor (R$)", "Ações"])` | ✅ |
| AC3 round(receita × bp / 10000) in BRL (5.000 × 7,5% → R$ 375,00) | R$ 1.500,00 / 1.500,00 / 1.250,00 / 375,00 / 125,00 / 250,00 | `src/lib/domain/budget.test.ts:151` `expect(allocateCents(500000, 750)).toBe(37500)`; `:162` 6 Independent-Test values; `:166` `toBe(33330)`, `:170` half-cent `toBe(50001)`; `e2e/categories.spec.ts:101-102` per-row `toHaveText(value)` | ✅ |
| AC4 updates on percent/income change, no save/reload | R$ 500,00, soma R$ 5.125,00; income change → R$ 300,00 | `e2e/categories.spec.ts:107-109` `toHaveText("R$ 500,00")`, `toHaveText("R$ 5.125,00")`, "Categorias salvas" count 0; `:113-114` `R$ 300,00` / `R$ 1.025,00` | ✅ |
| AC5 footer sum in BRL while income valid | R$ 5.000,00 | `e2e/categories.spec.ts:103` `expect(amountSum(page)).toHaveText("R$ 5.000,00")` | ✅ |
| AC6 empty income → "—" everywhere incl. footer | "—" | `e2e/categories.spec.ts:125-126` every `amount(n)` and `amountSum` `toHaveText("—")` | ✅ |
| AC7 invalid income → `parseBRL` message + "—" | "abc", "0", "1.000.000.000,00" with exact parseBRL messages | `e2e/categories.spec.ts:129-143` `getByText(message, { exact: true })).toBeVisible()` + dashes for all three cases | ✅ |
| AC8 row with empty/invalid percent → "—" | "—" on that row | `e2e/categories.spec.ts:155` (empty), `:157` ("abc") `toHaveText("—")` | ✅ |
| AC9 save sends only name+percent, no income | income absent from payload | `e2e/categories.spec.ts:181-183` `expect(bodies[0]).not.toContain("4321")` | ⚠️ Spec-precision gap G1 |
| AC10 income kept after successful save | field keeps value | `e2e/categories.spec.ts:185` `toHaveValue("4321,09")`, `:186` `R$ 1.296,33`; `:189` reload → `""` | ✅ |

### P2: Cor por categoria (COR-01..04)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 8 colors with accessible names per row | Azul…Vermelho | `src/lib/domain/color.test.ts:6` `toEqual([...8 names])`; `e2e/categories.spec.ts:220-222` 8 radios `toHaveAccessibleName(colorName)` per row | ✅ (see N1) |
| AC2 chosen color persisted (1-8) and selected after reload | index persisted; Roxo after reload | `src/actions/categories.int.test.ts:133` `toEqual([["Custos fixos",7],…])`; `src/lib/db/repos/categories.int.test.ts:111,118`; `e2e/categories.spec.ts:242` `toHaveAccessibleName("Cor da categoria 4: Roxo")` after reload | ✅ |
| AC3 new row preselects first unused color, else 1 | [1,2] → Verde(3); all used → 1 | `src/lib/domain/color.test.ts:41-46` `nextFreeColor` `[[],1],[[1,2],3],[[2],1],[[1..8],1]`; `e2e/categories.spec.ts:254` "…3: Verde", `:265` "…9: Azul" | ✅ |
| AC4 color outside 1-8 / non-integer → reject whole set, "Cor inválida" on the row | nothing written; message on row | `src/lib/validation/category.test.ts:40-52` 0, 9, 2.5, "3", missing → `{ path: "1.color", message: "Cor inválida" }`; `src/actions/categories.int.test.ts:154-158` `fieldErrors: { "1.color": "Cor inválida" }` + `list(userId)).toEqual(saved)` + no revalidate; `src/lib/db/schema.int.test.ts:89-100` CHECK/NOT NULL | ⚠️ G2 (UI rendering of the row message has code evidence only: `src/components/category-editor.tsx:205,228`) |
| AC5 migration backfill ((pos−1) mod 8)+1 per user by creation order | 1..8,1 and 1,2 | `src/lib/db/schema.int.test.ts:145` `toEqual([1,2,3,4,5,6,7,8,1])`, `:146` `toEqual([1,2])` (runs the real UPDATE from `drizzle/0002_category_color.sql`, rows inserted in reverse + interleaved) | ✅ |
| AC6 pie slice + legend in category color, no "Outras" | `var(--viz-7)` fill and swatch | `e2e/charts.spec.ts:81-86` sector `path[fill="var(--viz-7)"]` count 1, swatch style `var(--viz-7)`; `:103` `not.toContainText("Outras")` | ✅ |
| AC7 summary row marker in category color | `var(--viz-7)` next to "Metas" | `e2e/summary.spec.ts:111-112` marker style `/background: ?var\(--viz-7\)/`, Moradia `--viz-1` | ✅ |
| AC8 transaction-list expense marker in category color | `var(--viz-7)`; income none | `e2e/transaction-list.spec.ts:78-80` count 1, style `var(--viz-7)`, income count 0 | ✅ |
| AC9 render via `var(--viz-N)` token | `var(--viz-N)` | `src/lib/domain/color.test.ts:20-26` `colorVar(7) === "var(--viz-7)"`; e2e assertions above all match the token; used at `budget-charts.tsx:101`, `summary-table.tsx:53`, `transaction-list.tsx:71` | ✅ |

**Status**: ✅ All 19 ACs covered; ⚠️ 2 spec-precision gaps flagged.

---

## Edge Cases

- [x] New row with empty percent → "—": `e2e/categories.spec.ts:155`
- [x] Sum ≠ 100% still shows R$ sum: `e2e/categories.spec.ts:108` `R$ 5.125,00`
- [x] Removing a row recalculates the sum: `e2e/categories.spec.ts:160-161` `R$ 3.500,00`
- [x] Two categories with the same color save normally: `e2e/categories.spec.ts:268-283`; `src/actions/categories.int.test.ts:130` (7,7 persisted)
- [x] >8 categories with spending → all own slices: `e2e/charts.spec.ts:101-108` 9 sectors, 9 legend items, no "Outras", C9 `var(--viz-1)`, no `--viz-other`

---

## Discrimination Sensor

Run in a detached `git worktree` of HEAD under the session scratchpad (node_modules symlinked, test DB `orcamento_test` only); only the relevant test file run; worktree removed; real tree `git status --porcelain` unchanged.

| # | File | Mutation | Test run | Killed? |
| - | ---- | -------- | -------- | ------- |
| 1 | `src/lib/domain/budget.ts:44` | `Math.round` → `Math.floor` in `allocateCents` | `budget.test.ts` | ✅ Killed (2 failing: half-cent cases `:142`, `:170`) |
| 2 | `src/lib/domain/color.ts:24` | `nextFreeColor` fallback `?? 1` → `?? 8` | `color.test.ts` | ✅ Killed (all-used → 1) |
| 3 | `src/lib/domain/color.ts:19` | `isCategoryColor` bound `<= length` → `<= length + 1` | `color.test.ts`, `category.test.ts` | ✅ Killed (2 failing: rejects 9) |
| 4 | `drizzle/0002_category_color.sql:2` | backfill `ORDER BY "created_at"` → `"created_at" DESC` | `schema.int.test.ts -t backfill` | ✅ Killed |
| 5 | `drizzle/0002_category_color.sql:2` | modulo `(rn - 1) % 8 + 1` → `rn % 8 + 1` | `schema.int.test.ts -t backfill` | ✅ Killed |

**Sensor depth**: lightweight (3 requested targets, 5 mutants)
**Result**: 5/5 killed - PASS ✅

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` (Node 20, local Docker `orcamento-pg`, `.env.test` → `orcamento_test`); `build` and `e2e` not run (lightweight, user request)
- **Result**: exit 0. typecheck ✅; lint ✅ 0 errors, 1 warning (`src/components/category-editor.tsx:60` `jsx-a11y/role-supports-aria-props`: `aria-invalid` on a button - in uncommitted code, see N1); unit **110 passed** (7 files); integration **98 passed** (9 files); 0 skipped
- **E2E**: not run here; last recorded worker gate run: 42 passed
- **Test count before/after**: not measured (lightweight)

---

## Spec-precision gaps and notes

- **G1 (P1 AC9)**: the spec says the save sends "apenas nome e percentual", but P2 makes the payload also carry `color` (and `id` for upsert). The test pins only the true intent (reference income absent: `not.toContain("4321")`). Suggest rewording AC9 to "sem a receita de referência".
- **G2 (P2 AC4)**: "exibir 'Cor inválida' na linha" is not reachable from the UI (the picker only offers 1-8), so the row rendering is evidenced by code only (`category-editor.tsx:205,228`); server rejection, nothing persisted, and the field path are fully tested.
- **N1 (uncommitted work outside the diff range)**: the working tree has uncommitted edits to `src/components/category-editor.tsx` (color picker turned into a button that opens the palette popover), `e2e/categories.spec.ts`, `e2e/summary.spec.ts`, and `.specs/STATE.md` (AD-004, AD-005). The unit/int gates above ran on this working tree; the e2e line numbers cited refer to it. Whether the recorded "e2e 42 passed" covered this uncommitted version was not verified here. It also introduces the lint warning above. P2 AC1 still holds (each row has a selector whose palette exposes the 8 named colors), but the palette now only appears after a click.
- **N2 (P2 AC9)**: light/dark switching is asserted at the token level (`var(--viz-N)`), not by toggling the theme. This matches the AC's wording.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| SIM-01 | Implementing | ✅ Verified |
| SIM-02 | Implementing | ✅ Verified |
| SIM-03 | Implementing | ✅ Verified |
| SIM-04 | Implementing | ✅ Verified (G1) |
| COR-01 | Implementing | ✅ Verified |
| COR-02 | Implementing | ✅ Verified (N1) |
| COR-03 | Implementing | ✅ Verified |
| COR-04 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 19/19 ACs + 5/5 edge cases matched the spec outcome | 2 spec-precision gaps (G1, G2)
**Sensor**: 5/5 mutations killed
**Gate**: typecheck + lint (1 warning) + unit 110 + int 98 passed; e2e not run (lightweight)

**Next steps**: reword P1 AC9 (G1); commit or revert the uncommitted color-picker change and rerun e2e for it, fixing the `aria-invalid` lint warning (N1).
