# Ápice: Folga sobre a Meta Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (seção "Decisões de design" abaixo; sem `design.md`)
**Spec**: `.specs/features/apice-folga-meta/spec.md`
**Status**: In Progress

**Ordem:** o domínio e a copy vêm primeiro e são testados em unit (fase 1); depois o Hero e o bloco de folga (fase 2); por fim a barra e o gráfico (fase 3). Cada commit compila e passa o gate. Nenhuma task toca o banco nem a Server Action `saveGoal`.

**Next.js:** nenhuma task usa API do Next além do que já existe; `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de código de framework, e aqui só há componentes cliente e domínio puro.

**Concorrência e ambiente:** outra sessão pode mexer no repositório (há `.specs/features/data-nascimento/` não rastreado e commits de `resumo`); cada commit inclui só os arquivos da task e o status do `tasks.md`/`spec.md`. Node 20 no `PATH` (memória do projeto). Os testes são unitários, sem banco.

**Verificação manual (AD-005, sem teste de componente):** o Verifier fecha a feature com uma conferência no app (skill `run`): cenário de referência (renda R$ 5 mil, 48 anos, 8%/5%, R$ 565 mil), estado "Ápice já atingido", aporte maior que 0, gaveta com os dois botões, barra e gráfico em tema claro e escuro e viewport de 320 px.

**Supersede testes existentes:** T7 troca as expectativas de `freedom-copy.test.ts` sobre "Sem aporte necessário" e "Você já tem o necessário." Essa troca decorre da spec nova (substitui APM-02/03 e amplia AP-09), não é enfraquecimento de teste.

---

## Decisões de design (inline)

- **Idade da meta N** (`Reach.ageYears`): menor idade inteira entre a idade atual + 1 e a idade-alvo cujo prazo (`monthsUntilRetirement`) é maior ou igual ao mês `m*` em que o guardado, sem aportes, alcança o alvo (`monthsToTarget`). `Reach.age` (fracionária, `retirementAge - (months - m*)/12`) serve só ao gráfico.
- **`GoalSummary` ganha**: `reach: Reach | null` (só com `monthlyCents === 0`, guardado abaixo do alvo e `months > 0`; traz `months`, `ageYears`, `age`, `finalCents` = patrimônio no prazo sem aportes), `incomeNowCents` (guardado × retirada ÷ 12), `barEndCents` (`reach.finalCents` ou o alvo) e `todayPositionBp` (guardado ÷ `barEndCents`, teto 10000).
- **Marcos**: `positionBp` = valor ÷ `barEndCents`; com `reach`, o marco de 100% usa `reach.ageYears`; os de 25/50/75% mantêm a regra de anos completos.
- **`src/lib/domain/slack.ts`** (novo): `slackOptions(summary)` → `{ extraIncomeCents, earlierAge }` (cada um ou `null`, limiares da spec) e `robustnessCheck(summary)` → `null | { reaches: true } | { reaches: false; monthlyCents }` a 6% real a.a. mantendo prazo, alvo e retirada.
- **Botões da folga**: `GoalExperience` recebe dois callbacks que fazem `draft.set(...)` (renda com `referenceIncomeText`, idade com `String(N)`) e `setOpen(true)`; nada é salvo.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` em `src/**/*.test.ts` e `integration` em `*.int.test.ts`), AD-005 (e2e suspenso), `.specs/STATE.md`. Lição L-002 (texto exato nas mensagens): os textos dos AC já estão literais na spec e entram literais nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio e copy (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os AC da spec; cada caso de borda listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`) | none | - (e2e suspenso, AD-005; sem teste de componente; build gate only) | - | build gate only |

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
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 2: Hero e bloco de folga

```
T9 → T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 3: Barra e gráfico

```
T16 → T17
```

---

## Task Breakdown

### T1: Mês em que o guardado alcança o alvo

**What**: Criar `monthsToTarget({ savedCents, targetCents, annualRateBp, months })`: menor `m` entre 1 e `months` com `projectedCents` (aporte 0) maior ou igual ao alvo; `null` se nenhum.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: None
**Reuses**: `projectedCents`, `monthlyRate`
**Requirement**: APF-02, APF-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cenário de referência (R$ 565 mil, alvo R$ 1,2 mi, 8% a.a., 179 meses) dá 118
- [x] Guardado R$ 0 ou abaixo do alcance no prazo dá `null`
- [x] Guardado igual ao alvo dá 1 (ou o primeiro mês) e 1 centavo abaixo do alvo dá o mês em que o rendimento cobre o centavo; nenhum caso volta 0
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): find the month the savings reach the target`
**Status**: ✅ Done

---

### T2: Idade da meta

**What**: Criar `retirementAgeReaching({ birthDate, retirementAge, currentAge, reachMonths, now })`: menor idade entre `currentAge + 1` e `retirementAge` cujo `monthsUntilRetirement` é maior ou igual a `reachMonths`.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T1
**Reuses**: `monthsUntilRetirement`, `currentMonth`
**Requirement**: APF-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cenário de referência (nascido em 1993-05-10, agora 2026-06, ápice 48, `reachMonths` 118) dá 43
- [x] `reachMonths` igual ao prazo total dá a idade-alvo
- [x] Nunca devolve idade menor que a atual + 1 nem maior que a idade-alvo
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): compute the age at which the target is reached`
**Status**: ✅ Done

---

### T3: Plano de chegada e renda atual no resumo

**What**: `summarize` preenche `reach` (`months`, `ageYears`, `age`, `finalCents`) quando `monthlyCents` é 0, o guardado é menor que o alvo e `months` é maior que 0, e `incomeNowCents` (guardado × retirada ÷ 12, centavos arredondados).
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T2
**Reuses**: `monthsToTarget`, `retirementAgeReaching`, `projectedCents`
**Requirement**: APF-02, APF-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Referência: `reach.ageYears` 43, `reach.months` 118, `reach.finalCents` entre R$ 1,78 mi e R$ 1,79 mi e `age` fracionária entre 42,9 e 43
- [x] `reach` é `null` com aporte maior que 0, com guardado igual ou maior que o alvo e com prazo encerrado
- [x] `incomeNowCents` com R$ 1,3 mi e retirada de 5% é 541.667 (R$ 5.416,67)
- [x] Todas as expectativas numéricas existentes de `freedom.test.ts` seguem passando sem edição
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): expose the reach plan and the current income in the summary`
**Status**: ✅ Done

---

### T4: Escala da barra e marcos

**What**: `GoalSummary` ganha `barEndCents` e `todayPositionBp`; `buildCheckpoints` posiciona cada marco em valor ÷ `barEndCents` e, com `reach`, dá ao marco de 100% a idade `reach.ageYears`.
**Where**: `src/lib/domain/freedom.ts`
**Depends on**: T3
**Reuses**: `buildCheckpoints`, `progressBp`
**Requirement**: APF-04, APF-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Referência: `barEndCents` igual a `reach.finalCents`, marco de R$ 1,2 mi com `positionBp` entre 6600 e 6800 e `ageYears` 43; marcos de 25/50/75% mantêm `ageYears` da regra atual (33 e 39 nos de 600 e 900 mil)
- [x] Com aporte maior que 0: `barEndCents` igual ao alvo e `positionBp` igual à fração (2500, 5000, 7500, 10000), como hoje
- [x] `todayPositionBp` é o guardado ÷ `barEndCents` com teto 10000
- [x] Guardado igual ou maior que o alvo: os 4 marcos com `reached` verdadeiro e `todayPositionBp` 10000
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): scale the checkpoints to the projected patrimony`
**Status**: ✅ Done

---

### T5: Opções da folga

**What**: Criar `slackOptions(summary)` em módulo novo: `extraIncomeCents` (patrimônio no prazo × retirada ÷ 12, em reais inteiros para baixo, só se for pelo menos 5% maior que a renda desejada) e `earlierAge` (`reach.ageYears` só se menor que a idade-alvo); tudo `null` sem `reach`.
**Where**: `src/lib/domain/slack.ts`
**Depends on**: T4
**Reuses**: `GoalSummary.reach`, `referenceIncomeText`
**Requirement**: APF-09, APF-10, APF-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Referência: `extraIncomeCents` 742.000 (R$ 7.420) e `earlierAge` 43
- [x] Renda extra de 4,9% sobre a desejada dá `extraIncomeCents` nulo; de 5% dá o valor
- [x] `earlierAge` nulo quando N é igual à idade-alvo
- [x] Sem `reach` (aporte maior que 0, já atingiu, prazo encerrado, guardado 0) as duas opções são nulas
- [x] Aplicar `extraIncomeCents` ao objetivo de referência dá `monthlyCents` 0 em `summarize`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): derive the slack options from the summary`
**Status**: ✅ Done

---

### T6: Teste de robustez

**What**: Criar `robustnessCheck(summary)` em `slack.ts`: `null` sem `reach` ou com rentabilidade do objetivo de 6% ou menos; senão recalcula com 6% real mantendo prazo, alvo e retirada e devolve `{ reaches: true }` ou `{ reaches: false, monthlyCents }`.
**Where**: `src/lib/domain/slack.ts`
**Depends on**: T5
**Reuses**: `requiredMonthlyCents`
**Requirement**: APF-13, APF-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Referência (R$ 565 mil, 8%): `{ reaches: true }` (R$ 565 mil a 6% chegam a R$ 1,35 mi)
- [x] Guardado R$ 400 mil com aporte 0 a 8% e alvo R$ 1,2 mi: `{ reaches: false, monthlyCents }` igual a `requiredMonthlyCents` a 6%
- [x] Rentabilidade do objetivo de 6% (ou 5,5%) dá `null`
- [x] Sem `reach` dá `null`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): check the conclusion against a 6% real return`
**Status**: ✅ Done

---

### T7: Textos do indicador, da frase e do estado atingido

**What**: `depositText` devolve "R$ 0" com aporte 0 e guardado abaixo do alvo; `summarySentence` passa a "…chega lá aos {N}, sem novos aportes." e, com guardado no alvo, "Você já atingiu seu Ápice."; sai `NO_DEPOSIT_NEEDED`.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T6
**Reuses**: `depositText`, `summarySentence`, `PLAN_REACHED`
**Requirement**: APF-01, APF-03, APF-05, APF-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Referência: indicador "R$ 0" e frase "Para ter R$ 5 mil/mês aos 48 anos, você precisa de R$ 1,2 mi. Seu patrimônio atual, rendendo, chega lá aos 43, sem novos aportes."
- [x] Guardado igual ao alvo: indicador "Meta alcançada" e frase terminando em "Você já atingiu seu Ápice."; 1 centavo abaixo: "R$ 0"
- [x] Aporte maior que 0 e prazo encerrado: textos inalterados
- [x] Os testes de `freedom-copy.test.ts` sobre "Sem aporte necessário" e "Você já tem o necessário." são substituídos pelas expectativas desta spec; nenhum outro teste é alterado, removido ou pulado
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): celebrate a zero deposit and the reached Ápice in the copy`
**Status**: ✅ Done

---

### T8: Textos da folga, da chegada e da robustez

**What**: Criar em `freedom-copy.ts`: `reachLine(summary)` ("Seu patrimônio atual já te leva lá: você atinge a meta aos {N} anos, {D} antes do previsto." ou "…, no prazo previsto."), `incomeNowLine(summary)`, `slackIntro(summary)`, `extraIncomeOption`, `earlierOption`, `robustnessText(check)` e as constantes "Você tem folga", "Ter mais renda", "Parar antes", "Usar {renda}" e "Antecipar para {N}".
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T7
**Reuses**: `formatCompactBRL`, `formatWholeBRL`, `plural`
**Requirement**: APF-02, APF-07, APF-09, APF-10, APF-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `reachLine` na referência: "…aos 43 anos, 5 anos antes do previsto."; com D igual a 1: "1 ano antes do previsto"; com N igual à idade-alvo: "no prazo previsto"
- [x] `incomeNowLine` com R$ 1,3 mi e 5%: "Seu patrimônio já gera R$ 5,4 mil/mês"
- [x] `slackIntro`: "Sem novos aportes, aos 48 anos seu patrimônio chega a R$ 1,8 mi."
- [x] Opções: "R$ 7,4 mil/mês aos 48 anos" com botão "Usar R$ 7,4 mil" e "R$ 5 mil/mês aos 43 anos" com botão "Antecipar para 43"
- [x] `robustnessText`: "Mesmo com 6% real a.a., você chega à meta. Isso considera que você não retira nada do patrimônio até lá." e "Com 6% real a.a., seria preciso aportar R$ {A}/mês." com A em reais inteiros
- [x] Os textos novos passam no teste de linguagem proibida existente (`FORBIDDEN` em `freedom-copy.test.ts`)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes anteriores mais os novos passam (nenhum removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(apice): add the reach, slack and robustness copy`
**Status**: ✅ Done

---

### T9: Indicador de aporte do Hero

**What**: O card de aporte mostra "R$ 0" na cor de sucesso com ícone `Check` e `reachLine` no lugar de "em {prazo}"; no estado atingido mostra "Meta alcançada" e `incomeNowLine`; sem prazo exibido nesses dois casos; com aporte maior que 0 fica como hoje.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: None (fase 1 concluída)
**Reuses**: `depositText`, `reachLine`, `incomeNowLine`, `text-income`, `Check` do `lucide-react`
**Requirement**: APF-01, APF-02, APF-05, APF-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com `reach` o card mostra "R$ 0" com check e `reachLine`, sem `em {prazo}`
- [ ] Com guardado no alvo mostra "Meta alcançada" e `incomeNowLine`, sem `em {prazo}`
- [ ] Aporte maior que 0 mantém o valor e o prazo; o ícone é `aria-hidden`
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): show the zero deposit as an achievement in the hero`
**Status**: Pending

---

### T10: Bloco "Você tem folga"

**What**: Criar `GoalSlack({ summary, onApplyIncome, onApplyAge })`: título, `slackIntro` e uma linha por opção de `slackOptions`, cada uma com botão; nada é renderizado sem opção.
**Where**: `src/components/goal-slack.tsx`
**Depends on**: T9
**Reuses**: `slackOptions`, textos de T8, `Button` de `src/components/ui/button.tsx`
**Requirement**: APF-09, APF-10, APF-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com as duas opções renderiza as duas linhas e os botões "Usar R$ 7,4 mil" e "Antecipar para 43"
- [ ] Com só uma opção renderiza só ela; sem opção devolve `null`
- [ ] Os botões são `button` nativos, com o texto do rótulo como nome acessível
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): add the slack block with the two apply options`
**Status**: Pending

---

### T11: Linha de robustez

**What**: Criar `GoalRobustness({ summary })`: texto discreto quando `reaches` é verdadeiro e linha na cor de atenção com o aporte a 6% quando falso; `null` quando `robustnessCheck` é nulo.
**Where**: `src/components/goal-robustness.tsx`
**Depends on**: T10
**Reuses**: `robustnessCheck`, `robustnessText`, token `warning`
**Requirement**: APF-13, APF-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `reaches` verdadeiro: texto secundário com a frase da spec
- [ ] `reaches` falso: linha em `text-warning` com o aporte a 6%
- [ ] `null` não renderiza nada
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): add the robustness line for the 6% real return`
**Status**: Pending

---

### T12: Bloco e robustez dentro do Hero

**What**: O Hero recebe `onApplyIncome` e `onApplyAge` e renderiza `GoalSlack` logo abaixo dos dois indicadores e `GoalRobustness` na sequência, só quando há `reach`.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: T11
**Reuses**: `GoalSlack`, `GoalRobustness`
**Requirement**: APF-08, APF-09, APF-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com `reach` o Hero mostra o bloco abaixo dos indicadores e a robustez depois dele; sem `reach` não mostra nenhum
- [ ] No estado atingido não há bloco nem robustez
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): place the slack block and robustness in the hero`
**Status**: Pending

---

### T13: Repassar as ações pelo resumo

**What**: `GoalSummary` (componente) repassa `onApplyIncome` e `onApplyAge` ao Hero.
**Where**: `src/components/goal-summary.tsx`
**Depends on**: T12
**Reuses**: `GoalHero`
**Requirement**: APF-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Props repassadas sem mudar o layout
- [ ] Typecheck e build passam
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): pass the slack actions through the summary`
**Status**: Pending

---

### T14: Botões da folga preenchem o rascunho

**What**: `GoalExperience` cria os callbacks: renda extra → `draft.set({ monthlyIncome: referenceIncomeText(cents) })`, idade → `draft.set({ retirementAge: String(N) })`; os dois chamam `setOpen(true)`; nenhum chama `saveGoal`.
**Where**: `src/components/goal-experience.tsx`
**Depends on**: T13
**Reuses**: `useGoalDraft.set`, `referenceIncomeText`
**Requirement**: APF-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Acionar "Usar R$ 7,4 mil" deixa o campo de renda com "7.420,00" e abre a gaveta em prévia
- [ ] Acionar "Antecipar para 43" deixa a idade com "43" e abre a gaveta em prévia
- [ ] Nenhum caminho chama `saveGoal`; o salvar continua só em `GoalForm`
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): apply the slack options to the draft and open the drawer`
**Status**: Pending

---

### T15: Conferência do estado vazio e da gaveta

**What**: Conferir que `goal-empty-state.tsx` e `drawer-summary.tsx` seguem corretos com os novos `depositText` e `summarySentence` ("R$ 0" simples, sem bloco de folga); só editar se o typecheck ou a leitura mostrarem erro.
**Where**: `src/components/drawer-summary.tsx`
**Depends on**: T14
**Reuses**: `depositText`, `summarySentence`
**Requirement**: APF-01, APF-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `drawer-summary.tsx` mostra "R$ 0" com aporte 0 e a variação contra o salvo continua correta
- [ ] `goal-empty-state.tsx` mostra a frase e o indicador novos sem o bloco de folga
- [ ] Evidência por inspeção de código (`file:line`); se nada precisar mudar, a task fecha sem commit de código e o status vai no commit da T16
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `fix(apice): keep the drawer summary coherent with the zero deposit copy`
**Status**: Pending

---

### T16: Barra com trecho de folga

**What**: `GoalCheckpoints` usa `todayPositionBp` e `positionBp` na escala nova; com `reach` pinta o trecho depois do marco de 100% na cor de rendimentos e acrescenta o rótulo final "{patrimônio compacto}" com "Aos {idade} anos (Folga)"; o percentual do rótulo "Hoje" segue o real.
**Where**: `src/components/goal-checkpoints.tsx`
**Depends on**: None (fase 2 concluída)
**Reuses**: `summary.todayPositionBp`, `summary.barEndCents`, `reach`, `text-returns`/`bg-returns`
**Requirement**: APF-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Referência: marco de R$ 1,2 mi a cerca de 67% da barra, trecho final em cor de rendimentos e rótulo final com o patrimônio e a idade-alvo
- [ ] Sem `reach` o componente fica como hoje (marcos em 25/50/75/100%)
- [ ] Os rótulos continuam sem sobreposição (grade 2×2 abaixo de `@xl`, posições absolutas acima)
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): draw the slack stretch on the checkpoints bar`
**Status**: Pending

---

### T17: Ponto de cruzamento no gráfico

**What**: `GoalChart` desenha um `ReferenceDot` na linha da meta em `x = reach.age` com o rótulo "Meta aos {N}", só com `reach` e `reach.ageYears` menor que a idade-alvo; a série "Total investido" segue constante (aporte 0).
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T16
**Reuses**: `ReferenceDot` do `recharts`, `reach`
**Requirement**: APF-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Referência: ponto sobre a linha da meta em torno dos 43 anos com "Meta aos 43"
- [ ] Sem `reach` ou com N igual à idade-alvo não há ponto
- [ ] Com aporte 0 a série "Total investido" é a linha plana do valor guardado
- [ ] Evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): mark where the curve crosses the target on the chart`
**Status**: Pending

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5 ------→ T6 ------→ T7 ------→ T8
Phase 2:  T9 ------→ T10 -----→ T11 -----→ T12 -----→ T13 -----→ T14 -----→ T15
Phase 3:  T16 -----→ T17
```

Execução estritamente sequencial. São 17 tasks em 3 fases: a skill oferece sub-agentes em lotes de cerca de 7 tasks com fases inteiras (lote 1: fase 1 com 8 tasks; lote 2: fases 2 e 3 com 9 tasks).
