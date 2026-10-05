# Liberdade: Taxa de Retirada Validation

## Validation: liberdade-taxa-retirada - PASS ✅

**Veredito**: PASS ✅

**Date**: 2026-10-05
**Spec**: `.specs/features/liberdade-taxa-retirada/spec.md`
**Diff range**: `6e76ce6^..cab60b0`, só os commits da feature: 6e76ce6, 456765e, be083c6, a3c7bbb, 5dac92c, e72f7b0, 04850d9, 9ab57bc, 1865cb1, cab60b0. Ficam de fora d4c6598, 0d607e4, 06eb728, 6b29a55 (resumo/ritmo, outras sessões) e `docs/backlog.md` (não commitado).
**Superfície do diff (src)**: `src/lib/domain/freedom.ts`, `freedom.test.ts`, `freedom-copy.ts`, `freedom-copy.test.ts`, `src/components/goal-hero.tsx`, `goal-form.tsx`, `goal-experience.tsx`, `rate-toggle.tsx`.
**Verifier**: sub-agente independente (author ≠ verifier), sem acesso ao contexto do autor.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | 6e76ce6 |
| T2 | ✅ Done | 456765e; errata da renda máxima (fator 10) corrigida no teste e na spec (5dac92c) |
| T3 | ✅ Done | be083c6; desvio do arredondamento do aporte registrado e a spec corrigida em 5dac92c |
| T4 | ✅ Done | a3c7bbb |
| T5 | ✅ Done | e72f7b0 (UI, sem teste automático) |
| T6 | ✅ Done | 04850d9 (UI) |
| T7 | ✅ Done | 9ab57bc (UI) |
| T8 | ✅ Done | 1865cb1 (UI) |
| T9 | ✅ Done | cab60b0 (varredura e regressão) |

---

## Spec-Anchored Acceptance Criteria

Conferência independente dos valores: renda anual 2.000.000 × 12 = 24.000.000 centavos; × 10.000 ÷ 400 = 600.000.000; ÷ 600 = 400.000.000; ÷ 700 = 342.857.142,857 → 342.857.143. Renda máxima: 1.200.000.000 × 10.000 ÷ 700 = 17.142.857.142,857 → 17.142.857.143 (R$ 171.428.571,43). (1,06)^(1/12) − 1 = 0,0048676.

| ID | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + asserção | Result |
| -- | ------------------------- | -------------------- | ---------------------- | ------ |
| RET-01 | Tabela única em `freedom.ts` | 6→4, 8→6, 10→7; um par por cenário | `src/lib/domain/freedom.ts:11` (`WITHDRAWAL_RATE_BP: Record<AnnualRateBp, number> = { 600: 400, 800: 600, 1000: 700 }`); `src/lib/domain/freedom.test.ts:37` - `expect(Object.keys(WITHDRAWAL_RATE_BP).map(Number)).toEqual([...ANNUAL_RATES])`. Única ocorrência da tabela em `src` (grep `WITHDRAWAL_RATE`/`getWithdrawalRate`) | ✅ PASS |
| RET-02 | `getWithdrawalRate(600/800/1000)` | 400, 600, 700 | `src/lib/domain/freedom.test.ts:24-29` - `expect(getWithdrawalRate(rate)).toBe(expected)` com `[600,400],[800,600],[1000,700]` | ✅ PASS |
| RET-03 | Rentabilidade fora da tabela | `RangeError`, nenhuma taxa devolvida | `src/lib/domain/freedom.test.ts:32-33` - `expect(() => getWithdrawalRate(rate)).toThrow(RangeError)` para 0, 500, 700, 1200, NaN; implementação `freedom.ts:16` | ✅ PASS |
| RET-04 | R$ 20.000/mês | R$ 6.000.000,00 / 4.000.000,00 / 3.428.571,43 | `src/lib/domain/freedom.test.ts:50-55` - `expect(targetCents(2_000_000, rate)).toBe(expected)` com 600_000_000, 400_000_000, 342_857_143; também `freedom.test.ts:330` (`summary.targetCents`) e `src/lib/domain/freedom-copy.test.ts:26-31` (texto `Patrimônio necessário R$ 6.000.000,00` etc.) | ✅ PASS |
| RET-05 | Meta = renda × 12 ÷ retirada, arredondada ao centavo; nunca ÷ rentabilidade | `round(...)`; 6% ≠ 400.000.000 | `src/lib/domain/freedom.test.ts:59` - `expect(targetCents(2_000_000, 600)).not.toBe(400_000_000)`; arredondamento: `freedom.test.ts:55` (342_857_143, que exige `Math.round`: floor daria …142) e `freedom.test.ts:64` (`toBe(17_142_857_143)`); `freedom.test.ts:70` - `expect(annualIncomeCents(2_000_000)).toBe(24_000_000)` | ✅ PASS |
| RET-06 | Taxa mensal `(1+a)^(1/12) − 1` | 6% → 0,4868% a.m.; nunca a ÷ 12 | `src/lib/domain/freedom.test.ts:318-320` - `expect(rate).toBeCloseTo(perMonth, 8)` (0.004867551 / 0.00643403 / 0.00797414), `expect((1 + rate) ** 12).toBeCloseTo(1 + annualRateBp / 10_000, 12)`, `expect(rate).not.toBeCloseTo(annualRateBp / 10_000 / 12, 6)`; `freedom.test.ts:271` | ✅ PASS |
| RET-07 | PMT resolve FV = meta nova, fim de mês, arredondado para cima | PMT mínimo em centavos que alcança a meta | `src/lib/domain/freedom.test.ts:342` - `expect(at(monthly)).toBeGreaterThanOrEqual(target)`; `:344` - `expect(at(monthly - 1)).toBeLessThan(target)` (prova o ceil ao centavo); `:348` - aporte maior que o da meta antiga; fórmula de fim de mês travada em `:160-167` | ✅ PASS |
| RET-08 | Resumo único com rentabilidade, retirada, renda anual, meta, aporte, meses; progresso, distância, marcos e eixo Y pela mesma meta; recálculo por entrada | `withdrawalRateBp` 400/600/700, `annualIncomeCents` 24.000.000; cada entrada muda só os dependentes | `src/lib/domain/freedom.test.ts:328-330` - `expect(summary.withdrawalRateBp).toBe(withdrawalRateBp)`, `expect(summary.annualIncomeCents).toBe(24_000_000)`, `expect(summary.targetCents).toBe(target)`; recálculo `:382-410` (renda → meta 600_000_000 e anual 36_000_000; guardado → só aporte; nascimento → 288 meses; ápice 65 → 300 meses; 6% → retirada 400 e meta 600_000_000); progresso/distância `:180-186`, `:417`; marcos `:364`, `:590-593`; eixo Y `:362-363` | ✅ PASS |
| RET-09 | Último ponto ≥ meta com sobra limitada ao ceil do aporte (spec corrigida em 5dac92c); aporte 0 quando o guardado capitalizado alcança; "Prazo encerrado" com 0 meses | `last ≥ target`; `last − target ≤ projeção de 1 centavo/mês`; aporte 0; `null` | `src/lib/domain/freedom.test.ts:360-361` - `expect(last).toBeGreaterThanOrEqual(target)`, `expect(last - target).toBeLessThanOrEqual(projectedCents({ savedCents: 0, monthlyCents: 1, annualRateBp }, 240))`; `:345` idem pela projeção; aporte 0 `:416`; prazo encerrado `:428` - `toBeNull()`; render: `src/components/goal-hero.tsx:68-69` e `src/components/goal-experience.tsx:23-24` ("Prazo encerrado") | ✅ PASS |
| RET-10 | Linha "Meta" do gráfico em `summary.targetCents`, mesmo valor do Hero e da gaveta | mesmo inteiro em todos | Domínio: `src/lib/domain/freedom.test.ts:362` - `expect(chartYMax(summary.targetCents, last)).toBe(yMax)` (642_000_458 / 428_000_093 / 366_857_473) e `:364` - `expect(summary.checkpoints.at(-1)?.valueCents).toBe(summary.targetCents)`. Fiação (verificação por leitura de código, AD-005/AD-008): `src/components/goal-chart.tsx:117` (`domain={[0, chartYMax(summary.targetCents, last.totalCents)]}`), `goal-chart.tsx:123` (`y={summary.targetCents}`), `goal-chart.tsx:129` (rótulo "Meta"); Hero `src/components/goal-hero.tsx:40`; gaveta `src/components/goal-experience.tsx:31`; os três recebem o mesmo objeto `summary` (`src/components/goal-summary.tsx:9-10`, `goal-experience.tsx:83,100`) | ✅ PASS (domínio testado; fiação por leitura de código) |
| RET-11 | Seletor "Rentabilidade real esperada", legenda, opções | título, legenda e 3 opções exatos | `src/lib/domain/freedom-copy.test.ts:15-16` - `expect(RATE_TITLE).toBe("Rentabilidade real esperada")`, `expect(RATE_HINT).toBe("Taxa real estimada (descontada a inflação)")`. Fiação (leitura de código): `src/components/goal-form.tsx:164-165`, `src/components/rate-toggle.tsx:20` (`aria-label={RATE_TITLE}`), opções `rate-toggle.tsx:11-13` | ✅ PASS |
| RET-12 | Hero com rentabilidade, retirada, renda, patrimônio nos pares 6/4, 8/6, 10/7 | textos exatos por cenário | `src/lib/domain/freedom-copy.test.ts:26-31` - `expect(factsOf(rate)).toEqual([\`Rentabilidade real ${real} a.a.\`, \`Taxa de retirada ${withdrawal} a.a.\`, "Renda desejada R$ 20.000,00/mês", \`Patrimônio necessário ${target}\`])`. Fiação (leitura de código): `src/components/goal-hero.tsx:42-49` (`heroFacts(summary)`) | ✅ PASS (⚠️ ver lacuna 2) |
| RET-13 | "Como calculamos?" com o texto do pedido, variação por cenário e premissa | texto exato + duas frases | `src/lib/domain/freedom-copy.test.ts:39-41` (texto do pedido, `toContain`), `:45` (varia conforme o cenário), `:49` (premissas de simulação). Fiação (leitura de código): `src/components/goal-hero.tsx:53-62` (`<details>` nativo, toque e teclado) | ✅ PASS |
| RET-14 | Sem "perpétuo/garantido/vitalício" e sem promessa; a prévia atualiza a retirada ao trocar o cenário | ausência das palavras; retirada exibida segue o cenário | `src/lib/domain/freedom-copy.test.ts:62-63` - `expect(t.toLowerCase()).not.toContain(root)` para `perpétu`, `garantid`, `vitalíc` sobre todos os textos exportados e os fatos dos três cenários. Varredura independente `grep -rniE "perpétu\|vitalíc\|garantid\|Taxa esperada" src e2e`: única ocorrência `src/lib/domain/freedom-copy.test.ts:54` (lista `FORBIDDEN`). `INTRO` sem "sem consumir o principal": `src/components/goal-experience.tsx:17`. AC5 (leitura de código): `src/components/goal-form.tsx:69-70` (`getWithdrawalRate(Number(rate) * 100) / 100` recalculado a cada render), `goal-form.tsx:167`; prévia via `goal-experience.tsx:65-67` (`summarize` a cada rascunho válido) | ✅ PASS (⚠️ ver lacuna 1) |
| RET-15 | Objetivos salvos recalculam sem migração; schema, `goalSchema`, `saveGoal` e nomes inalterados; `freedom.ts` e `validation/goal.ts` sem import de servidor | diff vazio; imports puros | `git diff --stat 6e76ce6^ cab60b0 -- src/lib/validation src/actions src/lib/db drizzle src/lib/repos` vazio (exit 0, sem saída). Imports: `src/lib/domain/freedom.ts:1` (só `./month`, que não importa nada), `src/lib/domain/freedom-copy.ts:1-2` (`./freedom`, `./money` → `./result`), `src/lib/validation/goal.ts:1-4` (zod e domínio). Nomes `annualRateBp`, `targetCents`, `requiredMonthlyCents`, `summarize` em `freedom.ts:31,66,86,239`. Recalculo na leitura: `src/components/goal-experience.tsx:58` (`summarize(saved, now)`); integração 285/285 verde | ✅ PASS |

### Casos de borda

| Caso | Spec | Evidência | Result |
| ---- | ---- | --------- | ------ |
| Renda máxima R$ 1.000.000,00 a 10% | R$ 171.428.571,43, erro ≤ 1 centavo | `src/lib/domain/freedom.test.ts:64` - `expect(target).toBe(17_142_857_143)`; `:66` - `expect(Math.abs(target * 700 - 12_000_000_000_000)).toBeLessThanOrEqual(700)` | ✅ |
| Meta de 10% não inteira usada arredondada em todos | mesmo inteiro em Hero, gaveta, marcos, gráfico, aporte | `src/lib/domain/freedom.ts:240` (uma chamada), repasse em `:248,270-271,277`; `src/lib/domain/freedom.test.ts:330` (342_857_143), `:364` (marco 100% = `summary.targetCents`); componentes leem `summary.targetCents` (RET-10) | ✅ |
| Guardado acima da meta nova | progresso > 100% e aporte 0 | `src/lib/domain/freedom.test.ts:422-423` - `expect(summary.progressBp).toBe(12_000)`, `expect(summary.monthlyCents).toBe(0)` (480.000.000 / 400.000.000) | ✅ |
| `months = 0` e guardado alcança a meta | aporte 0 | `src/lib/domain/freedom.test.ts:429` - `expect(summarize({ ...ended, savedCents: 400_000_000 }, now).monthlyCents).toBe(0)`; fronteira 399_999_999 → `null` em `:428` | ✅ |

### Conferências independentes pedidas

- (a) Nenhum componente escreve 4/6/7 como retirada nem recalcula meta: `grep` em `src/components` só acha `getWithdrawalRate` em `goal-form.tsx:70`; `summarize` só em `goal-experience.tsx:58,62,67`; `targetCents(` não é chamado fora do domínio. Os "6%/8%/10%" de `rate-toggle.tsx:11-13` são rótulos de rentabilidade, não de retirada.
- (b) Gráfico, Hero e gaveta usam o mesmo `summary.targetCents` (citações em RET-10).
- (c) Varredura `perpétu|vitalíc|garantid|Taxa esperada` em `src` e `e2e`: só `freedom-copy.test.ts:54`.
- (d) `freedom.ts` não importa servidor (AD-008).
- (e) Diff de schema, `goalSchema`, `saveGoal` (e repos/drizzle) nos commits da feature: vazio.
- Desvio do arredondamento do aporte: a spec corrigida (RET-09 AC4, 5dac92c) pede "≥ meta, sobra limitada ao ceil, 1 centavo a menos não alcança"; os testes `freedom.test.ts:342,344,345,360,361` asserem exatamente isso. Não há `// SPEC_DEVIATION` no código.

**Status**: ✅ 15/15 ACs com evidência e valor conferido contra a spec; 2 lacunas de precisão menores (abaixo), nenhuma reprova.

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt cab60b0`, `node_modules` por symlink, comando `npx vitest run --project unit src/lib/domain/freedom.test.ts src/lib/domain/freedom-copy.test.ts` (119 testes; baseline sem mutação: 119 passando). Cada mutação aplicada e revertida por script; worktree removido no fim.

| Mutação | File:line | Descrição | Killed? |
| ------- | --------- | --------- | ------- |
| M1 | `src/lib/domain/freedom.ts:11` | `WITHDRAWAL_RATE_BP[800]` 600 → 500 | ✅ Killed (25 falhas) |
| M2 | `src/lib/domain/freedom.ts:32` | meta dividida pela rentabilidade em vez da retirada | ✅ Killed (41) |
| M3 | `src/lib/domain/freedom.ts:32` | sem `Math.round` na meta | ✅ Killed (6) |
| M4 | `src/lib/domain/freedom.ts:248` | `summarize` passa a `requiredMonthlyCents` a meta antiga (÷ rentabilidade) em vez da exibida | ✅ Killed (14) |
| M5 | `src/lib/domain/freedom.ts:22` | `monthlyRate` = taxa ÷ 12 | ✅ Killed (22) |
| M6 | `src/lib/domain/freedom-copy.ts:22-23` | `heroFacts` troca rentabilidade e retirada | ✅ Killed (3) |
| M7 | `src/lib/domain/freedom.ts:16` | `getWithdrawalRate` devolve 600 por padrão em vez de lançar | ✅ Killed (5) |
| M8 | `src/lib/domain/freedom.ts:267` | `summary.withdrawalRateBp` fixo em 400 | ✅ Killed (6) |
| M9 | `src/lib/domain/freedom.ts:27` | renda anual × 13 | ✅ Killed (44) |
| M10 | `src/lib/domain/freedom.ts:277` | marcos recebem meta + 100 centavos (≠ exibida) | ✅ Killed (7) |
| M11 | `src/lib/domain/freedom.ts:32` | `Math.round` → `Math.floor` na meta | ✅ Killed (4) |
| M12 | `src/lib/domain/freedom-copy.ts:14` | remove a frase "premissas de simulação" | ✅ Killed (1) |

**Sensor depth**: expandido (12 mutações, ≥ 5 pedidas)
**Result**: 12/12 killed - PASS ✅

**Isolamento**: baseline `git status --porcelain` antes do sensor = ` M docs/backlog.md` + `?? .specs/features/ritmo-sem-investimento/`. Depois: ` M docs/backlog.md`. A diferença é o diretório `ritmo-sem-investimento` que outra sessão commitou durante a verificação (0d607e4 15:04, 06eb728 15:05, 6b29a55 15:05:59); o sensor só mexeu no worktree destacado no scratchpad. `git worktree list` mostra só a árvore principal; `node_modules` real intacto (symlink removido antes do `worktree remove`).

---

## Interactive UAT Results

Não realizado. Nenhuma verificação visual no navegador dos três cenários foi feita (nem nesta validação nem em T9). A UI não tem teste automático (AD-005, AD-008); a fiação foi conferida por leitura de código.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (tabela + 2 funções + 2 campos; textos num módulo puro) |
| Surgical changes | ✅ (só os 8 arquivos de `src` previstos no design) |
| No scope creep | ✅ (sem migração, sem campo livre, sem `calculateFinancialIndependence`) |
| Matches patterns | ✅ (módulo puro testado como `spending-pace.ts`; `<details>` nativo) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ domínio 1:1; UI "build gate only" pela matriz |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md`, `vitest.config.ts`, AD-005, AD-008 | ✅ |

---

## Gate Check

- **Comandos**: `npm run typecheck` (exit 0), `npm run lint` (exit 0), `npm run test:unit` (exit 0), `DATABASE_URL=…/orcamento_taxa_retirada_test npx vitest run --project integration` (exit 0). Node v20.20.2.
- **Unit**: 17 arquivos, 550 passando, 0 falhas, 0 skips (a suíte inteira inclui testes de outras sessões já commitados; T9 registrou 535 antes deles).
- **Integração**: 13 arquivos, 285 passando, 0 falhas, no banco privado `orcamento_taxa_retirada_test` (o `vitest.config.ts` usa `loadEnv("test", cwd, "")`, em que `process.env` prevalece sobre `.env.test`; o `db-reset.ts` só aceita nomes `*_test`). `orcamento_test` não foi usado.
- **Build**: não rodado. Há um `next dev` de outra sessão em execução (PID 449756, desde 14:07); T5-T8 registram build verde no momento dos commits.
- **Test count da feature**: `freedom.test.ts` tinha 73 testes em `6e76ce6^`; agora `freedom.test.ts` + `freedom-copy.test.ts` = 119 (109 + 10). Delta +46; nenhum teste removido e nenhuma asserção afrouxada (as expectativas antigas de meta foram reescritas com os valores da spec).
- **Failures**: nenhuma.

---

## Lacunas de precisão da spec (não bloqueiam)

1. **RET-14 AC4, "qualquer frase que afirme renda ou retorno garantido"**: não dá para checar isso mecanicamente. O teste automático (`freedom-copy.test.ts:62-63`) cobre só os textos exportados por `freedom-copy.ts`. `INTRO` (`goal-experience.tsx:17`), a linha da retirada no formulário (`goal-form.tsx:167`) e o `aria-label` do gráfico ficam cobertos só pela varredura por grep e por leitura. Por leitura, nenhuma dessas frases promete renda ou retorno.
2. **RET-12 versus a premissa do Hero**: a premissa diz que o valor grande "Meta Patrimonial" "não se repete", mas o AC 2 pede a linha "Patrimônio necessário" com a meta. A implementação mostra os dois (`goal-hero.tsx:40` e o 4º fato em `goal-hero.tsx:43`), então a meta aparece duas vezes no card. Além disso, a UI renderiza `"<rótulo>:"` + valor (`goal-hero.tsx:45`, "Taxa de retirada: 4% a.a."), enquanto a spec e o teste usam o texto sem dois-pontos. A diferença é só cosmética.

Nota de processo: a tabela de rastreabilidade da spec já marcava RET-11..RET-15 como "Verified" antes desta validação, e RET-01..RET-10 continuam "Implementing". O orquestrador deve alinhar os status (sugestão: RET-01..RET-15 → Verified).

---

## Riscos para o usuário

- **Objetivos já salvos mudam de meta e de aporte ao abrir a tela.** O cálculo acontece na leitura e não há migração. A meta sobe de ×200/×150/×120 da renda mensal para ×300/×200/×171,43. Exemplo com R$ 10.000/mês e 240 meses a 8%: a meta passa de R$ 1.500.000 para R$ 2.000.000 e o aporte de R$ 2.636,21 para R$ 3.514,95.
- **Sem verificação visual no navegador** dos três cenários: layout, quebra das linhas `dl` no Hero estreito e abertura do `<details>` por toque e teclado foram vistos só por leitura de código.
- A projeção final passa da meta por alguns centavos (428, 87 e 308 centavos a 6/8/10% com R$ 20.000/mês) por causa do aporte arredondado para cima. É o comportamento esperado pela spec corrigida.
- `getWithdrawalRate` lança `RangeError` com rentabilidade fora de 6/8/10. Na prática isso não acontece (banco, `goalSchema` e `AnnualRateBp` restringem o valor), mas, se acontecer, a tela quebra em vez de mostrar uma meta errada. Foi uma decisão de design.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| RET-01 .. RET-10 | Implementing | ✅ Verified |
| RET-11 .. RET-15 | Verified (pelo autor) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (com UAT visual pendente)

**Spec-anchored check**: 15/15 ACs batem com a spec; 2 lacunas de precisão menores
**Sensor**: 12/12 mutações mortas
**Gate**: typecheck, lint, unit 550/550, integração 285/285 (build não rodado: há `next dev` de outra sessão)

**What works**: tabela única de retirada, meta pela retirada com arredondamento, aporte/projeção/marcos/eixo Y pela mesma meta, textos sem promessa, fiação da UI só pelo resumo.

**Issues found**: nenhum bloqueante. A spec poderia resolver a premissa "não se repete" do Hero e definir um critério verificável para "frase que afirme garantia".

**Next steps**: verificação visual opcional dos três cenários em `/liberdade`; alinhar os status da rastreabilidade em `spec.md`.
