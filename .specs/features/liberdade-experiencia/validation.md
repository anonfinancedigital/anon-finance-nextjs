# Liberdade: Experiência do Objetivo Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/liberdade-experiencia/spec.md`
**Diff range**: `43fb421..17aef1a` (19 commits de tarefa T1-T19 e a correção `63eb495`). Os commits de `categorias-ux`, `percentuais` e `identidade-vertice` intercalados no histórico são de outra sessão e ficaram fora.
**Verifier**: passada de olhos frescos feita **pelo mesmo agente que implementou** (modo fallback do skill: o harness só cria sub-agentes a pedido do usuário). **Author ≠ verifier não foi atendido.** Ver "Limites desta verificação".

## Validation: Liberdade Experiência - PASS

**Result**: PASS (domínio, validação, persistência e action cobertos por testes com a asserção do valor da spec; UI verificada só manualmente, como a matriz de testes e a AD-005 determinam; 3 lacunas de UI registradas abaixo)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 date-br | ✅ Done | 34221f4 |
| T2 formatCompactBRL | ✅ Done | 9ab1522; o teste pegou `375,0 mil`; corrigido na implementação com `minimumFractionDigits: 0` |
| T3 taxa no domínio | ✅ Done | 07129fb |
| T4 coluna da taxa | ✅ Done | 76e434e; `drizzle/0009_bored_thunderball.sql:1-2` contém só o `ADD COLUMN` e o `CHECK` |
| T5 validação | ✅ Done | 71b84a9 |
| T6 repositório | ✅ Done | 3ccd61c |
| T7 Goal com taxa | ✅ Done | 3e14d8d; texto da task corrigido (1986-06-15 dá 240 meses, 1990 daria 288) |
| T8 timeline | ✅ Done | 0a2b798 |
| T9 checkpoints | ✅ Done | 8cf55d8 |
| T10-T15 componentes | ✅ Done | 81833c0, 7b28ec5, 90f0a73, 79a64e8, 9e4809f, 00f3e45 |
| T16 remover marcas | ✅ Done | 51883cc; removidos 9 testes de `projectMilestones`, como previsto |
| T17-T19 simulador e página | ✅ Done | bc5e363, b929700, 17aef1a |
| Correção do slider | ✅ Done | 63eb495: o thumb do Radix não herdava o `aria-label`; achado na verificação manual |

---

## Spec-Anchored Acceptance Criteria

Cobertura automatizada (unit e integration):

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| LEX-06 AC2: alvo por taxa | R$ 10.000,00 → 200.000.000 / 150.000.000 / 120.000.000 centavos | `src/lib/domain/freedom.test.ts:201` - `it.each([[600, 200_000_000], [800, 150_000_000], [1000, 120_000_000]])` com `expect(targetCents(1_000_000, rate)).toBe(expected)` | ✅ PASS |
| LEX-06 AC3: aporte por taxa | 441.075 / 263.621 / 167.071 centavos (R$ 4.410,75 / 2.636,21 / 1.670,71) | `src/lib/domain/freedom.test.ts:209` - `expect(requiredMonthlyCents({... annualRateBp: rate })).toBe(expected)` | ✅ PASS |
| LEX-06: alvo e aporte no resumo | alvo e aporte do resumo por taxa | `src/lib/domain/freedom.test.ts:233` - `expect(summary.targetCents).toBe(target)` e `expect(summary.monthlyCents).toBe(monthly)` | ✅ PASS |
| LEX-02/03 (dados): renda e taxa no resumo | `monthlyIncomeCents` e `annualRateBp` iguais aos do objetivo | `src/lib/domain/freedom.test.ts:244` - `expect(summary.monthlyIncomeCents).toBe(2_000_000)` | ✅ PASS |
| LEX-04 AC1: presets | 6%, 8% (padrão), 10% | `src/lib/domain/freedom.test.ts:196` - `expect(ANNUAL_RATES).toEqual([600, 800, 1000])` | ✅ PASS |
| LEX-04 AC4: gravar e devolver a taxa | 600, 800, 1000 | `src/lib/db/repos/goals.int.test.ts:46` - `expect((await goalsRepo.get(userId))?.annualRateBp).toBe(annualRateBp)` | ✅ PASS |
| LEX-04 AC4: substituição na mesma linha | taxa 1000, 1 linha | `src/lib/db/repos/goals.int.test.ts:52` - `toBe(1000)` e `toHaveLength(1)` | ✅ PASS |
| LEX-04 AC5: migração dá 800 | linha sem taxa volta com 800 | `src/lib/db/repos/goals.int.test.ts:61` - `expect(...annualRateBp).toBe(800)` | ✅ PASS |
| LEX-04: CHECK da coluna | taxa 700 recusada pelo banco | `src/lib/db/repos/goals.int.test.ts:69` - `.rejects.toThrow()` | ✅ PASS |
| LEX-04 AC4: via action | taxa 6% e data ISO gravadas | `src/actions/goals.int.test.ts:62` - `toMatchObject({ userId, annualRateBp: 600, birthDate: "1990-06-15" })` | ✅ PASS |
| LEX-05 AC6: mensagem da taxa | "Escolha uma taxa de 6%, 8% ou 10% ao ano" | `src/lib/validation/goal.test.ts:119` - `expect(errors({ annualRate }).annualRate).toBe("Escolha uma taxa de 6%, 8% ou 10% ao ano")` (7, vazio, abc, 12, 8,0); ausente em `:123` | ✅ PASS |
| LEX-05 AC3/4 e LEX-07 AC3: data | "Data de nascimento inválida" para `31/02/1990`, `1990-06-15`, `15/06/90`; grava `1990-06-15` | `src/lib/validation/goal.test.ts:68-84` - `toBe("Data de nascimento inválida")` e `toBe("1990-06-15")`; via action `src/actions/goals.int.test.ts:69` | ✅ PASS |
| LEX-07 AC1/2: formato e máscara | `1993-09-18` → `18/09/1993`; `18091993` → `18/09/1993`; `1809` → `18/09` | `src/lib/domain/date-br.test.ts:5,21,25,29` - `expect(isoToBR("1993-09-18")).toBe("18/09/1993")` e `expect(maskDateInput(...)).toBe(...)` | ✅ PASS |
| LEX-11 AC2: valores do último ponto | total 150.000.104, investido 63.269.040, rendimentos 86.731.064 | `src/lib/domain/freedom.test.ts:255` - `toMatchObject({ months: 240, totalCents: 150_000_104, investedCents: 63_269_040, interestCents: 86_731_064 })` | ✅ PASS |
| LEX-11 AC3: pontos | 21 pontos em 240 meses; 0, 12, 18 em 18 meses; 0 e 12 em 12 | `src/lib/domain/freedom.test.ts:269,276,280` - `toHaveLength(21)` e `toEqual([0, 12, 18])` | ✅ PASS |
| LEX-11 AC7: prazo 0 sem gráfico | timeline `[]` e participação nula | `src/lib/domain/freedom.test.ts:310` - `expect(empty).toEqual([])` e `expect(interestSharePct(empty)).toBeNull()` | ✅ PASS |
| LEX-12 AC6: frase de rendimentos | 58% | `src/lib/domain/freedom.test.ts:265` - `expect(interestSharePct(projectTimeline(base))).toBe(58)` | ✅ PASS |
| LEX-11: idade (anos completos e eixo) | 40 … 60; `[58, 59, 60]`; `[58.5, 59.5, 60]` | `src/lib/domain/freedom.test.ts:297,305` - `toEqual([58, 59, 60])` | ✅ PASS |
| LEX-11: aporte 0 | investido constante, rendimentos > 0 | `src/lib/domain/freedom.test.ts:316` - `expect(points.every((p) => p.investedCents === 200_000_000)).toBe(true)` | ✅ PASS |
| LEX-13 AC2: valores dos checkpoints | 37.500.000 / 75.000.000 / 112.500.000 / 150.000.000 | `src/lib/domain/freedom.test.ts:364` - `toEqual([37_500_000, 75_000_000, 112_500_000, 150_000_000])` | ✅ PASS |
| LEX-13 AC2: rótulo compacto | "R$ 375 mil", "R$ 1,1 mi", "R$ 1,5 mi" | `src/lib/domain/money.test.ts:114-123` - `expect(normalize(formatCompactBRL(cents))).toBe(expected)` | ✅ PASS |
| LEX-14 AC4: previsão | meses 102, 163, 206, 240; idades 48, 53, 57, 60 | `src/lib/domain/freedom.test.ts:373,377` - `toEqual([102, 163, 206, 240])` e `toEqual([48, 53, 57, 60])` | ✅ PASS |
| LEX-14 AC3: atingido | 25% atingido sem previsão com R$ 400.000,00; todos com guardado = alvo | `src/lib/domain/freedom.test.ts:382,391` - `toMatchObject({ reached: true, months: null, ageYears: null })` | ✅ PASS |
| LEX-14 AC5: sem previsão | prazo 0: `months` e `ageYears` nulos | `src/lib/domain/freedom.test.ts:397` - `expect(ended.every((c) => c.months === null && c.ageYears === null)).toBe(true)` | ✅ PASS |
| LEX-14: 100% no prazo por taxa | 240 meses e 60 anos a 6%, 8%, 10% | `src/lib/domain/freedom.test.ts:403` - `toMatchObject({ months: 240, ageYears: 60, fractionBp: 10_000 })` | ✅ PASS |
| LEX-10 AC9: regras herdadas | LIB-08/09/10 e sem sessão | `src/actions/goals.int.test.ts` - suíte existente migrada (279 testes de integração passam) | ✅ PASS |

Cobertura **só manual** (matriz: UI = `none`; AD-005; sem teste de componente). Evidência: fluxo Playwright descartável (removido), screenshots desktop e celular, tema claro e escuro; sem asserção versionada.

| Criterion | Observado | Result |
| --------- | --------- | ------ |
| LEX-01/02/03: Hero Card (alvo, guardado, 7,2%, aporte em destaque, selo "Gera R$ 20.000,00/mês sem consumir o principal", "a 8% ao ano", falta e prazo) | Presente e legível; aporte `text-5xl` em painel destacado; brilho violeta e verde | ✅ manual |
| LEX-08 AC1/2/8: slider "De 34 a 90 anos", taxa segmentada, teclado | 5× seta direita levou a idade de 45 a 50 | ✅ manual |
| LEX-09 AC3/4/5: prévia ao vivo, rascunho inválido, sem objetivo só formulário | Preenchendo os campos, resumo e gráfico apareceram sem salvar; `abc` na renda manteve o resultado; sem objetivo não havia resumo | ✅ manual |
| LEX-10 AC6/7: salvar e cancelar | Salvar manteve o resultado; Cancelar voltou de R$ 2.400.000,00 a R$ 3.000.000,00 | ✅ manual |
| LEX-07 AC1: data exibida | "18/09/1993" ao reabrir; `31/02/1993` mostrou "Data de nascimento inválida" | ✅ manual |
| LEX-11 AC1, LEX-12 AC5/6: gráfico, marcas 25/50/75%, frase | Duas camadas, marcas e "Rendimentos: 43% do patrimônio aos 45 anos" | ✅ manual |
| LEX-13 AC1, LEX-14 AC3/4: barra `--income` com brilho e estados | Barra verde com brilho; "Previsão: aos 36, 40, 42, 45 anos" | ✅ manual |

**Status**: ✅ ACs de lógica cobertos com asserção do valor da spec; ⚠️ 3 lacunas de UI abaixo.

### Lacunas registradas (não bloqueiam)

1. **LEX-12 AC4** (tooltip ao passar o mouse ou focar um ponto): não foi exercitado no navegador. O Recharts 3.10.1 liga `accessibilityLayer` por padrão (`node_modules/recharts/types/chart/PieChart.d.ts:9` e as demais `d.ts`), mas isso não foi comprovado para o `AreaChart`.
2. **LEX-11 AC8** (contraste suficiente nos dois temas): as cores vêm dos tokens `--viz-target` e `--viz-spent` já usados em `budget-charts.tsx`; o validador de paleta do skill `dataviz` não foi rodado.
3. **LEX-13 AC2**: os rótulos dos checkpoints ficam numa lista **abaixo** da barra, com marcas na barra nas posições 25/50/75/100%, em vez de rótulos sobre a própria barra. Decisão tomada na T13 para não sobrepor texto no celular; o texto da task foi atualizado.

---

## Discrimination Sensor

Worktree descartável do `HEAD`, removida ao final. `git status --porcelain` real comparado antes e depois: só desapareceram entradas de arquivos que a outra sessão commitou no intervalo; nenhum arquivo meu mudou.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/domain/freedom.ts` (`targetCents`) | divisor `annualRateBp` trocado por `800` | ✅ Killed (7 testes falham) |
| M2 | `src/lib/domain/freedom.ts` (`projectTimeline`) | `interestCents: totalCents - investedCents` → `totalCents` | ✅ Killed (5 falham) |
| M3 | `src/lib/domain/freedom.ts` (`buildCheckpoints`) | `Math.ceil` → `Math.floor` na idade do checkpoint | ✅ Killed (1 falha: `freedom.test.ts:377`) |
| M4 | `src/lib/domain/date-br.ts` (`brToIso`) | dia e mês trocados na data ISO | ✅ Killed (16 falham) |
| M5 | `src/lib/domain/freedom.ts` (`interestSharePct`) | `Math.round` → `Math.floor` | ✅ Killed (2 falham) |
| M6 | `src/lib/domain/money.ts` (`formatCompactBRL`) | removido `minimumFractionDigits: 0` | ✅ Killed (1 falha) |
| M7 | `src/lib/db/repos/goals.ts` (`get`) | taxa devolvida fixa em `800` | ✅ Killed (4 falham, integração) |
| M8 | `src/lib/validation/goal.ts` (taxa) | filtro da taxa aceita qualquer texto (`|| true`) | ✅ Killed (9 falham) |

**Sensor depth**: lightweight, 8 mutações nas funções novas de maior risco.
**Result**: 8/8 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ Um arquivo por tarefa; exceção prevista: T5 ajustou 3 chamadores para compilar; T17 exportou `today` de `validation/goal.ts` |
| No scope creep | ✅ Os arquivos da outra sessão foram deixados de fora de todos os commits |
| Matches patterns | ✅ `KindToggle` → `RateToggle`; `budget-charts.tsx` → `GoalChart`; `ui/progress.tsx` → `ui/slider.tsx` |
| Spec-anchored outcome check | ✅ Os valores dos testes são os exemplos da spec (R$ 4.410,75, 150.000.104, 58%, 48/53/57/60) |
| Per-layer Coverage Expectation | ✅ Domínio 1:1 com ACs e Edge Cases (prazo 0, guardado ≥ alvo, prazo < 12 meses, guardado 0); repositório e action com default, CHECK e erro |
| Every test maps to a requirement | ✅ Os testes de default da T3 (que deixaram de valer na T7) foram removidos junto com a mudança de assinatura |
| Guidelines | `AGENTS.md` (doc do Next lida antes dos Client Components), `vitest.config.ts`, AD-005 e AD-008 |

---

## Edge Cases

- [x] Guardado ≥ alvo: 4 checkpoints atingidos e aporte 0 (`freedom.test.ts:391`, `:154`)
- [x] Prazo menor que 12 meses: pontos só no início e no fim (`freedom.test.ts:284`)
- [x] Troca de taxa recalcula os checkpoints sobre o novo alvo (`freedom.test.ts:408`)
- [x] Prazo 0: gráfico omitido e "Sem previsão" (`freedom.test.ts:310`, `:397`)
- [x] Guardado R$ 0,00: aceito pela validação (`goals.int.test.ts` existente) e checkpoints sem atingidos (`freedom.test.ts:373`)
- [ ] Slider fora da faixa (idade digitada 95): clamp implementado em `src/components/goal-form.tsx` (`sliderValue`), **não exercitado**

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- **Result**: unit 440 passed, 0 failed; integration 279 passed, 0 failed; typecheck, lint e build sem erro
- **Test count before feature**: unit 361, integration 270
- **Test count after feature**: unit 440, integration 279
- **Delta**: integração +9 (todos desta feature). Unitário +79, **misturado** com testes que a outra sessão adicionou em paralelo (`percent.test.ts`, `sum-warning.test.ts`); desta feature saíram 12 testes (3 de `freedom.test.ts` por mudança de assinatura e 9 de `projectMilestones`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma na execução final. Durante a execução houve falhas de integração por **interferência** da outra sessão no banco `orcamento_test` compartilhado (TRUNCATE concorrente); as suítes passaram no banco privado `orcamento_lex_test`

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LEX-01 a LEX-14 | In Tasks | ✅ Verified (UI: manual; lacunas 1 a 3 acima) |

---

## Limites desta verificação

- Mesmo agente implementou e verificou. Para uma verificação independente, rode o skill com um sub-agente Verifier.
- O sensor injetou 8 mutações; não é uma varredura completa com ferramenta de mutação.
- A UI não tem teste automatizado: uma regressão visual ou de interação só aparece em verificação manual.

---

## Summary

**Overall**: ✅ Ready (com as 3 lacunas de UI registradas)

**Spec-anchored check**: 27/27 ACs de lógica com asserção do valor da spec; 7 grupos de ACs de UI só manuais; 3 lacunas
**Sensor**: 8/8 mutações mortas
**Gate**: 440 unitários e 279 de integração passam

**What works**: Hero Card com aporte e selo de renda passiva; taxa 6/8/10% persistida com migração segura; data em DD/MM/AAAA; simulador com prévia ao vivo, slider por teclado e Cancelar; gráfico de juros compostos com marcas; barra com checkpoints e estados em texto.

**Issues found**: nenhum bloqueante. Defeito achado e corrigido na verificação manual: thumb do slider sem nome acessível (`63eb495`).

**Next steps**: conferir o tooltip do gráfico no navegador e, se quiser, rodar o validador de paleta do `dataviz` nas duas cores.
