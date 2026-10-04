# Validation: orcamento-domestico - PASS ✅

**Date**: 2026-10-04
**Spec**: `.specs/features/orcamento-domestico/spec.md`
**Diff range**: `23b1aee..943724e` (root commit through HEAD, 31 commits, 87 files)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Baseline**: HEAD `943724e`; `git status --porcelain` = `?? .agents/`, `?? .claude/`, `?? .cursor/` (pre-existing, unrelated)

**Result**: PASS ✅ - every AC (P1 and P2) and edge case has `file:line` evidence, 19/19 mutants killed, full Build gate green. 4 spec-precision gaps and 4 deviations flagged below (none blocking).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T31 | ✅ Done | 118 Done-when boxes checked, 0 unchecked in `tasks.md` (header still says "In Progress"; orchestrator should flip it) |

---

## Spec-Anchored Acceptance Criteria

Legend: ✅ PASS - assertion targets the spec outcome; ⚠️ - covered, but the spec does not pin the exact outcome (spec-precision gap) or there is a minor evidence note.

### P1: Categorias com meta percentual (CAT-01..03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 save valid name+percent → persist and list | persisted and shown in list | `src/actions/categories.int.test.ts:45` - `expect(await saveCategories(FIVE)).toEqual({ ok: true })` + `:47` `expect(await names()).toEqual([["Custos fixos",3000],…])`; `e2e/categories.spec.ts:36` - `toHaveValue(catName)` after reload | ✅ |
| AC2 set summing 100% → accepted | accepted | `src/lib/domain/budget.test.ts:8` - `toEqual({ ok: true })` for 30/30/10/10/20; `src/actions/categories.int.test.ts:45` | ✅ |
| AC3 sum ≠ 100% → block + "A soma dos percentuais deve ser 100% (atual: X%)" | exact message, nothing saved | `src/actions/categories.int.test.ts:60-64` - `error: "A soma dos percentuais deve ser 100% (atual: 95%)"` + `names()` `toEqual([])`; `src/lib/domain/budget.test.ts:15,22,29` (105%, 0%, 99,99%); `e2e/categories.spec.ts:48,50` - text visible + `Salvar` `toBeDisabled()` | ✅ |
| AC4 percent < 0,01, > 100 or > 2 decimals → reject with validation message | rejected + message (text not defined by spec) | `src/actions/categories.int.test.ts:75` - `toMatchObject({ ok:false, fieldErrors: {"0.percent": message} })` for "0", "100,01", "12,345"; `src/lib/domain/percent.test.ts:18-19` ("0,001", "-1", …) | ⚠️ spec-precision (message text unspecified; impl text pinned) |
| AC5 name empty / > 40 chars / case-insensitive duplicate → reject | rejected + message (text not defined) | `src/actions/categories.int.test.ts:89-93` - `fieldErrors: {"1.name": message}` for "", 41×"x", "conforto" vs "Conforto"; `src/lib/domain/budget.test.ts:40,51,70`; 40 chars accepted `budget.test.ts:55-60` | ⚠️ spec-precision (message text unspecified; impl text pinned) |
| AC6 delete category with expenses → block + inform count | blocked, count shown | `src/actions/categories.int.test.ts:120-124` - `toEqual({ ok:false, error:"Esta categoria tem 2 gastos e não pode ser excluída" })` + set unchanged; `src/lib/db/repos/categories.int.test.ts:88-92` (3 gastos, rollback); `e2e/categories.spec.ts:70` | ✅ |
| AC7 delete category without expenses → removed, sum must return to 100% before save | removed; save gated on 100% | `src/lib/db/repos/categories.int.test.ts:103-104` - `replaceSet(...)` `toEqual({ ok:true })` + `list` `toEqual(next)` (removed + rebalanced); gating via same set rule `src/actions/categories.int.test.ts:60` | ✅ (note: no test removes a category and then saves with sum ≠ 100; covered by the generic sum rule on the same code path) |

### P1: Registrar ganhos e gastos (TRX-01..04)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 expense with date, amount, category, optional description → persisted, listed in the date's month | row in month list with all fields | `src/actions/transactions.int.test.ts:68` - `listByMonth(OCTOBER)` `toMatchObject([{ kind:"expense", amountCents:20000, date:"2026-10-15", categoryId, description:"Cinema" }])`; `e2e/transaction-form.spec.ts:42-45` | ✅ |
| AC2 income → persisted, included in the month's revenue | month income includes it | `src/actions/transactions.int.test.ts:87` - `expect(totals.incomeCents).toBe(500000)`; `:88` row `categoryId: null` | ✅ |
| AC3 amount ≤ 0 or > R$ 999.999.999,99 → reject | rejected + message | `src/actions/transactions.int.test.ts:103` - `fieldErrors: { amount: "O valor deve ser maior que zero" / "O valor máximo é R$ 999.999.999,99" }` + `$count` 0; boundary `src/lib/domain/money.test.ts:14` (0,01 and 999.999.999,99 accepted) | ⚠️ spec-precision (message text unspecified; impl text pinned) |
| AC4 date empty or invalid → reject | rejected + message | `src/actions/transactions.int.test.ts:103` - `fieldErrors: { date: "Informe a data" / "Data inválida" }`; `src/lib/validation/transaction.test.ts:63` | ⚠️ spec-precision (same as above) |
| AC5 expense without category / non-existent category → reject | rejected + message | `src/actions/transactions.int.test.ts:103` (`categoryId: "Selecione uma categoria"`), `:113` (`"Categoria não encontrada"` for random uuid), `:125` (other user's category) | ⚠️ spec-precision (same as above) |
| AC6 edit → updates date, amount, category, description; reflected in summary | all 4 fields changed, totals updated | `src/actions/transactions.int.test.ts:182` - `toMatchObject([{ amountCents:35050, date:"2026-11-02", categoryId:other.id, description:"Curso" }])` + `:192` `spentByCategory.get(other.id)).toBe(35050)` + `:193` `revalidatePath("/")`; `e2e/transaction-list.spec.ts:43` | ✅ |
| AC7 confirmed delete → removed, reflected in summary | gone, totals updated | `src/actions/transactions.int.test.ts:284` - `monthTotals(...).incomeCents).toBe(0)` + `:285` revalidate; `e2e/transaction-list.spec.ts:51` (after confirm dialog) | ✅ |
| AC8 same form submitted more than once within 2 s → one transaction | exactly 1 row | `src/actions/transactions.int.test.ts:136` - `$count(transaction)).toBe(1)` after two creates with same id; `src/lib/db/repos/transactions.int.test.ts:43`; `e2e/transaction-form.spec.ts:87` (dblclick → `toHaveCount(1)` after reload) | ✅ |
| AC9 list → month's transactions in descending date order | desc by date, month only | `src/lib/db/repos/transactions.int.test.ts:58` - `toEqual([oct31.id, oct15.id, oct01.id])` (excludes 09-30 and 11-01); `e2e/transaction-list.spec.ts:18-23` | ✅ |

### P1: Resumo de gastos por categoria (SUM-01..03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 per category: %, target (% × income), spent, remaining | exact values | `e2e/summary.spec.ts:24-31` - cells `["Conforto","30%","R$ 1.500,00","R$ 1.600,00","-R$ 100,00","Estourou R$ 100,00"]`; `src/lib/domain/budget.test.ts:83-91` (`targetCents:150000, remainingCents:-10000`) | ✅ |
| AC2 total income, total spent, balance | exact totals | `e2e/summary.spec.ts:38-40` - `R$ 5.000,00` / `R$ 1.600,00` / `R$ 3.400,00`; `src/lib/domain/budget.test.ts:132-136` (negative balance too) | ✅ |
| AC3 spent > target → highlight overspent + show excess R$ | highlighted + excess | `e2e/summary.spec.ts:30` - `"Estourou R$ 100,00"`; `src/lib/domain/budget.test.ts:89-90` (`overspent:true, overspentCents:10000`); equality not overspent `:96` | ✅ |
| AC4 spent ≤ target → progress bar with % consumed | bar value = consumed % | `e2e/summary.spec.ts:66-67` - progressbar `aria-valuenow "50"` + text `"50%"`; `src/lib/domain/budget.test.ts:96,101` (`consumedPct: 100`, `50`) | ✅ |
| AC5 income R$ 0,00 → targets R$ 0,00, categories with spending overspent | R$ 0,00 + overspent only when spent > 0 | `e2e/summary.spec.ts:83-89` - `"R$ 0,00"`, `data-overspent "true"`, `"Estourou R$ 50,00"`, untouched not overspent; `src/lib/domain/budget.test.ts:106,111` | ✅ |
| AC6 create/edit/delete reflected without manual reload | summary updates in place | `e2e/summary.spec.ts:63-67` - after save: `total-spent "R$ 750,00"`, balance `"R$ 4.250,00"`, row `"R$ 750,00"`; edit/delete: `revalidatePath("/")` asserted at `src/actions/transactions.int.test.ts:193,285` | ✅ (note: UI-level summary refresh asserted for create only) |
| AC7 integer cents, BRL format (R$ 1.234,56) | exact BRL text | `src/lib/domain/money.test.ts:34` - `formatBRL(123456)` `toBe("R$ 1.234,56")`; `src/lib/domain/money.test.ts:14` parse → integer cents; rounding `src/lib/domain/budget.test.ts:145` | ✅ |

### P2: Navegar entre meses (MON-01)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 open → current month (America/Sao_Paulo) | current SP month | `e2e/month-picker.spec.ts:14-15` - month input `toHaveValue(today)` + income of that month; `src/lib/domain/month.test.ts:6` | ✅ |
| AC2 select month → only that month's summary and list | month-scoped totals/list | `e2e/month-picker.spec.ts:26-40` - `R$ 100,00` / `R$ 250,00` and rows `[/Setembro/]` / `[/Outubro/]` per month | ✅ |
| AC3 transaction dated in another month → that month's summary | lands in date's month | `e2e/month-picker.spec.ts:73-78` - displayed Oct stays `R$ 0,00`; Sep shows `R$ 80,00` + row "Farmácia" | ✅ |
| AC4 month without transactions → zeroed summary + "Nenhuma transação neste mês" | exact message + zeros | `e2e/transaction-list.spec.ts:61` - message `toBeVisible()`; `e2e/month-picker.spec.ts:73-74` - `total-spent "R$ 0,00"` + message | ✅ (note: only total-spent asserted zero, not income/balance) |
| AC5 reload keeps month in URL | `?mes=` persisted | `e2e/month-picker.spec.ts:52-54` - URL `/?mes=2026-09`, input value, income after reload | ✅ |

### P2: Gráficos no resumo (CHT-01)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 bar chart: spent and target per category | 2 bars × category | `e2e/charts.spec.ts:21,23` - bar chart visible, `.recharts-bar-rectangle` `toHaveCount(6)` for 3 categories | ✅ |
| AC2 pie chart: share of each category in month spend | shares | `e2e/charts.spec.ts:28,30` - 3 sectors, legend `["Moradia50%","Conforto25%","Lazer25%"]` | ✅ (donut variant, see deviations) |
| AC3 total spend R$ 0,00 → omit pie, show "Sem gastos no mês" | exact text, no pie | `e2e/charts.spec.ts:62-63` - text visible, `pie-chart` `toHaveCount(0)` | ✅ |
| AC4 overspent bar distinct color + text label | color + label | `e2e/charts.spec.ts:47` - label `"Estourou R$ 100,00"`; `:49` - one `fill="var(--viz-over)"`; `:52` only one label | ✅ |

### P1: Acesso com login (AUTH-01..03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 correct credentials → session + redirect to current month's summary | session + `/` | `src/actions/auth.int.test.ts:55-57` - `rejects.toThrow("NEXT_REDIRECT /")`, `redirect` called with `"/"`, `sessionsOf(userId)).toBe(1)`; `e2e/login.spec.ts:8` | ✅ |
| AC2 invalid credentials → "E-mail ou senha inválidos" without telling which | identical exact message | `src/actions/auth.int.test.ts:64-65` - wrong password and wrong e-mail both `toEqual({ ok:false, error:"E-mail ou senha inválidos" })`; `e2e/login.spec.ts:13` | ✅ |
| AC3 no session → page redirects to login / data API answers 401 | redirect / 401 | pages: `e2e/proxy.spec.ts:6` (`/`, `/categorias` → `/login`), `src/lib/auth-guard.int.test.ts:33-34` (page guard `redirect("/login")`); data writes: `src/lib/auth-guard.int.test.ts:29` and every action `src/actions/transactions.int.test.ts:143,252,313`, `src/actions/categories.int.test.ts:132-134` - `toEqual({ ok:false, error:"UNAUTHORIZED" })` + no write | ✅ (accepted deviation D1: 401 → `UNAUTHORIZED` result) |
| AC4 5 failures in 15 min for the same e-mail → block new attempts for 15 min | blocked even with right password; released after 15 min | `src/actions/auth.int.test.ts:75-79` - 6th attempt with correct password `toEqual({ error:"Muitas tentativas. Tente novamente em 15 minutos" })` + 0 sessions; `:100-101` released at 15 min + 1 s; `src/lib/db/repos/login-attempts.int.test.ts:15-20` (16-min-old failures ignored) | ⚠️ spec-precision (see Gap 1: lock duration semantics) |
| AC5 click "sair" → session ended | session invalid | `src/actions/auth.int.test.ts:122` - `getSession(...)).toBeNull()` after `signOutAction`; `e2e/app-shell.spec.ts:9,12` | ✅ |
| AC6 password stored only as salted hash | hash, never plain | `src/lib/db/seed-user.int.test.ts:29-31` - `row.password` `not.toBe(password)`, `not.toContain(password)`, `verifyPassword(...)).toBe(true)` | ✅ |

**Status**: ✅ All 38 ACs covered with `file:line` evidence (32 ✅, 6 ⚠️ spec-precision). No uncovered AC.

---

## Edge Cases

- [x] No categories when registering an expense → guide to create categories: `e2e/transaction-form.spec.ts:95-97` - link "Crie suas categorias primeiro" visible and navigates to `/categorias`.
- [x] 29/02 in a non-leap year → invalid: `src/lib/domain/month.test.ts:49` (`"2025-02-29"` → false), `src/lib/validation/transaction.test.ts:63`, `src/actions/transactions.int.test.ts:103` (`"2026-02-29"` → `"Data inválida"`).
- [x] 23:30 on 31/01 in America/Sao_Paulo → January: `src/lib/domain/month.test.ts:6` (`2026-02-01T02:30Z` → `{2026, 1}`); transactions store a calendar `date`, month boundaries `src/lib/db/repos/transactions.int.test.ts:58`.
- [x] DB unavailable on save → "Não foi possível salvar. Tente novamente" and typed data kept: message `src/actions/transactions.int.test.ts:154,269,323`, `src/actions/categories.int.test.ts:141-144`; form keeps values on any `ok:false` (`src/components/transaction-form.tsx:75`), asserted for the validation-error path at `e2e/transaction-form.spec.ts:64-67`. Note: data preservation is not asserted on the DB-error path itself (same branch).
- [x] Two edits of the same transaction in sequence → last value kept: `src/actions/transactions.int.test.ts:203-204` (`amountCents: 2000`), `src/lib/db/repos/transactions.int.test.ts:113` (`2222`).

---

## Deviations evaluated

| # | Deviation | Where | Verdict |
| - | --------- | ----- | ------- |
| D1 | AUTH-02 AC3 "responder 401" mapped to `{ ok:false, error:'UNAUTHORIZED' }` for Server Actions | design.md Risks; `src/lib/auth-guard.ts:23` | ✅ Accepted. The app exposes no REST data API; Server Actions are the only data endpoints, each starts with `requireSessionForAction` (`src/actions/transactions.ts:30,52,74`, `src/actions/categories.ts:12`) and is tested to write nothing without a session. Mutant M8 killed. |
| D2 | Native `<select>`/radios instead of shadcn Select (`// SPEC_DEVIATION`) | `src/components/transaction-form.tsx:42` | ✅ Accepted. Design-level choice; no spec AC names the widget. |
| D3 | Donut instead of pie chart | `src/components/budget-charts.tsx:124` (`innerRadius="55%"`) | ✅ Accepted. A donut is a pie with a hole and shows the same per-category share (CHT AC2 asserted at `e2e/charts.spec.ts:30`). |
| D4 | Lockout message always "minutos" (e.g. "1 minutos") | `src/actions/auth.ts:36` | ✅ Accepted (cosmetic). Spec defines no lockout message text. |

---

## Discrimination Sensor

Isolated scratch: `git worktree add --detach /tmp/claude-1000/orc-verify-wt HEAD` (own copy of `node_modules` for the e2e mutants), mutate → run unit + integration (and targeted e2e for U1/U2) → `git checkout` the file. Worktree removed with `git worktree remove --force` + `git worktree prune`.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/domain/budget.ts:31` | `sum !== TOTAL_BP` → `sum > TOTAL_BP` (accepts < 100%) | ✅ Killed (unit 2, int 1) |
| M2 | `src/lib/domain/budget.ts:79` | overspent `>` → `>=` | ✅ Killed (unit 2) |
| M3 | `src/lib/domain/budget.ts:70` | target `Math.round` → `Math.floor` | ✅ Killed (unit 1) |
| M4 | `src/actions/auth.ts:10` | lockout threshold 5 → 6 | ✅ Killed (int 2) |
| M5 | `src/lib/db/repos/transactions.ts:52` | `ON CONFLICT (id) DO NOTHING` removed | ✅ Killed (int 2) |
| M6 | `src/lib/domain/month.ts:33` | `monthRange.endExclusive` day `01` → `02` | ✅ Killed (unit 2, int 2) |
| M7 | `src/lib/db/repos/transactions.ts:44` | month filter `< endExclusive` → `<=` | ✅ Killed (int 2) |
| M8 | `src/lib/auth-guard.ts:23` | `requireSessionForAction` no-session check removed (bypass) | ✅ Killed (int 6) |
| M9 | `src/lib/db/repos/categories.ts:52` | category-with-expenses delete guard removed | ✅ Killed (int 2) |
| M10 | `src/actions/transactions.ts:23` | expense category existence/ownership check → `return true` | ✅ Killed (int 2) |
| M11 | `src/actions/auth.ts:11` | lockout window 15 → 16 min | ✅ Killed (int 3) |
| M12 | `src/lib/domain/month.ts:4` | current-month time zone `America/Sao_Paulo` → `UTC` | ✅ Killed (unit 4) |
| M13 | `src/lib/db/repos/transactions.ts:38` | update/delete ownership `userId` filter removed | ✅ Killed (int 4) |
| M14 | `src/lib/domain/budget.ts:86` | balance `income - spent` → `income + spent` | ✅ Killed (unit 2) |
| M15 | `src/actions/auth.ts:43` | failed login not recorded (side effect removed) | ✅ Killed (int 3) |
| M16 | `src/lib/domain/percent.ts:18` | percent upper bound 10000 → 10001 bp | ✅ Killed (unit 2, int 1) |
| M17 | `src/lib/domain/money.ts:26` | amount max `MAX_CENTS` → `MAX_CENTS + 1` | ✅ Killed (unit 2, int 1) |
| U1 | `src/components/summary-table.tsx:57` | overspent label/excess never rendered (`row.overspent ?` → `false ?`) | ✅ Killed (e2e summary.spec 2 failed; baseline 6/6 green in scratch) |
| U2 | `src/components/budget-charts.tsx:162` | pie shown when spend is 0 (`> 0` → `>= 0`) | ✅ Killed (e2e charts.spec 1 failed) |

**Sensor depth**: P0-full (money + auth; expanded manual fault injection, 19 mutants covering domain, repos, actions, guard and UI)
**Result**: 19/19 killed - PASS ✅
**Isolation**: real tree `git status --porcelain` after cleanup = baseline (`?? .agents/`, `?? .claude/`, `?? .cursor/`); HEAD unchanged `943724e`.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (greenfield feature; diff is the whole app) |
| No scope creep | ✅ (no out-of-scope items such as recurrence, import, multi-user) |
| Matches patterns | ✅ (domain pure → Zod → repo → action with `requireSessionForAction` → `revalidatePath`, consistent across actions) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (exact spec strings asserted where the spec defines them; gaps flagged) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; actions success + validation + no-session + DB error + revalidate) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (spot-checked: extra tests such as cross-user isolation map to AUTH / Success Criteria "nenhum dado acessível sem sessão") |
| Documented guidelines followed: `AGENTS.md` (Next.js docs notice only) | ✅ - otherwise strong defaults applied |

---

## Gate Check

- **Gate command** (Build, from tasks.md): `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int && npm run e2e` (Node v20.20.2, `npm run db:up` first)
- **Result**: typecheck exit 0, lint exit 0, build exit 0, unit **73 passed** (6 files), integration **85 passed** (9 files), e2e **26 passed**; 0 failed, 0 skipped
- **Test count before feature**: 0 (greenfield; root commit had no tests)
- **Test count after feature**: 184 (73 + 85 + 26)
- **Delta**: +184
- **Skipped tests**: none
- **Failures**: none

---

## Ranked Gaps (non-blocking)

1. **AUTH-03 / AC4 lock-duration semantics (spec-precision gap).** Spec: "bloquear novas tentativas por 15 minutos". Implementation is a sliding window: the lock ends when the oldest of the 5 failures leaves the 15-minute window (`src/actions/auth.ts:15-24`). If the 5 failures are spread over e.g. 14 minutes, the lock lasts about 1 minute, not 15. Tests only cover 5 failures at the same instant (`src/actions/auth.int.test.ts:70-101`). Fix: have the user confirm the intended meaning; if "15 minutes from the 5th failure", lock until `newest failure + 15 min` and add a test with spread-out failures.
2. **Validation messages not pinned by spec (spec-precision gap).** CAT AC4/AC5 and TRX AC3/AC4/AC5 say only "mensagem de validação". Tests pin the implementation's texts (`src/actions/categories.int.test.ts:75,89-93`, `src/actions/transactions.int.test.ts:103`), so they discriminate, but the spec does not define the expected text. Fix: add the message texts to the spec (or confirm the current ones).
3. **CAT AC7 conjunction partially exercised.** No test removes a category without expenses and then attempts to save with sum ≠ 100%; it is covered only through the generic sum rule (`src/actions/categories.int.test.ts:57-65`). Low risk (same code path). Fix: one integration case removing a category without rebalancing → sum message.
4. **Edge "DB indisponível … manter os dados digitados" / SUM AC6 for edit-delete / MON AC4 zeroed summary: evidence on adjacent paths.** Data kept on the form is asserted on the validation-error path, not the DB-error path (`e2e/transaction-form.spec.ts:64-67`); summary refresh in the UI is asserted for create only (`e2e/summary.spec.ts:63-67`), and edit/delete rely on `revalidatePath` assertions; empty-month test asserts only total spent = R$ 0,00 (`e2e/month-picker.spec.ts:73`). Low risk. Fix: optional extra assertions.

---

## Requirement Traceability Update

The Verifier does not edit `spec.md`. Recommended status changes for the orchestrator:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CAT-01 | Implementing | ✅ Verified (spec-precision note: messages) |
| CAT-02 | Implementing | ✅ Verified |
| CAT-03 | Implementing | ✅ Verified |
| TRX-01 | Implementing | ✅ Verified |
| TRX-02 | Implementing | ✅ Verified (spec-precision note: messages) |
| TRX-03 | Implementing | ✅ Verified |
| TRX-04 | Implementing | ✅ Verified |
| SUM-01 | Implementing | ✅ Verified |
| SUM-02 | Implementing | ✅ Verified |
| SUM-03 | Implementing | ✅ Verified |
| MON-01 | Implementing | ✅ Verified |
| CHT-01 | Implementing | ✅ Verified (donut accepted) |
| AUTH-01 | Implementing | ✅ Verified |
| AUTH-02 | Implementing | ✅ Verified (D1 accepted) |
| AUTH-03 | Implementing | ✅ Verified (Gap 1 to confirm with user) |

---

## Summary

**Overall**: ✅ Ready (with spec-precision follow-ups)

**Spec-anchored check**: 38/38 ACs + 5/5 edge cases have evidence; 2 spec-precision gaps (AUTH AC4 lock semantics; unspecified validation message texts covering 5 ACs)
**Sensor**: 19/19 mutations killed
**Gate**: 184 passed (unit 73, int 85, e2e 26), 0 failed; typecheck/lint/build green

**What works**: 100% category rule with exact message, integer-cent money and target rounding, month scoping in America/Sao_Paulo, idempotent create, last-write-wins edits, delete guard with expense count, summary/overspend/progress UI, charts, session guard on every page and action, DB-backed login lockout, salted password hash.

**Issues found**: see Ranked Gaps (none blocking).

**Next steps**: orchestrator commits this report; ask the user to confirm AUTH AC4 lock semantics and the validation message texts.
