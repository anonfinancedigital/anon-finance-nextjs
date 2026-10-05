# Liberdade: Ajustes de UX e Taxa Personalizada Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/liberdade-ajustes-ux/spec.md`
**Diff range**: commits `liberdade`/`ui` T1..T14: eaffaee cb0cc3f 4ce15b6 f863d3f b1e7289 2bfbd20 a3dd8bf e3797c5 726365d 3cc779d 931f47a 5fd8b4c 2d151fc 4bf0615 + correções da iteração 1: 8904827 (`test(liberdade): pin the age tick limits at the boundary`) e 60c0769 (`fix(liberdade): keep the withdrawal subtext on one line`). Commits `recorrencia` intercalados e alterações não commitadas em docs/, page-header, categorias, `src/app/(app)/page.tsx`, goal-experience (só o `eyebrow`) e transaction-form foram ignorados.
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS ✅ (re-verificação, iteração 1 de 3)

Histórico:
- **Rodada 0: FAIL ❌.** Os mutantes M13 e M15 de `ageTicks` sobreviveram, e em 360 px o subtexto dos perfis quebrava linha.
- **Iteração 1: PASS.** O teste novo `src/lib/domain/age-ticks.test.ts:27-38` mata M13 e M15. O subtexto ficou com `whitespace-nowrap text-[11px]` (`src/components/rate-toggle.tsx:55`): uma linha em 320, 360 e 1280 px, e a mesma altura nos três botões.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | eaffaee; teste de borda incompleto (ver Sensor) |
| T2 | ✅ Done | cb0cc3f |
| T3 | ✅ Done | 4ce15b6 |
| T4 | ✅ Done | f863d3f |
| T5 | ✅ Done | b1e7289 |
| T6 | ✅ Done | 2bfbd20 |
| T7 | ✅ Done | a3dd8bf |
| T8 | ✅ Done | e3797c5 |
| T9 | ✅ Done | 726365d |
| T10 | ✅ Done | 3cc779d |
| T11 | ✅ Done | 931f47a |
| T12 | ✅ Done | 5fd8b4c; em 360 px o subtexto quebra linha (ver UAT) |
| T13 | ✅ Done | 2d151fc |
| T14 | ✅ Done | 4bf0615 |

---

## Spec-Anchored Acceptance Criteria

### P1: Rótulos dos marcos

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| AJL-01 | "Aos N anos", sem "Previsão" | `src/lib/domain/freedom-copy.test.ts:86` - `expect(checkpointLabel(cp({ ageYears: 38 }), false)).toBe("Aos 38 anos")`; usado em `src/components/goal-checkpoints.tsx:70` | ✅ PASS |
| AJL-02 | "Atingido" + círculo verde preenchido + check | `src/lib/domain/freedom-copy.test.ts:81-82` - `.toBe("Atingido")` (também no último). Círculo/check por leitura de código: `src/components/goal-checkpoints.tsx:41` (`border-income bg-income`), `:45` (`<Check>`) | ✅ PASS (texto testado; círculo verificado por leitura de código) |
| AJL-03 | "Sem previsão" + círculo vazio | `src/lib/domain/freedom-copy.test.ts:94` - `.toBe("Sem previsão")`; círculo vazio `src/components/goal-checkpoints.tsx:41` (`border-muted-foreground bg-card`) | ✅ PASS (círculo por leitura de código) |
| AJL-04 | último: "Aos N anos (Meta)" | `src/lib/domain/freedom-copy.test.ts:90` - `.toBe("Aos 45 anos (Meta)")`; `isLast` = `index === lastIndex` em `src/components/goal-checkpoints.tsx:18,70` | ✅ PASS |
| AJL-05 | uma linha, sem quebra nem sobreposição, 360-1280 px | Sem teste automático (AD-005/AD-008). Código: `src/components/goal-checkpoints.tsx:61` (`min-w-0`), `:68` (`truncate text-xs whitespace-nowrap`). Visual (Playwright, dev server isolado): 360 px grade 2×2, rótulos 16 px de altura (1 linha), `scrollWidth <= clientWidth` (não truncados), colunas 37-174 e 186-323 px; 1280 px rótulos em 485-551, 716-783, 947-1013, 1103-1211 px, sem interseção | ✅ PASS (visual) / ⚠️ Spec-precision gap: sem asserção automatizável |

### P1: Idade final no eixo

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| AJL-06 | idade de aposentadoria entre os rótulos | `src/lib/domain/age-ticks.test.ts:7` - `expect(ticks[ticks.length - 1]).toBe(45)`; uso `src/components/goal-chart.tsx:96`. Visual: eixo termina em 45 em 360 e 1280 px | ✅ PASS |
| AJL-07 | no máximo 9 rótulos, inteiros, crescentes, distintos | `src/lib/domain/age-ticks.test.ts:32-36` - para toda distância de 0 a 60 anos: `expect(ticks[ticks.length - 1]).toBe(30 + span)`, `expect(ticks.length).toBeLessThanOrEqual(9)`, `toEqual([...new Set(ticks)].sort(...))`; também `:8,14,16` | ✅ PASS (M13 morto na iteração 1) |
| AJL-08 | distância < 9 anos: cada idade inteira | `src/lib/domain/age-ticks.test.ts:28` - `expect(ageTicks(34, 42)).toEqual([34, 35, 36, 37, 38, 39, 40, 41, 42])` (limite de 8 anos); `:20` (4 anos) | ✅ PASS (M15 morto na iteração 1) |

### P1: Prefixo R$

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| AJL-09 | `R$` fixo à esquerda dos dois inputs | Código: `src/components/currency-input.tsx:9-15` (span `aria-hidden` `left-3.5` + `pl-10`), usado em `src/components/goal-form.tsx:122,136`; rótulos sem "(R$)" `:121,135`. Visual: dois spans "R$" no formulário, nos dois campos, em 360 e 1280 px | ✅ PASS (verificado por leitura de código e visual) |
| AJL-17 | submete o texto sem `R$` | `src/actions/goals.int.test.ts:19,28` - `INPUT.monthlyIncome: "10.000,00"` → `SAVED.monthlyIncomeCents: 1_000_000` (`toEqual` no `goalsRepo.get`); estado `values` sem prefixo `src/components/goal-form.tsx:126,108`. Visual: `inputValue()` = `"20.000,00"` | ✅ PASS |

### P1: Seletor de perfil

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| AJL-24 | grid de 3 colunas, mesma altura | Código: `src/components/rate-toggle.tsx:42` (`grid-cols-3 items-stretch`), `:49` (`min-h-16`). Visual: alturas 64/64/64 px em 320, 360 e 1280 px, com 3 linhas por botão; o subtexto (`src/components/rate-toggle.tsx:55`, `whitespace-nowrap text-[11px]`) tem 15 px de altura (1 linha), cabe dentro do botão e não estoura (`scrollWidth <= clientWidth`) | ✅ PASS (visual, iteração 1) |
| AJL-25 | título, "6% a.a."/"8% a.a."/"10% a.a.", "Retirada: 4% a.a."/"6%"/"7%" | Código: `src/components/rate-toggle.tsx:13-18,53-55` (da tabela `PRESET_RATES` + `formatRate`). Visual: "Conservador \| 6% a.a. \| Retirada: 4% a.a.", "Moderado \| 8% a.a. \| Retirada: 6% a.a.", "Agressivo \| 10% a.a. \| Retirada: 7% a.a." | ✅ PASS (visual) |
| AJL-26 | sem a linha "Taxa de retirada N% a.a." | Código: ausente em `src/components/goal-form.tsx:189-220`. Visual: o texto do formulário não contém "Taxa de retirada 6% a.a." | ✅ PASS |
| AJL-27 | só o ativo destacado | Código: `src/components/rate-toggle.tsx:40,50` (`data-[state=checked]`). Visual: Moderado `checked`, demais `unchecked`; após clicar Agressivo só ele `checked` | ✅ PASS (visual) |

### P1: Card de Meta

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| AJL-28 | pílula "Gera R$ X/mês com retirada de M% a.a." abaixo do valor | `src/lib/domain/freedom-copy.test.ts:111` - `toBe("Gera R$ 20.000,00/mês com retirada de 6% a.a.")`; posição `src/components/goal-hero.tsx:42` (logo após o valor `:39-41`). Visual: idêntico, e "...de 4,5% a.a." no objetivo 6,5/4,5 | ✅ PASS |
| AJL-29 | sem as 4 linhas no card | Código: `src/components/goal-hero.tsx:37-64` (o `dl` só existe dentro de `<details>`). Visual: `innerText` do card fechado sem "Rentabilidade real", "Taxa de retirada:", "Renda desejada", "Patrimônio necessário" | ✅ PASS (visual) |
| AJL-30 | "Como calculamos?" com as 4 linhas + parágrafos | `src/lib/domain/freedom-copy.test.ts:28` - `toEqual([\`Rentabilidade real ${real} a.a.\`, ...4 linhas])`; `src/components/goal-hero.tsx:46-63`. Visual (6,5/4,5): "6,5% a.a.", "4,5% a.a.", "R$ 20.000,00/mês", "R$ 5.333.333,33" + 3 parágrafos | ✅ PASS |
| AJL-31 | vírgula decimal ("6,5% a.a.") | `src/lib/domain/freedom-copy.test.ts:104` - `formatRate(650)` `toBe("6,5%")`, `675` → `"6,75%"` | ✅ PASS |

### P2: Taxa personalizada

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| AJL-10 | botão de texto "Personalizada" abaixo do grid | Código: `src/components/rate-toggle.tsx:59-69` (`<button type="button" aria-pressed>` fora do radiogroup). Visual: presente abaixo do grid | ✅ PASS (visual) |
| AJL-11 | campos com os valores do preset ativo | Código: `src/components/goal-form.tsx:195` (`onCustom` só liga `custom`), `:198-214`. Visual: preset 8/6 → Personalizada mostra "8" e "6" | ✅ PASS (visual) |
| AJL-12 | recalcula tudo; meta = round(renda × 12 ÷ retirada) | `src/lib/domain/freedom.test.ts:67` - `targetCents(2_000_000, 450)` `toBe(533_333_333)`; `:315-325` - `summarize` 650/450: `targetCents` 533_333_333, aporte, último marco e último ponto do gráfico pela rentabilidade 650. Prévia: `src/components/goal-experience.tsx:66-67`. Visual: digitar 6,5/4,5 → "R$ 5.333.333,33" e pílula "4,5% a.a." | ✅ PASS |
| AJL-13 | "A rentabilidade deve estar entre 1% e 15% ao ano" | `src/lib/validation/goal.test.ts:156` - `toBe(ANNUAL_RANGE)` para "0,99", "15,01", "0", "16", "100"; limites aceitos `:152`; `src/actions/goals.int.test.ts:78` | ✅ PASS |
| AJL-14 | "A taxa de retirada deve estar entre 1% e 15% ao ano" | `src/lib/validation/goal.test.ts:160` - `toBe(WITHDRAWAL_RANGE)` para "0,99", "15,01", "0"; `src/actions/goals.int.test.ts:79` | ✅ PASS |
| AJL-15 | "Informe a taxa com até 2 casas decimais, ex.: 6,5" | `src/lib/validation/goal.test.ts:166-167` - `toBe(FORMAT)` ("6,555", "abc", "1e1", "6,"...); `src/actions/goals.int.test.ts:80` | ✅ PASS |
| AJL-18 | "A taxa de retirada não pode ser maior que a rentabilidade" | `src/lib/validation/goal.test.ts:183` - `toEqual({ withdrawalRate: WITHDRAWAL_ABOVE })` (7 vs 6); `src/actions/goals.int.test.ts:81`; CHECK do banco `src/lib/db/repos/goals.int.test.ts:113,118`. Visual: mensagem aparece ao salvar 6,5/7 | ✅ PASS |
| AJL-19 | reabrir marca o preset do par ou Personalizada, campos preenchidos | `src/lib/domain/freedom.test.ts:36,45` - `presetFor` (par → preset / `toBeNull()`); persistência `src/lib/db/repos/goals.int.test.ts:75`, `src/actions/goals.int.test.ts:74`. Página: `src/app/(app)/liberdade/page.tsx:15,31-32`; modo `src/components/goal-form.tsx:73`. Visual: objetivo 650/450 reabre com `aria-pressed="true"`, nenhum perfil marcado, campos "6,5" e "4,5"; 800/600 reabre com Moderado marcado | ✅ PASS (visual para a UI) |
| AJL-20 | 6/8/10 → retirada 4/6/7 | `src/lib/domain/freedom.test.ts:24` - `PRESET_RATES` `toEqual([...600/400, 800/600, 1000/700])`; `src/components/goal-form.tsx:98-102`. Visual: clicar Agressivo → pílula "7% a.a." e meta R$ 3.428.571,43 | ✅ PASS |
| AJL-16 | backfill 6→4, 8→6, 10→7 sem alterar a meta | `src/lib/db/repos/goals.int.test.ts:153` - `toEqual({ [u0]: [600, 400], [u1]: [800, 600], [u2]: [1000, 700] })`; `:155` metas `[342_857_143, 400_000_000, 600_000_000]`; `:162` `NOT NULL` | ✅ PASS |

### Edge cases

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| AJL-21 | "6,5" e "6.5" → 6,5% | `src/lib/validation/goal.test.ts:134-135` - `toBe(650)` nos dois campos | ✅ PASS |
| AJL-22 | vazio → mensagem de formato | `src/lib/validation/goal.test.ts:172-173` (`""`, `"   "`), `:177-178` (ausente) - `toBe(FORMAT)` | ✅ PASS |
| AJL-23 | retirada = rentabilidade aceita | `src/lib/validation/goal.test.ts:195` - `toEqual([bp, bp])` (6/6 e 6,5/6.5); banco `src/lib/db/repos/goals.int.test.ts:102` | ✅ PASS |
| AJL-32 | Personalizada ativa: nenhum perfil destacado | Código: `src/components/rate-toggle.tsx:40` (`value=""` com `customActive`). Visual: estados `unchecked ×3` após clicar Personalizada e ao reabrir 6,5/4,5 | ✅ PASS (visual) |

**Status**: ✅ Todos os 32 ACs cobertos (iteração 1) / ⚠️ 1 spec-precision gap residual (AJL-05), verificado visualmente

**Spec-precision gaps**:
1. AJL-05: o desfecho só pode ser checado visualmente (sem teste de componente/e2e por AD-005/AD-008). Verificado aqui com Playwright, mas sem trava de regressão.
2. AJL-24/AJL-25 (resolvido): o AC pede só "mesma altura". O coordenador decidiu que vale o Independent Test ("três linhas por botão", sem quebra), e a iteração 1 atende a isso em 320, 360 e 1280 px.

---

## Discrimination Sensor

Scratch: `git worktree` em `.../scratchpad/wt` (HEAD d295cf3, mesmos arquivos da feature de 4bf0615), `node_modules` por symlink, integração com `DATABASE_URL` → `orcamento_ajustes_test`. Baseline do scratch: 542 testes unitários e 32 de `goals.int.test.ts` passaram.

| # | File:line | Description | Killed? |
| - | --------- | ----------- | ------- |
| M1 | `src/lib/validation/goal.ts:24` | `parseRate` sem `padEnd`: "6,5" → 605 | ✅ Killed (6 falhas) |
| M2 | `src/lib/validation/goal.ts:104` | faixa `> MAX_RATE_BP` → `>=` (15% rejeitado) | ✅ Killed (1) |
| M3 | `src/lib/validation/goal.ts:109` | relação `withdrawal > annual` → `>=` | ✅ Killed (3) |
| M4 | `src/lib/validation/goal.ts:17` | regex aceita 3 casas decimais | ✅ Killed (3) |
| M5 | `src/lib/validation/goal.ts:104` | limite inferior `< 100` → `< 99` (aceita 0,99) | ✅ Killed (2) |
| M6 | `src/lib/domain/freedom.ts:34` | `targetCents` `Math.round` → `Math.floor` | ✅ Killed (3) |
| M7 | `src/lib/domain/freedom.ts:19` | `presetFor` ignora a retirada | ✅ Killed (2) |
| M8 | `src/lib/domain/age-ticks.ts:13-14` | ticks contados a partir da idade inicial (perde o último) | ✅ Killed (2) |
| M9 | `src/lib/domain/freedom-copy.ts:43` | `checkpointLabel` sem "(Meta)" | ✅ Killed (1) |
| M10 | `src/lib/domain/freedom-copy.ts:19` | `formatRate` em `en-US` ("6.5%") | ✅ Killed (2) |
| M11 | `src/lib/domain/freedom-copy.ts:26` | `heroPill` com a rentabilidade no lugar da retirada | ✅ Killed (1) |
| M12 | `drizzle/0011_withdrawal_rate.sql:2` | backfill `WHEN 800 THEN 500` | ✅ Killed (1, integração) |
| M13 | `src/lib/domain/age-ticks.ts:1` | `MAX_INTERVALS = 9`: `ageTicks(34, 43)` dá 10 rótulos (viola AJL-07) | Rodada 0: ❌ Survived · Iteração 1: ✅ Killed (`age-ticks.test.ts:31`) |
| M14 | `src/lib/domain/freedom.ts:245` | `summarize` deriva a retirada da rentabilidade (−2 pp) | ✅ Killed (5) |
| M15 | `src/lib/domain/age-ticks.ts:1` | `MAX_INTERVALS = 7`: `ageTicks(34, 42)` dá 34,36,…,42 (viola AJL-08) | Rodada 0: ❌ Survived · Iteração 1: ✅ Killed (`age-ticks.test.ts:27`) |

**Sensor depth**: expanded (15 mutações; a feature inclui migração com backfill de dados)
**Result**: na iteração 1, as 15 mutações foram reinjetadas num worktree novo em 60c0769 e as 15 morreram. PASS ✅
**Isolation (iteração 1)**: `git status --porcelain` foi idêntico antes e depois. O worktree `wt` foi removido e o dev server da porta 3210 foi encerrado.
**Isolation (rodada 0)**: `git status --porcelain` da árvore real foi idêntico antes e depois do sensor e da verificação visual. O único delta em relação ao snapshot do início foi `src/components/transaction-form.tsx`, que outra sessão commitou (f961fb6/d295cf3). Os worktrees `wt` e `vis` foram removidos. O worktree `.../f5f5b8b9-.../scratchpad/wt` pertence a outra sessão ativa (criado às 15:55) e não foi tocado.

---

## Interactive UAT Results (verificação visual automatizada)

Ambiente: worktree de HEAD + `next dev --webpack --port 3210`, com `DATABASE_URL=orcamento_ajustes_test` (banco privado `*_test`; o banco de desenvolvimento não foi tocado). Usuário e objetivo foram semeados via `seedUser`/`goalsRepo.upsert`: renda R$ 20.000, guardado R$ 500.000, nascimento 10/01/1992, aposentadoria aos 45. Playwright Chromium em 360×900 e 1280×900 (na iteração 1 também em 320×900, sobre 60c0769).

| # | Test | Result | Details |
| - | ---- | ------ | ------- |
| 1 | Marcos e eixo (360/1280) | ✅ Pass | "Aos 36 anos", "Aos 40 anos", "Aos 42 anos", "Aos 45 anos (Meta)" numa linha, sem truncar nem colidir; o eixo X termina em 45 (35,37,…,45) |
| 2 | Perfis em 360 px | ✅ Pass (iteração 1) | 320, 360 e 1280 px: três botões de 64 px, 3 linhas cada; "Retirada: N% a.a." numa linha só (15 px), dentro do botão, sem estouro. Rodada 0 (Issue, Cosmetic): as alturas eram iguais (80 px), mas "Retirada: 4% a.a." e "Retirada: 6% a.a." quebram em 2 linhas e "Retirada: 7% a.a." não. Os três botões ficam com alinhamento vertical diferente, o que contraria o Independent Test ("três linhas de texto cada"). Em 1280 px: 3 linhas, 64 px |
| 3 | Prefixo R$ | ✅ Pass | Os dois campos mostram "R$"; o valor é "20.000,00" |
| 4 | Pílula + "Como calculamos?" | ✅ Pass | Sem lista no card; o `details` abre com as 4 linhas e os 3 parágrafos |
| 5 | Personalizada | ✅ Pass | Parte de 8/6; digitar 6,5/4,5 dá meta R$ 5.333.333,33; retirada 7 > 6,5 mostra a mensagem exata; reabrir 650/450 marca Personalizada com 6,5/4,5; Agressivo → 7% e R$ 3.428.571,43 |

Observações fora do escopo (preexistentes, não contam contra a feature):
- Em 360 px, `/liberdade` tem rolagem horizontal (`scrollWidth` 454). Quem estoura é a `table.sr-only` do gráfico (`src/components/goal-chart.tsx`, introduzida em 9e4809f, antes da feature). A página `/` não tem o problema.
- O texto de `HOW_WE_CALCULATE` diz que a retirada "é menor que a rentabilidade real", mas AJL-23 aceita retirada igual à rentabilidade.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (cada commit só com os arquivos da tarefa) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`Result`, `fail(path,msg)`, migração no formato do drizzle) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (mensagens exatas, 650, 533_333_333) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ (iteração 1: bordas de `ageTicks` cobertas) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md`, `vitest.config.ts`, AD-005, AD-008, L-002 | ✅ |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit` (Node v20.20.2) + `npm run test:int` com `DATABASE_URL=.../orcamento_ajustes_test`
- **typecheck**: exit 0
- **lint**: exit 0
- **test:unit**: 18 arquivos, 621 passed, 0 failed, 0 skipped (iteração 1; rodada 0: 619)
- **test:int**: 13 arquivos, 323 passed, 0 failed, 0 skipped (banco privado; rodada 0: 322; o teste a mais é da feature `recorrencia`, 0c8d067)
- **build**: não rodado à parte. A compilação do `next dev --webpack` serviu `/login`, `/` e `/liberdade` sem erro.
- **Test count before/after feature**: não medido isoladamente (a contagem atual inclui testes da feature `recorrencia`). Nenhum teste foi removido sem substituto nos diffs de 726365d/931f47a.
- **Failures**: nenhuma. Nenhuma falha vem de arquivos alheios em edição.

---

## Fix Plans (rodada 0, aplicados em 8904827 e 60c0769 e re-verificados na iteração 1)

### Fix 1: Travar os limites de `ageTicks` (AJL-07, AJL-08)

- **Root cause**: `src/lib/domain/age-ticks.test.ts` só cobre as distâncias 0, 4, 11 e 60. Os limites 8 e 9, em que `MAX_INTERVALS` decide, não aparecem, e os mutantes M13 e M15 sobrevivem.
- **Fix task**: adicionar `expect(ageTicks(34, 42)).toEqual([34, 35, 36, 37, 38, 39, 40, 41, 42])` (AJL-08, 8 anos) e, para distâncias de 9 a 20 (ex.: `for d in 9..20`), `ticks.length <= 9`, último = idade final, crescente e distinto (AJL-07). Opcional: assertar `ageTicks(34, 43)` exato.
- **Priority**: Major

### Fix 2: Subtexto dos perfis em 360 px

- **Root cause**: "Retirada: N% a.a." em `text-xs` não cabe na coluna de ~100 px. `src/components/rate-toggle.tsx:49,55` não fixa `whitespace-nowrap` nem reduz o texto.
- **Fix task**: decidir com o usuário entre `whitespace-nowrap` com fonte menor/`tracking` e aceitar a quebra (e atualizar o Independent Test). Revalidar visualmente em 360 px.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| AJL-01..AJL-06, AJL-09..AJL-32 | Implementing | ✅ Verified |
| AJL-07 | Implementing | ✅ Verified (iteração 1) |
| AJL-08 | Implementing | ✅ Verified (iteração 1) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 32/32 ACs com evidência e desfecho exato. Resta 1 spec-precision gap (AJL-05, só visual), verificado com Playwright.
**Sensor**: 15/15 mutações mortas (iteração 1)
**Gate**: 621 unit + 323 integração passaram; typecheck e lint verdes

**What works**: rótulos dos marcos, eixo até a idade final, prefixo R$, pílula e "Como calculamos?", taxa personalizada de ponta a ponta (validação com mensagens exatas, persistência, backfill, reabertura).

**Issues found**: nenhum pendente. Os dois da rodada 0 foram corrigidos. Seguem como observações fora do escopo: a rolagem horizontal pela `table.sr-only` (preexistente) e o texto "é menor que a rentabilidade".

**Next steps**: atualizar a rastreabilidade da spec e fechar a feature.
