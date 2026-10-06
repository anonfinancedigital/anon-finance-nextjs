# Liberdade: Copy Financeira e Hierarquia do Hero Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/liberdade-copy-hierarquia/design.md`
**Spec**: `.specs/features/liberdade-copy-hierarquia/spec.md`
**Status**: Draft

**Ordem:** o domínio e a copy testável vêm primeiro (fase 1); os componentes só consomem as funções (fase 2). O código antigo sai na mesma task que passa a usar o novo, para que cada commit compile e o build passe.

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de código de framework; nenhuma task usa API do Next (só componentes React, Radix e Recharts).

**Concorrência e ambiente:** outra sessão pode mexer no repositório; cada commit inclui só os arquivos da task. Node 20 no `PATH` (memória do projeto). Os testes são unitários, sem banco.

**Verificação manual (AD-005, sem teste de componente):** a T8 fecha a fase de UI com uma conferência no app (skill `run`): cenário de aceite, formulário vazio, par fora dos presets e viewport de 320 px.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` e `integration`), AD-005 (e2e suspenso), AD-008 (`freedom.ts` e `freedom-copy.ts` isomórficos; sem teste de componente). Lição L-002 (texto exato nas mensagens): os textos de LCH-01 a LCH-08 já estão literais na spec e entram literais nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio e copy (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os AC da spec; cada caso de borda listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`) | none | - (e2e suspenso, AD-005; sem teste de componente, AD-008; build gate only) | - | build gate only |

## Gate Check Commands

> Generated from `package.json` - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de domínio e copy | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração (nenhuma nesta feature) | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

### Phase 1: Domínio e copy

```
T1 → T2 → T3 → T4
```

### Phase 2: Componentes

```
T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Idade do ápice no resumo e retirada padrão

**What**: `GoalSummary` ganha `retirementAge` e `freedom.ts` exporta `DEFAULT_WITHDRAWAL_RATE_BP`, derivado do preset do `DEFAULT_ANNUAL_RATE_BP`.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: None
**Reuses**: `PRESET_RATES`, `DEFAULT_ANNUAL_RATE_BP`, `summarize`
**Requirement**: LCH-10, LCH-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `summarize(goal, now).retirementAge` é igual a `goal.retirementAge` (teste novo em `freedom.test.ts`)
- [x] `DEFAULT_WITHDRAWAL_RATE_BP` vale 500 e `presetFor(DEFAULT_ANNUAL_RATE_BP, DEFAULT_WITHDRAWAL_RATE_BP)` devolve 800 (teste novo)
- [x] Todas as expectativas numéricas existentes de `freedom.test.ts` seguem passando sem edição (LCH-12)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores de `freedom.test.ts` mais os 2 novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): expose independence age and default withdrawal rate in the domain`
**Status**: ✅ Done

---

### T2: Pílula, popover e termos proibidos

**What**: Reescrever `heroPill`, `howWeCalculate` e `HOW_DISCLAIMER` com os textos da spec e ampliar o teste de termos proibidos.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T1
**Reuses**: `formatRate`, `perYear`, `formatBRL`, testes atuais de `freedom-copy.test.ts`
**Requirement**: LCH-01, LCH-02, LCH-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `heroPill` devolve "Renda de R$ 20.000,00/mês · retirada inicial de 5% a.a." para o cenário de aceite (8% real, retirada 5%)
- [ ] `howWeCalculate` devolve "Com uma renda de R$ 20.000,00/mês (R$ 240.000,00/ano) e uma taxa de retirada inicial de 5% a.a., o patrimônio-alvo é de R$ 4.800.000,00." para o mesmo cenário, e usa "6,5%" com retirada de 650 pb
- [ ] `HOW_DISCLAIMER` é exatamente "A simulação utiliza rentabilidade real, já descontada da inflação. Os valores são projeções e não representam garantia de rentabilidade ou de renda futura."
- [ ] Os testes antigos que fixavam "Gera…", "segura…" e o aviso antigo são reescritos para os textos novos (não apagados)
- [ ] O teste `FORBIDDEN` cobre "segur", "perpétu", "garantid", "vitalíc", "consumir", "principal" e "vai gerar" em pílula, frase do popover, `RATE_TITLE` e `RATE_HINT`; o aviso do popover é checado só contra as raízes exceto "garantid" (contém "garantia", a negação permitida)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Test count: mesmos casos de `freedom-copy.test.ts` (reescritos) mais os da lista ampliada passam (nenhum removido sem substituto)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): rewrite hero pill and popover copy as projection language`

---

### T3: Linhas do card de aporte

**What**: Criar `planLines(summary)`, `PLAN_REACHED` e mover `formatTerm` do Hero para o módulo de copy.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T2
**Reuses**: `formatCompactBRL`, `formatTerm` de `src/components/goal-hero.tsx:12` (cópia; o Hero ainda a mantém até a T5)
**Requirement**: LCH-03, LCH-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cenário de aceite (`months` > 0): `planLines` devolve `reach` = "para alcançar R$ 4,8 mi aos 48 anos" e `term` = "Você chega ao Ápice em: 14 anos e 11 meses"
- [ ] `months` = 12: `term` = "Você chega ao Ápice em: 1 ano"
- [ ] `months` = 0 e `monthlyCents` = 0: devolve `{ reached: true }`; `PLAN_REACHED` = "Meta alcançada"
- [ ] `months` = 0 e `monthlyCents` = null: devolve `null`
- [ ] Meta alcançada com `months` > 0 (aporte R$ 0,00): devolve as duas linhas normais (edge case da spec)
- [ ] `formatTerm` exportada do módulo de copy, com testes para "1 ano e 2 meses", "3 anos", "5 meses", "0 meses"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Test count: os testes anteriores mais os novos de `planLines` e `formatTerm` passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): add plan lines copy for the monthly deposit card`

---

### T4: Indicador de rendimentos

**What**: Criar `interestBadge(summary)` com o valor compacto e o percentual do patrimônio final.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T3
**Reuses**: `summary.timeline`, `summary.interestSharePct`, `formatCompactBRL`
**Requirement**: LCH-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Para o cenário de aceite, devolve "R$ 2,6 mi vêm dos rendimentos · 55% do patrimônio final", com o valor igual ao `interestCents` do último ponto (o teste calcula a expectativa a partir do resumo, não de um literal solto)
- [ ] Mudar o prazo muda o valor e o percentual (prova que nada é fixo)
- [ ] `interestSharePct` null: devolve só "{valor} vêm dos rendimentos", sem " · "
- [ ] Timeline vazia: devolve `null`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Test count: os testes anteriores mais os novos de `interestBadge` passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(liberdade): add interest share badge copy`

---

### T5: Card de aporte do Hero

**What**: Trocar o `<dl>` do Hero pelas linhas de `planLines`, remover "Distância do Alvo" e a `formatTerm` local.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: None (fase 1 concluída; usa `planLines` da T3)
**Reuses**: `planLines`, `PLAN_REACHED`, `formatTerm` do módulo de copy, classes atuais (`text-sm`, `text-muted-foreground`, `text-income`)
**Requirement**: LCH-03, LCH-04, LCH-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sob o valor aparecem, nesta ordem, "para alcançar…" (apoio) e "Você chega ao Ápice em: …" (`font-medium`); `{ reached: true }` mostra "Meta alcançada" em `text-income`; `null` não mostra linha
- [ ] "Distância do Alvo" e "Tempo até o Ápice" não existem mais no arquivo nem em `src` (busca por texto sem resultado)
- [ ] Nenhum import de `formatTerm` quebra (`grep formatTerm src` só aponta para o módulo de copy)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [ ] Test count: a suíte unitária completa passa com o mesmo número de testes de antes da task

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): reorder the monthly deposit card and drop distance to target`

---

### T6: Indicador de rendimentos no gráfico

**What**: Usar `interestBadge` na pílula do cabeçalho e no `aria-label` do gráfico.
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T5
**Reuses**: `interestBadge` (T4), estrutura atual da pílula
**Requirement**: LCH-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A pílula e o `aria-label` do `figure` usam o texto de `interestBadge`; sem texto (`null`), a pílula não é renderizada
- [ ] O texto "Rendimentos: N% do patrimônio aos N anos" não existe mais em `src`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [ ] Test count: a suíte unitária completa passa com o mesmo número de testes da task anterior

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): show interest amount and share in the chart header`

---

### T7: Rótulos do seletor de cenários

**What**: Mostrar "N% real a.a." nos cenários, trocar o botão para "Personalizar premissas" e corrigir o comentário desatualizado.
**Where**: `src/components/rate-toggle.tsx`
**Depends on**: T6
**Reuses**: `formatRate`, `PRESET_RATES`
**Requirement**: LCH-07, LCH-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] As três opções mostram título, "6% real a.a.", "8% real a.a.", "10% real a.a." e "Retirada: 4% a.a.", "Retirada: 5% a.a.", "Retirada: 6% a.a."
- [ ] O botão se chama "Personalizar premissas"; "Definir taxas personalizadas" não existe mais em `src`
- [ ] O comentário de documentação do componente descreve o botão novo
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [ ] Test count: a suíte unitária completa passa com o mesmo número de testes da task anterior

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): label scenarios as real rates and rename the custom button`

---

### T8: Estado personalizado derivado e formulário padrão 8% e 5%

**What**: O formulário vazio começa em 8% e 5%; o cenário marcado e o realce do botão derivam do par digitado.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T7
**Reuses**: `presetOf`, `DEFAULT_ANNUAL_RATE_BP`, `DEFAULT_WITHDRAWAL_RATE_BP`, `RateToggle` (props `value` e `customActive`)
**Requirement**: LCH-09, LCH-10

**Tools**:

- MCP: NONE
- Skill: `run` (conferência manual no app)

**Done when**:

- [ ] `blank.annualRate` e `blank.withdrawalRate` vêm de `DEFAULT_ANNUAL_RATE_BP` e `DEFAULT_WITHDRAWAL_RATE_BP` ("8" e "5")
- [ ] `RateToggle` recebe `value = presetOf(values)` sempre e `customActive = presetOf(values) === null`; o estado `custom` só controla se os campos de taxa estão visíveis
- [ ] Os comentários "6 → 4, 8 → 6, 10 → 7" e "Definir taxas personalizadas" em `goal-form.tsx` estão corrigidos
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [ ] Test count: a suíte unitária completa passa com o mesmo número de testes da task anterior
- [ ] Conferência manual no app, anotada no commit ou no `validation.md`: sem objetivo salvo, Moderado marcado e botão sem destaque; digitar retirada 6 com 8%: nenhum cenário e botão realçado; digitar 5: Moderado de volta; objetivo salvo 8% e 6%: abre sem cenário marcado; cenário de aceite mostra R$ 4.800.000,00, R$ 9.027,19 / mês, "para alcançar R$ 4,8 mi aos 48 anos" e "R$ 4,8 mi (Meta)"; gaveta sem rolagem horizontal em 320 px

**Tests**: none
**Gate**: build

**Commit**: `feat(liberdade): derive the custom state from the typed rates and default to the moderate preset`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7 ------→ T8
```

Execução sequencial inline: 8 tasks cabem em um único batch (≤ ~8), sem sub-agentes. O Verifier roda sozinho depois da T8.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Idade do ápice e retirada padrão | Domínio (`freedom.ts`) | unit | unit | ✅ OK |
| T2: Pílula, popover e termos proibidos | Domínio e copy (`freedom-copy.ts`) | unit | unit | ✅ OK |
| T3: Linhas do card de aporte | Domínio e copy | unit | unit | ✅ OK |
| T4: Indicador de rendimentos | Domínio e copy | unit | unit | ✅ OK |
| T5: Card de aporte do Hero | UI / componentes | none | none | ✅ OK |
| T6: Indicador no gráfico | UI / componentes | none | none | ✅ OK |
| T7: Rótulos do seletor | UI / componentes | none | none | ✅ OK |
| T8: Estado personalizado e padrão 8/5 | UI / componentes | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| LCH-01 | T2 |
| LCH-02 | T2 |
| LCH-03 | T3, T5 |
| LCH-04 | T5 |
| LCH-05 | T3, T5 |
| LCH-06 | T4, T6 |
| LCH-07 | T7 |
| LCH-08 | T7 |
| LCH-09 | T8 |
| LCH-10 | T1, T8 |
| LCH-11 | T2 |
| LCH-12 | T1 |
