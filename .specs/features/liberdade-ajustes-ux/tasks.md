# Liberdade: Ajustes de UX e Taxa Personalizada Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/liberdade-ajustes-ux/design.md`
**Spec**: `.specs/features/liberdade-ajustes-ux/spec.md`
**Status**: Draft

**Estratégia de ordem:** primeiro o que não muda contratos (marcos, eixo, prefixo, card), depois a taxa personalizada de baixo para cima (domínio, banco, validação, UI). A lógica testável vira função pura com teste unitário; a UI só a consome (AD-005, AD-008).

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de código de framework; nenhuma tarefa usa API nova do Next (só componentes React, Recharts e Drizzle).

**Quebra transitória em T11 → T13:** `goalSchema` passa a exigir `withdrawalRate` em T11 e o formulário só o envia em T13. Typecheck, lint, build e testes seguem verdes; o salvar pela tela fica indisponível nos commits de T11 e T12. T13 fecha.

**Concorrência:** outra sessão pode mexer no repositório. Cada commit inclui só os arquivos da tarefa. Integração com banco privado `*_test` via `DATABASE_URL` e Node 20 no `PATH` (T10 aplica a migração nele).

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` e `integration`), AD-005 (e2e suspenso), AD-008 (sem teste de componente). Lição L-002: mensagens de validação com texto exato na spec e nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio e validação (`src/lib/domain/*`, `src/lib/validation/*`) | unit | Todos os ramos; 1:1 com os AC da spec; cada caso de borda listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Repositório, schema e Server Actions | integration | Caminhos de leitura e escrita do campo novo + violação de CHECK | `src/**/*.int.test.ts` | `npm run test:int` |
| UI / componentes (`src/components/*`, páginas) | none | - (e2e suspenso, AD-005; sem teste de componente, AD-008; build gate only) | - | build gate only |

## Gate Check Commands

> Do `package.json`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de domínio e validação | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Marcos e eixo do gráfico

Rótulos dos marcos e ticks do eixo X.

```
T1 → T2 → T3 → T4
```

### Phase 2: Prefixo R$ e card de Meta

Campo com prefixo e pílula do card.

```
T5 → T6 → T7 → T8
```

### Phase 3: Taxa personalizada

Retirada como dado, migração, validação e interface.

```
T9 → T10 → T11 → T12 → T13 → T14
```

---

## Task Breakdown

### T1: Função pura de ticks do eixo de idade

**What**: Criar `ageTicks(first, last)` exportada, contando da idade final para trás, com no máximo 9 rótulos.
**Where**: `src/lib/domain/age-ticks.ts`
**Depends on**: None
**Reuses**: `ageTicks` atual em `src/components/goal-chart.tsx`
**Requirement**: AJL-06, AJL-07, AJL-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste (`age-ticks.test.ts`, mesmo commit): 34→45 contém 45 e tem ≤ 9 itens (AJL-06/07); crescente e sem repetição (AJL-07); 34→38 devolve 34,35,36,37,38 (AJL-08); intervalo de uma idade devolve `[idade]`
- [x] Gate quick passa; contagem de testes unitários só aumenta
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): add age ticks that always include the final age`

---

### T2: Gráfico usa os ticks novos

**What**: Trocar a `ageTicks` local pela importada de `age-ticks.ts` e remover a função e `MAX_TICKS` locais.
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T1
**Reuses**: `age-ticks.ts`
**Requirement**: AJL-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O `XAxis` usa `ageTicks(first.age, last.age)` do domínio
- [x] Gate build passa
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): show the final age on the trajectory chart axis`

---

### T3: Rótulo puro do marco

**What**: Criar `checkpointLabel(checkpoint, isLast)` em `freedom-copy.ts`: "Atingido", "Sem previsão", "Aos N anos" e "Aos N anos (Meta)" no último.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T2
**Reuses**: `status` atual em `goal-checkpoints.tsx`
**Requirement**: AJL-01, AJL-02, AJL-03, AJL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Testes em `freedom-copy.test.ts`: atingido → "Atingido" também no último (AJL-02); `ageYears` 38 → "Aos 38 anos", sem a palavra "Previsão" (AJL-01); último com 45 → "Aos 45 anos (Meta)" (AJL-04); `ageYears` nulo → "Sem previsão" (AJL-03)
- [x] Gate quick passa
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): add concise checkpoint labels`

---

### T4: Marcos usam o rótulo novo

**What**: `GoalCheckpoints` chama `checkpointLabel`; `li` com `min-w-0` e status com `truncate whitespace-nowrap`.
**Where**: `src/components/goal-checkpoints.tsx`
**Depends on**: T3
**Reuses**: `checkpointLabel`
**Requirement**: AJL-05, AJL-01, AJL-02, AJL-03, AJL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A função `status` local sai
- [x] Gate build passa
- [x] Verificação visual em 360 e 1280 px fica para a validação
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `fix(liberdade): stop checkpoint labels from overlapping`

---

### T5: Campo de dinheiro com prefixo R$

**What**: Criar `CurrencyInput`: `Input` com `R$` fixo à esquerda (`aria-hidden`) e `pl-10`.
**Where**: `src/components/currency-input.tsx`
**Depends on**: None
**Reuses**: `src/components/ui/input.tsx`
**Requirement**: AJL-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Aceita as props de `Input` e repassa `value` sem `R$`
- [x] Gate build passa
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add a currency input with a fixed R$ prefix`

---

### T6: Gaveta usa o campo com prefixo

**What**: Trocar os dois `Input` de dinheiro por `CurrencyInput` e remover "(R$)" dos rótulos.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T5
**Reuses**: `CurrencyInput`
**Requirement**: AJL-09, AJL-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Rótulos "Renda mensal desejada" e "Valor já guardado"
- [ ] O estado `values` continua com texto sem `R$` (AJL-17)
- [ ] Gate build passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): show the R$ prefix on the goal money fields`

---

### T7: Textos puros do card de Meta

**What**: Em `freedom-copy.ts`: `formatRate(bp)` pt-BR, `heroPill(summary)` e `heroFacts` usando `formatRate`.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T6
**Reuses**: `heroFacts` atual
**Requirement**: AJL-28, AJL-30, AJL-31

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Testes: `formatRate(600)`="6%", `formatRate(650)`="6,5%", `formatRate(675)`="6,75%" (AJL-31); `heroPill` com renda R$ 20.000 e retirada 600 = "Gera R$ 20.000,00/mês com retirada de 6% a.a." (AJL-28); `heroFacts` traz as 4 linhas com taxas em pt-BR (AJL-30)
- [ ] Gate quick passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): add pill and pt-BR rate copy for the target card`

---

### T8: Card de Meta com pílula

**What**: `GoalHero`: pílula logo abaixo do valor; o `dl` de fatos sai do card e a lista passa a abrir dentro do `details` "Como calculamos?", antes dos parágrafos.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: T7
**Reuses**: `heroPill`, `heroFacts`, `HOW_WE_CALCULATE`
**Requirement**: AJL-28, AJL-29, AJL-30

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O card fechado não mostra Rentabilidade real, Taxa de retirada, Renda desejada nem Patrimônio necessário (AJL-29)
- [ ] Gate build passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): replace the target facts list with a summary pill`

---

### T9: Domínio: retirada como dado do objetivo

**What**: `Goal` ganha `withdrawalRateBp`; `targetCents(renda, retiradaBp)`; `PRESET_RATES` e `presetFor`; `annualRateBp` vira `number`; `getWithdrawalRate` e `AnnualRateBp` saem. Ajustes de compilação mínimos: validação, repositório e formulário derivam a retirada pela tabela dos presets, como hoje (substituídos em T10, T11 e T13).
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: None
**Reuses**: `WITHDRAWAL_RATE_BP`, `summarize`
**Requirement**: AJL-12, AJL-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Testes em `freedom.test.ts` reescritos pelos valores da spec: renda 20.000/mês e retirada 450 → meta 533.333.333 centavos (AJL-12); retiradas 400/600/700 dão R$ 6.000.000,00, R$ 4.000.000,00 e R$ 3.428.571,43; `presetFor(600,400)`=600, `presetFor(650,450)`=null, `presetFor(600,500)`=null (AJL-19/20); `summarize` expõe `withdrawalRateBp` do objetivo
- [ ] Gate quick passa; nenhum teste removido sem substituto
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(liberdade): carry the withdrawal rate on the goal`

---

### T10: Persistência da retirada

**What**: Coluna `withdrawal_rate_bp` no schema e migração `0011` (backfill 400/600/700, `NOT NULL`, CHECKs 100..1500 e retirada ≤ rentabilidade); `goalsRepo.get` e `upsert` leem e gravam o campo.
**Where**: `src/lib/db/schema.ts`
**Depends on**: T9
**Reuses**: `drizzle/0010_*.sql` como formato; `goals.int.test.ts`
**Requirement**: AJL-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Migração em 3 passos aplicada no `orcamento_test` privado (Node 20, `DATABASE_URL` próprio)
- [ ] Teste de integração: grava e lê `withdrawalRateBp` 450 com 650; linha anterior à migração (rentabilidade 800) ganha retirada 600 (AJL-16); retirada > rentabilidade viola a CHECK
- [ ] Gate full passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(liberdade): persist the withdrawal rate with a backfilling migration`

---

### T11: Validação das taxas personalizadas

**What**: `parseRate` e `goalSchema` com `annualRate` e `withdrawalRate` livres (1% a 15%, ≤ 2 casas, retirada ≤ rentabilidade) e saída `withdrawalRateBp`; `saveGoal` repassa.
**Where**: `src/lib/validation/goal.ts`
**Depends on**: T10
**Reuses**: `fail(path, message)`, `parseBRL`
**Requirement**: AJL-12, AJL-13, AJL-14, AJL-15, AJL-18, AJL-21, AJL-22, AJL-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Testes 1:1 com a spec: "6,5" e "6.5" → 650 (AJL-21); "0,99" e "15,01" → mensagens exatas de AJL-13/14; "6,555", "abc" → AJL-15; vazio → AJL-22; retirada 7 com rentabilidade 6 → AJL-18; retirada = rentabilidade passa (AJL-23); par 6/4 passa
- [ ] `actions/goals.int.test.ts` atualizado e verde
- [ ] Gate full passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): validate custom rentability and withdrawal rates`

---

### T12: Seletor de perfis em três linhas

**What**: Reescrever `RateToggle`: grid de 3 colunas e mesma altura, título + `N% a.a.` + `Retirada: M% a.a.`, destaque só no ativo, nenhum destaque com Personalizada, botão de texto "Personalizada" abaixo do grid.
**Where**: `src/components/rate-toggle.tsx`
**Depends on**: T11
**Reuses**: `PRESET_RATES`, `formatRate`
**Requirement**: AJL-10, AJL-24, AJL-25, AJL-27, AJL-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Props `value: "6"|"8"|"10"|null`, `customActive`, `onCustom`
- [ ] Textos "Retirada: 4% a.a.", "6%", "7%" vêm da tabela
- [ ] Gate build passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): redesign the profile selector with withdrawal subtext`

---

### T13: Gaveta com taxa personalizada

**What**: `GoalForm`: campo `withdrawalRate`, estado `custom` derivado de `presetFor`, escolha de preset grava as duas taxas, campos de rentabilidade e retirada na Personalizada, remoção da linha "Taxa de retirada N% a.a." e de `getWithdrawalRate`.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T12
**Reuses**: `RateToggle`, `presetFor`, `fieldErrors`
**Requirement**: AJL-11, AJL-19, AJL-20, AJL-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Preset 8 grava annualRate "8" e withdrawalRate "6" (AJL-20)
- [ ] Personalizada abre com os valores do preset ativo (AJL-11)
- [ ] Erros por campo aparecem sob cada input
- [ ] Gate build passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): add the custom rate option to the goal drawer`

---

### T14: Página abre o objetivo salvo

**What**: `page.tsx` monta `initial.annualRate` e `initial.withdrawalRate` em texto pt-BR a partir de `goal`; verificação manual do fluxo completo.
**Where**: `src/app/(app)/liberdade/page.tsx`
**Depends on**: T13
**Reuses**: `moneyText`
**Requirement**: AJL-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Objetivo salvo 6,5/4,5 reabre em Personalizada com os dois campos preenchidos (AJL-19)
- [ ] Objetivo 8/6 reabre com Moderado marcado
- [ ] Gate build passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): reopen the saved custom rates in the drawer`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7 ------→ T8
Phase 3:  T9 ------→ T10 ------→ T11 ------→ T12 ------→ T13 ------→ T14
```

Execução estritamente sequencial. 14 tarefas: mais que um lote de ~8, então vale a oferta de sub-agentes (Phase 1+2 num lote, Phase 3 em outro).
