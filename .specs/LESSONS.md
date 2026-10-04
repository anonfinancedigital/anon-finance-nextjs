# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - For rate limits and lockouts, specify whether the lock duration counts from the triggering failure or is a sliding window, and test failures spread across the window
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: orcamento-domestico
- evidence: AUTH-03 AC4; src/actions/auth.ts:15-24 (auth)
- last seen: 2026-10-04T18:35:00Z

### L-002 - When an acceptance criterion requires a validation message, state the exact message text in the spec
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: orcamento-domestico
- evidence: CAT AC4/AC5, TRX AC3-AC5; src/actions/transactions.int.test.ts:103 (validation)
- last seen: 2026-10-04T18:35:00Z

### L-003 - When design names a UI component library widget, confirm it before tasks or record native controls as the default to avoid a late deviation
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: orcamento-domestico
- evidence: SPEC_DEVIATION src/components/transaction-form.tsx:42 (ui)
- last seen: 2026-10-04T18:35:00Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
