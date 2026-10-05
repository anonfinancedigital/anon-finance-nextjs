# Liberdade: Experiência do Objetivo Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/liberdade-experiencia/design.md`
**Status**: Draft

**Estratégia de ordem:** cada tarefa deixa `typecheck`, `lint` e os testes verdes. Por isso o domínio muda por adição (T3), os chamadores se ajustam antes de o tipo `Goal` exigir a taxa (T7) e o código antigo (`projectMilestones`) só sai depois de a UI deixar de usá-lo (T16). A T5 deixa `goal-form.tsx` e `page.tsx` com ajustes mínimos de compilação (data em DD/MM/AAAA, taxa `"8"` fixa); a T17 e a T19 trocam isso pelo comportamento final.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso), AD-008 (prévia no cliente, sem teste de componente). Sem guideline de cobertura: strong defaults aplicados, no mesmo padrão de `.specs/features/liberdade-financeira/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs de cálculo; todo Edge Case (prazo 0, guardado ≥ alvo, prazo < 12 meses, guardado 0) | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Cada AC de validação: válido, limites, vazio, formato inválido e a mensagem exata de cada rejeição | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositório (`src/lib/db/repos/*`) | integration | Leitura com e sem objetivo, inserir, substituir, isolamento entre usuários, taxa gravada e devolvida, default 800 | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso, campo inválido sem gravar, sem sessão, falha do banco devolve `SAVE_FAILED` | `src/actions/*.int.test.ts` | `npm run test:int` |
| Schema do banco (`src/lib/db/schema.ts`) | none | - (build gate; CHECK e default exercitados pelo teste do repositório na T6) | - | build gate only |
| UI / páginas (`src/app/*`, `src/components/*`) | none | - (e2e suspenso, AD-005; sem teste de componente no projeto; verificação manual no fim) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI, schema e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Domínio aditivo

Funções novas e taxa como parâmetro com default, sem quebrar nenhum chamador.

```
T1 → T2 → T3
```

### Phase 2: Persistência e entrada

Coluna da taxa, validação com data brasileira e taxa, e repositório. A seta vinda da fase 1 marca uma dependência já concluída.

```
T3 → T4 → T5 → T6
```

### Phase 3: Resumo do domínio

`Goal` com taxa obrigatória, linha do tempo e checkpoints dentro de `summarize`. A seta vinda da fase 2 marca uma dependência já concluída.

```
T6 → T7 → T8 → T9
```

### Phase 4: Componentes

Peças apresentacionais, a troca do resumo e a remoção do código antigo. A seta vinda da fase 3 marca uma dependência já concluída.

```
T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 5: Simulador e página

Formulário controlado, estado da prévia e página. A seta vinda da fase 4 marca uma dependência já concluída.

```
T16 → T17 → T18 → T19
```

---

## Task Breakdown

### T1: Data brasileira (date-br)

**What**: Criar `isoToBR`, `brToIso` e `maskDateInput`.
**Where**: `src/lib/domain/date-br.ts`
**Depends on**: None
**Reuses**: `isValidCalendarDate` de `src/lib/domain/month.ts`; estilo de `maskBRLInput` em `money.ts`
**Requirement**: LEX-07, LEX-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `isoToBR("1993-09-18")` = `"18/09/1993"`
- [x] `brToIso("18/09/1993")` = `"1993-09-18"`; `brToIso("31/02/1993")`, `brToIso("1993-09-18")`, `brToIso("18/09/93")` e `brToIso("")` = `null`
- [x] `maskDateInput("18091993")` = `"18/09/1993"`, `maskDateInput("1809")` = `"18/09"`, `maskDateInput("18/09/1993x9")` = `"18/09/1993"` (descarta não dígitos, corta em 8 dígitos)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: um teste por exemplo acima, todos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add pt-BR birth date parse, format and mask`

---

### T2: Valor compacto em BRL

**What**: Adicionar `formatCompactBRL(cents)` com `Intl` compacto pt-BR e uma casa decimal.
**Where**: `src/lib/domain/money.ts` (modify)
**Depends on**: T1
**Reuses**: `compactBRL` de `src/components/budget-charts.tsx:17` como referência de formato
**Requirement**: LEX-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `formatCompactBRL(37_500_000)` contém `375 mil`; `formatCompactBRL(112_500_000)` contém `1,1 mi`; `formatCompactBRL(150_000_000)` contém `1,5 mi` (todos com o símbolo `R$`)
- [x] `formatBRL` e `maskBRLInput` seguem idênticos (testes existentes passam sem edição)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: 3 testes novos passam, nenhum existente removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add compact BRL formatter`

---

### T3: Taxa como parâmetro no domínio

**What**: Em `freedom.ts`, exportar `ANNUAL_RATES`, `AnnualRateBp` e `DEFAULT_ANNUAL_RATE_BP`, criar `monthlyRate(annualRateBp)` e dar a `targetCents` e `requiredMonthlyCents` o parâmetro de taxa com default 800; `ANNUAL_RATE_BP` e `summarize` seguem como estão.
**Where**: `src/lib/domain/freedom.ts` (modify)
**Depends on**: T2
**Reuses**: `MONTHLY_RATE`, `targetCents` e `requiredMonthlyCents` existentes
**Requirement**: LEX-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `targetCents(1_000_000, 600)` = 200_000_000, `targetCents(1_000_000, 800)` = 150_000_000, `targetCents(1_000_000, 1000)` = 120_000_000; sem o segundo argumento = 150_000_000
- [x] `requiredMonthlyCents` com renda R$ 10.000,00, guardado 0 e 240 meses devolve 441_075 a 600, 263_621 a 800 e 167_071 a 1000 (R$ 4.410,75 / 2.636,21 / 1.670,71)
- [x] `monthlyRate(800)` ≈ 1,08^(1/12) − 1 (diferença < 1e-12)
- [x] Guardado capitalizado ≥ alvo devolve 0 em cada taxa
- [x] Testes existentes de `freedom.test.ts` passam sem edição
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos passam, nenhum existente removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): parameterize freedom target and deposit by annual rate`

---

### T4: Coluna da taxa no banco

**What**: Adicionar `annualRateBp` (smallint, `NOT NULL`, default 800) e o CHECK `IN (600, 800, 1000)` a `financial_goal`, e gerar a migração 0009.
**Where**: `src/lib/db/schema.ts` (modify)
**Depends on**: T3
**Reuses**: colunas e checks de `financialGoal` (`schema.ts:151`); `npm run db:generate`
**Requirement**: LEX-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `drizzle/0009_*.sql` contém só o `ALTER TABLE "financial_goal" ADD COLUMN "annual_rate_bp" smallint DEFAULT 800 NOT NULL` e o `ADD CONSTRAINT … CHECK`
- [x] `npm run db:migrate` aplica no banco de teste sem erro e as linhas existentes ficam com 800
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (camada schema = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(db): add annual_rate_bp to financial_goal`

---

### T5: Validação com taxa e data DD/MM/AAAA

**What**: `goalSchema` passa a receber `annualRate` e `birthDate` em DD/MM/AAAA e a devolver `annualRateBp` e `birthDate` ISO; `goals.int.test.ts`, `goal-form.tsx` e `page.tsx` recebem só o ajuste mínimo de compilação (data com `isoToBR`/`maskDateInput`, campo texto, taxa `"8"` fixa).
**Where**: `src/lib/validation/goal.ts` (modify)
**Depends on**: T4
**Reuses**: `brToIso`, `isoToBR`, `maskDateInput` (T1); `ANNUAL_RATES` (T3); padrão `transform` + `ctx.addIssue`
**Requirement**: LEX-05, LEX-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Entrada válida (`birthDate: "15/06/1990"`, `annualRate: "8"`) devolve `birthDate: "1990-06-15"` e `annualRateBp: 800`; `"6"` → 600, `"10"` → 1000
- [x] `annualRate` `"7"`, `""`, `"abc"` ou ausente rejeita no campo `annualRate` com a mensagem exata "Escolha uma taxa de 6%, 8% ou 10% ao ano"
- [x] `"1990-06-15"`, `"31/02/1990"` e `"15/06/90"` rejeitam no campo `birthDate` com "Data de nascimento inválida"; vazio mantém "Informe a data de nascimento"
- [x] Data futura, idade atual > 120 e idade de aposentadoria ≤ idade atual seguem rejeitadas com as mensagens atuais (testes existentes migrados para DD/MM/AAAA, valores esperados inalterados)
- [x] `saveGoal` grava a taxa escolhida e a data em ISO (teste de integração atualizado); entrada fora do formato não grava
- [x] `goal-form.tsx` e `page.tsx` compilam: o formulário envia `annualRate: "8"` e a data em DD/MM/AAAA; a página exibe a data salva com `isoToBR`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes de taxa e de data novos passam, nenhum existente removido (só migrados de formato)

**Tests**: unit
**Gate**: full

**Commit**: `feat(validation): accept pt-BR birth date and annual rate in goal schema`

---

### T6: Repositório devolve e grava a taxa

**What**: `goalsRepo.get` devolve `annualRateBp` (como `AnnualRateBp`) e `upsert` grava a taxa no insert e no update.
**Where**: `src/lib/db/repos/goals.ts` (modify)
**Depends on**: T5
**Reuses**: `get` e `upsert` existentes; `AnnualRateBp` (T3)
**Requirement**: LEX-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `upsert` com taxa 600 seguido de `get` devolve `annualRateBp: 600`; novo `upsert` com 1000 substitui na mesma linha (continua uma linha por usuário)
- [x] Linha inserida sem informar a taxa (SQL direto) volta com `annualRateBp: 800`
- [x] Inserir taxa fora de 600, 800, 1000 pelo banco é recusado pelo CHECK
- [x] Isolamento entre usuários preservado (teste existente passa)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes novos passam, nenhum existente removido

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): persist annual rate in goals repo`

---

### T7: Goal com taxa obrigatória e resumo por taxa

**What**: `Goal` ganha `annualRateBp: AnnualRateBp` obrigatório; `summarize` usa a taxa do objetivo e expõe `monthlyIncomeCents` e `annualRateBp`; os parâmetros de taxa deixam de ter default e `ANNUAL_RATE_BP` é removido.
**Where**: `src/lib/domain/freedom.ts` (modify)
**Depends on**: T6
**Reuses**: `summarize`, funções parametrizadas da T3
**Requirement**: LEX-06, LEX-03, LEX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `summarize` com renda R$ 10.000,00, guardado 0, nascimento 1986-06-15 (240 meses), aposentadoria 60 e `now` 2026-06-15 devolve alvo 200_000_000 / 150_000_000 / 120_000_000 e aporte 441_075 / 263_621 / 167_071 para 600 / 800 / 1000
- [x] O resumo devolve `monthlyIncomeCents` igual à renda do objetivo e `annualRateBp` igual à taxa
- [x] `months = 0` com guardado < alvo continua `monthlyCents = null`; guardado ≥ alvo continua 0
- [x] Os testes existentes de `summarize` migram para incluir `annualRateBp: 800` com os mesmos valores esperados
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes novos passam, nenhum existente removido

**Tests**: unit
**Gate**: full

**Commit**: `feat(domain): make goal rate part of the freedom summary`

---

### T8: Linha do tempo e participação dos rendimentos

**What**: Adicionar `projectedCents`, `projectTimeline` e `interestSharePct` a `freedom.ts` e incluir `timeline` e `interestSharePct` em `summarize`.
**Where**: `src/lib/domain/freedom.ts` (modify)
**Depends on**: T7
**Reuses**: `monthlyRate`, fórmula de `projectMilestones`
**Requirement**: LEX-11, LEX-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Renda R$ 10.000,00, guardado 0, 8%, 240 meses, aposentadoria aos 60: último ponto com `totalCents` 150_000_104, `investedCents` 63_269_040 e `interestCents` 86_731_064; `interestSharePct` = 58
- [x] Pontos em m = 0, 12, … 228 e 240 (21 pontos); com prazo de 18 meses, pontos em 0, 12 e 18; com prazo de 12 meses, pontos em 0 e 12 (sem duplicar)
- [x] `investedCents = guardado + aporte × m` e `interestCents = totalCents − investedCents` em todo ponto, sempre ≥ 0
- [x] `ageYears` = aposentadoria − ⌈(prazo − m) ÷ 12⌉ (ponto final = idade de aposentadoria) e `age` = aposentadoria − (prazo − m) ÷ 12
- [x] Prazo 0: `timeline` vazia e `interestSharePct` nulo
- [x] Aporte 0 (guardado ≥ alvo): investido constante em todo ponto, todo o crescimento em rendimentos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: um teste por AC e Edge Case acima, todos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add compound interest timeline to freedom summary`

---

### T9: Checkpoints do alvo

**What**: Adicionar `buildCheckpoints` a `freedom.ts` e incluir `checkpoints` em `summarize`.
**Where**: `src/lib/domain/freedom.ts` (modify)
**Depends on**: T8
**Reuses**: `projectedCents` e regra de idade de `projectTimeline` (T8)
**Requirement**: LEX-14, LEX-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Alvo R$ 1.500.000,00: valores 37_500_000, 75_000_000, 112_500_000 e 150_000_000 para 2500, 5000, 7500 e 10000 pb
- [x] Guardado 0, 8%, 240 meses, aposentadoria aos 60: `months` 102, 163, 206 e 240 e `ageYears` 48, 53, 57 e 60
- [x] Guardado R$ 400.000,00 (acima de 25%, abaixo de 50%): o de 25% tem `reached` verdadeiro e `months`/`ageYears` nulos; os demais têm previsão
- [x] Guardado ≥ alvo: os 4 `reached` verdadeiros
- [x] Prazo 0 e guardado < alvo: os não atingidos têm `months` e `ageYears` nulos
- [x] `positionBp` = fração do alvo (2500, 5000, 7500, 10000); o checkpoint de 100% prevê no prazo para 600, 800 e 1000
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: um teste por AC e Edge Case acima, todos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add target checkpoints to freedom summary`

---

### T10: Componente Slider

**What**: Criar `Slider` sobre o Radix com o estilo do design system.
**Where**: `src/components/ui/slider.tsx`
**Depends on**: T9
**Reuses**: `src/components/ui/progress.tsx` e `radio-group.tsx` (padrão dos primitivos Radix); `Slider` do pacote `radix-ui`
**Requirement**: LEX-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `Slider` aceita `value`, `min`, `max`, `step`, `onValueChange`, `disabled` e `aria-label`
- [x] Trilho `bg-subtle`, faixa `bg-primary`, polegar com `focus-visible:ring`, legível nos temas claro e escuro
- [x] Sem erros de tipo ou lint
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add slider primitive`

---

### T11: Controle segmentado de taxa

**What**: Criar `RateToggle` com Conservador · 6%, Moderado · 8% e Agressivo · 10%.
**Where**: `src/components/rate-toggle.tsx`
**Depends on**: T10
**Reuses**: `src/components/kind-toggle.tsx` e `ui/radio-group.tsx`
**Requirement**: LEX-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `RateToggle({ value, onChange })` com `value` `"6" | "8" | "10"` e `aria-label="Taxa esperada"`
- [x] Os três itens exibem exatamente "Conservador · 6%", "Moderado · 8%" e "Agressivo · 10%", com um selecionado
- [x] Navegação por setas e foco visível herdados do `RadioGroup`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add expected rate segmented control`

---

### T12: Hero Card

**What**: Criar `GoalHero` com alvo, guardado, progresso, taxa, selo de renda passiva, aporte em destaque, falta e prazo.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: T11
**Reuses**: `formatBRL`, `formatShare`, `formatTerm` (extraído de `goal-summary.tsx:6`); tokens `--glow-a` e `--income`; `PageHeader` como padrão de tipografia `font-display`
**Requirement**: LEX-01, LEX-02, LEX-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Alvo em `font-display` `text-3xl sm:text-4xl` (maior que guardado e progresso); guardado, percentual com uma casa e "a 8% ao ano" (taxa do resumo) visíveis no cartão
- [x] O selo exibe `Gera {renda em BRL}/mês sem consumir o principal` (renda R$ 20.000,00 → "Gera R$ 20.000,00/mês sem consumir o principal")
- [x] "Aporte mensal necessário" é o texto de maior peso do cartão (`font-display` `text-4xl sm:text-5xl` em painel destacado); com `monthlyCents` nulo exibe "Prazo encerrado"
- [x] Falta (`max(0, alvo − guardado)`) e Prazo restante como linhas de texto secundário, sem caixas
- [x] Brilho sutil com `--glow-a`/`--income`, legível nos temas claro e escuro
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add goal hero card`

---

### T13: Barra com checkpoints

**What**: Criar `GoalCheckpoints` com barra `--income` com brilho e os 4 checkpoints rotulados.
**Where**: `src/components/goal-checkpoints.tsx`
**Depends on**: T12
**Reuses**: `Progress` com `indicatorClassName` (`ui/progress.tsx:12`); `formatCompactBRL` (T2); `formatShare`
**Requirement**: LEX-13, LEX-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Barra com `indicatorClassName="bg-income"` e brilho (elemento decorativo à parte, porque o `overflow` do `Progress` corta sombras), largura limitada a 100% e o percentual real no texto (120,0% quando passa do alvo)
- [x] 4 marcas na barra em `positionBp` e, numa lista abaixo da barra, cada checkpoint com o valor compacto (alvo R$ 1.500.000,00 → "R$ 375 mil", "R$ 750 mil", "R$ 1,1 mi", "R$ 1,5 mi")
- [x] Estado em texto: "Atingido" (com ícone de check), "Previsão: aos N anos" ou "Sem previsão"
- [x] A lista usa 2 colunas no celular e 4 em telas maiores, sem sobreposição de rótulos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add progress bar with labeled checkpoints`

---

### T14: Gráfico de juros compostos

**What**: Criar `GoalChart` com área empilhada de investido e rendimentos, marcas de checkpoint, tooltip e frase de rendimentos.
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T13
**Reuses**: padrão de `src/components/budget-charts.tsx` (`ResponsiveContainer`, `tick`, `tooltipStyle`, `<figure>`, `isAnimationActive={false}`); tokens `--viz-target`, `--viz-spent`, `--viz-grid`; `formatBRL`, `formatCompactBRL`
**Requirement**: LEX-11, LEX-12

**Tools**:

- MCP: NONE
- Skill: `dataviz` (cores e legenda); confirmar `accessibilityLayer` na documentação instalada em `node_modules/recharts`

**Done when**:

- [x] `"use client"`; renderiza `AreaChart` com duas `Area` empilhadas "Total investido" (`--viz-target`) e "Rendimentos" (`--viz-spent`) a partir de `summary.timeline`
- [x] Eixo X em idade (ticks inteiros) e eixo Y em BRL compacto; tooltip mostra idade, investido, rendimentos e total
- [x] `ReferenceDot` para cada checkpoint de 25, 50 e 75% não atingido com previsão
- [x] Frase "Rendimentos: X% do patrimônio aos N anos" com `interestSharePct` e a idade de aposentadoria (exemplo da T8: "Rendimentos: 58% do patrimônio aos 60 anos")
- [x] `<figure>` com `aria-label` contendo alvo, idade final e participação dos rendimentos; legenda em texto
- [x] `timeline` vazia (prazo 0): o componente não renderiza nada
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add compound interest area chart`

---

### T15: Resumo recomposto

**What**: Reescrever `GoalSummary` para compor `GoalHero`, `GoalChart` e `GoalCheckpoints`, removendo as caixas repetidas, a projeção a cada 4 anos e o aviso de 8% fixos.
**Where**: `src/components/goal-summary.tsx` (modify)
**Depends on**: T14
**Reuses**: `GoalHero` (T12), `GoalCheckpoints` (T13), `GoalChart` (T14)
**Requirement**: LEX-01, LEX-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Ordem: Hero Card, gráfico, checkpoints; nenhum `dl` de caixas iguais e nenhuma lista "Projeção" a cada 4 anos
- [ ] `GoalSummary({ summary })` mantém a assinatura (a página atual continua compilando)
- [ ] `summary.milestones` não é mais lido neste arquivo
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): compose goal summary from hero, chart and checkpoints`

---

### T16: Remover as marcas de 4 anos do domínio

**What**: Remover `projectMilestones`, o tipo `Milestone`, o campo `milestones` de `GoalSummary` e os testes correspondentes.
**Where**: `src/lib/domain/freedom.ts` (modify)
**Depends on**: T15
**Reuses**: `projectTimeline` e `buildCheckpoints` (T8, T9) como substitutos
**Requirement**: LEX-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum símbolo `projectMilestones`, `Milestone` ou `milestones` resta em `src` (busca vazia)
- [ ] Os testes de `projectMilestones` saem junto com a função (substituída pelos testes de timeline e checkpoints das T8 e T9); os demais testes passam sem edição
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Test count: contagem anterior menos só os testes de `projectMilestones` removidos

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(domain): drop four-year milestones replaced by timeline and checkpoints`

---

### T17: Formulário simulador

**What**: `GoalForm` ganha o slider de idade, o `RateToggle`, `annualRate` em `GoalFormValues` e a prop opcional `onDraftChange`, chamada a cada alteração e no Cancelar.
**Where**: `src/components/goal-form.tsx` (modify)
**Depends on**: T16
**Reuses**: `Slider` (T10), `RateToggle` (T11), `maskDateInput` e `ageOn` (T1), `maskBRLInput`; estado, `useTransition` e `fieldErrors` atuais
**Requirement**: LEX-07, LEX-08, LEX-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Data de nascimento como texto com máscara e dica "DD/MM/AAAA"; renda e guardado com `maskBRLInput`
- [ ] Slider "Idade de aposentadoria" de idade atual + 1 a 90, passo 1, sincronizado com o campo numérico; desabilitado enquanto a data for inválida; valor do slider limitado à faixa e campo numérico com o texto digitado
- [ ] `RateToggle` com "Moderado · 8%" selecionado quando não há objetivo e a taxa salva quando há
- [ ] `onDraftChange(values)` é chamado a cada alteração e `onDraftChange(initial ?? null)` no Cancelar; sem a prop o formulário funciona como antes
- [ ] Sem mensagem de erro de campo antes do envio; erros por campo continuam no envio, incluindo `annualRate`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): turn goal form into an interactive simulator`

---

### T18: Estado da prévia

**What**: Criar `GoalExperience`, que guarda o `summary` exibido, recalcula a cada rascunho válido com `goalSchema` e `summarize`, mantém o último resultado válido e trata o Cancelar.
**Where**: `src/components/goal-experience.tsx`
**Depends on**: T17
**Reuses**: `goalSchema`, `summarize`, `GoalSummary` (T15), `GoalForm` (T17); AD-008
**Requirement**: LEX-09, LEX-10

**Tools**:

- MCP: NONE
- Skill: NONE (ler `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` antes de escrever o Client Component)

**Done when**:

- [ ] `GoalExperience({ saved, initial, nowIso })` com `"use client"`; `summary` inicial é `summarize(saved, new Date(nowIso))` ou `null`
- [ ] Rascunho válido recalcula o resumo na hora; rascunho inválido mantém o último resultado válido
- [ ] Cancelar volta o resumo ao objetivo salvo, ou a `null` sem objetivo salvo
- [ ] Sem objetivo salvo e sem rascunho válido, só o formulário aparece
- [ ] Nenhum import de servidor no arquivo nem nos módulos que ele usa no cliente (AD-008): `npm run build` passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add live preview state for the goal simulator`

---

### T19: Página com o simulador

**What**: A página `/liberdade` monta `GoalExperience` com o objetivo salvo, os valores iniciais (data com `isoToBR`, taxa real) e `nowIso`, e o texto de introdução deixa de citar 8% fixos.
**Where**: `src/app/(app)/liberdade/page.tsx` (modify)
**Depends on**: T18
**Reuses**: `GoalExperience` (T18), `isoToBR` (T1), `goalsRepo.get`, `requireSessionForPage`
**Requirement**: LEX-10, LEX-03

**Tools**:

- MCP: NONE
- Skill: `run` (abrir o app e conferir a tela nos temas claro e escuro e em largura de celular)

**Done when**:

- [ ] A página renderiza `GoalExperience` no lugar de `GoalSummary` e `GoalForm` soltos
- [ ] `initial.annualRate` vem da taxa salva (`String(annualRateBp / 100)`) e `initial.birthDate` em DD/MM/AAAA; sem objetivo, `initial` indefinido
- [ ] A introdução fala em "a taxa escolhida" e não cita 8% fixos
- [ ] Verificação manual: com renda R$ 20.000,00, guardado R$ 216.000,00, nascimento 18/09/1993 e aposentadoria aos 45, vê alvo R$ 3.000.000,00 e progresso 7,2%; arrastar a idade e trocar a taxa atualiza Hero, gráfico e checkpoints sem recarregar; Cancelar restaura; Salvar mantém o resultado
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): mount the goal simulator on the freedom page`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5 ------→ T6
Phase 3:  T7 ------→ T8 ------→ T9
Phase 4:  T10 -----→ T11 -----→ T12 -----→ T13 -----→ T14 -----→ T15 -----→ T16
Phase 5:  T17 -----→ T18 -----→ T19
```

Execução estritamente sequencial; cada tarefa termina em um commit atômico com o gate verde.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1-T2 | 1 módulo / 1 função cada | ✅ Granular |
| T3 | 1 arquivo, parâmetro de taxa em 3 funções coesas | ✅ Granular |
| T4 | 1 arquivo de schema (+ migração gerada) | ✅ Granular |
| T5 | 1 schema; ajustes de compilação em 3 chamadores listados | ⚠️ Coeso: o schema muda o formato de entrada e quebraria a compilação sem eles |
| T6 | 1 repositório | ✅ Granular |
| T7-T9 | 1 arquivo, 1 conceito por task (taxa, timeline, checkpoints) | ✅ Granular |
| T10-T15 | 1 componente cada | ✅ Granular |
| T16 | 1 arquivo, só remoção | ✅ Granular |
| T17-T19 | 1 componente / 1 página cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: date-br | Domínio | unit | unit | ✅ OK |
| T2: formatCompactBRL | Domínio | unit | unit | ✅ OK |
| T3: taxa no domínio | Domínio | unit | unit | ✅ OK |
| T4: coluna da taxa | Schema | none | none | ✅ OK |
| T5: validação | Validação + Server Action (teste de integração migrado) + UI mínima | unit (validação), integration (action) | unit; gate full roda a integração | ✅ OK |
| T6: repositório | Repositório | integration | integration | ✅ OK |
| T7: Goal com taxa | Domínio | unit | unit | ✅ OK |
| T8: timeline | Domínio | unit | unit | ✅ OK |
| T9: checkpoints | Domínio | unit | unit | ✅ OK |
| T10-T15: componentes | UI | none | none | ✅ OK |
| T16: remover marcas | Domínio | unit | unit | ✅ OK |
| T17-T19: UI | UI / páginas | none | none | ✅ OK |

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| LEX-01 | T12, T15 |
| LEX-02 | T7, T12 |
| LEX-03 | T7, T12, T19 |
| LEX-04 | T4, T6 |
| LEX-05 | T1, T5 |
| LEX-06 | T3, T7 |
| LEX-07 | T1, T5, T17 |
| LEX-08 | T10, T11, T17 |
| LEX-09 | T17, T18 |
| LEX-10 | T18, T19 |
| LEX-11 | T8, T14, T15, T16 |
| LEX-12 | T8, T14 |
| LEX-13 | T2, T9, T13 |
| LEX-14 | T9, T13 |

**Coverage:** 14 total, 14 mapped to tasks, 0 unmapped
