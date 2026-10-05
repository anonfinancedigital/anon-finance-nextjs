# Resumo: Visões e Ritmo Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/resumo-visoes/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (consultar `node_modules/next/dist/docs/` antes de codar), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso; o projeto não tem testing-library, então componentes não têm teste automatizado).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*.ts`) | unit | Todos os ramos; 1:1 com os ACs de RITMO-02 a RITMO-04 e RITMO-03 (referência); todo edge case listado (fevereiro, vários gastos no mesmo dia) | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`) | none | - (build gate; ACs de seletor e gráfico verificados no navegador na última task) | - | build gate only |
| Páginas (`src/app/*`) | none | - (build gate; verificação no navegador na última task) | - | build gate only |
| Repositórios | none | Não tocados; testes existentes seguem como regressão | `src/**/*.int.test.ts` | `npm run test:int` |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (PATH com o Node 20 do nvm). Integração exige `npm run db:up` e `DATABASE_URL` apontando para um banco `*_test` próprio da sessão.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks com teste unitário | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Não usado nesta feature (sem teste de integração novo) | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks só de UI e a fase final | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Domínio do ritmo

```
T1
```

### Phase 2: Seletor Tabela / Barras

```
T2 → T3 → T4
```

### Phase 3: Card "Ritmo de gastos"

```
T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Criar buildSpendingPace

**What**: Função pura que devolve a série diária de gasto acumulado e a referência ideal do mês, com os testes unitários.
**Where**: `src/lib/domain/spending-pace.ts`
**Depends on**: None
**Reuses**: `mulDivRound` (`src/lib/domain/percent.ts`), `monthRange` (`src/lib/domain/month.ts`)
**Requirement**: RITMO-02, RITMO-03, RITMO-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `buildSpendingPace` exporta os tipos `SpendingPace` e `SpendingPacePoint` do design
- [x] Teste: mês de 30 dias com R$ 100 no dia 1 e R$ 200 no dia 10 dá spent 100 até o dia 9 e 300 do dia 10 ao 30 (cents)
- [x] Teste: receitas não entram; vários gastos no mesmo dia somam num ponto
- [x] Teste: número de pontos é 28, 29, 30 e 31 conforme o mês (fevereiro de 2026 e 2028 incluídos)
- [x] Teste: ideal do último dia é exatamente a meta total; meta total 0 dá `hasReference = false` e `idealCents = null`
- [x] Teste: mês corrente corta o gasto em "hoje"; mês futuro não tem gasto; mês passado vai até o último dia
- [x] Teste: `hasSpending` falso sem despesas; `aboveIdeal` verdadeiro só quando o último gasto supera o ideal do mesmo dia, e falso sem referência
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes novos passam e a contagem total não cai (sem exclusões silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(resumo): add the daily spending pace calculation`

---

### T2: Exportar SpentVsTarget

**What**: Exportar o gráfico de barras `SpentVsTarget` de `budget-charts.tsx` sem mudar seu render.
**Where**: `src/components/budget-charts.tsx` (modify)
**Depends on**: None
**Reuses**: Componente existente
**Requirement**: VISOES-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `SpentVsTarget` e o tipo de linha que ele recebe são exportados
- [x] A página renderiza igual a antes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `refactor(resumo): export the spent versus target bar chart`

---

### T3: Criar CategoryOverview

**What**: Card "Gastos por categoria" cliente com `Tabs` Tabela/Barras no cabeçalho, "Tabela" inicial, e sem seletor quando não há categorias.
**Where**: `src/components/category-overview.tsx`
**Depends on**: T2
**Reuses**: `ContentCard`, `ui/tabs.tsx`, `SummaryTable`, `SpentVsTarget`
**Requirement**: VISOES-01, VISOES-02, VISOES-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Seletor com exatamente "Tabela" e "Barras", expondo `aria-selected` e navegável por setas
- [x] Só a visão selecionada fica montada
- [x] Sem categorias, mostra o link "Crie suas categorias primeiro" e nenhum seletor
- [x] A contagem "N categorias" no `note` continua
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): add the table and bars selector to the category card`

---

### T4: Usar CategoryOverview na página

**What**: Trocar o `ContentCard` + `SummaryTable` de "Gastos por categoria" por `CategoryOverview` na Visão Geral.
**Where**: `src/app/(app)/page.tsx` (modify)
**Depends on**: T3
**Reuses**: `CategoryOverview`
**Requirement**: VISOES-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A página mostra o card com o seletor e a tabela por padrão
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): show the category overview selector on the home page`

---

### T5: Criar SpendingPaceChart

**What**: Card cliente "Ritmo de gastos" com gráfico de linha (gasto acumulado e ritmo ideal tracejado), legenda, tooltip, aviso "Acima do ritmo ideal" e o texto "Sem gastos no mês".
**Where**: `src/components/spending-pace-chart.tsx`
**Depends on**: None (usa os tipos de T1, da fase anterior)
**Reuses**: `ContentCard`, estilos de gráfico de `budget-charts.tsx`, `formatBRL`, variáveis `--viz-*`
**Requirement**: RITMO-01, RITMO-03, RITMO-05

**Tools**:

- MCP: NONE
- Skill: `dataviz`

**Done when**:

- [ ] Recebe `SpendingPace` e desenha um ponto por dia; a linha de gasto para onde `spentCents` é null
- [ ] Legenda "Gasto acumulado" e "Ritmo ideal" (a segunda só com referência)
- [ ] Tooltip com dia, gasto acumulado e ideal em BRL
- [ ] "Acima do ritmo ideal" aparece só quando `aboveIdeal`
- [ ] Sem gastos mostra "Sem gastos no mês"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): add the spending pace chart`

---

### T6: Trocar o card de barras pelo ritmo em BudgetCharts

**What**: Remover o card "Gasto × meta por categoria" de `BudgetCharts` e renderizar `SpendingPaceChart` ao lado do donut.
**Where**: `src/components/budget-charts.tsx` (modify)
**Depends on**: T5
**Reuses**: `SpendingPaceChart`
**Requirement**: VISOES-03, RITMO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `BudgetCharts` aceita `pace` e renderiza "Ritmo de gastos" e "Participação no gasto do mês"
- [ ] Nenhum card "Gasto × meta por categoria" resta no componente
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): replace the bar card with the spending pace card`

---

### T7: Calcular e passar o ritmo na página

**What**: Calcular `buildSpendingPace` na página com as ocorrências do mês, a meta total e "hoje", e passá-lo a `BudgetCharts`.
**Where**: `src/app/(app)/page.tsx` (modify)
**Depends on**: T6
**Reuses**: `buildSpendingPace`, `todayInSaoPaulo`, `summary.rows`
**Requirement**: RITMO-02, RITMO-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `totalTargetCents` é a soma de `targetCents` de `summary.rows`
- [ ] A página compila e renderiza o card com dados reais
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): feed the spending pace chart from the month occurrences`

---

### T8: Verificar no navegador e marcar a spec

**What**: Rodar o app e conferir os ACs de seletor e ritmo em mês corrente, passado e futuro; registrar o resultado e marcar a rastreabilidade da spec.
**Where**: `.specs/features/resumo-visoes/spec.md` (modify)
**Depends on**: T7
**Reuses**: Skill `run`
**Requirement**: VISOES-01, VISOES-02, VISOES-03, RITMO-01, RITMO-02, RITMO-03, RITMO-04, RITMO-05

**Tools**:

- MCP: NONE
- Skill: `run`

**Done when**:

- [ ] Seletor alterna sem mostrar tabela e barras juntas; teclado e `aria-selected` conferidos
- [ ] Curva do ritmo fecha o mês no mesmo total do card "Gasto"
- [ ] Mês futuro, mês sem gastos e meta zero conferidos
- [ ] Rastreabilidade da spec atualizada
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `docs(resumo): record verification and mark requirements verified`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1
Phase 2:  T2 ------→ T3 ------→ T4
Phase 3:  T5 ------→ T6 ------→ T7 ------→ T8
```

Total de 8 tasks: cabe num único lote, executado inline, sem sub-agentes. O Verifier roda sozinho após a última task.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | None | - | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | None (T1 é da fase anterior) | - | ✅ Match |
| T6 | T5 (T4 é da fase anterior) | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | UI / componentes | none | none | ✅ OK |
| T3 | UI / componentes | none | none | ✅ OK |
| T4 | Páginas | none | none | ✅ OK |
| T5 | UI / componentes | none | none | ✅ OK |
| T6 | UI / componentes | none | none | ✅ OK |
| T7 | Páginas | none | none | ✅ OK |
| T8 | Documentação | none | none | ✅ OK |
