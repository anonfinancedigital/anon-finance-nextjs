# Ápice: Clareza do Objetivo Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/apice-clareza/design.md`
**Spec**: `.specs/features/apice-clareza/spec.md`
**Status**: Draft

**Ordem:** o domínio, a copy e a lógica do rascunho vêm primeiro e são testados em unit (fase 1); tokens e blocos de formulário (fase 2); página preenchida (fase 3); gaveta, estado vazio e orquestração (fase 4). Código antigo só sai na task que passa a usar o novo, para cada commit compilar e o build passar (`chartYMax` e os textos antigos saem nas tasks que os substituem).

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de código de framework; nenhuma task usa API do Next além do que já existe (`router.refresh`, Server Action `saveGoal` inalterada).

**Concorrência e ambiente:** outra sessão pode mexer no repositório (há alterações não relacionadas em `transaction-form.tsx`, `summary-table.tsx`, `adjust-sum-bar.tsx`); cada commit inclui só os arquivos da task. Node 20 no `PATH` (memória do projeto). Os testes são unitários, sem banco; nenhuma task toca o banco.

**Verificação manual (AD-005, sem teste de componente):** o Verifier fecha a feature com uma conferência no app (skill `run`): cenário de aceite, estado vazio, gaveta com descarte, tooltips por teclado, gráfico com metas de 500 mil, 4,8 mi e 20 mi, tema claro e escuro e viewport de 320 px.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` em `src/**/*.test.ts` e `integration` em `*.int.test.ts`), AD-005 (e2e suspenso), AD-008 (domínio e validação isomórficos; sem teste de componente). Lição L-002 (texto exato nas mensagens): os textos dos AC já estão literais na spec e entram literais nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio, copy e validação (`src/lib/domain/*`, `src/lib/validation/*`) | unit | Todos os ramos; 1:1 com os AC da spec; cada caso de borda listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`, `src/app/**`) | none | - (e2e suspenso, AD-005; sem teste de componente; build gate only) | - | build gate only |
| Estilo global (`globals.css`) | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from `package.json` - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de domínio, copy e validação | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração (nenhuma nesta feature) | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e CSS | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

### Phase 1: Domínio, copy e rascunho

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Tokens e blocos do formulário

```
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 3: Página preenchida

```
T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 4: Gaveta, estado vazio e orquestração

```
T21 → T22 → T23 → T24 → T25 → T26
```

---

## Task Breakdown

### T1: Idade atual no resumo

**What**: `GoalSummary` ganha `currentAge` (idade em anos completos hoje, só para exibição).
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: None
**Reuses**: `ageOn`, `summarize`, `today` de `src/lib/validation/goal.ts` (para `YearMonthDay` em America/Sao_Paulo; `summarize` já recebe `now`)
**Requirement**: APICE-06, APICE-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `summarize(goal, now).currentAge` é igual a `ageOn(goal.birthDate, hoje)` para o cenário de aceite (33) e na véspera do aniversário (idade ainda anterior)
- [x] Todas as expectativas numéricas existentes de `freedom.test.ts` seguem passando sem edição
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores de `freedom.test.ts` mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): expose the current age in the goal summary`
**Status**: ✅ Done

---

### T2: Eixo Y com passos regulares

**What**: Criar `chartYAxis(targetCents, finalCents)` devolvendo `{ max, ticks }`; `chartYMax` fica até a T20 trocar o gráfico.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T1
**Reuses**: `chartYMax` (convive até T25)
**Requirement**: APICE-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Meta R$ 500 mil: ticks 0, 100 mil, 200 mil, 300 mil, 400 mil, 500 mil (em centavos) e `max` = 500 mil
- [x] Meta R$ 4,8 mi (patrimônio final até 4,8 mi): ticks 0, 1 mi, 2 mi, 3 mi, 4 mi, 5 mi e `max` = 5 mi
- [x] Meta R$ 20 mi: ticks 0, 5 mi, 10 mi, 15 mi, 20 mi
- [x] Patrimônio final maior que a meta define o `max`; os ticks ficam igualmente espaçados e sempre de 4 a 6 itens para entradas de 50 mil a 50 mi
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos de `chartYAxis` passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): add a regular-step y axis for the trajectory chart`
**Status**: ✅ Done

---

### T3: Aporte arredondado ao real

**What**: Criar `formatWholeBRL(cents)` ("R$ 9.027").
**Where**: `src/lib/domain/money.ts`
**Depends on**: T2
**Reuses**: `formatBRL` e o formatador `brl` existentes
**Requirement**: APICE-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `formatWholeBRL(902719)` devolve "R$ 9.027"; `902750` devolve "R$ 9.028"; `0` devolve "R$ 0"
- [x] Valores de milhão usam separador de milhar ("R$ 1.234.568" para 123456789 centavos)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores de `money.test.ts` mais os novos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): add whole-real currency formatting`
**Status**: ✅ Done

---

### T4: Textos da hierarquia, nomenclatura e frase-resumo

**What**: Adicionar as constantes e funções de APICE-01 a APICE-03 e trocar os termos antigos nos textos existentes do módulo de copy.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T3
**Reuses**: `formatCompactBRL`, `formatWholeBRL`, `formatTerm`, `planLines`, `howWeCalculate`
**Requirement**: APICE-01, APICE-02, APICE-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `SUBTITLE` é exatamente "Quanto você precisa juntar para viver de renda — e quanto guardar por mês para chegar lá."; `DRAWER_INTRO` é "Altere os valores e veja o aporte mensal mudar na hora."; `ADJUST_LABEL` "Ajustar objetivo"; `DEPOSIT_LABEL` "Aporte mensal necessário"; `TARGET_LABEL` "Patrimônio necessário"
- [x] `incomeHeadline` devolve "R$ 20 mil/mês aos 48 anos" no cenário de aceite
- [x] `summarySentence` devolve "Para ter R$ 20 mil/mês aos 48 anos, você precisa de R$ 4,8 mi. Isso exige guardar R$ 9.027/mês por 14 anos e 11 meses." no cenário de aceite e muda com a renda e a idade (prova que nada é fixo)
- [x] `monthlyCents` null: a frase termina em "…você precisa de R$ 4,8 mi." sem "Isso exige guardar"; `monthlyCents` 0: usa "Você já tem o necessário." no lugar da cláusula
- [x] `depositText` devolve "R$ 9.027/mês", "Prazo encerrado" (null) e "Meta alcançada" (0)
- [x] Nenhum texto do módulo contém "Aporte Estratégico", "Meta Patrimonial", "Calibrar Parâmetros" nem "Simule o ápice"; `heroPill` permanece até a T26 (o Hero ainda a usa até a T17)
- [x] A lista de termos proibidos da feature `liberdade-copy-hierarquia` segue passando para os textos novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os casos antigos de `freedom-copy.test.ts` mantidos ou reescritos para os textos novos, mais os novos (nenhum removido sem substituto)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): add income-first copy and rename jargon terms`
**Status**: ✅ Done

---

### T5: Textos das premissas, "Hoje" e variação

**What**: Adicionar `scenarioName`, `assumptionChips`, `withdrawalTooltip`, `todayLabel` e `depositDelta`.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T4
**Reuses**: `presetFor`, `PRESET_RATES`, `targetCents`, `formatRate`, `formatShare`, `formatCompactBRL`, `formatWholeBRL`
**Requirement**: APICE-04, APICE-05, APICE-06, APICE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `assumptionChips` devolve "Cenário moderado", "8% real a.a.", "Retirada de 5% a.a.", "Valores em R$ de hoje" para 8%/5%; "Cenário conservador" e "Cenário agressivo" para 6%/4% e 10%/6%; "Cenário personalizado" com as taxas digitadas (ex.: "6,5% real a.a.") fora dos presets
- [x] `withdrawalTooltip` devolve "Percentual do patrimônio que você saca por ano para gerar sua renda. Com 5%, R$ 4,8 mi geram R$ 240 mil/ano (R$ 20 mil/mês)." para o cenário de aceite e usa os valores dados (renda e retirada diferentes mudam o texto)
- [x] `todayLabel` devolve "Hoje · R$ 565 mil (11,8%) · 33 anos" para o cenário de aceite; com progresso acima de 100% mostra o percentual real
- [x] `depositDelta(10267, 9027)` (em reais, valores em centavos nos testes) devolve `{ direction: "up", text: "R$ 1.240 vs. atual" }`; redução devolve `"down"`; iguais devolve `null`; qualquer lado null devolve `null`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): add assumption, today and delta copy`
**Status**: ✅ Done

---

### T6: Idade atual como primeiro tick do eixo X

**What**: `ageTicks` inclui sempre o primeiro ano inteiro (a idade atual) e o último.
**Where**: `src/lib/domain/age-ticks.ts`
**Depends on**: T5
**Reuses**: `ageTicks` e `age-ticks.test.ts` atuais
**Requirement**: APICE-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Para `first = 33` e `last = 48` o primeiro tick é 33 e o último é 48, com no máximo 9 ticks
- [x] Para um intervalo curto (ex.: 33 a 35) devolve 33, 34, 35
- [x] Os ticks ficam em ordem crescente, sem repetição, para intervalos de 1 a 60 anos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores (ajustados só onde a spec mudou o primeiro tick) mais os novos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): always label the current age on the x axis`
**Status**: ✅ Done

---

### T7: Avaliação do rascunho do objetivo

**What**: Criar `evaluateDraft(values, saved, now, previous)` que valida com `goalSchema`, calcula o resumo, os erros por campo e `dirty`.
**Where**: `src/lib/validation/goal-draft.ts`
**Depends on**: T6
**Reuses**: `goalSchema`, `summarize`, o tipo `GoalFormValues` (movido para uma exportação sem React: o tipo continua definido em `goal-form.tsx` e reexportado até a T14)
**Requirement**: APICE-14, APICE-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Valores válidos devolvem `summary` igual a `summarize` do mesmo objetivo e `errors` vazio
- [x] Valores inválidos mantêm o `summary` anterior (`previous`) e devolvem o erro do campo com o texto do `goalSchema` (ex.: "A data de nascimento não pode ser futura")
- [x] `dirty` é `false` quando os valores são iguais aos salvos (inclusive depois de digitar e desfazer) e `true` quando um campo difere
- [x] Sem objetivo salvo (`saved` null) e com renda ou idade vazias: `summary` é `null` e `dirty` é `true` só se algum campo foi preenchido
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos de `goal-draft.test.ts` passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): evaluate the goal draft with validation and dirty state`
**Status**: ✅ Done

---

### T8: Tokens de cor e animação de destaque

**What**: Definir `--color-invested`, `--color-returns`, `--color-progress` (claro e escuro), expô-los ao Tailwind e adicionar o keyframe `flash` de 300 ms.
**Where**: `src/app/globals.css`
**Depends on**: None (fase 1 concluída)
**Reuses**: `--viz-target`, `--viz-spent`, bloco `@theme inline` existente
**Requirement**: APICE-13, APICE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os três tokens existem nos temas claro e escuro; `--color-invested` = `--viz-target` e `--color-returns` = `--viz-spent`; `--color-progress` tem valor próprio distinto dos dois
- [x] Classes `bg-progress`, `text-progress`, `text-returns` e `animate-flash` utilizáveis; `animate-flash` não anima com `prefers-reduced-motion`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): add color tokens with single meanings and a flash animation`
**Status**: ✅ Done

---

### T9: Subtítulo no cabeçalho da página

**What**: `PageHeader` aceita `subtitle` e o renderiza em texto secundário abaixo do título.
**Where**: `src/components/page-header.tsx`
**Depends on**: T8
**Reuses**: estrutura atual do `PageHeader`
**Requirement**: APICE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem `subtitle`, o cabeçalho das demais telas fica idêntico ao atual
- [x] Com `subtitle`, o texto aparece em `text-sm text-muted-foreground` abaixo do título e cabe em uma linha a 1280 px
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): support a subtitle in the page header`
**Status**: ✅ Done

---

### T10: Hook do rascunho

**What**: Criar `useGoalDraft` que liga `evaluateDraft` ao estado do React (valores, `touched`, `reset`).
**Where**: `src/components/use-goal-draft.ts`
**Depends on**: T9
**Reuses**: `evaluateDraft`, `summarize`, `GoalFormValues`
**Requirement**: APICE-14, APICE-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O hook devolve `values`, `set`, `summary`, `savedSummary`, `dirty`, `errors` (só de campos tocados), `touched` e `reset`
- [x] O resumo é recalculado a cada alteração, sem blur (derivado no render)
- [x] `reset` volta aos valores salvos e limpa `touched`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente mais os testes da T7 passam

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): add the goal draft hook`
**Status**: ✅ Done

---

### T11: Slider da idade com valor e extremos

**What**: Criar `AgeSlider` em largura total, valor acima do handle e extremos rotulados.
**Where**: `src/components/age-slider.tsx`
**Depends on**: T10
**Reuses**: `src/components/ui/slider.tsx`
**Requirement**: APICE-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Mostra "{valor} anos" acima do handle e "{mínimo} anos" e "90 anos" nas pontas
- [x] Setas do teclado mudam a idade em 1 ano; `disabled` desativa o controle
- [x] Sem data de nascimento, mostra "Informe a data de nascimento para usar o controle"
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): add the independence age slider`
**Status**: ✅ Done

---

### T12: Cartões de cenário legíveis

**What**: Reescrever `RateToggle` com hierarquia nome → rentabilidade → retirada, check no selecionado, tooltip de retirada e quarto cartão "Personalizado".
**Where**: `src/components/rate-toggle.tsx`
**Depends on**: T11
**Reuses**: `PRESET_RATES`, `withdrawalTooltip`, `Tooltip`
**Requirement**: APICE-17, APICE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O selecionado tem borda e fundo de destaque e ícone de check
- [x] A linha de retirada tem ícone ⓘ com o tooltip de `withdrawalTooltip`, acessível por hover e foco, com Escape fechando
- [x] Com par fora dos presets o cartão "Personalizado" aparece selecionado e nenhum preset marcado; clicar nele abre os campos de taxa
- [x] Sem corte de texto e sem rolagem horizontal a 320 px
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): make scenario cards clearer with a custom state`
**Status**: ✅ Done

---

### T13: Campos do objetivo reutilizáveis

**What**: Extrair `GoalFields` (renda, guardado, nascimento com idade calculada, idade com `AgeSlider`, cenários) com variante `drawer` e `inline`.
**Where**: `src/components/goal-fields.tsx`
**Depends on**: T12
**Reuses**: `CurrencyInput`, `Input`, `maskDateInput`, `maskBRLInput`, `AgeSlider`, `RateToggle`, `ageOn`, erros de `useGoalDraft`
**Requirement**: APICE-15, APICE-16, APICE-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A data mantém a máscara dd/mm/aaaa e mostra a idade ("33 anos") ao lado quando válida
- [x] Data inválida mostra "Data de nascimento inválida"; futura mostra "A data de nascimento não pode ser futura"; nesses casos não mostra a idade
- [x] O mínimo do slider e do campo de idade é a idade atual + 1
- [x] Campo e slider da idade ficam sincronizados nos dois sentidos
- [x] Na variante `inline` os rótulos são "Renda mensal desejada", "Quanto você já tem guardado", "Com que idade quer chegar lá" e "Data de nascimento", sem seletor de cenários
- [x] Erros só aparecem em campos tocados
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): extract reusable goal fields with a birth date age`
**Status**: ✅ Done

---

### T14: Formulário da gaveta com rodapé fixo

**What**: `GoalForm` passa a usar `GoalFields` e o rascunho, com rodapé fixo "Aplicar" e "Cancelar".
**Where**: `src/components/goal-form.tsx`
**Depends on**: T13
**Reuses**: `GoalFields`, `useGoalDraft`, `saveGoal`
**Requirement**: APICE-18, APICE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O botão "Salvar" vira "Aplicar"; o rodapé fica fixo e visível sem rolar
- [x] "Aplicar" com valores válidos salva via `saveGoal` e chama `onSaved`; "Cancelar" chama `onCancel`
- [x] O tipo `GoalFormValues` e `blank` (8% real, retirada 5%) continuam exportados do mesmo módulo
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): apply goal changes from a fixed drawer footer`
**Status**: ✅ Done

---

### T15: Chips de premissas

**What**: Criar `AssumptionChips` com os quatro chips, tooltips e o link "Ajustar".
**Where**: `src/components/assumption-chips.tsx`
**Depends on**: None (fase 2 concluída)
**Reuses**: `assumptionChips`, `withdrawalTooltip`, `ADJUST_LABEL`, `Tooltip`
**Requirement**: APICE-04, APICE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Renderiza "Cenário moderado", "8% real a.a.", "Retirada de 5% a.a.", "Valores em R$ de hoje" e "Ajustar" conforme as premissas do resumo
- [x] "Ajustar" chama `onAdjust`
- [x] Tooltip "Todos os valores já descontam a inflação." no chip de R$ de hoje e tooltip de retirada no ⓘ, ambos por hover e foco
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): show scenario assumptions as chips`
**Status**: ✅ Done

---

### T16: Barra de marcos sem aparência interativa

**What**: Trocar o marcador por um ponto "Hoje" com rótulo, marcos atingidos preenchidos e futuros menores e vazados, sem cursor.
**Where**: `src/components/goal-checkpoints.tsx`
**Depends on**: T15
**Reuses**: `todayLabel`, token `--color-progress`
**Requirement**: APICE-06, APICE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O rótulo "Hoje · R$ 565 mil (11,8%) · 33 anos" aparece na barra e é o único lugar com o percentual de progresso
- [x] Nenhum elemento da barra tem `cursor-pointer` ou estado de hover/foco
- [x] Marcos atingidos são círculos preenchidos; futuros são menores e vazados
- [x] A barra usa `bg-progress` e não usa o verde de rendimentos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): label today on the progress bar without handle affordance`
**Status**: ✅ Done

---

### T17: Card principal com a renda em destaque

**What**: Reescrever `GoalHero`: card "Renda desejada", frase-resumo, indicadores de patrimônio e aporte com prazo, chips e barra; remover pílula e texto "acumulados".
**Where**: `src/components/goal-hero.tsx`
**Depends on**: T16
**Reuses**: `incomeHeadline`, `summarySentence`, `depositText`, `planLines`, `AssumptionChips`, `GoalCheckpoints`, popover "Como calculamos?"
**Requirement**: APICE-02, APICE-03, APICE-07, APICE-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A renda é o maior valor numérico (`text-4xl`); patrimônio e aporte têm o mesmo tamanho (`text-2xl`) e ficam lado a lado
- [x] O prazo "em 14 anos e 11 meses" aparece junto ao aporte quando `months` > 0
- [x] O card de aporte não usa verde de rendimentos; usa a cor neutra do card
- [x] A pílula verde de renda e o texto "acumulados (… do alvo)" não existem
- [x] `GoalHero` aceita `onAdjust` e `preview` e mostra "Prévia" quando `preview` é verdadeiro
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): make desired income the hero of the summary card`
**Status**: ✅ Done

---

### T18: Encaminhar ajuste e prévia no resumo

**What**: `GoalSummary` repassa `onAdjust` e `preview` ao Hero.
**Where**: `src/components/goal-summary.tsx`
**Depends on**: T17
**Reuses**: `GoalHero`, `GoalChart`
**Requirement**: APICE-04, APICE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `GoalSummary({ summary, onAdjust, preview })` repassa os dois ao `GoalHero`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): pass adjust and preview through the summary`
**Status**: ✅ Done

---

### T19: Eixos e rótulo da meta no gráfico

**What**: O gráfico usa `chartYAxis`, o título "Idade" e o rótulo da meta com fundo sem sobrepor a curva.
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T18
**Reuses**: `chartYAxis`, `ageTicks`, `ReferenceLine`
**Requirement**: APICE-08, APICE-09, APICE-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os ticks do eixo Y vêm de `chartYAxis` (metas de 500 mil, 4,8 mi e 20 mi dão os ticks da spec)
- [x] O eixo X tem o título "Idade" e a idade atual no primeiro tick
- [x] "Meta: {valor}" aparece à esquerda da linha, com fundo da cor do card, sem tocar a curva
- [x] `chartYMax` deixa de ser importado
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): regular axes and a clear target label in the chart`
**Status**: ✅ Done

---

### T20: Tooltip, insight e cores do gráfico

**What**: Guia vertical que acompanha o cursor (mouse e toque), tooltip com total, investido e rendimentos, insight sem pílula e cores pelos tokens.
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T19
**Reuses**: `ChartTooltip`, `interestBadge`, tokens `--color-invested` e `--color-returns`
**Requirement**: APICE-11, APICE-12, APICE-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Passar o mouse ou tocar mostra o tooltip da idade (patrimônio total, total investido, rendimentos) e a linha vertical acompanha o cursor
- [x] O insight "{rendimentos} vêm dos rendimentos · {percentual}% do patrimônio final" aparece com ícone e sem fundo preenchido
- [x] Investido usa `--color-invested`, rendimentos `--color-returns`; nenhum uso de `income` no arquivo
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): age tooltip with a guide line and a plain earnings insight`
**Status**: ✅ Done

---

### T21: Resumo fixo da gaveta

**What**: Criar `DrawerSummary` com o aporte em destaque, patrimônio ao lado, variação "vs. atual" e rótulo "Prévia".
**Where**: `src/components/drawer-summary.tsx`
**Depends on**: None (fase 3 concluída)
**Reuses**: `depositText`, `depositDelta`, `TARGET_LABEL`, `DEPOSIT_LABEL`, `animate-flash`
**Requirement**: APICE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O aporte usa o maior tamanho e o patrimônio fica menor ao lado
- [x] O número do aporte recebe `animate-flash` quando muda (re-disparado por `key`), sem animação com `prefers-reduced-motion`
- [x] A variação aparece só quando há objetivo salvo e a diferença não é zero, com ↑ ou ↓
- [x] "Prévia" aparece só quando `dirty` é verdadeiro
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): show a live deposit summary with delta in the drawer`
**Status**: ✅ Done

---

### T22: Confirmação de descarte

**What**: Criar `DiscardDialog` "Descartar alterações?" com "Descartar" e "Continuar editando".
**Where**: `src/components/discard-dialog.tsx`
**Depends on**: T21
**Reuses**: `src/components/ui/dialog.tsx`, `Button`
**Requirement**: APICE-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Mostra o título "Descartar alterações?" e os botões "Descartar" e "Continuar editando"
- [x] "Descartar" chama `onDiscard`; "Continuar editando" e Escape chamam `onKeepEditing`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): add a light confirmation before discarding changes`
**Status**: ✅ Done

---

### T23: Estado vazio com simulação inline

**What**: Criar `GoalEmptyState` com headline, campos inline, chip de cenário, resultado ou placeholder, gráfico de exemplo e "Salvar objetivo".
**Where**: `src/components/goal-empty-state.tsx`
**Depends on**: T22
**Reuses**: `GoalFields` (inline), `useGoalDraft`, `summarySentence`, `depositText`, `AssumptionChips`, `GoalChart`, `saveGoal`
**Requirement**: APICE-19, APICE-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Mostra "Quanto você precisa para viver de renda?" e "Diga a renda que quer ter e veja quanto guardar por mês para chegar lá."
- [x] Sem interação não há mensagem de erro; com renda ou idade faltando mostra "Preencha a renda e a idade para ver o aporte"
- [x] Com renda e idade válidas mostra a frase-resumo e o aporte, calculados por `useGoalDraft` (mesma lógica da gaveta)
- [x] O cenário Moderado vem por padrão, mostrado como chip com "Ajustar" que chama `onAdjust`
- [x] Enquanto renda ou idade estão vazias, mostra um gráfico de exemplo esmaecido e `aria-hidden`
- [x] "Salvar objetivo" salva via `saveGoal`; em erro mostra a mensagem retornada e mantém os valores
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): simulate the goal inline in the empty state`
**Status**: ✅ Done

---

### T24: Orquestração da página

**What**: `GoalExperience` usa `useGoalDraft`, o subtítulo, `GoalEmptyState`, `DrawerSummary`, `DiscardDialog` e os novos nomes.
**Where**: `src/components/goal-experience.tsx`
**Depends on**: T23
**Reuses**: todos os componentes acima, `PageHeader` com subtítulo, `Sheet`
**Requirement**: APICE-01, APICE-03, APICE-14, APICE-18, APICE-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O título "Ápice" tem o subtítulo nos estados vazio e preenchido
- [x] O botão e o título da gaveta são "Ajustar objetivo" e a descrição é "Altere os valores e veja o aporte mensal mudar na hora."
- [x] "Cancelar" e "X" com alterações abrem "Descartar alterações?"; sem alterações fecham direto; "Descartar" restaura a página ao salvo
- [x] A página por trás da gaveta reflete a prévia e mostra "Prévia" enquanto `dirty`
- [x] Sem objetivo salvo mostra `GoalEmptyState`; depois de "Salvar objetivo" mostra o estado preenchido sem abrir a gaveta
- [x] "Ajustar" nos chips abre a gaveta
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: a suíte unit existente passa sem alteração

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): wire the goal page with the draft, empty state and discard flow`
**Status**: ✅ Done

---

### T25: Remover `chartYMax`

**What**: Remover `chartYMax` e seus testes, já sem uso.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T24
**Reuses**: `chartYAxis` (T2)
**Requirement**: APICE-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `grep` não encontra `chartYMax` em `src/`
- [x] Os testes antigos de `chartYMax` são removidos porque a função some, e `chartYAxis` já os cobre (T2)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: os testes de `chartYMax` removidos e todos os demais passam

**Tests**: unit
**Gate**: build

**Commit**: `refactor(apice): remove the superseded chart ceiling helper`
**Status**: ✅ Done

---

### T26: Remover `heroPill`

**What**: Remover `heroPill` e seu teste, já sem uso depois da T17.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T25
**Reuses**: `assumptionChips` (T5)
**Requirement**: APICE-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `grep` não encontra `heroPill` em `src/`
- [x] Nenhum texto de `freedom-copy.ts` contém "Renda de" seguido de "retirada inicial de" em formato de pílula
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: os testes de `heroPill` removidos e todos os demais passam

**Tests**: unit
**Gate**: build

**Commit**: `refactor(apice): remove the superseded hero pill copy`
**Status**: ✅ Done

---

## Phase 5: Correções da verificação

Gaps do `validation.md` (Verifier reprovou): APICE-14.1 (Major), APICE-19.4 (Major), APICE-19.3 e APICE-04.4 (Minor) e limpezas sem risco; T33 a T35 vêm da iteração 3 (Gaps A e B e spec); T36 e T37 vêm da iteração 4 (Gaps B' e A'). Execução sequencial T27 → T28 → T29 → T30 → T31 → T32 → T33 → T34 → T35 → T36 → T37.

### T27: Resumo da gaveta fixo ao rolar

**What**: Tornar o resumo da gaveta `sticky` no topo da área rolável, com fundo opaco do tema e acima do conteúdo que rola.
**Where**: `src/components/drawer-summary.tsx`
**Depends on**: T26
**Reuses**: `SheetContent` (`overflow-y-auto`, largura 320 px a 384 px)
**Requirement**: APICE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A `section` do resumo é `sticky top-0` com `z-index` acima dos campos e fundo opaco (`bg-card`), sem vazar conteúdo por baixo
- [x] O resumo continua visível ao rolar a gaveta, sem estourar a largura de 320 px
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: todos os testes existentes passam

**Tests**: none (UI, AD-005/AD-008)
**Gate**: build

**Commit**: `fix(apice): keep the drawer summary fixed while the drawer scrolls`
**Status**: ✅ Done

---

### T28: Guardado vazio vale R$ 0 no rascunho

**What**: Tratar "guardado" vazio como "0,00" ao avaliar e ao salvar o rascunho, para quem não tem nada guardado ver o aporte e salvar. `goalSchema` e `parseBRL` ficam intactos.
**Where**: `src/lib/validation/goal-draft.ts`, `src/lib/validation/goal-draft.test.ts`, `src/components/goal-empty-state.tsx`, `src/components/goal-form.tsx`
**Depends on**: T27
**Reuses**: `goalSchema`, `evaluateDraft`
**Requirement**: APICE-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Renda e idade válidas com "guardado" vazio: `evaluateDraft` devolve o mesmo `summary` de "guardado" "0,00" e `errors.saved` indefinido
- [x] "Guardado" só com espaços também vale R$ 0; `dirty` continua comparando o texto digitado
- [x] Os valores enviados a `saveGoal` no estado vazio e na gaveta trazem "0,00" no lugar de vazio
- [x] Os testes de `goalSchema` (vazio rejeitado em `saved`) e de `maskBRLInput` seguem iguais
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: build

**Commit**: `fix(apice): treat an empty saved amount as zero in the goal draft`
**Status**: ✅ Done

---

### T29: Chips de premissas e tooltip no estado vazio

**What**: Mostrar os quatro chips de premissas no estado vazio sem resumo válido, reusando `scenarioName`, e mover o texto do tooltip "R$ de hoje" para `freedom-copy.ts` com assertão exata.
**Where**: `src/lib/domain/freedom-copy.ts`, `src/lib/domain/freedom-copy.test.ts`, `src/components/assumption-chips.tsx`, `src/components/goal-empty-state.tsx`
**Depends on**: T28
**Reuses**: `scenarioName`, `assumptionChips`, `AssumptionChips`
**Requirement**: APICE-19, APICE-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `TODAY_TOOLTIP` em `freedom-copy.ts` vale exatamente "Todos os valores já descontam a inflação." e o teste faz `toBe` desse texto
- [x] Sem resumo válido, o estado vazio mostra os chips de cenário, taxa real, retirada e "Valores em R$ de hoje" mais "Ajustar", com as taxas digitadas
- [x] `scenarioChip` e `SCENARIO_NAMES` saem de `goal-empty-state.tsx`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: build

**Commit**: `fix(apice): show all assumption chips in the empty state`
**Status**: ✅ Done

---

### T30: Limpezas seguras

**What**: Mover `GoalFormValues` para a camada de validação sem React, remover o export `blank` sem consumidor e `planLines` (se a spec não o exigir).
**Where**: `src/lib/validation/goal-draft.ts`, `src/components/goal-form.tsx`, `src/components/use-goal-draft.ts`, `src/lib/domain/freedom-copy.ts`, `src/lib/domain/freedom-copy.test.ts`
**Depends on**: T29
**Reuses**: n/a
**Requirement**: APICE-02, APICE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `goal-draft.ts` não importa de `@/components/*`; o tipo `GoalFormValues` é definido em `src/lib/validation/goal-draft.ts` e os consumidores importam dele
- [x] `grep` não encontra o export `blank` nem `planLines` sem consumidor em `src/`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: só saem os testes de `planLines`, se removido; os demais passam

**Tests**: unit
**Gate**: build

**Commit**: `refactor(apice): move the goal form values type out of the component layer`
**Status**: ✅ Done

---

### T31: `dirty` trata guardado vazio como R$ 0

**What**: Comparar `withZeroSaved(values)` com `withZeroSaved(baseline)` em `evaluateDraft`, para guardado vazio e "0,00" não contarem como alteração (a T28 deixou `dirty` comparando o texto cru; após salvar, a página recebe "0,00" e mostrava "Prévia" e o diálogo de descarte indevidos).
**Where**: `src/lib/validation/goal-draft.ts`, `src/lib/validation/goal-draft.test.ts`
**Depends on**: T30
**Reuses**: `withZeroSaved`
**Requirement**: APICE-14, APICE-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `dirty` é `false` com guardado "" contra baseline "0,00" (e o inverso) e `true` quando o valor realmente difere
- [x] O teste da T28 que fixava `dirty` no texto cru é corrigido (contrariava APICE-14.7)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: quick

**Commit**: `fix(apice): ignore empty-versus-zero saved amount when checking dirty`
**Status**: ✅ Done

---

### T32: Ajustes cosméticos de gráfico e gaveta

**What**: Conter a tabela `sr-only` do gráfico para a página não rolar na horizontal a 320 px e dar `z-index` ao rodapé sticky da gaveta, acima dos cartões e abaixo de popovers e tooltips (`z-50`).
**Where**: `src/components/goal-chart.tsx`, `src/components/goal-form.tsx`
**Depends on**: T31
**Reuses**: n/a
**Requirement**: APICE-17, APICE-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A `figure` do gráfico é `relative overflow-hidden`, com a tabela `sr-only` mantida para leitores de tela
- [x] O rodapé da gaveta tem `z-20`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: todos os testes existentes passam

**Tests**: none (UI, AD-005/AD-008)
**Gate**: build

**Commit**: `fix(apice): contain the chart table and lift the drawer footer`
**Status**: ✅ Done

---

### T33: Eixo Y ignora o excesso de arredondamento do patrimônio final

**What**: Em `chartYAxis`, só considerar o patrimônio final como maior que a meta quando o excede em mais de 0,1% da meta; o aporte arredondado para cima deixa o final centavos acima da meta e subia o eixo um passo em R$ 500 mil e R$ 20 mi (Gap A do `validation.md`).
**Where**: `src/lib/domain/freedom.ts`, `src/lib/domain/freedom.test.ts`
**Depends on**: T32
**Reuses**: `summarize`, `chartYAxis`
**Requirement**: APICE-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com o patrimônio final real de `summarize` (renda R$ 2.500 e R$ 100.000, 6% a.a. e retirada de 6%), os ticks são 0…500 mil e 0…20 mi
- [x] Patrimônio final realmente maior que a meta (acima de 0,1%) continua definindo o máximo; os testes existentes seguem, exceto o do teto da linha do tempo, que passou a aceitar o excesso de arredondamento acima do teto
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: quick

**Commit**: `fix(apice): ignore final patrimony rounding overshoot on the Y axis`
**Status**: ✅ Done

---

### T34: Primeiro tick do eixo X é a idade inteira atual

**What**: `ageTicks` passa a começar em `Math.floor(first)` e o domínio do eixo X em `Math.floor(first.age)`, para o primeiro tick coincidir com `currentAge` (Gap B do `validation.md`: idade fracionária do primeiro ponto dava 34 com idade atual 33).
**Where**: `src/lib/domain/age-ticks.ts`, `src/lib/domain/age-ticks.test.ts`, `src/components/goal-chart.tsx`
**Depends on**: T33
**Reuses**: `summarize`
**Requirement**: APICE-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com a idade fracionária real do pipeline (`summarize`), o primeiro tick é `summary.currentAge`
- [x] O domínio do eixo X inclui o primeiro tick
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: build

**Commit**: `fix(apice): start the X axis at the current whole age`
**Status**: ✅ Done

---

### T35: Limpeza de lint e precisão da spec

**What**: Remover o import `PLAN_REACHED` sem uso de `freedom-copy.test.ts` e registrar na `spec.md` as regras pendentes (guardado vazio vale R$ 0, placeholder de 19.5 também sem data de nascimento, frase com `monthlyCents = 0`) e a regra do eixo Y de 08.1.
**Where**: `src/lib/domain/freedom-copy.test.ts`, `.specs/features/apice-clareza/spec.md`, `.specs/features/apice-clareza/design.md`
**Depends on**: T34
**Reuses**: n/a
**Requirement**: APICE-02, APICE-08, APICE-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run lint` sem avisos
- [x] `spec.md` descreve as quatro regras
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: todos os testes existentes passam

**Tests**: none (limpeza e documentação)
**Gate**: quick

**Commit**: `docs(apice): record pending spec rules and drop an unused import`
**Status**: ✅ Done

---

### T36: Eixo X começa na idade atual do resumo

**What**: O eixo X passa a começar em `summary.currentAge` (anos completos de `ageOn`), não no `floor` da idade fracionária do primeiro ponto, que no mês do aniversário, antes do dia, dava a idade atual + 1 (Gap B' do `validation.md`).
**Where**: `src/lib/domain/age-ticks.ts`, `src/lib/domain/age-ticks.test.ts`, `src/components/goal-chart.tsx`
**Depends on**: T35
**Reuses**: `summarize`, `ageTicks`
**Requirement**: APICE-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `goal-chart.tsx` chama `ageTicks(summary.currentAge, last.age)` e usa `Math.min(summary.currentAge, first.age)` como início do domínio
- [x] Com `now` fixo e aniversário no mês corrente (antes, no dia e depois do dia de hoje), o primeiro rótulo é `summary.currentAge` (ex.: nascimento 20/10/1993 com hoje 07/10/2026 dá 32), crescente e sem repetição
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: build

**Commit**: `fix(apice): start the X axis at the summary current age`
**Status**: ✅ Done

---

### T37: Eixo Y segue a meta quando há aporte

**What**: `chartYAxis` recebe o aporte: com aporte maior que 0 o excesso do patrimônio final é só arredondamento (chega a R$ 500,29 em 20 a 90 anos, acima da tolerância de 0,1%), então o máximo segue a meta; com aporte 0 o patrimônio final real também define o máximo (Gap A' do `validation.md`).
**Where**: `src/lib/domain/freedom.ts`, `src/lib/domain/freedom.test.ts`, `src/components/goal-chart.tsx`, `.specs/features/apice-clareza/design.md`
**Depends on**: T36
**Reuses**: `summarize`, `chartYAxis`
**Requirement**: APICE-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `chartYAxis(targetCents, finalCents, monthlyCents)` usa `raw = target` com aporte > 0 e `raw = max(target, final)` com aporte 0; a tolerância fixa sai
- [ ] Com `summarize`, o cenário agressivo de 20 a 90 anos com meta de R$ 500 mil dá ticks 0 a 500 mil; com aporte 0 e patrimônio acima da meta, o final define o máximo
- [ ] `design.md` descreve a regra e o eixo X a partir da idade atual
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [ ] Test count: os testes anteriores mais os novos passam

**Tests**: unit
**Gate**: build

**Commit**: `fix(apice): follow the target on the Y axis when a deposit is due`
**Status**: ⬜ Pending

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11 → T12 → T13 → T14
Phase 3:  T15 → T16 → T17 → T18 → T19 → T20
Phase 4:  T21 → T22 → T23 → T24 → T25 → T26
Phase 5:  T27 → T28 → T29 → T30 → T31 → T32 → T33 → T34 → T35 → T36 → T37
```

Execução estritamente sequencial. Com 26 tasks, o empacotamento dá 4 lotes (~7 tasks, fases inteiras); a oferta de sub-agentes é feita no Execute.

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| APICE-01 | T4, T9, T24 |
| APICE-02 | T3, T4, T17, T26, T30, T35 |
| APICE-03 | T4, T17, T24 |
| APICE-04 | T5, T15, T18, T23, T29 |
| APICE-05 | T5, T12, T15 |
| APICE-06 | T1, T5, T16 |
| APICE-07 | T16, T17 |
| APICE-08 | T2, T19, T25, T33, T35, T37 |
| APICE-09 | T19 |
| APICE-10 | T6, T19, T34, T36 |
| APICE-11 | T20 |
| APICE-12 | T20 |
| APICE-13 | T8, T17, T20 |
| APICE-14 | T5, T7, T8, T10, T14, T18, T21, T24, T27, T30, T31 |
| APICE-15 | T1, T13 |
| APICE-16 | T11, T13 |
| APICE-17 | T12, T32 |
| APICE-18 | T14, T22, T24, T31, T32 |
| APICE-19 | T7, T10, T13, T23, T24, T28, T29, T35 |

Cobertura: 19 de 19 requisitos mapeados.
