# Categorias: Estado Vazio e Hierarquia Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/categorias-estado-vazio/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso), AD-008 (UI sem teste automático). Não há teste de componente no projeto. Strong defaults aplicados à lógica de domínio.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`, `src/app/**/page.tsx`) | none | - (sem teste de componente; e2e suspenso, AD-005) | - | build gate only |
| e2e (`e2e/*.spec.ts`) | none | - (ajuste de spec existente, não roda, AD-005) | - | typecheck apenas |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

Notas de execução: a árvore tem mudanças alheias (`summary-table.tsx`, `transaction-form.tsx`, `e2e/transaction-form.spec.ts`); cada commit adiciona só os arquivos da própria task. `test:int` usa um banco `*_test` privado via `DATABASE_URL` (ver memória de isolamento).

---

## Execution Plan

### Phase 1: Regra de visibilidade

```
T1
```

### Phase 2: Peças independentes

Cada task toca um arquivo; só T4 depende de T3.

```
T2
T3 → T4
T5
T6
```

### Phase 3: Integração no editor

Todas alteram `category-editor.tsx`, então rodam em ordem. Setas vindas de fases anteriores marcam dependências já concluídas.

```
T1 → T7 → T8 → T9 → T10
T2 → T8
T3 → T8
T4 → T8
T5 → T10
```

### Phase 4: e2e

```
T10 → T11
```

---

## Task Breakdown

### T1: Criar a regra de visibilidade do editor

**What**: Função pura `allocationView(rowCount, sumMicro)` com testes.
**Where**: `src/lib/domain/allocation-view.ts`
**Depends on**: None
**Reuses**: `sumLabel`, `TOTAL_MICRO`, `MICRO_PER_PERCENT` de `percent.ts`
**Requirement**: ESV-01, ESV-03, ESV-04, ESV-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `allocationView(0, 0)`: `empty` true, `showSumWarning` false, `showAdjust` false, `showSave` false, `saveHint` null, `progressValue` 0, `progressText` "0% de 100% alocado"
- [x] `allocationView(1, 40_000_000)`: `empty` false, `showSumWarning` true, `showAdjust` false, `showSave` true, `saveHint` "Some 100% para salvar", `progressText` "40,00% de 100% alocado"
- [x] `allocationView(2, 40_000_000)`: `showAdjust` true; `allocationView(2, 100_000_000)`: `showSumWarning` false, `showAdjust` false, `saveHint` null, `progressText` "100,00% de 100% alocado"
- [x] `allocationView(1, 105_000_000)`: `progressValue` 100 e `progressText` "105,00% de 100% alocado"; `allocationView(1, 0)` (percentual apagado): `showSumWarning` true e `progressText` "0% de 100% alocado"
- [x] `allocationView(3, 99_999_999).progressText` = "99,999999% de 100% alocado" (herdado de `sumLabel`)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos em `allocation-view.test.ts` passam e nenhum existente é removido

**Tests**: unit
**Gate**: quick

**Status**: ✅ Complete

**Commit**: `feat(categorias): add allocation view rules for the editor`

---

### T2: Criar o indicador de progresso da alocação

**What**: Componente `AllocationProgress` com texto visível e barra neutra.
**Where**: `src/components/allocation-progress.tsx`
**Depends on**: None
**Reuses**: `src/components/ui/progress.tsx` (`indicatorClassName`)
**Requirement**: ESV-01, ESV-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Props `{ value: number; text: string }`; mostra `text` e uma barra com `role="progressbar"`, `aria-valuenow={value}` e `aria-label={text}`
- [x] Indicador usa `bg-muted-foreground` (sem cor de erro nem de ação)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `feat(categorias): add allocation progress indicator`

---

### T3: Criar o aviso de soma com ícone

**What**: Componente `SumWarning` com `AlertCircleIcon` e o texto de `sumWarning`.
**Where**: `src/components/sum-warning.tsx`
**Depends on**: None
**Reuses**: `sumWarning` de `src/lib/domain/sum-warning.ts`; padrão `text-sm text-destructive`
**Requirement**: ESV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Props `{ sumMicro: number; incomeCents: number | null }`; renderiza ícone `aria-hidden` seguido do texto exato de `sumWarning(sumMicro, incomeCents)`
- [x] Texto e ícone em `text-destructive`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `feat(categorias): add sum warning with icon`

---

### T4: Fazer o AdjustSumBar usar o aviso novo e poder omiti-lo

**What**: `AdjustSumBar` renderiza `SumWarning` no lugar do parágrafo e ganha a prop `showWarning` (padrão true).
**Where**: `src/components/adjust-sum-bar.tsx`
**Depends on**: T3
**Reuses**: `SumWarning`
**Requirement**: ESV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com `showWarning` omitido, o aviso aparece com ícone (comportamento atual + ícone)
- [x] Com `showWarning={false}`, só select, Rebalancear e erro de ajuste são renderizados
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `refactor(categorias): let the adjust bar omit the sum warning`

---

### T5: Dar card, prefixo R$ e texto de ajuda à receita base

**What**: `ReferenceIncomeCard` com card de largura total nos dois modos, `InputAffix prefix="R$"`, prop opcional `initialValue` e texto de ajuda.
**Where**: `src/components/reference-income-card.tsx`
**Depends on**: None
**Reuses**: `InputAffix`; classes do card do modo resumo
**Requirement**: ESV-07, ESV-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Modo campo: card `rounded-2xl border bg-card px-4 py-2 shadow-lg` sem `max-w-md`, `Input` em `max-w-xs` com prefixo `R$`; modo resumo sem `max-w-md`
- [x] Texto `Informe para ver os valores em R$.` quando o valor está vazio
- [x] Texto `Preenchido com a receita do mês; edite para simular.` quando `value === initialValue` e `initialValue !== ""`; nenhum texto quando o valor foi trocado
- [x] `initialValue` é opcional (padrão `""`); label "Receita Base Mensal" e `id="reference-income"` intactos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `feat(categorias): format the reference income field as money`

---

### T6: Deixar uma só frase de instrução na página

**What**: Remover o subtítulo `Alocação total obrigatória: 100% da receita`.
**Where**: `src/app/(app)/categorias/page.tsx`
**Depends on**: None
**Reuses**: Parágrafo de instrução existente
**Requirement**: ESV-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A página mostra só `Defina quanto da receita do mês vai para cada categoria. A soma deve ser 100%.` como instrução
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `fix(categorias): keep a single instruction line on the allocation page`

---

### T7: Mostrar o estado vazio e o Salvar condicional no editor

**What**: `CategoryEditor` chama `allocationView`; com 0 linhas mostra `EmptyAllocation` no lugar do card da tabela e do rodapé; Salvar só com `showSave`, com `title` e texto `sr-only` do `saveHint`.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T1
**Reuses**: `allocationView`; `Button` padrão (primário); classe do card da tabela
**Requirement**: ESV-01, ESV-02, ESV-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com 0 linhas: aparece o texto `Você ainda não tem categorias. Crie a primeira para começar a distribuir sua receita.` e o botão primário `Adicionar primeira categoria`; não há cabeçalhos, linha Soma, aviso, select, Rebalancear nem Salvar
- [x] O botão do estado vazio cria uma linha vazia e a tabela substitui o bloco; remover a última linha volta ao estado vazio
- [x] Com 1+ linhas e soma ≠ 100%, o Salvar fica desabilitado com `title="Some 100% para salvar"` e `aria-describedby` para um `span sr-only` com o mesmo texto; com soma 100% fica habilitado sem `title`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `feat(categorias): show an empty state when there are no categories`

---

### T8: Mostrar progresso, aviso e ajuste conforme a regra

**What**: Editor renderiza `AllocationProgress`, `SumWarning` (só com `showSumWarning`), `AdjustSumBar` com `showWarning={false}` (só com `showAdjust`) e ícone no erro de salvar.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T2, T3, T4, T7
**Reuses**: `AllocationProgress`, `SumWarning`, `AdjustSumBar`, `AlertCircleIcon`
**Requirement**: ESV-01, ESV-03, ESV-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Indicador visível com 0 ou mais linhas, com `progressText` e `progressValue` de `allocationView`
- [x] Aviso de soma só com 1+ linhas e soma ≠ 100%; select e Rebalancear só com 2+ linhas e soma ≠ 100%; nenhum erro de soma com 0 linhas
- [x] O `role="alert"` do erro de salvar tem `AlertCircleIcon aria-hidden` antes do texto
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `feat(categorias): show the sum warning and rebalance controls only when useful`

---

### T9: Reorganizar a tabela: cabeçalhos, Adicionar e Soma alinhada

**What**: Cabeçalhos `COR`, `AÇÕES` (mesma fonte) e `É INVESTIMENTO?`; botão `Adicionar categoria` dentro do card antes da Soma; linha Soma com as larguras `COL_PERCENT` e `COL_AMOUNT`.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T8
**Reuses**: `COL_PERCENT`, `COL_AMOUNT`, `sumLabel`, `formatBRL`
**Requirement**: ESV-05, ESV-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Primeira coluna do cabeçalho com `COR`; `AÇÕES` sem `text-[10px]` nem `tracking-normal`; coluna do marcador com `É INVESTIMENTO?`
- [x] Com 1+ linhas, `Adicionar categoria` (outline) fica dentro do card, abaixo da última linha e acima da Soma; o rodapé fora do card mantém só o Salvar
- [x] Linha Soma: espaçador `w-9`, `Soma` em `min-w-40 flex-1`, `sumLabel` em `COL_PERCENT`, total R$ (ou `—` sem receita válida) em `COL_AMOUNT`; `data-testid` `category-sum` e `category-amount-sum` mantidos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `feat(categorias): align the sum row and move add button into the table`

---

### T10: Ligar a receita inicial e alinhar as larguras dos blocos

**What**: Editor passa `initialValue={initialIncome}` ao card da receita e todos os blocos ficam `w-full` na mesma coluna.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T5, T9
**Reuses**: `ReferenceIncomeCard` (prop `initialValue`)
**Requirement**: ESV-07, ESV-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `ReferenceIncomeCard` recebe `initialValue={initialIncome}`
- [x] Card da receita, indicador, card da tabela (ou do estado vazio) e barra de ajuste têm a mesma borda esquerda e direita (verificado por `getBoundingClientRect` na verificação manual)
- [x] Ordem na tela: receita, indicador, tabela ou vazio, aviso, ajuste, status/erro, Salvar
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Status**: ✅ Complete

**Commit**: `feat(categorias): align allocation blocks and wire the initial income`

---

### T11: Ajustar os seletores do e2e existente

**What**: Trocar `Adicionar categoria` por regex que aceita `Adicionar primeira categoria` em `e2e/categories.spec.ts`.
**Where**: `e2e/categories.spec.ts`
**Depends on**: T10
**Reuses**: Helpers `addCategories`, `apply`, `adjustSelect`
**Requirement**: ESV-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Os seletores das linhas 12, 184, 284 e 295 usam `/Adicionar (primeira )?categoria/`
- [ ] Nenhum teste e2e novo (AD-005); specs de Rebalancear continuam com 3 categorias
- [ ] Gate check passes: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: quick

**Commit**: `test(categorias): accept the first-category button label in e2e selectors`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1
Phase 2:  T2
          T3 ------→ T4
          T5
          T6
Phase 3:  T7 ------→ T8 ------→ T9 ------→ T10
Phase 4:  T11
```

Execução estritamente sequencial; 11 tasks ficam num lote inline só se o usuário recusar sub-agentes (acima de ~8, o skill oferece lotes).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 função + teste | ✅ Granular |
| T2, T3 | 1 componente cada | ✅ Granular |
| T4, T5, T6 | 1 arquivo, 1 preocupação | ✅ Granular |
| T7-T10 | 1 arquivo, 1 preocupação cada (vazio / progresso e avisos / tabela / larguras) | ✅ Granular |
| T11 | 1 arquivo de spec | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | None | - | ✅ Match |
| T3 | None | - | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | None | - | ✅ Match |
| T6 | None | - | ✅ Match |
| T7 | T1 | T1 → T7 | ✅ Match |
| T8 | T2, T3, T4, T7 | T7 → T8, T2 → T8, T3 → T8, T4 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T5, T9 | T9 → T10, T5 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: regra de visibilidade | Domínio | unit | unit | ✅ OK |
| T2-T10: componentes, editor e página | UI / componentes | none | none | ✅ OK |
| T11: seletores e2e | e2e | none | none | ✅ OK |

**Cobertura de requisitos:** ESV-01 (T1, T2, T7, T8), ESV-02 (T7, T11), ESV-03 (T1, T3, T4, T8), ESV-04 (T1, T2, T8), ESV-05 (T1, T7, T9), ESV-06 (T9), ESV-07 (T5, T10), ESV-08 (T5, T6, T10). Todos os 8 mapeados. O AC de contraste (ESV-08/5) não gera task: o token já mede ≥ 6,7:1 e o Verifier registra a medição.
