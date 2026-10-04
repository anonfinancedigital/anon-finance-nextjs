# Simulação de Valor e Cor por Categoria Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/simulacao-categorias/spec.md`
**Design**: inline (sem `design.md`) - segue as camadas e padrões de `orcamento-domestico`
**Status**: Approved

---

## Test Coverage Matrix

> Inferido do código e de `.specs/features/orcamento-domestico/tasks.md`. Guidelines found: `AGENTS.md`, `package.json` (scripts), `vitest` projects `unit`/`integration`, `e2e/*.spec.ts` (Playwright). Confirmar antes do Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Todo campo: válido, cada regra de rejeição e mensagem | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Schema + migração + repositórios (`src/lib/db/**`) | integration | Constraint nova, backfill, leitura/escrita do campo novo, escopo por `userId` | `src/lib/db/**/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso + cada erro de validação novo + nada persistido em erro | `src/actions/*.int.test.ts` | `npm run test:int` |
| UI (`src/components/*`, `src/app/*`) | e2e | Todo AC visível da task: caminho feliz + edge cases + erros visíveis | `e2e/*.spec.ts` | `npm run e2e` |

## Gate Check Commands

> Integração e e2e exigem `npm run db:up`. Usar Node 20 (nvm) no PATH.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI (e2e) e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int && npm run e2e` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Simulação de valor (P1)

```
T1 → T2
```

### Phase 2: Cor - dados e edição (P2)

```
T3 → T4 → T5 → T6 → T7
```

### Phase 3: Cor - exibição (P2)

```
T8 → T9 → T10
```

---

## Task Breakdown

### T1: Função de alocação `allocateCents`

**What**: Extrair `allocateCents(incomeCents, percentBp) = round(incomeCents × percentBp / 10000)` em `budget.ts` e fazer `buildMonthlySummary` usá-la.
**Where**: `src/lib/domain/budget.ts`
**Depends on**: None
**Reuses**: fórmula atual de `targetCents` em `buildMonthlySummary`
**Requirement**: SIM-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `allocateCents(500000, 750) === 37500` e os 6 valores do Independent Test da P1 (receita 5.000,00) testados
- [x] Arredondamento testado em caso com fração de centavo (ex.: 100001 × 3333)
- [x] `buildMonthlySummary` usa a função; testes existentes de `budget.test.ts` continuam passando sem alteração
- [x] Gate quick passa; nenhum teste removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(budget): extract category allocation function`

---

### T2: Receita de referência e coluna "Valor (R$)" no editor

**What**: Adicionar ao `CategoryEditor` o campo "Receita de referência (R$)" (vazio, só estado local, validado com `parseBRL`), a coluna "Valor (R$)" por linha via `allocateCents` + `formatBRL`, "—" para receita vazia/inválida ou percentual vazio/inválido, e a soma em R$ no rodapé; o payload de `saveCategories` não muda e o campo mantém o valor após salvar.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T1
**Reuses**: `parseBRL`, `formatBRL` (`src/lib/domain/money.ts`), `parsePercent`
**Requirement**: SIM-01, SIM-02, SIM-03, SIM-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e em `e2e/categories.spec.ts`: categorias 30/30/25/7,5/2,5/5 + receita 5000 → R$ 1.500,00, 1.500,00, 1.250,00, 375,00, 125,00, 250,00 e soma R$ 5.000,00 (AC 1-3, 5)
- [x] e2e: trocar 7,5 por 10 → R$ 500,00 e soma R$ 5.125,00 sem salvar (AC 4, edge soma ≠ 100%)
- [x] e2e: campo vazio → "—" em todas as células e no rodapé (AC 6)
- [x] e2e: receita "abc" e "0" → mensagem do `parseBRL` abaixo do campo e "—" nas células (AC 7)
- [x] e2e: nova linha sem percentual → "—" nessa linha; remover linha recalcula a soma (AC 8, edge cases)
- [x] e2e: salvar com sucesso mantém a receita no campo e recarregar a página o deixa vazio (AC 9, 10)
- [x] Gate build passa; nenhum teste removido

**Tests**: e2e
**Gate**: build

**Commit**: `feat(categories): preview category amounts from a reference income`

---

### T3: Paleta de cores de categoria

**What**: Criar o módulo da paleta: `CATEGORY_COLORS` (índices 1-8 com nomes Azul, Laranja, Verde, Amarelo, Rosa, Verde-escuro, Roxo, Vermelho), `colorVar(n)` → `var(--viz-n)`, `isCategoryColor(value)` e `nextFreeColor(used)` (primeira não usada, senão 1).
**Where**: `src/lib/domain/color.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: tokens `--viz-1` … `--viz-8` de `src/app/globals.css`
**Requirement**: COR-01, COR-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Testes em `src/lib/domain/color.test.ts`: 8 cores com os nomes da spec; `colorVar(7) === "var(--viz-7)"`
- [x] `isCategoryColor` aceita 1 e 8, rejeita 0, 9, 1.5, "1", null
- [x] `nextFreeColor([])=1`, `([1,2])=3`, `([2])=1`, todas 1-8 usadas → 1
- [x] Gate quick passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(budget): add category color palette`

---

### T4: Coluna `color`, migração com backfill e repositório

**What**: Adicionar `color` (integer NOT NULL, CHECK 1-8) a `category`, gerar a migração `0002` que cria a coluna, preenche as categorias existentes com ((posição por `created_at`, `id` dentro do usuário) − 1) mod 8 + 1 e só então aplica NOT NULL e CHECK; incluir `color` no tipo `Category` e em `list`/`replaceSet` do repositório.
**Where**: `src/lib/db/schema.ts` (+ migração gerada, tipo `Category` e `categoriesRepo`, que não compilam separados da coluna NOT NULL)
**Depends on**: T3
**Reuses**: padrão de `check(...)` existente em `category`; `npm run db:generate`; `columns`/`CategoryItem` do repo
**Requirement**: COR-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `schema.int.test.ts`: color 0 e 9 → CHECK_VIOLATION; color nulo → NOT NULL violation; 1 e 8 aceitos
- [ ] Teste de integração do backfill: executa o UPDATE da migração sobre 9 categorias de um usuário e 2 de outro → cores 1..8,1 e 1,2 (AC 5)
- [ ] `categories.int.test.ts` (repo): `replaceSet` cria e atualiza com cor; `list` devolve a cor salva; cor de outro usuário não vaza
- [ ] `npm run db:migrate` aplica do zero sem erro
- [ ] Testes existentes ajustados só para incluir `color` nas entradas; nenhum removido
- [ ] Gate full passa

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add category color column with backfill`

---

### T5: Validação da cor no schema do conjunto de categorias

**What**: Adicionar `color` ao item de `categorySetSchema`, aceitando apenas inteiro 1-8 via `isCategoryColor`, com mensagem "Cor inválida" no caminho `[index, "color"]`.
**Where**: `src/lib/validation/category.ts`
**Depends on**: T4
**Reuses**: `isCategoryColor` (T3)
**Requirement**: COR-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `category.test.ts`: cor 1-8 válida; 0, 9, 2.5, "3", ausente → "Cor inválida" no caminho da linha (AC 4)
- [ ] Testes existentes continuam passando (entradas ajustadas para incluir `color`)
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(categories): validate category color`

---

### T6: Action `saveCategories` com cor

**What**: Garantir que `saveCategories` repassa `color` por item ao repositório e cobrir o comportamento com testes de integração.
**Where**: `src/actions/categories.ts`
**Depends on**: T5
**Reuses**: fluxo atual da action
**Requirement**: COR-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `categories.int.test.ts` (actions): salvar com cores persiste os índices (AC 2)
- [ ] Uma linha com cor 9 → `fieldErrors["1.color"] = "Cor inválida"` e nenhuma categoria alterada no banco (AC 4)
- [ ] Testes existentes continuam passando
- [ ] Gate full passa

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): save category color through the action`

---

### T7: Seletor de cor no editor de categorias

**What**: Adicionar a cada linha do `CategoryEditor` um seletor (radiogroup) com as 8 cores e nomes acessíveis, inicializado pela cor salva, com `nextFreeColor` para linhas novas, enviando `color` no salvamento e exibindo o erro de campo de cor. Fecha a Fase 2: a partir de T5 o salvamento exige `color`, e esta task volta a deixar a tela salvando.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T6
**Reuses**: `CATEGORY_COLORS`, `colorVar`, `nextFreeColor` (T3)
**Requirement**: COR-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e: cada linha mostra 8 opções acessíveis por nome (AC 1)
- [ ] e2e: trocar "Metas" para Roxo, salvar, recarregar → Roxo selecionado (AC 2)
- [ ] e2e: com cores 1 e 2 em uso, "Adicionar categoria" pré-seleciona Verde (3) (AC 3)
- [ ] e2e: duas categorias com a mesma cor salvam normalmente (edge case)
- [ ] Testes e2e existentes de categorias e da simulação (T2) continuam passando
- [ ] Gate build passa

**Tests**: e2e
**Gate**: build

**Commit**: `feat(categories): pick a color for each category`

---

### T8: Pizza com a cor da categoria

**What**: Fazer `SpendingShare` usar `colorVar(category.color)` em cada fatia e na legenda, removendo o agrupamento "Outras".
**Where**: `src/components/budget-charts.tsx`
**Depends on**: None (fase anterior concluída)
**Reuses**: `Swatch`, `colorVar`
**Requirement**: COR-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e em `e2e/charts.spec.ts`: categoria com cor Roxo → fatia e marcador da legenda com `var(--viz-7)` (AC 6, 9)
- [ ] e2e: 9 categorias com gasto → 9 fatias, nenhuma "Outras" (edge case)
- [ ] Testes e2e existentes de gráficos continuam passando (ajustados só onde dependiam de "Outras")
- [ ] Gate build passa

**Tests**: e2e
**Gate**: build

**Commit**: `feat(summary): color pie slices by category color`

---

### T9: Marcador de cor na tabela de resumo

**What**: Mostrar um marcador com `colorVar(row.color)` ao lado do nome de cada categoria na tabela de resumo do mês.
**Where**: `src/components/summary-table.tsx`
**Depends on**: T8
**Reuses**: estilo do `Swatch` de `budget-charts.tsx`
**Requirement**: COR-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e em `e2e/summary.spec.ts`: linha de "Metas" com marcador de cor `var(--viz-7)` após escolher Roxo (AC 7, 9)
- [ ] Testes e2e existentes de resumo continuam passando
- [ ] Gate build passa

**Tests**: e2e
**Gate**: build

**Commit**: `feat(summary): show category color in the summary table`

---

### T10: Marcador de cor na lista de transações

**What**: Mostrar um marcador com a cor da categoria ao lado do nome da categoria de cada gasto na lista de transações.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T9
**Reuses**: mapa `categoryName` existente (estendido para cor), estilo do `Swatch`
**Requirement**: COR-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] e2e em `e2e/transaction-list.spec.ts`: gasto de "Metas" mostra marcador `var(--viz-7)`; ganho não mostra marcador (AC 8, 9)
- [ ] Testes e2e existentes da lista continuam passando
- [ ] Gate build passa

**Tests**: e2e
**Gate**: build

**Commit**: `feat(transactions): show category color in the transaction list`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2
Phase 2:  T3 → T4 → T5 → T6 → T7
Phase 3:  T8 → T9 → T10
```

Batches (~7 tasks, whole phases): **Batch A** = Phases 1 + 2 (T1-T7), **Batch B** = Phase 3 (T8-T10).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: `allocateCents` | 1 função | ✅ Granular |
| T2: simulação no editor | 1 componente (campo + coluna + rodapé, coesos) | ✅ Granular |
| T3: paleta | 1 módulo pequeno | ✅ Granular |
| T4: coluna + migração + repo | 1 campo novo de ponta a ponta na camada de dados; não compila separado | ⚠️ Coeso (2-3 arquivos ligados pelo tipo) |
| T5: validação da cor | 1 campo | ✅ Granular |
| T6: action com cor | 1 action | ✅ Granular |
| T7: seletor de cor | 1 componente | ✅ Granular |
| T8: pizza | 1 componente | ✅ Granular |
| T9: resumo | 1 componente | ✅ Granular |
| T10: lista | 1 componente | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início da Fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None (fase anterior) | início da Fase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | None (fase anterior) | início da Fase 3 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | UI | e2e | e2e | ✅ OK |
| T3 | Domínio | unit | unit | ✅ OK |
| T4 | Schema + migração + repositório | integration | integration | ✅ OK |
| T5 | Validação | unit | unit | ✅ OK |
| T6 | Server Action | integration | integration | ✅ OK |
| T7 | UI | e2e | e2e | ✅ OK |
| T8 | UI | e2e | e2e | ✅ OK |
| T9 | UI | e2e | e2e | ✅ OK |
| T10 | UI | e2e | e2e | ✅ OK |
