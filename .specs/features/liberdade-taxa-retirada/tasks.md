# Liberdade: Taxa de Retirada Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/liberdade-taxa-retirada/design.md`
**Spec**: `.specs/features/liberdade-taxa-retirada/spec.md`
**Status**: Done

**Estratégia de ordem:** toda a regra financeira vive em `freedom.ts` e é testada no domínio (AD-008). Os textos saem para `freedom-copy.ts`, também puro e testado, para que a UI só consuma. A UI vem por último e não tem teste automático (AD-005 e AD-008). Cada tarefa deixa `typecheck`, `lint`, build e testes verdes e vira um commit.

**Valores de referência (R$ 20.000/mês = 2.000.000 centavos; renda anual 24.000.000):** 6% → retirada 4% → R$ 6.000.000,00; 8% → retirada 6% → R$ 4.000.000,00; 10% → retirada 7% → R$ 3.428.571,43 (342.857.143 centavos). O valor de R$ 4,8 mi do pedido original foi descartado pelo usuário: a tabela prevalece.

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de escrever código de framework; nenhuma tarefa usa API nova do Next (só React e `<details>`), então basta seguir as telas existentes.

**Concorrência:** outra sessão pode trabalhar neste repositório. Cada commit inclui só os arquivos da tarefa (e este `tasks.md` e `spec.md`). Node 20 no `PATH` (ver memória do projeto); integração, se rodada, com banco privado `*_test` via `DATABASE_URL`.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` e `integration`), AD-005 (e2e suspenso), AD-008 (domínio isomórfico, UI sem teste de componente). Mesmo padrão de `liberdade-refinamentos`.

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
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Regra financeira no domínio

Tabela de retirada, meta nova com os testes antigos reescritos, resumo com os campos novos.

```
T1 → T2 → T3
```

### Phase 2: Textos

Rótulos, explicação e fatos do Hero em módulo puro. A seta vinda da fase 1 marca uma dependência já concluída.

```
T3 → T4
```

### Phase 3: Interface

Hero, seletor, formulário e introdução da gaveta. A seta vinda da fase 2 marca uma dependência já concluída.

```
T4 → T5 → T6 → T7 → T8
```

T9 (regressão e varredura final) fica na fase 3 e fecha a feature.

```
T8 → T9
```

---

## Task Breakdown

### T1: Tabela e leitura da taxa de retirada

**What**: Criar `WITHDRAWAL_RATE_BP` (`{ 600: 400, 800: 600, 1000: 700 }`, tipado como `Record<AnnualRateBp, number>`) e `getWithdrawalRate(annualRateBp)`, que lança `RangeError` fora da tabela.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: None
**Reuses**: `ANNUAL_RATES`, `AnnualRateBp`
**Requirement**: RET-01, RET-02, RET-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `getWithdrawalRate(600) = 400`, `(800) = 600`, `(1000) = 700` (RET-02)
- [x] Teste: valores fora da tabela (0, 500, 700, 1200, NaN) lançam `RangeError` e nenhum devolve taxa (RET-03)
- [x] Teste: `Object.keys(WITHDRAWAL_RATE_BP)` coincide com `ANNUAL_RATES`, então todo cenário oferecido tem retirada (RET-01)
- [x] Domínio continua isomórfico: sem import de servidor (AD-008)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes anteriores seguem passando e os novos entram (sem exclusões)

**Tests**: unit
**Gate**: quick

**Status**: ✅ Done

**Commit**: `feat(freedom): add the withdrawal rate table for each return scenario`

---

### T2: Meta patrimonial pela taxa de retirada

**What**: Criar `annualIncomeCents(monthlyIncomeCents)` e mudar `targetCents` para `Math.round(annualIncomeCents(renda) * 10_000 / getWithdrawalRate(rentabilidade))`; reescrever em `freedom.test.ts` as expectativas que usavam a meta antiga (×200, ×150, ×120) a partir da spec.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T1
**Reuses**: `getWithdrawalRate`; nome e assinatura atuais de `targetCents` (RET-15)
**Requirement**: RET-04, RET-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] R$ 20.000,00/mês: 6% → 600.000.000 centavos, 8% → 400.000.000, 10% → 342.857.143 (R$ 3.428.571,43) (RET-04)
- [x] Teste: a meta de 6% não é mais `renda × 12 ÷ 6%` (R$ 4.000.000), que era o resultado antigo (RET-05)
- [x] Teste: renda máxima R$ 1.000.000,00 com 10% → 171.428.571.429 centavos, diferença de no máximo 1 centavo para o valor exato (edge case)
  - Errata: R$ 1.000.000,00 × 12 ÷ 7% = R$ 171.428.571,43 (17.142.857.143 centavos). O valor 171.428.571.429 (R$ 1.714.285.714,29) tem um fator 10 a mais. O teste usa a renda máxima do `goalSchema` e o valor correto.
- [x] Teste: `annualIncomeCents(2_000_000) = 24_000_000`
- [x] Todas as expectativas antigas de meta em `freedom.test.ts` reescritas com os valores da spec, sem remover testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: nenhum teste excluído; testes novos entram

**Tests**: unit
**Gate**: quick

**Status**: ✅ Done

**Commit**: `feat(freedom): derive the target patrimony from the withdrawal rate`

---

### T3: Resumo com retirada, renda anual e meta única

**What**: Adicionar `withdrawalRateBp` e `annualIncomeCents` a `GoalSummary`, calculados em `summarize`, que continua calculando `targetCents` uma única vez e repassando o valor a aporte, linha do tempo, marcos e progresso.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T2
**Reuses**: `summarize`, `requiredMonthlyCents`, `projectedCents`, `chartYMax`
**Requirement**: RET-06, RET-07, RET-08, RET-09, RET-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste: `monthlyRate(600)` ≈ 0,004867551 (0,4868% a.m.) e `(1 + monthlyRate)^12 = 1,06`; idem 8% e 10%; nunca `6% ÷ 12` (RET-06)
- [x] Teste: para os três cenários com R$ 20.000/mês, `summary.withdrawalRateBp` = 400, 600, 700 e `summary.annualIncomeCents` = 24.000.000 (RET-08)
- [x] Teste: `projectedCents` com o aporte de `summarize` ao fim de `months` fica a no máximo 1 centavo de `summary.targetCents`, para os três cenários (RET-07 e RET-09 AC4); aporte é maior com a meta nova que seria com a antiga
  - Nota (spec-precision gap): com o aporte arredondado para cima ao centavo (RET-07, convenção mantida), o patrimônio em 240 meses passa da meta em 428, 87 e 308 centavos (6%, 8%, 10%). O teste fixa o que o arredondamento permite: projeção ≥ meta, 1 centavo a menos de aporte não alcança a meta e a sobra ≤ projeção de 1 centavo/mês.
- [x] Teste: `summary.timeline.at(-1).totalCents` ≈ `summary.targetCents`; `chartYMax(summary.targetCents, último total)` = 107% da meta, e `checkpoints.at(-1).valueCents` = `summary.targetCents` (RET-10: gráfico e marcos usam a mesma meta)
  - Nota: como o último total passa da meta pelo arredondamento do aporte, `chartYMax` dá 107% do último total (642.000.458, 428.000.093 e 366.857.473 centavos), sempre ≥ 107% da meta.
- [x] Teste: mudar renda, guardado, data de nascimento, idade do ápice e rentabilidade, um por vez, altera meta, aporte e prazo exatamente nos campos dependentes e deixa os demais iguais (RET-08)
- [x] Teste: guardado capitalizado ≥ meta → aporte 0; `months = 0` sem alcançar a meta → `null`; `months = 0` alcançando → 0; guardado acima da meta mantém progresso acima de 100% (RET-09 e edge cases)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: nenhum teste excluído; testes novos entram

**Tests**: unit
**Gate**: quick

**Status**: ✅ Done

**Commit**: `feat(freedom): expose the withdrawal rate and annual income in the summary`

---

### T4: Textos de rentabilidade, retirada e "Como calculamos?"

**What**: Criar módulo puro com `RATE_TITLE`, `RATE_HINT`, `HOW_WE_CALCULATE` e `heroFacts(summary)` (Rentabilidade real, Taxa de retirada, Renda desejada, Patrimônio necessário).
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T3
**Reuses**: `GoalSummary`, `formatBRL`; padrão de módulo puro com teste (ex.: `spending-pace.ts`)
**Requirement**: RET-11, RET-12, RET-13, RET-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `RATE_TITLE = "Rentabilidade real esperada"` e `RATE_HINT = "Taxa real estimada (descontada a inflação)"` (RET-11)
- [x] `heroFacts` devolve, para 6%, 8% e 10% com R$ 20.000/mês: "Rentabilidade real 6% a.a." / "Taxa de retirada 4% a.a.", 8%/6%, 10%/7%, "Renda desejada R$ 20.000,00/mês" e "Patrimônio necessário" = R$ 6.000.000,00, R$ 4.000.000,00 e R$ 3.428.571,43 (RET-12)
- [x] `HOW_WE_CALCULATE` contém o texto exato do pedido, a frase de que a taxa de retirada varia com o cenário e a de que são premissas de simulação sem garantia (RET-13)
- [x] Teste: nenhum texto exportado contém "perpétu", "garantid" nem "vitalíc" (RET-14 AC4), exceto negações explícitas como "não garantem"; o teste usa a lista exata de padrões da spec e a negação fica fora dela
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos entram

**Tests**: unit
**Gate**: quick

**Status**: ✅ Done

**Commit**: `feat(freedom): add the copy for return, withdrawal rate and the calculation note`

---

### T5: Hero com rentabilidade, retirada e explicação

**What**: Trocar o selo "Gera … perpétuos …" por `<dl>` com `heroFacts` e adicionar `<details>` "Como calculamos?" com `HOW_WE_CALCULATE`, mantendo o valor grande da meta, o aporte, o prazo e a barra.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: T4
**Reuses**: classes, tokens e estrutura atuais do Hero
**Requirement**: RET-12, RET-13, RET-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Hero mostra rentabilidade real, taxa de retirada, renda desejada e patrimônio necessário a partir de `summary` (RET-12)
- [x] "Como calculamos?" abre e fecha por toque e teclado e mostra o texto de `HOW_WE_CALCULATE` (RET-13)
- [x] Sem a palavra "perpétuos" no componente; layout, cores e colunas atuais preservados
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Status**: ✅ Done

**Commit**: `feat(liberdade): show withdrawal rate and how the target is calculated in the hero`

---

### T6: Rótulo acessível do seletor de cenários

**What**: Trocar o `aria-label` do radiogroup de "Taxa esperada" para `RATE_TITLE` e ajustar o comentário do componente.
**Where**: `src/components/rate-toggle.tsx`
**Depends on**: T5
**Reuses**: `RATE_TITLE`
**Requirement**: RET-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Radiogroup tem nome acessível "Rentabilidade real esperada"; opções e visual inalterados (RET-11)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Status**: ✅ Done

**Commit**: `feat(liberdade): name the scenario selector as the expected real return`

---

### T7: Formulário com título novo e taxa de retirada

**What**: Trocar o título "Taxa esperada ao ano" por `RATE_TITLE`, usar `RATE_HINT` na legenda e mostrar "Taxa de retirada M% a.a." sob o seletor, lida de `getWithdrawalRate` para a rentabilidade escolhida.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T6
**Reuses**: `RATE_TITLE`, `RATE_HINT`, `getWithdrawalRate`, `RateToggle`
**Requirement**: RET-11, RET-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Título "Rentabilidade real esperada" e legenda "Taxa real estimada (descontada a inflação)" (RET-11)
- [x] Ao trocar o cenário, a taxa de retirada exibida passa a 4%, 6% ou 7% sem recarregar, junto com a meta e o aporte da prévia (RET-14 AC5)
- [x] Nenhum valor 4, 6 ou 7 de retirada escrito no componente; tudo vem de `getWithdrawalRate`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Status**: ✅ Done

**Commit**: `feat(liberdade): show the withdrawal rate of the chosen scenario in the form`

---

### T8: Introdução da gaveta sem promessa de principal

**What**: Reescrever `INTRO` para citar a taxa de retirada do cenário e remover "sem consumir o principal".
**Where**: `src/components/goal-experience.tsx`
**Depends on**: T7
**Reuses**: texto atual de `INTRO` e `DRAWER_INTRO`
**Requirement**: RET-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `INTRO` descreve a meta como o patrimônio que, na taxa de retirada do cenário, gera a renda desejada, sem prometer renda nem preservação do principal (RET-14 AC4)
- [x] `DRAWER_INTRO` e o resto da página inalterados
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Status**: ✅ Done

**Commit**: `fix(liberdade): drop the principal-preservation claim from the intro`

---

### T9: Regressão e varredura final

**What**: Rodar a suíte completa e varrer `src` por "perpétuo", "vitalício", "garantido" e "Taxa esperada" em textos da tela; registrar o resultado em `tasks.md`.
**Where**: `.specs/features/liberdade-taxa-retirada/tasks.md`
**Depends on**: T8
**Reuses**: Gate Full
**Requirement**: RET-14, RET-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` passam; `goal.test.ts`, `goals.int.test.ts` e `repos/goals.int.test.ts` sem alteração de contrato (RET-15)
- [x] Varredura sem ocorrências proibidas em `src` (RET-14 AC4); nenhuma alteração em schema, `goalSchema`, `saveGoal` (RET-15)
- [x] Resultado da varredura e contagem de testes anotados neste arquivo

**Tests**: none
**Gate**: full

**Status**: ✅ Done

**Commit**: `docs(liberdade-taxa-retirada): record the final regression sweep`

**Resultado (T9):**

- `npm run typecheck`, `npm run lint` e `npm run build` passam; `npm run test:unit`: 17 arquivos, 535 testes passando; `npm run test:int`: 13 arquivos, 285 testes passando, rodado contra o banco privado `orcamento_taxa_retirada_test` (via `DATABASE_URL`), sem tocar em `orcamento_test`.
- Varredura `perpétu|vitalíc|garantid|Taxa esperada` em `src` e `e2e`: única ocorrência é a lista `FORBIDDEN` do teste `src/lib/domain/freedom-copy.test.ts:54` (padrões proibidos, não texto de tela). Nenhum texto exibido, comentário ou e2e restante.
- Nenhuma alteração em schema, `goalSchema`, `saveGoal`, `goal.test.ts`, `goals.int.test.ts` e `repos/goals.int.test.ts` (RET-15).
- UI sem teste automático (AD-005, AD-008); verificação visual dos três cenários não executada nesta rodada.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4
Phase 3:  T5 ------→ T6 ------→ T7 ------→ T8 ------→ T9
```

Execução sequencial, em linha: 9 tarefas cabem em um lote (~8-9), então proponho executar inline, sem sub-agentes.
