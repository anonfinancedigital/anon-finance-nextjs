# Liberdade: Refinamentos Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: nenhum (escopo médio, sem decisão de arquitetura; o desenho está nas tarefas)
**Spec**: `.specs/features/liberdade-refinamentos/spec.md`
**Status**: In Progress

**Estratégia de ordem:** a regra que dá para testar sem tela (participação percentual e teto do eixo Y) vira função pura em `freedom.ts` com teste unitário, e a UI só a consome (AD-005 e AD-008: UI sem teste automático). Cada tarefa deixa `typecheck`, `lint`, `build` e os testes verdes e vira um commit.

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de escrever código de framework; nenhuma tarefa usa API nova do Next (só componentes React e Recharts), então basta conferir nas telas já existentes.

**Recharts:** a linha da meta usa `ReferenceLine` e o teto do eixo usa `YAxis domain`; conferir os tipos instalados em `node_modules/recharts` antes da T4.

**Concorrência:** outra sessão pode trabalhar neste repositório. Cada commit inclui só os arquivos da tarefa. Integração, se rodada, com banco privado `*_test` via `DATABASE_URL` e Node 20 no `PATH`.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` e `integration`), AD-005 (e2e suspenso), AD-008 (sem teste de componente). Mesmo padrão de `liberdade-layout`: lógica testável vai ao domínio com teste unitário; a UI é verificada pelo build e pela verificação manual do Verifier.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os AC da spec; cada caso de borda listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Repositório e Server Actions | integration | Inalterados por esta feature; regressão pelos testes existentes | `src/**/*.int.test.ts` | `npm run test:int` |
| UI / componentes (`src/components/*`) | none | - (e2e suspenso, AD-005; sem teste de componente, AD-008; build gate only) | - | build gate only |

## Gate Check Commands

> Do `package.json`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de domínio com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração (nenhuma nesta feature) | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Regras puras do gráfico

Participação percentual e teto do eixo Y, testados no domínio.

```
T1 → T2
```

### Phase 2: Gráfico

Tooltip com percentuais, depois linha da meta e eixo. A seta vinda da fase 1 marca uma dependência já concluída.

```
T2 → T3 → T4
```

### Phase 3: Barra de marcos

Marcos sobre o trilho com estados, depois o pino. A seta vinda da fase 2 marca uma dependência já concluída.

```
T4 → T5 → T6
```

### Phase 4: Gaveta

Legenda de taxa real e descrição enxuta. A seta vinda da fase 3 marca uma dependência já concluída.

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: Participação percentual de investido e rendimentos

**What**: Criar `compositionShares(investedCents, totalCents)` que devolve `{ investedPct, interestPct }` inteiros somando 100, ou `null` com total ≤ 0.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: None
**Reuses**: `interestSharePct` (mesmo estilo de arredondamento)
**Requirement**: RFN-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `investedPct = Math.round(invested * 100 / total)` e `interestPct = 100 - investedPct`
- [x] Teste em `freedom.test.ts`: R$ 1.130.000,00 investido e R$ 2.170.000,00 total → 52 e 48 (RFN-06 AC3)
- [x] Teste: arredondamento em .5 (ex.: 1 de 8 → 13 e 87) soma 100; total 0 → `null` (RFN-06 AC4 e AC5); investido igual ao total → 100 e 0
- [x] Domínio continua isomórfico: sem import de servidor (AD-008)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores seguem passando e os novos entram (sem exclusões)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(freedom): add the invested and interest share of a patrimony`
**Status**: ✅ Done

---

### T2: Teto do eixo Y do gráfico

**What**: Criar `chartYMax(targetCents, finalCents)` que devolve 107% do maior dos dois, em centavos inteiros arredondados.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T1
**Reuses**: Padrão de funções puras de `freedom.ts`
**Requirement**: RFN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Alvo R$ 3.000.000,00 e final R$ 3.000.000,00 → R$ 3.210.000,00 (RFN-05 AC2)
- [x] Teste: final maior que o alvo usa o final; alvo maior que o final usa o alvo (edge case do patrimônio acima da meta)
- [x] Teste: resultado é inteiro (alvo ímpar não gera fração de centavo)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes anteriores seguem passando e os novos entram (sem exclusões)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(freedom): add the chart ceiling for the patrimony axis`
**Status**: ✅ Done

---

### T3: Tooltip do gráfico com percentuais

**What**: Mudar `ChartTooltip` para os rótulos "Total investido", "Rendimentos gerados" e "Patrimônio total", com "(P%)" e "(Q%)" de `compositionShares`, omitindo-os quando for `null`.
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T2
**Reuses**: `compositionShares`; `ChartTooltip` e `Swatch` atuais
**Requirement**: RFN-06, RFN-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Tooltip mostra "Aos N anos", "Total investido: R$ X (52%)", "Rendimentos gerados: R$ Y (48%)" e "Patrimônio total: R$ Z" (RFN-06 AC3)
- [x] Sem percentuais quando o total é R$ 0,00 (RFN-06 AC5)
- [x] Selo, legenda ("Rendimentos"), linha-guia, ponto ativo e tabela para leitores de tela inalterados (RFN-04 AC7)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): show the share of each part in the chart tooltip`
**Status**: ✅ Done

---

### T4: Linha da meta e teto do eixo Y

**What**: Adicionar `ReferenceLine` pontilhada em `targetCents` com a etiqueta "Meta: " + `formatCompactBRL` alinhada à direita, e `YAxis domain={[0, chartYMax(...)]}`.
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T3
**Reuses**: `chartYMax`; `formatCompactBRL`; `tick` e tokens `--viz-*` do próprio arquivo
**Requirement**: RFN-04, RFN-05

**Tools**:

- MCP: NONE
- Skill: `dataviz` (cor e legibilidade da linha nos dois temas)

**Done when**:

- [x] Linha pontilhada sutil na altura da meta com a etiqueta "Meta: R$ 3 mi" à direita (RFN-04 AC1)
- [x] Eixo Y de 0 a `chartYMax(targetCents, último total)`; alvo de R$ 3.000.000,00 termina em R$ 3,21 mi (RFN-05 AC2)
- [x] Meta visível dentro do domínio quando o patrimônio final passa do alvo (edge case) e quando o alvo é menor que o primeiro ponto
- [x] Legível nos temas claro e escuro; prazo restante 0 continua omitindo o gráfico (RFN-04 AC6)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): draw the goal line and tighten the chart axis`
**Status**: ✅ Done

---

### T5: Marcos sobre o trilho com labels centrados e estados

**What**: Trocar os traços por um marcador por checkpoint sobre o trilho (círculo verde com check se atingido, círculo vazio com borda se pendente) e posicionar o label de cada um centrado na mesma posição, com o do 100% alinhado à direita, a partir de 576 px; abaixo disso manter a grade 2×2.
**Where**: `src/components/goal-checkpoints.tsx`
**Depends on**: T4
**Reuses**: `Checkpoint.positionBp`; classes `@xl` do container; ícones `Check` e `Circle`
**Requirement**: RFN-01, RFN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhum traço vertical separado; cada marco é um elemento sobre o trilho em 25/50/75/100% (RFN-01 AC1)
- [x] Com o Hero a partir de 576 px, cada label fica centrado no seu marco (label do 100% na borda direita); abaixo disso, grade 2×2 com marcos no trilho (RFN-01 AC1 e AC2)
- [x] Marco atingido: círculo `--income` com check e "Atingido" em texto; pendente: círculo vazio com borda e "Previsão: aos N anos" ou "Sem previsão" (RFN-02 AC3 e AC4)
- [x] Valor guardado ≥ alvo: 4 marcos atingidos (edge case)
- [x] Brilho da barra, nome acessível "Progresso do objetivo: …" e percentual único inalterados
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): put the milestones on the progress rail`
**Status**: ✅ Done

---

### T6: Pino "você está aqui"

**What**: Adicionar sobre o trilho o pino na posição do progresso (limitada a 100%), sem texto visível, com nome acessível "Você está aqui: 19,0% do alvo", acima dos marcos quando coincidir.
**Where**: `src/components/goal-checkpoints.tsx`
**Depends on**: T5
**Reuses**: `formatShare`; `barValue` já calculado no componente
**Requirement**: RFN-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Guardado R$ 570.000,00 e alvo R$ 3.000.000,00 → pino em 19% com nome acessível "Você está aqui: 19,0% do alvo" (RFN-03 AC5)
- [x] Nenhum texto de percentual novo visível: "19,0%" continua uma vez na tela (RFN-03 AC6)
- [x] Progresso 0% → pino na borda esquerda; progresso ≥ 100% → borda direita (RFN-03 AC7 e edge case)
- [x] Pino acima do marco quando coincidem, sem esconder "Atingido" (RFN-03 AC8)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): mark the current progress on the rail`
**Status**: ✅ Done

---

### T7: Legenda de taxa real no formulário

**What**: Exibir "Taxa real estimada (descontada a inflação)" como texto de apoio entre "Taxa esperada ao ano" e os presets.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T6
**Reuses**: Classes `text-muted-foreground` do formulário
**Requirement**: RFN-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Legenda visível abaixo do título e acima dos 3 presets (RFN-07 AC1)
- [x] `RateToggle` mantém o nome "Taxa esperada" e os valores 6, 8 e 10; erro de taxa continua abaixo dos presets
- [x] Trocar a taxa continua chamando `onDraftChange` e atualizando o resumo da gaveta (RFN-09 AC4)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): label the expected rate as real`
**Status**: ✅ Done

---

### T8: Descrição enxuta da gaveta

**What**: Trocar a descrição da gaveta por "Simule o ápice: renda, patrimônio e idade." e manter o `INTRO` completo só no cartão de estado vazio.
**Where**: `src/components/goal-experience.tsx`
**Depends on**: T7
**Reuses**: `INTRO` existente; `SheetDescription`
**Requirement**: RFN-08, RFN-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `SheetDescription` mostra o texto curto em uma linha a 384 px (RFN-08 AC2)
- [ ] Sem objetivo salvo, o cartão de estado vazio mostra o `INTRO` completo sem mudança (RFN-08 AC3)
- [ ] `DrawerSummary` e `handleDraft` inalterados: arrastar o slider ou trocar a taxa atualiza Meta e Aporte antes de "Salvar"; prévia inválida mantém os últimos valores (RFN-09 AC4 e AC5)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): shorten the drawer description`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2
Phase 2:  T2 ------→ T3 ------→ T4
Phase 3:  T4 ------→ T5 ------→ T6
Phase 4:  T6 ------→ T7 ------→ T8
```

Execução sequencial, 8 tarefas: cabe em um único lote, sem sub-agentes. O Verifier roda sozinho depois da T8.

---

## Requirement Coverage

| Requirement ID | Tasks |
| -------------- | ----- |
| RFN-01 | T5 |
| RFN-02 | T5 |
| RFN-03 | T6 |
| RFN-04 | T3, T4 |
| RFN-05 | T2, T4 |
| RFN-06 | T1, T3 |
| RFN-07 | T7 |
| RFN-08 | T8 |
| RFN-09 | T7, T8 |

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped
