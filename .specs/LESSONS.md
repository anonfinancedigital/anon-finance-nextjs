# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-002 - When an acceptance criterion requires a validation message, state the exact message text in the spec
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `validation` · harmful: 0
- features: orcamento-domestico, liberdade-financeira
- evidence: CAT AC4/AC5, TRX AC3-AC5; src/actions/transactions.int.test.ts:103 (validation) (+1 more)
- last seen: 2026-10-04T23:22:57Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - For rate limits and lockouts, specify whether the lock duration counts from the triggering failure or is a sliding window, and test failures spread across the window
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: orcamento-domestico
- evidence: AUTH-03 AC4; src/actions/auth.ts:15-24 (auth)
- last seen: 2026-10-04T18:35:00Z

### L-003 - When design names a UI component library widget, confirm it before tasks or record native controls as the default to avoid a late deviation
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: orcamento-domestico
- evidence: SPEC_DEVIATION src/components/transaction-form.tsx:42 (ui)
- last seen: 2026-10-04T18:35:00Z

### L-004 - With uncommitted work from another feature in the tree, stage hunks selectively and run the gate on a clean checkout of the commit before calling a task done.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `git` · harmful: 0
- features: gastos-recorrentes
- evidence: b583b0c src/actions/transactions.int.test.ts:27 (git)
- last seen: 2026-10-04T23:12:05Z

### L-005 - When an edit can split a row into a new row, assert every copied field on the new row, not only the field the test changed.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/lib/db/repos` · harmful: 0
- features: gastos-recorrentes
- evidence: M9 src/lib/db/repos/transactions.ts:212 (src/lib/db/repos)
- last seen: 2026-10-04T23:12:05Z

### L-006 - Test non-integer rejection with every decimal separator and notation the parser could accept (dot, comma, exponent), not just the one the current code happens to reject
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: liberdade-financeira
- evidence: mutant V9; src/lib/validation/goal.ts:70; src/lib/validation/goal.test.ts:90 (validation)
- last seen: 2026-10-04T23:22:56Z

### L-007 - When a rule depends on the current calendar day in a fixed timezone, add a test with a clock instant where that timezone and UTC fall on different days
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: liberdade-financeira
- evidence: mutant V10; src/lib/validation/goal.ts:10 (validation)
- last seen: 2026-10-04T23:22:57Z

### L-008 - When a select falls back to its placeholder for an unknown stored id, submit the placeholder value instead of the stale id
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: modal-transacao
- evidence: MODT-02 edge categoria removida; src/components/transaction-form.tsx:108 (ui)
- last seen: 2026-10-05T11:59:39Z

### L-009 - When a spec positions a control at an opposite edge, state its placement in the stacked mobile layout too
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: modal-transacao
- evidence: MODT-08 AC8; src/components/transaction-form.tsx:342 (ui)
- last seen: 2026-10-05T11:59:39Z

### L-010 - When a goal is a relative size reduction, record the baseline measurement in the spec
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: modal-transacao
- evidence: Goals altura; .specs/features/modal-transacao/tasks.md:606 (ui)
- last seen: 2026-10-05T11:59:39Z

### L-011 - When a spec disables controls while an action is pending, name which component owns that pending state
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: modal-transacao
- evidence: MODT-07 AC7; src/components/transaction-list.tsx:212 (ui)
- last seen: 2026-10-05T11:59:39Z

### L-012 - When a page switches to a per-month data source, check every consumer of that data, since forms and selectors usually still need only the active records
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `pages` · harmful: 0
- features: percentuais-historico
- evidence: validation.md Fix 1; src/app/(app)/page.tsx:34,128; HIST-08 AC5 (pages)
- last seen: 2026-10-05T12:48:13Z

### L-013 - Give every defensive guard a test that reaches its state, or remove it when the state is unreachable
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: percentuais-historico
- evidence: validation.md M6; src/lib/db/repos/categories.ts:48 (repo-layer)
- last seen: 2026-10-05T12:48:13Z

### L-014 - Key UI selections that outlive their list by a stable row key, not by array index, so removing a row cannot silently retarget the choice.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: categorias-ux
- evidence: spec.md Edge Cases; adjust-sum-bar.tsx:150 (ui)
- last seen: 2026-10-05T13:52:37Z

### L-015 - When a state style must win over a variant of a shared component (hover on ghost button), add the same variant explicitly instead of relying on a group variant of equal specificity.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: categorias-ux
- evidence: P2 AC2; category-editor.tsx:345 (ui)
- last seen: 2026-10-05T13:52:37Z

### L-016 - Test rounding functions with an input whose fraction is at least one half, so round is told apart from floor
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: liberdade-refinamentos
- evidence: freedom.ts:146 mutant M4 (Math.round to Math.floor in chartYMax) (domain)
- last seen: 2026-10-05T17:31:50Z

### L-017 - State forbidden-copy rules as an exact list of patterns plus the files they apply to, not as a vague phrase class
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `copy` · harmful: 0
- features: liberdade-taxa-retirada
- evidence: RET-14 AC4; src/lib/domain/freedom-copy.test.ts:62 (copy)
- last seen: 2026-10-05T18:09:34Z

### L-018 - Keep spec assumptions consistent with the acceptance criteria on what a UI card shows, including repeated values and label punctuation
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: liberdade-taxa-retirada
- evidence: RET-12; src/components/goal-hero.tsx:43 (ui)
- last seen: 2026-10-05T18:09:34Z

### L-019 - To test user scoping, give another user's row the same grouping key as the user's row, not a distinct one
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: recorrencia-parcelas
- evidence: validation.md M12 (src/lib/db/repos/transactions.ts:274) (repo-layer)
- last seen: 2026-10-05T20:48:03Z

### L-020 - Test a bounded-count or threshold rule exactly at its limit and one past it, not only well inside and far outside
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: liberdade-ajustes-ux
- evidence: validation.md M13/M15 src/lib/domain/age-ticks.test.ts (AJL-07, AJL-08) (domain)
- last seen: 2026-10-05T20:49:13Z

### L-021 - When a UI criterion depends on text fitting, state in the AC whether wrapping is allowed at the narrowest supported width
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: liberdade-ajustes-ux
- evidence: validation.md AJL-24 vs Independent Test (rate-toggle.tsx:55 wraps at 360 px) (ui)
- last seen: 2026-10-05T20:49:13Z

### L-022 - Assert the missing-field (undefined) error message of every validated field, not only its empty-string message
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: liberdade-gaveta-copy
- evidence: goal.ts:54 (mutante 13, validation.md) (validation)
- last seen: 2026-10-06T14:15:18Z

### L-023 - Quote UI text in success criteria exactly as the component renders it, naming each separate element instead of joining them into one string
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: liberdade-copy-hierarquia
- evidence: SPG-1 Success Criteria 'R$ 4,8 mi (Meta)'; src/components/goal-checkpoints.tsx:66 (ui)
- last seen: 2026-10-06T22:02:46Z

### L-024 - When a spec goal lists acceptance-scenario numbers, turn each into a numbered AC so a test pins it
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: liberdade-copy-hierarquia
- evidence: SPG-2 Goals/Success Criteria R$ 9.027,19 and 11,8%; src/lib/domain/freedom-copy.test.ts:27 (domain)
- last seen: 2026-10-06T22:02:46Z

### L-025 - When an action performs several writes that the spec treats as one decision, run them in one database transaction and test a failure of the last write
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `actions` · harmful: 0
- features: cadastro-aprovacao
- evidence: src/actions/admin-users.ts:28,34 (decisão AC 11) (actions)
- last seen: 2026-10-06T23:48:10Z

### L-026 - To test that an operation is atomic, make a write inside the transaction fail and assert nothing changed, instead of mocking the whole repository method
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: cadastro-aprovacao
- evidence: M19 src/lib/db/repos/users.ts:108 (decisão AC 17) (repo-layer)
- last seen: 2026-10-06T23:48:10Z

### L-027 - When a failure criterion says the previous state is kept, list every write that belongs to the operation, including side effects such as session deletion
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: cadastro-aprovacao
- evidence: spec.md decisão AC 11 (spec)
- last seen: 2026-10-06T23:48:10Z

### L-028 - To prove a button does not submit a form, fill the form so a submission would visibly change state, or assert type=button directly; a blocked or failing submit looks the same as none
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: senha-visivel-confirmacao
- evidence: M4 src/components/password-input.tsx:18; e2e/login.spec.ts:26 (ui)
- last seen: 2026-10-07T09:23:55Z

### L-029 - When a UI criterion lists exact attributes or icons, verify each one explicitly (code inspection with file:line while e2e is suspended, AD-005) instead of relying on flows that only exercise them indirectly
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: senha-visivel-confirmacao
- evidence: PWD-01 AC3/AC6, PWD-02 AC1; M8 M9 M10 (ui)
- last seen: 2026-10-07T09:23:55Z

### L-030 - When an AC requires a link next to an error message, render the link on every path that shows that message, including the error returned by the Server Action, not only on the page.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui/forms` · harmful: 0
- features: esqueci-senha
- evidence: P1 Definir a nova senha AC 8 / reset-form.tsx (ui/forms)
- last seen: 2026-10-07T09:52:50Z

### L-031 - Test visibility rules above the threshold with the minimum row count the UI can actually reach, not only a degenerate input
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: categorias-estado-vazio
- evidence: M9 allocation-view.ts complete >= TOTAL_MICRO (domain)
- last seen: 2026-10-07T13:00:43Z

### L-032 - State the UI mode in which a conditional message appears when a component has more than one display mode
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: categorias-estado-vazio
- evidence: ESV-07 AC2 (ui)
- last seen: 2026-10-07T13:00:44Z

### L-033 - When a spec requires an element to stay fixed in a scrolling panel, make it sticky inside the scroll container and check it at a short viewport
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: apice-clareza
- evidence: APICE-14.1 src/components/drawer-summary.tsx:34 (ui)
- last seen: 2026-10-07T13:22:47Z

### L-034 - When a live preview depends on a form, make sure every required field can hold its zero value so the preview can appear
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `forms` · harmful: 0
- features: apice-clareza
- evidence: APICE-19.4 src/lib/validation/goal-draft.ts:48 (forms)
- last seen: 2026-10-07T13:22:47Z

### L-035 - Keep acceptance-criteria copy in the copy module with an exact-text unit test instead of literals inside components
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `copy` · harmful: 0
- features: apice-clareza
- evidence: APICE-04.4 src/components/assumption-chips.tsx:11 (copy)
- last seen: 2026-10-07T13:22:47Z

### L-036 - Pair each visual acceptance criterion with the viewport and the observable check that proves it
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: apice-clareza
- evidence: APICE-01.2, APICE-09.5, APICE-17.12 (ui)
- last seen: 2026-10-07T13:22:47Z

### L-037 - Compute the dirty flag on the same normalized values that are validated and saved, or an equivalent saved state keeps showing as changed.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: apice-clareza
- evidence: APICE-14.7 / goal-draft.ts:56 (validation)
- last seen: 2026-10-07T13:46:48Z

### L-038 - State in the spec when an empty field is treated as a default value, so the acceptance wording matches the schema.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: apice-clareza
- evidence: APICE-19.4 / T28 withZeroSaved (specs)
- last seen: 2026-10-07T13:46:48Z

### L-039 - Test display helpers with the values the real pipeline feeds them, such as fractional ages or totals rounded past the target, not only idealized round inputs
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: apice-clareza
- evidence: APICE-10.6 src/components/goal-chart.tsx:118 + src/lib/domain/age-ticks.ts:8 (domain) (+1 more)
- last seen: 2026-10-07T13:58:56Z

### L-040 - When an acceptance example depends on a computed value that rounding can push past a boundary, state in the spec how that overshoot is treated
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: apice-clareza
- evidence: APICE-08.1 vs 08.2/08.4 (final patrimony exceeds target by cents) (specs)
- last seen: 2026-10-07T13:58:56Z

### L-041 - When an age or date value mixes calendar-month counts with day-based birthdays, test a birthday later in the current month as well as earlier and later months
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: apice-clareza
- evidence: APICE-10.6 Gap B' src/lib/domain/age-ticks.test.ts:66 (domain)
- last seen: 2026-10-07T14:13:26Z

### L-042 - Derive a rounding tolerance from the computation's actual rounding error bound, not from a fixed percentage of the result
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: apice-clareza
- evidence: APICE-08.2 Gap A' src/lib/domain/freedom.ts:180 (domain)
- last seen: 2026-10-07T14:13:26Z

### L-043 - When sibling acceptance examples share a precondition, state it in every example, not only in one of them
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: apice-clareza
- evidence: APICE-08.2/08.4 spec.md:209-211 (specs)
- last seen: 2026-10-07T14:13:26Z

### L-044 - When a fix task replaces a rule that an acceptance criterion states, list spec.md in the task's Where and update that criterion in the same commit
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: apice-clareza
- evidence: spec.md:208 (APICE-08.1) vs src/lib/domain/freedom.ts:183 (specs)
- last seen: 2026-10-07T14:32:04Z

### L-045 - Check chart annotations in the state where the series starts above or below the reference line, not only where the series ends at it
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: apice-clareza
- evidence: APICE-09.5, src/components/goal-chart.tsx:24-36 (v5-chart-aporte0.png) (ui)
- last seen: 2026-10-07T14:32:04Z

### L-046 - Assert boolean completion flags are false at partial progress, not only at zero and at full
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: visao-geral-primeiros-passos
- evidence: validation.md M4 src/lib/domain/onboarding.ts:30 (domain)
- last seen: 2026-10-07T14:34:48Z

### L-047 - Test the one-item boundary of count-based state branches, not only zero and many
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain` · harmful: 0
- features: visao-geral-primeiros-passos
- evidence: validation.md M6 src/lib/domain/onboarding.ts:40 (domain)
- last seen: 2026-10-07T14:34:48Z

### L-048 - When a chart label must not overlap the data, state in the spec whether area fills count or only the plotted lines
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `charts` · harmful: 0
- features: apice-clareza
- evidence: validation.md APICE-09.5 (placa below sobre o preenchimento de Total investido) (charts)
- last seen: 2026-10-07T14:48:57Z

### L-049 - For every threshold or rounding rule in the spec, add a test whose input lands exactly on the boundary (equality, fraction >= 0.5) so >= vs > and floor vs round are distinguishable.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/lib/domain` · harmful: 0
- features: apice-folga-meta
- evidence: src/lib/domain/slack.ts:18-20 (M8, M9); src/lib/domain/freedom.ts:152 (M3) (src/lib/domain)
- last seen: 2026-10-07T15:50:25Z

### L-050 - Props made optional only to keep intermediate commits compiling must become required in the task that wires the last caller; otherwise UI silently disappears.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `src/components` · harmful: 0
- features: apice-folga-meta
- evidence: src/components/goal-hero.tsx:108 (src/components)
- last seen: 2026-10-07T15:50:25Z

### L-051 - Cover redirect guards in layouts and pages with a unit test that mocks the repo and redirect, since e2e is suspended and code inspection does not kill a removed guard
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `layout` · harmful: 0
- features: data-nascimento
- evidence: mutant M7 src/app/(app)/layout.tsx:99 (layout)
- last seen: 2026-10-08T08:46:47Z

### L-052 - Prove data-copying migrations with an integration test that rebuilds the prior schema, not only a manual psql run recorded in validation.md
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `migrations` · harmful: 0
- features: data-nascimento
- evidence: NASC-11 drizzle/0013_user_birth_date.sql:2 (migrations)
- last seen: 2026-10-08T08:46:47Z

### L-053 - Assert with a test that public Better Auth endpoints ignore server-owned user columns instead of relying on the field being absent from additionalFields
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: data-nascimento
- evidence: edge case Better Auth input false src/lib/auth.ts (auth)
- last seen: 2026-10-08T08:46:47Z

### L-054 - When two keys come from one secret via HKDF, test domain separation against an independent reference derivation and prove the login secret cannot open data encrypted by the data key.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `crypto` · harmful: 0
- features: sigilo-dados
- evidence: M04 src/lib/crypto/kdf.ts:30 (crypto)
- last seen: 2026-10-09T23:19:29Z

### L-055 - A form that submits through onSubmit without an action leaks the password in a native GET before hydration; keep the submit button disabled until hydrated, set method=post and call preventDefault unconditionally.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui/forms` · harmful: 0
- features: sigilo-dados
- evidence: SIGILO-02 G1 login-form.tsx:68 (ui/forms)
- last seen: 2026-10-09T23:19:29Z

### L-056 - When a task names a link target that differs from the spec criterion, follow the spec text and add a separate item for the extra page instead of redirecting the spec link.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui/nav` · harmful: 0
- features: sigilo-dados
- evidence: SIGILO-35 G3 app-nav.tsx:12 (ui/nav)
- last seen: 2026-10-09T23:19:29Z

### L-057 - Put enabled/disabled rules of a submit button in a tested pure view function, not only in component JSX
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: remover-ultima-categoria
- evidence: mutant M7 category-editor.tsx:588 (components)
- last seen: 2026-10-10T12:44:47Z

### L-058 - Cover a new save-path exception, such as an empty set, with a unit or integration test that submits it
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: remover-ultima-categoria
- evidence: REMOVE-03 category-editor.tsx:294 (components)
- last seen: 2026-10-10T12:44:47Z

### L-059 - When a fix relies on the server accepting a boundary input, add an integration test with that exact input
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: remover-ultima-categoria
- evidence: REMOVE-05 repos/categories.ts:130 (repo-layer)
- last seen: 2026-10-10T12:44:47Z

### L-060 - Force the overlap deterministically in concurrency tests (hold the lock or pause inside the first transaction) instead of relying on Promise.all timing
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: importar-dados
- evidence: M3 src/lib/db/repos/import.ts:31 (IMPORT-17) (repo-layer)
- last seen: 2026-10-10T13:08:50Z

### L-061 - When an acceptance criterion promises an equal derived view (summary, totals), assert the derived output itself, not only the round-trip of its inputs
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: importar-dados
- evidence: IMPORT-07 (validation)
- last seen: 2026-10-10T13:08:50Z

### L-062 - When a pure options function is tested but its wiring (client.ts) has Tests: none, add a mocked-constructor test so reverting the call site fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `config` · harmful: 0
- features: hospedagem-gratuita
- evidence: M16 HOSTING-01..03 (config)
- last seen: 2026-10-13T14:36:24Z

### L-063 - When testing a CI workflow for fail-fast, also forbid shell options that disable it (set +e, set +o)
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `workflow` · harmful: 0
- features: hospedagem-gratuita
- evidence: M25 HOSTING-18 (workflow)
- last seen: 2026-10-13T14:36:24Z

### L-064 - When a new account type lacks a row that an existing flow updates, add an integration test of that flow for the new account type
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: login-google
- evidence: edge case recuperacao so-Google; src/lib/db/repos/password-resets.ts:221-229 (repo-layer)
- last seen: 2026-10-13T17:33:19Z

### L-065 - Cover edge cases delegated to a library with an integration test that drives the library through the app configuration
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: login-google
- evidence: edge case e-mail alterado; node_modules/better-auth/dist/oauth2/link-account.mjs:80 (auth)
- last seen: 2026-10-13T17:33:19Z

### L-066 - Test each failure path an acceptance criterion names, not only the one that is easiest to simulate
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: login-google
- evidence: P1 Entrar com Google AC5; no evidence (auth)
- last seen: 2026-10-13T17:33:19Z

### L-067 - When the UI acts only if two signals are present, assert both signals in the test of the code that produces them
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: login-google
- evidence: src/lib/auth-google.int.test.ts:142; src/app/login/page.tsx:24 (auth)
- last seen: 2026-10-13T17:33:19Z

### L-068 - When an acceptance criterion combines a refusal with a redirect, state in the spec which layer redirects and the exact refusal message
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: login-google
- evidence: P1 Criar o cofre AC5; src/actions/vault.ts:64 (validation)
- last seen: 2026-10-13T17:33:19Z

### L-069 - When the spec names a logging function, state the logging mechanism for each path, including library-internal logs
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `logging` · harmful: 0
- features: login-google
- evidence: edge case logs; src/lib/auth.ts:62 (logging)
- last seen: 2026-10-13T17:33:19Z

### L-070 - When a test drives a library flow, start it through the production entry point or a shared constant, not a copy of the production arguments, so redirect targets stay covered
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `integration/auth` · harmful: 0
- features: login-google
- evidence: src/actions/auth-google.ts:23 (M10/M11) (integration/auth)
- last seen: 2026-10-13T17:53:54Z

### L-071 - When a spec fixes a crypto construction (HMAC-SHA-256 keyed by a named secret), add a known-answer test against an independent createHmac call, not only stability/keyed-difference property tests.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/lib/**,crypto` · harmful: 0
- features: cadastro-aberto
- evidence: M12 src/lib/client-ip.ts hashIp (HMAC key/data swapped survives) (src/lib/**,crypto)
- last seen: 2026-10-13T19:33:23Z

### L-072 - Fix in the spec the exact user-facing text of every refusal and success outcome of an action or form, including branches the UI normally hides
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `actions-ui` · harmful: 0
- features: pwa
- evidence: validation.md G1: src/actions/push.ts:14 (PUSH-01, recusa sem VAPID) (actions-ui) (+1 more)
- last seen: 2026-10-31T22:25:45Z

### L-073 - When the spec requires logging a failure, state the exact log code for each failure class, including errors without a status
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `logging` · harmful: 0
- features: pwa
- evidence: validation.md G2: src/lib/push/send.ts:31 (PUSH-28, código de log de erro de rede) (logging)
- last seen: 2026-10-31T22:25:45Z

### L-074 - Test the failure path of a write-then-cleanup function starting from a pre-existing record, not an empty store
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `biometric` · harmful: 0
- features: pwa-splash-biometria
- evidence: M14 src/lib/biometric/lock-store.ts:39 (biometric)
- last seen: 2026-10-31T23:30:25Z

### L-075 - Specify a tolerance when an acceptance criterion says an element is centered, or the test can only assert presence
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `pwa` · harmful: 0
- features: pwa-splash-biometria
- evidence: SPLASH-04 src/lib/pwa/splash-images.test.ts:52 (pwa)
- last seen: 2026-10-31T23:30:25Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
