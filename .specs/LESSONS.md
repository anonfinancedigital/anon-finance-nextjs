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

### L-029 - When a UI criterion lists exact attributes or icons, assert each one in the e2e test instead of relying on flows that only exercise them indirectly
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: senha-visivel-confirmacao
- evidence: PWD-01 AC3/AC6, PWD-02 AC1; M8 M9 M10 (ui)
- last seen: 2026-10-07T09:23:55Z

### L-030 - When an AC requires a link next to an error message, render the link on every path that shows that message, including the error returned by the Server Action, not only on the page.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui/forms` · harmful: 0
- features: esqueci-senha
- evidence: P1 Definir a nova senha AC 8 / reset-form.tsx (ui/forms)
- last seen: 2026-10-07T09:52:50Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
