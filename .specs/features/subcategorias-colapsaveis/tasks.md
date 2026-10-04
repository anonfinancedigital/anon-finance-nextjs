# Subcategorias Colapsáveis Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/subcategorias-colapsaveis/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso). Não há teste de componente no projeto. Strong defaults aplicados à lógica de domínio.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`) | none | - (sem teste de componente; e2e suspenso, AD-005) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Base

Regras puras e o card colapsável.

```
T1 → T2
```

### Phase 2: Tela de Categorias (P1)

Seta vinda da fase 1 marca dependência já concluída.

```
T2 → T3
```

### Phase 3: Formulário de lançamento (P2)

Os dois primeiros passos só ampliam tipos (aditivo); o último troca os selects. Setas vindas de fases anteriores marcam dependências já concluídas.

```
T3 → T4 → T5 → T6 → T7
T2 → T6
```

---

## Task Breakdown

### T1: Criar regras puras de rótulo e seleção

**What**: Funções `subcategoryCountLabel`, `categoryDisplayName`, `categoryInitial`, `addSubcategoryLabel` e `pickSelection` com testes.
**Where**: `src/lib/domain/category-label.ts`
**Depends on**: None
**Reuses**: Estilo dos módulos de `src/lib/domain/`
**Requirement**: SUBCOL-01, SUBCOL-02, SUBCOL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `subcategoryCountLabel(0)`, `(1)` e `(2)` retornam "0 subcategorias", "1 subcategoria" e "2 subcategorias"
- [x] `categoryDisplayName("  ")` retorna "Nova categoria"; nome com espaços nas pontas é aparado
- [x] `categoryInitial("lazer")` retorna "L"; nome vazio usa a inicial de "Nova categoria"
- [x] `addSubcategoryLabel("Lazer")` retorna "Nova subcategoria em Lazer" e, com nome vazio, "Nova subcategoria em Nova categoria"
- [x] `pickSelection("c1")` retorna `subcategoryId: ""`; `pickSelection("c1", "s1")` retorna os dois ids
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos passam e a contagem anterior não diminui

**Tests**: unit
**Gate**: quick
**Commit**: `feat(categories): add label and selection helpers for collapsible cards`

---

### T2: Criar o componente CategoryCard

**What**: Cabeçalho colapsável controlado, com quadrado colorido, nome, contagem, chevron e painel.
**Where**: `src/components/category-card.tsx`
**Depends on**: T1
**Reuses**: `colorVar`, padrão `aria-expanded`/`aria-controls` de `src/components/subcategory-editor.tsx`
**Requirement**: SUBCOL-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Props `id`, `name`, `color`, `count`, `open`, `onToggle`, `children`
- [x] Cabeçalho é `<button>` com `aria-expanded` e `aria-controls` igual ao `id` do painel
- [x] Chevron para baixo quando fechado e para cima quando aberto; texto da contagem vem de `subcategoryCountLabel`
- [x] `children` só renderizam com `open`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(ui): add collapsible category card`

---

### T3: Aplicar o card no editor de subcategorias

**What**: Trocar o link "Subcategorias (N)" por `CategoryCard`, com marcadores, "Nova subcategoria em …" com foco no novo campo, limite de 30 e abertura por erro; `CategoryEditor` passa nome e cor.
**Where**: `src/components/subcategory-editor.tsx`
**Depends on**: T2
**Reuses**: `CategoryCard`, `MAX_SUBCATEGORIES`, chaves de erro `"<i>.subcategories[.<j>.name]"`
**Requirement**: SUBCOL-01, SUBCOL-02, SUBCOL-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Props novas `name` e `color`; a única chamada em `src/components/category-editor.tsx` passa `row.name` e `row.color`
- [x] Categorias começam fechadas e abrem e fecham de forma independente; o texto digitado sobrevive a fechar e reabrir
- [x] Cada item mostra marcador `colorVar(color)`, campo de nome e botão "Remover", com os `aria-label` atuais
- [x] Última linha "Nova subcategoria em <nome>" com `PlusIcon` acrescenta um item vazio e foca seu campo
- [x] Linha de adição fica `disabled` com 30 itens
- [x] Erro de lista ou de nome abre a categoria fechada e mostra a mensagem
- [x] `TableRow` com `colSpan={5}` preservado em `category-editor.tsx`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Verificação manual em /categorias: abrir "Lazer", adicionar, salvar, recarregar (pendente: sem e2e, AD-005)

**Tests**: none
**Gate**: build
**Commit**: `feat(categories): show subcategories in collapsible cards`

---

### T4: Aceitar cor das categorias no botão de nova transação

**What**: Ampliar o tipo de `categories` com `color: number` (a página já envia a categoria completa).
**Where**: `src/components/new-transaction-button.tsx`
**Depends on**: T3
**Reuses**: Tipo `Category` de `src/lib/domain/budget.ts`
**Requirement**: SUBCOL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Tipo de `categories` inclui `color: number`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `refactor(ui): accept category color in new transaction button`

---

### T5: Aceitar cor das categorias na lista de transações

**What**: Ampliar o tipo de `categories` com `color: number` para repassar ao formulário de edição.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T4
**Reuses**: Mesmo tipo da T4
**Requirement**: SUBCOL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Tipo de `categories` (linha ~23) inclui `color: number`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `refactor(ui): accept category color in transaction list`

---

### T6: Criar o CategoryPicker

**What**: Seletor de categoria e subcategoria com `CategoryCard` e radios nativos.
**Where**: `src/components/category-picker.tsx`
**Depends on**: T2, T5
**Reuses**: `CategoryCard`, `pickSelection`, `colorVar`
**Requirement**: SUBCOL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Props `categories`, `categoryId`, `subcategoryId`, `invalid`, `onChange({ categoryId, subcategoryId })`
- [ ] Container `role="radiogroup"` rotulado "Categoria"
- [ ] Categoria com subcategorias vira card; a categoria atual começa aberta; dentro há "Sem subcategoria" e uma opção por subcategoria
- [ ] Categoria sem subcategorias é uma linha selecionável direta, sem chevron
- [ ] Escolher uma opção chama `onChange` com o resultado de `pickSelection`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(ui): add grouped category and subcategory picker`

---

### T7: Usar o CategoryPicker no formulário de lançamento

**What**: Substituir os dois `<select>` de categoria e subcategoria pelo `CategoryPicker`, mantendo erros e ramo de ganho.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T6
**Reuses**: `CategoryPicker`, `fieldErrors.categoryId` e `fieldErrors.subcategoryId`
**Requirement**: SUBCOL-04, SUBCOL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Tipo de `categories` inclui `color: number`
- [ ] O picker atualiza `categoryId` e `subcategoryId` juntos em `values`
- [ ] Erros de categoria e subcategoria aparecem abaixo do picker
- [ ] Ganho continua sem seletor de categoria; ramo `needsCategories` inalterado
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Verificação manual: lançar "Lazer › Cinema", ver na lista; editar a transação e ver a categoria atual aberta e marcada

**Tests**: none
**Gate**: build
**Commit**: `feat(transactions): pick category and subcategory in grouped list`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2
Phase 2:  T3
Phase 3:  T4 ------→ T5 ------→ T6 ------→ T7
```

Execução estritamente sequencial. Total de 7 tarefas: cabe em um único lote, sem sub-agentes de implementação (o Verificador roda ao final).

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início da cadeia | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 (fase anterior) | início da fase | ✅ Match |
| T4 | T3 (fase anterior) | início da cadeia | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T2 (fase anterior), T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | UI | none | none | ✅ OK |
| T3 | UI | none | none | ✅ OK |
| T4 | UI | none | none | ✅ OK |
| T5 | UI | none | none | ✅ OK |
| T6 | UI | none | none | ✅ OK |
| T7 | UI | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| SUBCOL-01 | T1, T2, T3 |
| SUBCOL-02 | T1, T3 |
| SUBCOL-03 | T3 |
| SUBCOL-04 | T1, T4, T5, T6, T7 |
| SUBCOL-05 | T7 |
