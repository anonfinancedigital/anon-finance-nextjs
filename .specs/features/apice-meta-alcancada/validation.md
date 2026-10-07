# Validation: Ápice meta alcançada e check nos marcos - PASS

**Date**: 2026-10-07
**Spec**: `.specs/features/apice-meta-alcancada/spec.md`
**Diff range**: 67414e6^..84280a1 (somente estes dois commits; demais commits de `main` são de sessões paralelas)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: PASS

---

## Task Completion

Sem tasks.md (fix pequeno, spec direto). Dois commits atômicos: 67414e6 (APM-01..05) e 84280a1 (APM-06/07). Typecheck (`tsc --noEmit`) e eslint nos 4 arquivos: limpos.

---

## Spec-Anchored Acceptance Criteria

AGENTS.md (AD-005): e2e suspenso; sem testes de componente no projeto. ACs de UI são evidenciados por inspeção de código (`file:line`).

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| APM-01 (AC1.1): saved >= target | "Meta alcançada" no indicador; "Você já tem o necessário." na frase | `src/lib/domain/freedom-copy.ts:65` `remainingCents === 0 ? PLAN_REACHED : NO_DEPOSIT_NEEDED`; `:56` idem para a frase. Testes: `freedom-copy.test.ts:204-209` `expect(depositText(reached)).toBe("Meta alcançada")`; `:229-234` (igual ao alvo) ; `:155-163` e `:176-188` frase `toBe("... Você já tem o necessário.")` | PASS |
| APM-02 (AC1.2): monthly 0 e saved < target | "Sem aporte necessário" | `freedom-copy.ts:65`, `:158`; `freedom-copy.test.ts:212-219` `expect(depositText(compounding)).toBe("Sem aporte necessário")` (com `monthlyCents` 0 asserido) | PASS |
| APM-03 (AC1.3): frase | "...você precisa de {meta}. Seu patrimônio atual, rendendo, chega lá sem novos aportes." | `freedom-copy.ts:56`; `freedom-copy.test.ts:165-177` `toBe("Para ter R$ 5 mil/mês aos 48 anos, você precisa de R$ 1,2 mi. Seu patrimônio atual, rendendo, chega lá sem novos aportes.")` + `not.toContain("Você já tem o necessário")` | PASS |
| APM-04 (AC1.4): months > 0 mostra "em {prazo}", inclusive aporte 0 | prazo visível | `src/components/goal-hero.tsx:76-80` `summary.months > 0 && summary.remainingCents > 0` -> `em {formatTerm(summary.months)}` (aporte 0 com remaining > 0 e months > 0 renderiza) | PASS (inspeção) |
| APM-04 (AC1.5): saved >= target omite prazo | sem "em {prazo}" | `goal-hero.tsx:76` `remainingCents > 0` falso quando saved >= target (`freedom.ts:303` `Math.max(0, target - saved)`) | PASS (inspeção) |
| APM-05 (AC1.6): monthly nulo | "Prazo encerrado" e frase sem cláusula | `freedom-copy.ts:54,64` (`monthlyCents === null` antes do ramo 0); testes preexistentes `freedom-copy.test.ts:148-158` `toBe("... você precisa de R$ 4,8 mi.")` e `:196-203` "Prazo encerrado" | PASS |
| APM-06 (AC2.1): reached | círculo preenchido progress + check | `src/components/goal-checkpoints.tsx:44` `c.reached ? "size-4 border-progress bg-progress text-background"`, `:48` `{c.reached && <Check className="size-3" strokeWidth={3} />}` (12 px, traço 3 como assumido na spec) | PASS (inspeção) |
| APM-06 (AC2.2): não reached | círculo menor vazio, sem check | `goal-checkpoints.tsx:44` `"size-3 border-muted-foreground bg-card"`; `:48` check só com `c.reached` | PASS (inspeção) |
| APM-07 (AC2.3): decorativo | `aria-hidden`, sem foco/interação, rótulo "Atingido" em texto | `goal-checkpoints.tsx:40` `aria-hidden` no marcador (span, sem handlers/tabIndex); rótulo em texto `:73` via `checkpointLabel` (`freedom-copy.ts:133` "Atingido"; teste `freedom-copy.test.ts:385`) | PASS (inspeção) |

Edge cases:
- [x] saved == target -> "Meta alcançada": `freedom-copy.test.ts:229-234` (indicador) e `:179-188` (frase).
- [x] 1 centavo abaixo com aporte 0 -> "Sem aporte necessário": `freedom-copy.test.ts:221-227` (`savedCents: 119_999_999`).
- [x] Rascunho da gaveta atualiza indicador e frase: `src/components/drawer-summary.tsx:26` `depositText(summary)` recalculado do resumo; `goal-empty-state.tsx:135,139` `summarySentence`/`depositText`. Ambos consomem só `GoalSummary`, sem lógica própria de aporte 0 (`months`/prazo não usados nesses componentes), portanto herdam o comportamento correto.

**Status**: todos os ACs cobertos; ACs de UI por inspeção (política AD-005), sem spec-precision gaps.

---

## Discrimination Sensor

Scratch: `git worktree` destacado no scratchpad (node_modules via symlink), revertido por `git checkout -- .` entre mutações, removido ao final. `git status --porcelain` do tree real idêntico ao baseline (`?? .specs/features/data-nascimento/`).

Comando: `npx vitest run --project unit src/lib/domain/freedom-copy.test.ts`

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| 1 | `freedom-copy.ts:65` | `remainingCents === 0` -> `!== 0` | Killed (4 falhas) |
| 2 | `freedom-copy.ts:65` | troca dos textos (`NO_DEPOSIT_NEEDED : PLAN_REACHED`) | Killed (4 falhas) |
| 3 | `freedom-copy.ts:56` | frase: `=== 0` -> `> 0` | Killed (3 falhas) |
| 4 | `freedom-copy.ts:65` | remove a distinção (sempre `PLAN_REACHED`, comportamento antigo) | Killed (2 falhas) |
| 5 | `goal-hero.tsx:76` | remove `&& summary.remainingCents > 0` | Survived (esperado: JSX sem teste de componente; AD-005) |

**Sensor depth**: lightweight (lógica de domínio)
**Result**: 4/4 mutações de domínio mortas; mutação 5 sobrevive por limitação conhecida do projeto (UI sem testes), coberta por inspeção em `goal-hero.tsx:76`. Não gera fix task (e2e suspenso, e não há teste de componente no projeto).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | OK (uma constante nova, uma condição no hero, ícone Check) |
| Surgical changes | OK (4 arquivos de código + spec) |
| No scope creep | OK (cálculo/marcos/projeção intocados, conforme Out of Scope) |
| Matches patterns | OK (constantes de copy em `freedom-copy.ts`, `cn()`/`lucide-react` como no resto) |
| Spec-anchored outcome check | OK (strings exatas do spec asseridas com `toBe`) |
| Every test maps to AC/edge case | OK (+5 testes: AC1.2, AC1.3, edges de igual e 1 centavo, AC1.1) |
| Guidelines | AGENTS.md (AD-005 e2e suspenso) |

---

## Gate Check

- **Gate command**: `npx vitest run --project unit src/lib/domain/freedom-copy.test.ts`; `npx tsc --noEmit`; `npx eslint` nos 4 arquivos
- **Result**: 68 passed, 0 failed, 0 skipped; tsc e eslint sem erros
- **Test count before feature**: 63 (68 - 5)
- **Test count after feature**: 68
- **Delta**: +5 testes novos, nenhum removido/enfraquecido (diff só adiciona `it`)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| APM-01..05 | Implementing | Verified |
| APM-06, APM-07 | Implementing | Verified (inspeção de código) |

---

## Summary

**Overall**: Ready

**Spec-anchored check**: 7/7 requisitos (APM-01..07) casam com o resultado definido na spec; 0 spec-precision gaps
**Sensor**: 4/4 mutações de domínio mortas; 1 mutação de JSX sobrevive (sem teste de componente, AD-005)
**Gate**: 68 passed, 0 failed

**Issues found**: nenhum bloqueante. Observação de baixo risco: a condição `months > 0 && remainingCents > 0` do hero (`goal-hero.tsx:76`) e o check dos marcos não têm teste automatizado; protegidos só por inspeção.

**Next steps**: nenhum.
