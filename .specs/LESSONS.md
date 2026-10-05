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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
