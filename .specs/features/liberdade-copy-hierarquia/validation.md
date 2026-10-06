# Liberdade: Copy Financeira e Hierarquia do Hero Validation

## Validation: liberdade-copy-hierarquia - PASS ✅ (com conferência manual pendente)

**Date**: 2026-10-06
**Spec**: `.specs/features/liberdade-copy-hierarquia/spec.md`
**Diff range**: `790ea4c..a527e26` (995fae0, 71b8f0b, 6502e72, 078d7ec, 8e26392 docs, d3d9d59, e818f7d, d5264a5, a527e26)
**Verifier**: independent sub-agent (author ≠ verifier)

**Result**: PASS - todos os ACs automatizáveis têm evidência `file:line` com o valor exato da spec; gate verde; 9/9 mutantes mortos. Os itens só verificáveis no app (T8, AC 7 da gaveta em 320 px) estão na seção "Pendente: conferência manual" e NÃO foram vistos.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `retirementAge` e `DEFAULT_WITHDRAWAL_RATE_BP` testados (`freedom.test.ts:262`, `:273-274`) |
| T2 | ✅ Done | pílula, frase, aviso e `FORBIDDEN` ampliado |
| T3 | ✅ Done | `planLines`, `PLAN_REACHED`, `formatTerm` no módulo de copy |
| T4 | ✅ Done | `interestBadge` |
| T5 | ✅ Done | Hero sem `<dl>`; inspecionado |
| T6 | ✅ Done | Pílula e `aria-label` do gráfico; inspecionado |
| T7 | ✅ Done | Rótulos "N% real a.a." e "Personalizar premissas"; inspecionado |
| T8 | ⚠️ Partial | Código conferido; conferência manual no app não feita (ver seção pendente) |

---

## Spec-Anchored Acceptance Criteria

Testes unitários: `src/lib/domain/freedom-copy.test.ts` (FC) e `src/lib/domain/freedom.test.ts` (F). `normalize` troca NBSP por espaço (FC:19). Cenário `acceptance` em FC:27-30 (R$ 20.000/mês, R$ 565.000, 8%, 5%, ápice 48, now 2026-06-15).

| Req / AC | Spec-defined outcome | `file:line` + assertion | Result |
| -------- | -------------------- | ----------------------- | ------ |
| LCH-01 (P1 AC1) | "Renda de R$ 20.000,00/mês · retirada inicial de 5% a.a." | FC:94 `expect(normalize(heroPill(acceptance))).toBe("Renda de R$ 20.000,00/mês · retirada inicial de 5% a.a.")` | ✅ PASS |
| LCH-02 (P1 AC2) | "Com uma renda de R$ 20.000,00/mês (R$ 240.000,00/ano) e uma taxa de retirada inicial de 5% a.a., o patrimônio-alvo é de R$ 4.800.000,00." | FC:105-108 `expect(acceptance.targetCents).toBe(480_000_000)`; `expect(normalize(howWeCalculate(acceptance))).toBe("Com uma renda de R$ 20.000,00/mês (R$ 240.000,00/ano) … R$ 4.800.000,00.")` | ✅ PASS |
| LCH-02 (P1 AC3) | aviso literal "A simulação utiliza rentabilidade real, … renda futura." | FC:118-120 `expect(HOW_DISCLAIMER).toBe("A simulação utiliza rentabilidade real, já descontada da inflação. Os valores são projeções e não representam garantia de rentabilidade ou de renda futura.")`; render em `src/components/goal-hero.tsx:46` | ✅ PASS |
| LCH-03 (P1 AC4) texto | "para alcançar R$ 4,8 mi aos 48 anos" / "Você chega ao Ápice em: 14 anos e 11 meses" | FC:137 `expect(acceptance.months).toBe(179)`; FC:142 `toBe("para alcançar R$ 4,8 mi aos 48 anos")`; FC:143 `toBe("Você chega ao Ápice em: 14 anos e 11 meses")`; idade de F:262 `expect(summary.retirementAge).toBe(48)` | ✅ PASS |
| LCH-03 (P1 AC4) ordem no card | título, "{valor} / mês", "para alcançar…", "Você chega ao Ápice em…" | `src/components/goal-hero.tsx:52` (título), `:58-59` (valor + " / mês"), `:67` (`plan.reach`, muted), `:68` (`plan.term`, font-medium) - implementação inspecionada, sem teste automático (AD-005) | ✅ PASS (inspeção) |
| LCH-04 (P1 AC8) | sem "Distância do Alvo", "Tempo até o Ápice", "Patrimônio necessário" | `grep -rn` em `src` sem resultado para os três textos; `<dl>` removido do Hero (diff `goal-hero.tsx`) - implementação inspecionada, sem teste automático | ✅ PASS (inspeção + grep) |
| LCH-05 (P1 AC5) | `months` = 0 omite as duas linhas | FC:171 `expect(planLines(summary)).toEqual({ reached: true })`; FC:182 `expect(planLines(summary)).toBeNull()`; Hero só renderiza `reach`/`term` no ramo objeto-com-linhas `goal-hero.tsx:63-70` | ✅ PASS |
| LCH-05 (P1 AC6) | `months`=0 e aporte 0 → "Meta alcançada" | FC:169-172 `expect(summary.months).toBe(0)`, `expect(summary.monthlyCents).toBe(0)`, `toEqual({ reached: true })`, `expect(PLAN_REACHED).toBe("Meta alcançada")`; render `goal-hero.tsx:64` | ✅ PASS |
| LCH-05 (P1 AC7) | `months`=0 e aporte null → "Prazo encerrado", sem "Meta alcançada" | FC:180-182 `expect(summary.monthlyCents).toBeNull()`, `expect(planLines(summary)).toBeNull()`; "Prazo encerrado" em `goal-hero.tsx:54-55`; `null` → nenhuma linha `goal-hero.tsx:70` | ✅ PASS |
| LCH-06 (P1-graf AC1) | "R$ 2,6 mi vêm dos rendimentos · 55% do patrimônio final" | FC:194 `expect(normalize(badge!)).toBe("R$ 2,6 mi vêm dos rendimentos · 55% do patrimônio final")`; FC:193 contra `formatCompactBRL(timeline.at(-1).interestCents)` + `interestSharePct` | ✅ PASS |
| LCH-06 (AC2) derivado, não fixo | muda com o resumo | FC:203-206 `expect(badge).toBe(expected(later))`, `expect(later.interestSharePct).not.toBe(acceptance.interestSharePct)`, `expect(badge).not.toBe(normalize(interestBadge(acceptance)!))` | ✅ PASS |
| LCH-06 (AC3) mesmo texto no `aria-label` | `figure aria-label` contém o texto | `src/components/goal-chart.tsx:65` (`badge = interestBadge(summary)`), `:70` (aria-label com `badge`), `:76-77` (pílula) - implementação inspecionada, sem teste automático | ✅ PASS (inspeção) |
| LCH-06 (AC4) percentual null | só o valor, sem " · " | FC:211-214 `toBe(\`${…} vêm dos rendimentos\`)`, `expect(badge).not.toContain(" · ")` | ✅ PASS |
| LCH-07 (P2 AC1) | "Conservador / 6% real a.a. / Retirada: 4% a.a." etc. | `src/components/rate-toggle.tsx:12` (títulos), `:17` `` `${formatRate(preset.annualBp)} real a.a.` ``, `:18` `` `Retirada: ${formatRate(preset.withdrawalBp)} a.a.` ``; pares de preset fixados em F:24 - implementação inspecionada, sem teste automático | ✅ PASS (inspeção) |
| LCH-07 (P2 AC7) | 3 linhas sem corte nem rolagem horizontal em 320 px | Não automatizável; `rate-toggle.tsx:54-56` (3 spans; só a retirada tem `whitespace-nowrap`) | ⏳ Pendente manual |
| LCH-08 (P2 AC2) | "Personalizar premissas" | `rate-toggle.tsx:70`; grep de "Definir taxas personalizadas" em `src` vazio - inspecionado | ✅ PASS (inspeção) |
| LCH-08 (P2 AC6) | legenda "Taxa real estimada (descontada a inflação)" | FC:35 `expect(RATE_HINT).toBe("Taxa real estimada (descontada a inflação)")`; render `goal-form.tsx:199` | ✅ PASS |
| LCH-09 (P2 AC3) | par = preset → cenário marcado, botão sem realce | `goal-form.tsx:201` `value={presetOf(values)}`, `:204` `customActive={presetOf(values) === null}`; `rate-toggle.tsx:41` (radio vazio só se `customActive`/null), `:66` (realce só com `customActive`). `presetFor` testado em F:24 - implementação inspecionada, sem teste de componente | ✅ PASS (inspeção) |
| LCH-09 (P2 AC4) | par fora do preset → nenhum marcado, botão realçado | mesmas linhas: `presetOf` → `null` ⇒ `customActive` true ⇒ `value=""` (`rate-toggle.tsx:41`) e `font-medium text-link` (`:66`) | ✅ PASS (inspeção) |
| LCH-10 (P2 AC5) | formulário vazio 8 e 5, Moderado marcado | F:273-274 `expect(DEFAULT_WITHDRAWAL_RATE_BP).toBe(500)`, `expect(presetFor(DEFAULT_ANNUAL_RATE_BP, DEFAULT_WITHDRAWAL_RATE_BP)).toBe(800)`; `goal-form.tsx:45-46` (`blank` = "8"/"5"), `:81` (`custom` inicial false) | ✅ PASS |
| LCH-11 (P2 AC1) | sem "segur", "perpétu", "garantid", "vitalíc", "consumir", "principal", "vai gerar" | FC:40-45 `it.each(FORBIDDEN)` sobre `[RATE_TITLE, RATE_HINT, heroPill, howWeCalculate]` com `not.toContain(root)`; FC:48-49 aviso sem as raízes exceto "garantid". Linhas do Hero (`planLines`, `PLAN_REACHED`) e o indicador não estão na lista `texts`, mas estão fixados por igualdade exata (FC:142-143, :172, :194), o que também impede raízes proibidas | ✅ PASS (nota) |
| LCH-12 (P2 AC2) | números de `summarize` inalterados | `git diff 790ea4c..HEAD -- src/lib/domain/freedom.test.ts`: 0 linhas removidas, só adições (2 testes); diff de `freedom.ts` só adiciona `retirementAge` e a constante (nenhuma fórmula tocada); suíte F verde | ✅ PASS |

### Edge cases

| Edge case | Evidência | Result |
| --------- | --------- | ------ |
| Meta já alcançada com `months` > 0: "R$ 0,00 / mês" + as duas linhas | FC:157-161 `months` 179, `monthlyCents` 0, `reach`/`term` exatos; Hero renderiza "R$ 0,00" via `formatBRL(0)` (`goal-hero.tsx:58`) | ✅ |
| `months` = 12 → "Você chega ao Ápice em: 1 ano" | FC:148-149 `toEqual({ reach: expect.any(String), term: "Você chega ao Ápice em: 1 ano" })`; `formatTerm` FC:124-132 | ✅ |
| Objetivo salvo 8%/6% → nenhum cenário, botão realçado | `goal-form.tsx:81` (`custom` inicial true), `:201/:204` (`presetOf` null) - inspeção | ✅ (inspeção) |
| Taxa fracionária 6,5% na pílula e na frase | FC:99 `toBe("Renda de R$ 20.000,00/mês · retirada inicial de 6,5% a.a.")`; FC:113 `toContain("taxa de retirada inicial de 6,5% a.a.")` | ✅ |

### Cenário de aceite por cálculo (probe vitest em worktree descartável)

`summarize(acceptance, 2026-06-15)` → meta **R$ 4.800.000,00**, aporte **R$ 9.027,19**, `months` **179** (14 anos e 11 meses), progresso **11,8%**, último marco **"R$ 4,8 mi" + "Aos 48 anos (Meta)"**.
`planLines` → `{ reach: "para alcançar R$ 4,8 mi aos 48 anos", term: "Você chega ao Ápice em: 14 anos e 11 meses" }`.
`interestBadge` → "R$ 2,6 mi vêm dos rendimentos · 55% do patrimônio final" (`interestCents` do último ponto 261.913.423, total 480.000.124, `interestSharePct` 55). Todos os separadores de moeda são NBSP.

### Spec-precision gaps (não bloqueantes)

1. **SPG-1**: o Success Criterion diz "a barra termina em 'R$ 4,8 mi (Meta)'", mas o marco renderiza o valor e o rótulo em linhas separadas ("R$ 4,8 mi" em `src/components/goal-checkpoints.tsx:66` e "Aos 48 anos (Meta)" via `checkpointLabel`). A string literal da spec não existe na UI. Ponto declarado fora de escopo (já atendido), mas o literal da spec é impreciso.
2. **SPG-2**: o aporte R$ 9.027,19 e o progresso 11,8% do cenário de aceite estão só nos Goals/Success Criteria, não num AC numerado, e nenhum teste unitário os fixa (`grep 902_719` vazio). Confirmados só pelo probe deste Verifier. LCH-12 continua coberto pelas expectativas existentes de `freedom.test.ts`.

**Status**: ✅ todos os ACs automatizáveis cobertos; ⚠️ 2 spec-precision gaps sinalizados; ⏳ LCH-07 AC7 e T8 pendentes de conferência manual.

---

## Revisão de lógica de componente (sem teste automático)

- `goal-form.tsx:201` `value={presetOf(values)}` e `:204` `customActive={presetOf(values) === null}`: conforme o design. `:45-46` `blank` deriva de `DEFAULT_ANNUAL_RATE_BP`/`DEFAULT_WITHDRAWAL_RATE_BP` ("8"/"5"). `:81` e `:203` `custom` só controla a abertura dos campos (`:206`); `choosePreset` fecha (`:108`). Com campos abertos e par igual a preset: cenário marcado e botão sem realce, como na premissa da spec. Comentário corrigido para "6 → 4, 8 → 5, 10 → 6" (`:105`).
- `goal-hero.tsx`: `months` > 0 → valor, `reach`, `term` (`:58-68`); `months` = 0 e aporte 0 → "R$ 0,00 / mês" + "Meta alcançada" em `text-income` (`:64`); `months` = 0 e null → "Prazo encerrado" sem linha (`:54-55`, `:70`). A gaveta não usa "inicial" na linha de retirada, conforme a decisão confirmada na spec.
- `goal-chart.tsx`: `timeline.length === 0` → `null` (`:54`), então `interestBadge` nunca é `null` no render; mesmo assim a pílula e o sufixo do `aria-label` são condicionais (`:70`, `:76`).
- `"Principal"` aparece só em `src/components/app-nav.tsx:20` (`aria-label` do menu global), contexto não financeiro.
- AD-008: `freedom.ts` importa só `./month`; `freedom-copy.ts` importa só `./freedom` (tipo) e `./money` (que importa só o tipo `./result`). Nenhum import de servidor.
- `formatTerm` existe só em `src/lib/domain/freedom-copy.ts:44` (e no teste).

---

## Discrimination Sensor

Worktree descartável `git worktree add --detach <scratchpad>/wt HEAD`, `node_modules` por symlink, cada mutação aplicada e revertida por script, `npx vitest run --project unit <arquivo>`.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| a | `src/lib/domain/freedom-copy.ts:26` | `heroPill`: "retirada inicial de" → "retirada de" | ✅ Killed (2 falhas) |
| b1 | `src/lib/domain/freedom-copy.ts:60` | `planLines`: `months > 0` → `months >= 0` | ✅ Killed (2 falhas) |
| b2 | `src/lib/domain/freedom-copy.ts:66` | `planLines`: sem o caso `{ reached: true }` (sempre `null`) | ✅ Killed (1 falha) |
| b3 | `src/lib/domain/freedom-copy.ts:66` | `planLines`: `monthlyCents === 0` → `!== 0` | ✅ Killed (2 falhas) |
| c | `src/lib/domain/freedom-copy.ts:77` | `interestBadge`: percentual → `100 - share` | ✅ Killed (2 falhas) |
| d | `src/lib/domain/freedom.ts:17-19` | `DEFAULT_WITHDRAWAL_RATE_BP` 500 → 600 | ✅ Killed (1 falha) |
| e | `src/lib/domain/freedom-copy.ts:38` | `howWeCalculate`: "inicial" → "segura" | ✅ Killed (3 falhas) |
| f | `src/lib/domain/freedom-copy.ts:77` | `interestBadge`: separador " · " → " - " | ✅ Killed (2 falhas) |
| g | `src/lib/domain/freedom.ts:295` | `summarize`: `retirementAge + 1` | ✅ Killed (1 falha) |

**Sensor depth**: lightweight ampliado (9 mutações)
**Isolation**: `git status --porcelain` da árvore real idêntico ao baseline (vazio) após `git worktree remove --force` e `prune`.
**Result**: 9/9 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (só os 6 arquivos de código previstos + specs) |
| No scope creep | ✅ (nenhuma fórmula alterada) |
| Matches patterns | ✅ (copy em funções puras, como `checkpointLabel`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (textos literais da spec nas asserções) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; UI build gate only) | ✅ |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md`, AD-005, AD-008 | ✅ |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit` (Node v20.20.2)
- **Exits**: typecheck 0, lint 0, build 0, test:unit 0
- **Result**: 647 passed, 0 failed, 0 skipped (18 arquivos)
- **Test count before feature** (790ea4c, worktree descartável): 621 (freedom + freedom-copy: 128)
- **Test count after feature**: 647 (freedom + freedom-copy: 154)
- **Delta**: +26
- **Not run**: `test:int`, e2e (fora do escopo; AD-005)

---

## Pendente: conferência manual

Nada abaixo foi visto no app por este Verifier; a T8 segue Partial até alguém conferir:

1. Abrir "Definir objetivo" sem objetivo salvo: Moderado marcado e "Personalizar premissas" sem destaque.
2. Abrir os campos, digitar retirada 6 com 8%: nenhum cenário marcado e botão realçado.
3. Voltar a retirada para 5: Moderado marcado de novo e botão sem destaque.
4. Objetivo salvo com 8% e 6%: gaveta abre sem cenário marcado, botão realçado e campos abertos.
5. Cenário de aceite na tela: R$ 4.800.000,00, pílula "Renda de R$ 20.000,00/mês · retirada inicial de 5% a.a.", "R$ 9.027,19 / mês", "para alcançar R$ 4,8 mi aos 48 anos", "Você chega ao Ápice em: 14 anos e 11 meses", "R$ 565.000,00 acumulados (11,8% do alvo)", marco final "R$ 4,8 mi" com "(Meta)", pílula do gráfico "R$ 2,6 mi vêm dos rendimentos · 55% do patrimônio final", popover com a frase e o aviso novos.
6. Gaveta em 320 px: cada cenário em três linhas, sem corte e sem rolagem horizontal (LCH-07 AC7). Atenção: "10% real a.a." (`rate-toggle.tsx:55`) não tem `whitespace-nowrap` e pode quebrar em quatro linhas numa coluna estreita.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LCH-01 | Implemented | ✅ Verified |
| LCH-02 | Implemented | ✅ Verified |
| LCH-03 | Implemented | ✅ Verified (ordem por inspeção) |
| LCH-04 | Implemented | ✅ Verified (grep + inspeção) |
| LCH-05 | Implemented | ✅ Verified |
| LCH-06 | Implemented | ✅ Verified (`aria-label` por inspeção) |
| LCH-07 | Implemented | ⏳ AC1 por inspeção; AC7 aguarda conferência manual |
| LCH-08 | Implemented | ✅ Verified |
| LCH-09 | Implemented | ✅ por inspeção; conferência manual pendente |
| LCH-10 | Implemented | ✅ Verified (constante testada; tela pendente) |
| LCH-11 | Implemented | ✅ Verified |
| LCH-12 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready para merge do ponto de vista automatizado; conferência manual (T8) pendente.

**Spec-anchored check**: todos os ACs automatizáveis batem com o resultado da spec; 2 spec-precision gaps sinalizados (SPG-1, SPG-2).
**Sensor**: 9/9 mutations killed.
**Gate**: 647 passed, 0 failed.

**Next steps**: fazer a conferência manual acima e, se quiser, fixar o aporte R$ 9.027,19 e o progresso 11,8% do cenário de aceite num teste (SPG-2).
