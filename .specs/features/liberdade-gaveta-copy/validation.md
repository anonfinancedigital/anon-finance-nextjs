# Liberdade: Gaveta Copy Validation

## Validation: liberdade-gaveta-copy - PASS ✅

**Verdict**: PASS (com 1 mutante sobrevivente Minor e 3 ressalvas de UI não exercida em navegador)
**Date**: 2026-10-06
**Spec**: `.specs/features/liberdade-gaveta-copy/spec.md`
**Diff range**: `527572f..HEAD` (commits b6b1564..5e4b0e3)
**Verifier**: sub-agente independente (autor ≠ verificador)

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T8 | ✅ Done | Todos marcados `[x]` em tasks.md |

## Spec-Anchored Acceptance Criteria

Testes unitários: `src/lib/domain/freedom-copy.test.ts` (FC) e `src/lib/validation/goal.test.ts` (G). ACs de UI não têm teste de componente por design (AD-005/AD-008); verificados por leitura de código. **Nenhum foi exercido em navegador** (sem dev server/DB); nenhuma checagem visual foi feita.

| ID | Spec-defined outcome | Evidência `file:line` + assertion | Result |
| -- | -------------------- | --------------------------------- | ------ |
| LGC-01 | Popover ancorado ao botão, título "Como chegamos a esse número:" | `goal-hero.tsx:48-57` (Radix Popover + Trigger "Como calculamos?" + `{HOW_TITLE}`); `FC:89` `expect(HOW_TITLE).toBe("Como chegamos a esse número:")` | ✅ PASS (comportamento de abrir: leitura de código) |
| LGC-02 | Altura do hero inalterada com popover aberto | `ui/popover.tsx:25-26` `PopoverPrimitive.Portal` (conteúdo fora do fluxo do hero); `<details>` removido de `goal-hero.tsx` | ⚠️ PASS por leitura, sem medição de altura em navegador |
| LGC-03 | Frase exata com 20.000 / 240.000 / 6% / 4.000.000 | `FC:77-81` `expect(summary.targetCents).toBe(400_000_000)` e `expect(normalize(howWeCalculate(summary))).toBe("Com uma renda de R$ 20.000,00/mês (R$ 240.000,00/ano) ... 6% a.a., ... R$ 4.000.000,00 para perpetuar ...")` | ✅ PASS |
| LGC-04 | Aviso "Simulação com base em rentabilidade real (líquida de inflação). Não representa garantia de rendimentos." | `FC:90-92` `expect(HOW_DISCLAIMER).toBe(...)`; renderizado em `goal-hero.tsx:56` | ✅ PASS |
| LGC-05 | Esc/clique fora fecha, foco volta ao botão | `goal-hero.tsx:48-58` Radix Popover sem override de `onOpenAutoFocus`/`onEscapeKeyDown`/`onInteractOutside` (padrão Radix) | ⚠️ PASS por leitura; não exercido em navegador |
| LGC-06 | 6,5% com vírgula | `FC:85` `expect(howWeCalculate(summary)).toContain("taxa de retirada segura de 6,5% a.a.")` | ✅ PASS |
| LGC-07 | Sem HOW_WE_CALCULATE nem heroFacts | `grep HOW_WE_CALCULATE\|heroFacts src` = 0 ocorrências; `freedom-copy.ts` sem ambos | ✅ PASS (grep) |
| LGC-08 | Botão com engrenagem + "Definir taxas personalizadas", sem "Personalizada" solta | `rate-toggle.tsx:60-71` (`<Settings aria-hidden/>` + texto); `grep "Personalizada\b" src` = 0 | ✅ PASS (leitura/grep) |
| LGC-09 | Dois inputs lado a lado rotulados "Rentabilidade real ao ano (%)" / "Taxa de retirada anual (%)" | `goal-form.tsx:198-215` (`grid grid-cols-2`, `label=` exatos) | ✅ PASS (leitura) |
| LGC-10 | Custom ativo: nenhum perfil marcado, `aria-pressed="true"` | `rate-toggle.tsx:41` `value={customActive \|\| value === null ? "" : value}`; `:62` `aria-pressed={customActive}`; `goal-form.tsx:193` `value={custom ? null : ...}` | ✅ PASS (leitura) |
| LGC-11 | Perfil oculta inputs e grava taxas da tabela | `goal-form.tsx:98-102` `setCustom(false)` + `update({... annualRate, withdrawalRate: preset.withdrawalBp/100})`; `:198` `custom ? ... : null` | ✅ PASS (leitura; comportamento pré-existente, não alterado) |
| LGC-12 | Rótulo "Idade da independência" e slider "Idade da independência (controle deslizante)" | `goal-form.tsx:161` `<Label>Idade da independência</Label>`; `:171` `aria-label="Idade da independência (controle deslizante)"` | ✅ PASS (leitura) |
| LGC-13 | Subtítulo "De N a 90 anos" inalterado | `goal-form.tsx:32,181` `MAX_SLIDER_AGE = 90`; linha não tocada no diff | ✅ PASS (leitura) |
| LGC-14 | Vazio → "Informe a idade da independência" | `G:221` `expect(errors({ retirementAge: "" }).retirementAge).toBe("Informe a idade da independência")` | ✅ PASS |
| LGC-15 | Fora de 1-120 → "A idade da independência deve estar entre 1 e 120" | `G:222` `errors({ retirementAge: "121" })...toBe("A idade da independência deve estar entre 1 e 120")`; `goal.ts:8` `MAX_AGE = 120` | ✅ PASS |
| LGC-16 | Não inteiro → "A idade da independência deve ser um número inteiro" | `G:223` `errors({ retirementAge: "60,5" })...toBe(...)` | ✅ PASS |
| LGC-17 | <= atual → "A idade da independência deve ser maior que a idade atual (N)" | `G:227-232` `toBe("A idade da independência deve ser maior que a idade atual (36)")` para "36" e "30" | ✅ PASS |

**Status**: 17/17 ACs com evidência. 6 ACs com teste automatizado (LGC-03,04,06,14-17); LGC-01/05 parcialmente por teste (texto) e leitura (abrir/fechar); o restante por leitura de código/grep. Sem ⚠️ spec-precision gap: os valores da spec são exatos (a spec diz 120 para a faixa, igual a `MAX_AGE`; o "90" é só o teto do slider/subtítulo, coerente).

## Greps de saída (Success Criteria)

- `aposentadoria` em `src/components`, `src/lib/validation`, `src/app`: 0 ocorrências.
- `Personalizada\b` em `src`: 0 ocorrências.
- `HOW_WE_CALCULATE|heroFacts` em `src`: 0 ocorrências.
- `retirementAge` (chave de dados) preservada (Out of Scope respeitado).

## Edge Cases

- [x] Resumo sem prazo (`monthlyCents` nulo): `howWeCalculate` usa só `monthlyIncomeCents`, `withdrawalRateBp`, `targetCents` (`freedom-copy.ts:36-38`). Sem teste dedicado (ver gap 2).
- [ ] 360 px sem rolagem horizontal: `popover.tsx:32` `max-w-[calc(100vw-2rem)]` + `collisionPadding={16}`; **não verificado em navegador**.

## Discrimination Sensor

Scratch: git worktree temporário em /tmp (scratchpad), `node_modules` via symlink; cada mutante revertido com `git checkout`; worktree removido.

| # | Arquivo | Mutação | Killed? |
| - | ------- | ------- | ------- |
| 1 | `freedom-copy.ts:38` | `monthlyIncomeCents * 12` → sem `*12` | ✅ Killed (1 falha) |
| 2 | `freedom-copy.ts:38` | taxa de retirada → `annualRateBp` | ✅ Killed (2) |
| 3 | `freedom-copy.ts:38` | removido `/ano` | ✅ Killed (1) |
| 4 | `freedom-copy.ts:38` | meta → `savedCents` | ✅ Killed (1) |
| 5 | `freedom-copy.ts:38` | removida a palavra "segura" | ✅ Killed (2) |
| 6 | `freedom-copy.ts:11` | `HOW_TITLE` sem ":" | ✅ Killed (1) |
| 7 | `freedom-copy.ts:15` | aviso "Não representa" → "Representa" | ✅ Killed (1) |
| 8 | `goal.ts:8` | `MAX_AGE` 120 → 110 | ✅ Killed (4) |
| 9 | `goal.ts:90` | vazio → "...de aposentadoria" | ✅ Killed (1) |
| 10 | `goal.ts:91` | inteiro: remove "da independência" | ✅ Killed (1) |
| 11 | `goal.ts:96` | "estar entre" → "ficar entre" | ✅ Killed (1) |
| 12 | `goal.ts:98` | "maior que" → "maior ou igual a" | ✅ Killed (1) |
| 13 | `goal.ts:54` | `z.string({ error: "Informe a idade da independência" })` → "Informe a idade" | ❌ Survived |

**Sensor depth**: lightweight ampliado (13 mutantes). **Result**: 12/13 killed. O sobrevivente é a mensagem de campo ausente (`undefined`), caminho inalcançável pelo formulário (campos sempre string) e coberto só no equivalente de taxa (`goal.test.ts:176-178`). Severidade Minor, não bloqueante.

Isolamento: `git status --porcelain` da árvore real vazio antes e depois da sensor; `git worktree list` mostra só a árvore principal.

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical changes | ✅ (diff restrito aos arquivos da spec; `popover.tsx` novo é necessário) |
| No scope creep | ✅ |
| Spec-anchored outcome check | ✅ (asserções com texto exato da spec) |
| Todo teste mapeia a um requisito | ✅ (testes removidos eram de `heroFacts`/`HOW_WE_CALCULATE`, removidos por LGC-07) |
| Cobertura por camada (domínio/validação 1:1) | ✅ |

## Gate Check

- **Gate**: `npm run test:unit` (+ `npm run typecheck`, `npm run lint`; `build` não rodado nesta verificação)
- **Result**: 619 passed, 0 failed, 0 skipped (18 arquivos); typecheck OK; lint sem erros
- **Test count**: antes não medido; delta do diff: `heroFacts`/`HOW_WE_CALCULATE` (testes removidos junto do código, LGC-07) vs +3 `howWeCalculate`, +1 mensagens exatas em `goal.test.ts`.

## Fix Plans

1. (Minor) `goal.test.ts`: acrescentar `expect(errors({ retirementAge: undefined }).retirementAge).toBe("Informe a idade da independência")`, no padrão de `goal.test.ts:176-178`.
2. (Minor) `freedom-copy.test.ts`: caso com `monthlyCents: null` (resumo sem prazo) para o Edge Case.

## Requirement Traceability Update

LGC-01..LGC-17: Pending → ✅ Verified (LGC-02, LGC-05 e o edge de 360 px verificados só por leitura de código; pendentes de UAT em navegador).

## Summary

**Overall**: ✅ Ready (com ressalvas)
**Spec-anchored check**: 17/17 ACs com evidência; 0 spec-precision gaps
**Sensor**: 12/13 killed
**Gate**: 619 passed
**Next steps**: UAT em navegador (altura do hero, Esc/clique fora/foco, 360 px, aria-pressed); fix tasks Minor acima.
