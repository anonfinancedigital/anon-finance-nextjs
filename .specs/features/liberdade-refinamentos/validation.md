# Liberdade: Refinamentos Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/liberdade-refinamentos/spec.md`
**Diff range**: `c788fa1^..9bce8a3` + re-verificação do fix `a623a15` (`freedom.test.ts`), só os arquivos da feature (`src/lib/domain/freedom.ts`, `freedom.test.ts`, `src/components/goal-chart.tsx`, `goal-checkpoints.tsx`, `goal-form.tsx`, `goal-experience.tsx`). Commits 6183ac9 e 64dd44a (resumo, outra sessão) ignorados. T1 (`compositionShares`) está em e3659c3, anterior ao intervalo, e foi lido no estado atual.
**Verifier**: sub-agent independente (author ≠ verifier)

**Veredito: PASS ✅** (re-verificado após a623a15). O mutante M4 (round → floor em `chartYMax`) agora é morto por `freedom.test.ts` (`expect(chartYMax(301_234_567, 0)).toBe(322_320_987)`). Itens visuais [M] seguem NÃO confirmados (verificação manual no navegador pendente; não são falhas).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `freedom.ts:134-142` (commit e3659c3) |
| T2 | ✅ Done | `freedom.ts:144-147` |
| T3 | ✅ Done | `goal-chart.tsx:38-56` |
| T4 | ✅ Done | `goal-chart.tsx:113-134` |
| T5 | ✅ Done | `goal-checkpoints.tsx:39-75` |
| T6 | ✅ Done | `goal-checkpoints.tsx:53-58` |
| T7 | ✅ Done | `goal-form.tsx:160` |
| T8 | ✅ Done | `goal-experience.tsx:14,98` |

---

## Spec-Anchored Acceptance Criteria

Legenda: **[T]** coberto por teste automatizado; **[C]** evidenciado por leitura de código (UI sem teste: AD-005/AD-008); **[M]** exige verificação manual no navegador (não confirmável aqui).

### P1: Marcos

| AC | Spec-defined outcome | file:line + evidência | Result |
| -- | -------------------- | --------------------- | ------ |
| 1 | >= 576 px: marco único sobre o trilho em 25/50/75/100%, sem traço; label centrado na mesma posição; label 100% à direita | [C] `goal-checkpoints.tsx:39-52` (um `<span>` por checkpoint, `left: positionBp/100 %`, `-translate-x-1/2`); `:61` `@xl:relative @xl:block @xl:h-10`; `:66-69` `@xl:absolute @xl:-translate-x-1/2` com o mesmo `left`, último `@xl:right-0 @xl:text-right`. `@xl` = 576 px do Hero (`goal-hero.tsx:35` `@container`). Centro a centro <= 1 px: [M] | ✅ [C] / ⚠️ [M] |
| 2 | < 576 px: grade 2x2 e marcos no trilho | [C] `goal-checkpoints.tsx:61` `grid grid-cols-2` sem `@xl`; marcos independentes do breakpoint (`:39-52`) | ✅ [C] |
| 3 | Atingido: círculo `--income` com check e "Atingido" em texto | [C] `:46` `border-income bg-income text-white`; `:50` `<Check>`; `:9` `"Atingido"`; `:72` `text-income` | ✅ [C] |
| 4 | Pendente: círculo vazio com borda; "Previsão: aos N anos" / "Sem previsão" | [C] `:46` `border-muted-foreground bg-card`; `:10-11` | ✅ [C] |
| 5 | Pino em `progressBp/100`% limitado a 100%; nome "Você está aqui: 19,0% do alvo" | [C] `:22` `Math.min(100, progressBp/100)`; `:53-57` `role="img"`, `aria-label={\`Você está aqui: ${share} do alvo\`}`, `left: barValue%` (`share = formatShare(progressBp)`, `:20`) | ✅ [C] |
| 6 | Sem texto de percentual no pino/barra; percentual visível uma vez | [C] pino sem filhos (`:53-58`); percentual só em `aria-label` (`:37`, `:55`); texto visível único em `goal-hero.tsx:47` | ✅ [C] |
| 7 | Progresso 0 → pino na borda esquerda | [C] `:57` `left: 0%` com `-translate-x-1/2` (centro do pino sobre a borda esquerda, metade para fora do trilho; Hero tem `px-5`, sem corte) | ✅ [C] / ⚠️ [M] |
| 8 | Coincidência: pino acima do marco, sem esconder "Atingido" do label | [C] `:56` `z-10` e vem depois dos marcos no DOM; label é o `<ol>` separado (`:61-75`), logo "Atingido" não é coberto. Pino (w-1.5, h-7) cobre parte central do marco de 20 px e do check (12 px): sobreposição visual [M] | ✅ [C] / ⚠️ [M] |

### P1: Gráfico

| AC | Spec-defined outcome | file:line + evidência | Result |
| -- | -------------------- | --------------------- | ------ |
| 1 | Linha pontilhada em `targetCents` com "Meta: R$ 3 mi" à direita | [C] `goal-chart.tsx:122-134` `ReferenceLine y={targetCents} strokeDasharray="4 4"`, label `Meta: ${formatCompactBRL(...)}`, `position: "insideTopRight"`. Posição do rótulo e legibilidade nos dois temas: [M] | ✅ [C] / ⚠️ [M] |
| 2 | Eixo Y 0 a 107% de max(alvo, final): 3.000.000 → 3.210.000 | [T] `freedom.test.ts:436-437` `expect(chartYMax(300_000_000, 300_000_000)).toBe(321_000_000)`; `:440-441` final maior → `428_000_000`; `:444-445` alvo maior → `321_000_000`. [C] uso `goal-chart.tsx:117` `domain={[0, chartYMax(targetCents, last.totalCents)]}`. Renderização do teto: [M] | ✅ [T] / ⚠️ [M] |
| 3 | Tooltip: "Aos N anos", "Total investido: R$ X (P%)", "Rendimentos gerados: R$ Y (Q%)", "Patrimônio total: R$ Z" | [T] `freedom.test.ts:418-419` `toEqual({ investedPct: 52, interestPct: 48 })` (valores do exemplo). [C] `goal-chart.tsx:44-53` (rótulos exatos; espaço antes de "(P%)" vem do template ``` ` (${...}%)` ```). Render do texto: [M] | ✅ [T]+[C] |
| 4 | P = round(inv/total x 100); Q = 100 - P | [T] `:422-423` `compositionShares(1, 8)` → `{13, 87}`; `:426-427` → `{100, 0}`. [C] `freedom.ts:140-141` | ✅ [T] |
| 5 | Total R$ 0,00 → sem "(P%)" e "(Q%)" | [T] `:430-431` `expect(compositionShares(0, 0)).toBeNull()`. [C] `goal-chart.tsx:47,51` `{shares && ...}` | ✅ [T]+[C] |
| 6 | Prazo 0 continua omitindo o gráfico | [C] `goal-chart.tsx:64` `if (timeline.length === 0) return null` (inalterado; `projectTimeline` retorna `[]` com `months === 0`, `freedom.ts:~108`) | ✅ [C] |
| 7 | Mantém selo, legenda, linha-guia, ponto ativo e tabela sr-only | [C] selo `:76,87`; legenda `:88-95` ("Rendimentos"); cursor `:135`; `activeDot` `:145,157`; tabela `:164-184` | ✅ [C] |

### P2: Gaveta

| AC | Spec-defined outcome | file:line + evidência | Result |
| -- | -------------------- | --------------------- | ------ |
| 1 | Legenda "Taxa real estimada (descontada a inflação)" entre o título e os presets | [C] `goal-form.tsx:159-160` `<p ...>Taxa esperada ao ano</p>` seguido de `<p className="text-xs text-muted-foreground">Taxa real estimada (descontada a inflação)</p>`, antes de `RateToggle` | ✅ [C] |
| 2 | Descrição "Simule o ápice: renda, patrimônio e idade." em uma linha | [C] `goal-experience.tsx:14,98`. 1 linha a 384 px: sheet `lg:w-96` com `p-5` e `pr-8` (`sheet.tsx:39`, `goal-experience.tsx:95`) deixa ~312 px para 42 caracteres em `text-sm`; plausível, não confirmado [M] | ✅ [C] / ⚠️ [M] |
| 3 | Sem objetivo salvo: estado vazio mantém `INTRO` completo | [C] `goal-experience.tsx:16-17,87` (`INTRO` inalterado no cartão de estado vazio) | ✅ [C] |
| 4 | Arrastar slider/trocar taxa atualiza Meta e Aporte do topo sem salvar | [C] diff da feature não toca `handleDraft`/`DrawerSummary` nem `onChange` da taxa (`git diff` de goal-experience.tsx só altera a descrição; goal-form.tsx só insere a legenda). Comportamento é de LAY-09/LAY-13, preservado | ✅ [C] (regressão) |
| 5 | Prévia inválida mantém últimos valores válidos | [C] idem: código inalterado | ✅ [C] (regressão) |

### Edge cases

- [x] Guardado >= alvo: `reached = savedCents >= valueCents` (`freedom.ts:181`) → 4 marcos com check; `barValue` capado em 100 (`goal-checkpoints.tsx:22`) → pino na borda direita. [C]
- [x] Patrimônio final > alvo: teto vem do final (`freedom.test.ts:440-441` [T]); `ReferenceLine` fica abaixo do teto. [C]
- [x] Alvo < primeiro ponto: domínio começa em 0 e vai a `chartYMax >= alvo` (`goal-chart.tsx:117`), e `ifOverflow="extendDomain"` (`:127`) como proteção; a linha fica dentro do domínio. [C] (render: [M])

**Status**: ✅ ACs com evidência; ⚠️ pontos visuais [M] listados abaixo (não confirmados, não falhas).

### Itens que NÃO consigo confirmar sem navegador (success criteria da spec)

1. Centro do marco x centro do label <= 1 px a >= 576 px (depende de largura real do `li` + `-translate-x-1/2`; a lógica de CSS está coerente).
2. Sobreposição visual do pino sobre o marco quando coincidem (pino de 6 px sobre círculo de 20 px com check de 12 px).
3. Rótulo "Meta: R$ 3 mi" em `insideTopRight` do `ReferenceLine` (pode colidir com a curva perto do fim, já que a curva termina na meta) e legibilidade nos dois temas.
4. Teto do eixo Y: com `tickCount={4}` e `domain` fixo o Recharts pode não imprimir um tick no teto; o espaço vazio some, mas o último rótulo exibido pode ser menor que R$ 3,21 mi.
5. Descrição da gaveta em 1 linha a 384 px (estimativa ~290 px de texto para ~312 px disponíveis).

---

## Discrimination Sensor

Scratch: `git worktree` destacado em HEAD no scratchpad, `node_modules` por symlink, só `freedom.ts` mutado; `vitest run --project unit src/lib/domain/freedom.test.ts` (baseline 73/73). Worktree removido ao final.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `freedom.ts:146` | 107 → 105 | ✅ Killed (3 testes) |
| M2 | `freedom.ts:146` | `Math.max` → `Math.min` | ✅ Killed (3) |
| M3 | `freedom.ts:146` | ignora `finalCents` (só `targetCents`) | ✅ Killed (1) |
| M4 | `freedom.ts:146` | `Math.round` → `Math.floor` | ✅ Killed após a623a15 (1 falha: teste de arredondamento de `chartYMax`; antes sobrevivia, 73/73) |
| M5 | `freedom.ts:146` | remove o arredondamento (fração de centavo) | ✅ Killed (1) |
| M6 | `freedom.ts:139` | `totalCents <= 0` → `< 0` | ✅ Killed (1) |
| M7 | `freedom.ts:141` | `interestPct` = `100 - investedPct` + 1 (soma != 100) | ✅ Killed (3) |
| M8 | `freedom.ts:140` | `Math.round` → `Math.floor` em `compositionShares` | ✅ Killed (1) |
| M9 | `freedom.ts:140` | divisão invertida (`total/invested`) | ✅ Killed (2) |

**Sensor depth**: lightweight ampliado (9 mutações; não é P0)
**Result**: 9/9 killed - ✅ PASS (M4 sobreviveu na 1ª rodada; re-executado em scratch isolado após a623a15 e morto)

Histórico do M4 (1ª rodada): os testes de `chartYMax` só usam entradas cujo produto x 1,07 é inteiro, ou 5 x 1,07 = 5,35 (round e floor dão 5), e o teste de "inteiro" (`freedom.test.ts:448-449`) só checa `Number.isInteger`, que o `floor` também satisfaz. Nenhum caso distingue "arredondado" (T2: "em centavos inteiros arredondados") de truncado.

Re-run pós-a623a15: worktree scratch novo, `git status --porcelain` antes/depois IDÊNTICO; worktree removido.

Isolamento (1ª rodada): `git status --porcelain` antes/depois **não** é idêntico, mas por ação de outra sessão, não do sensor: ` M src/app/(app)/page.tsx` sumiu (foi commitada; HEAD agora é a576457) e surgiu `?? src/components/spending-pace-chart.tsx`. Nenhum arquivo da feature foi tocado no worktree real (mutações só no scratch, que foi removido com `git worktree remove --force` + `prune`; `git worktree list` mostra só a árvore real).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (diff da feature só nos 6 arquivos) |
| No scope creep | ✅ |
| Matches patterns | ✅ (funções puras no domínio, UI consome) |
| Spec-anchored outcome check | ✅ (arredondamento de `chartYMax` pinado após a623a15) |
| Per-layer Coverage Expectation (domain 1:1 ACs) | ✅ |
| Every test maps to a spec requirement | ✅ (testes de `compositionShares` → RFN-06; `chartYMax` → RFN-05) |
| Guidelines followed | AGENTS.md, AD-005/AD-008 (UI sem teste automático) |

Nota (observação, não gap): `ifOverflow="extendDomain"` em `ReferenceLine` com `YAxis domain` numérico fixo; como `chartYMax >= alvo`, a linha nunca excede o domínio, então a prop é inofensiva.

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit` (Node 20; quick gate do tasks.md; `build` e integração fora do escopo pedido)
- **Result (re-executado após a623a15)**: typecheck OK, lint OK, 489 passed, 0 failed, 0 skipped (16 arquivos)
- **Test count before feature**: 4 testes de `compositionShares` (e3659c3) + testes anteriores; **delta da feature no intervalo**: +4 (`chartYMax`)
- **Failures**: nenhuma

---

## Fix Plans

### Fix 1 (APLICADO em a623a15): teste de `chartYMax` não distinguia round de floor

- **Root cause**: nenhum caso com parte fracionária >= 0,5 de centavo.
- **Fix task**: em `freedom.test.ts`, adicionar caso como `expect(chartYMax(301_234_567, 0)).toBe(322_320_987)` (301_234_567 x 1,07 = 322_320_986,69; o valor 322_300_988 sugerido na 1ª rodada era erro aritmético do Verifier, corrigido pelo autor).
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| RFN-01..RFN-04, RFN-07..RFN-09 | Implementing | ✅ Verified por código ([M] pendente em RFN-01, RFN-03, RFN-04, RFN-08) |
| RFN-05 | Implementing | ✅ Verified |
| RFN-06 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (itens [M] visuais pendentes de checagem manual)

**Spec-anchored check**: 25/25 ACs/edge cases com evidência de código ou teste; 5 pontos visuais exigem verificação manual
**Sensor**: 9/9 mutações mortas
**Gate**: 489 passed, 0 failed

**What works**: domínio correto; UI implementa cada AC conforme leitura de código; regressão de LAY-09/13 preservada (código intocado).

**Issues found**: nenhum aberto (M4 corrigido em a623a15).

**Next steps**: checagem visual manual dos 5 itens [M].
