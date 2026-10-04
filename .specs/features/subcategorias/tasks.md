# Subcategorias Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Precondição:** a feature `simulacao-categorias` precisa estar concluída e commitada antes do T1, porque mexe nos mesmos arquivos e cria a migração 0002 (ver Risks em `design.md`).

---

**Design**: `.specs/features/subcategorias/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (sem regra de testes; só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), e2e (Playwright) suspenso por decisão do usuário (AD-005). Sem guideline de cobertura: strong defaults aplicados, sem ficar abaixo do padrão de `.specs/features/orcamento-domestico/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Todo campo novo: válido, cada regra de rejeição e mensagem | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) + constraints do schema | integration | Caminhos de consulta principais, escopo por `userId`, constraints do banco e caminhos de erro | `src/lib/db/**/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Toda entrada nova: sucesso + cada erro de validação/propriedade + `revalidatePath` | `src/actions/*.int.test.ts` | `npm run test:int` |
| UI / páginas (`src/app/*`, `src/components/*`) | none | - (e2e suspenso, AD-005) | - | build gate only |
| Migração SQL gerada | none | - (coberta pelos testes de constraint do schema) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também. Toda mudança de tipo ou contrato é aditiva, para o `typecheck` passar ao fim de cada tarefa.

### Phase 1: Dados e regras do conjunto

Banco, regra de nome e repositórios.

```
T1 → T3 → T4
T2 → T4
T1 → T5
```

### Phase 2: Domínio do resumo, validação e actions

Funções puras e entradas validadas, ainda sem UI. Setas vindas da fase 1 marcam dependências já concluídas.

```
T3 → T6
T5 → T6
T3 → T7
T2 → T8 → T10
T4 → T10
T9 → T11
T3 → T11
T5 → T11
```

### Phase 3: UI

Telas e fluxos de UI. Setas vindas da fase 2 marcam dependências já concluídas.

```
T10 → T12
T11 → T13
T6 → T14
T15 → T16 → T17
```

---

## Task Breakdown

### T1: Schema `subcategory` + `transaction.subcategory_id` e migração 0003

**What**: Tabela `subcategory` e coluna `transaction.subcategory_id` com FK composta e CHECK, conforme Data Models do design; migração gerada por `npm run db:generate` (`drizzle/0003_*.sql`).
**Where**: `src/lib/db/schema.ts`
**Depends on**: None
**Reuses**: convenções de `category` (`defaultRandom`, `clock_timestamp()`, `uniqueIndex` com `lower(name)`)
**Requirement**: SUB-01, SUB-03, SUB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Migração 0003 aplica limpa sobre a 0002 e não altera dados existentes (gastos antigos ficam com `subcategory_id NULL`)
- [x] `schema.int.test.ts`: nome repetido na mesma categoria (diferindo maiúsculas) é rejeitado; mesmo nome em categorias diferentes é aceito
- [x] `schema.int.test.ts`: gasto com subcategoria de outra categoria é rejeitado pela FK composta
- [x] `schema.int.test.ts`: ganho (category_id NULL) com `subcategory_id` é rejeitado pelo CHECK
- [x] `schema.int.test.ts`: excluir subcategoria com gasto é rejeitado (restrict); excluir categoria sem gastos remove as subcategorias (cascade)
- [x] Gate full passa; ≥ 6 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add subcategory table and transaction subcategory link`

---

### T2: Regras de subcategoria em `validateCategorySet`

**What**: `validateCategorySet` aceita `subcategories?: { name }[]` por item e valida nome 1–40 (após trim), único por categoria sem diferenciar maiúsculas e no máximo 30 por categoria; erros em `"<i>.subcategories.<j>.name"` e `"<i>.subcategories"`.
**Where**: `src/lib/domain/budget.ts`
**Depends on**: None
**Reuses**: `MAX_CATEGORY_NAME`, laço de nomes atual, `fieldErrors`
**Requirement**: SUB-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nome vazio, só espaços e com 41 caracteres → mensagem no campo; 40 caracteres aceito
- [x] "Restaurante" + "restaurante" na mesma categoria → "Já existe uma subcategoria com esse nome nesta categoria"
- [x] Mesmo nome em categorias diferentes → ok
- [x] 30 subcategorias aceitas; 31 → "Máximo de 30 subcategorias por categoria" em `"<i>.subcategories"`
- [x] Soma 100% continua independente das subcategorias (SUB-01 AC 10); itens sem `subcategories` continuam válidos
- [x] Gate quick passa; ≥ 8 testes novos em `budget.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(budget): validate subcategory names and limit per category`

---

### T3: `categoriesRepo.list` com subcategorias

**What**: `Category` ganha `subcategories: Subcategory[]` e `list` devolve as subcategorias de cada categoria em ordem de criação (2 queries agrupadas em JS); fixtures existentes que montam `Category` passam a incluir `subcategories: []`.
**Where**: `src/lib/db/repos/categories.ts`
**Depends on**: T1
**Reuses**: `list` atual, ordenação por `createdAt, id`
**Requirement**: SUB-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Tipos `Subcategory` e `Category.subcategories` exportados de `src/lib/domain/budget.ts`
- [x] `list` devolve subcategorias na ordem de criação e só as do usuário (outro usuário com subcategorias não vaza)
- [x] Categoria sem subcategorias vem com `[]`
- [x] Gate full passa; ≥ 3 testes novos em `categories.int.test.ts`; nenhum teste existente removido

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): list categories with their subcategories`

---

### T4: `categoriesRepo.replaceSet` grava subcategorias

**What**: `CategoryItem` ganha `subcategories: { id?, name }[]`; `replaceSet` cria, renomeia e exclui subcategorias na mesma transação, seguindo o fluxo de 6 passos do design.
**Where**: `src/lib/db/repos/categories.ts`
**Depends on**: T3, T2
**Reuses**: estrutura atual de `replaceSet`, `expensesMessage`
**Requirement**: SUB-01, SUB-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Criar categoria nova com subcategorias no mesmo salvamento persiste tudo
- [x] Renomear mantém o id e os gastos vinculados (SUB-01 AC 2)
- [x] Excluir subcategoria sem gastos remove; com gastos → "Esta subcategoria tem N gasto(s) e não pode ser excluída" e **nada** do conjunto muda (rollback)
- [x] Excluir categoria sem gastos remove as subcategorias (SUB-03 AC 9); categoria com gastos mantém a mensagem atual de categoria
- [x] Id de subcategoria de outra categoria ou de outro usuário → "Subcategoria não encontrada"
- [x] Remover "Restaurante" e criar "restaurante" no mesmo salvamento é aceito (edge case); trocar só maiúsculas é aceito
- [x] Gate full passa; ≥ 8 testes novos em `categories.int.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): save subcategories within the category set`

---

### T5: `transactionsRepo` com `subcategoryId` e totais por subcategoria

**What**: `TransactionData`/`columns` ganham `subcategoryId`; `monthTotals` agrupa por `kind, category_id, subcategory_id` e devolve `spentBySubcategory: Map<categoryId, Map<subcategoryId | null, cents>>` **além** do `spentByCategory` atual (aditivo).
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T1
**Reuses**: `fields`, `inMonth`, `monthTotals`
**Requirement**: SUB-04, SUB-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `create`/`update` gravam e limpam (`null`) `subcategoryId`; `listByMonth` o devolve
- [x] `monthTotals`: gastos com e sem subcategoria na mesma categoria aparecem em chaves separadas (`id` e `null`); `spentByCategory` continua igual à soma delas
- [x] Gastos de outro mês e de outro usuário não entram
- [x] Gate full passa; ≥ 4 testes novos em `transactions.int.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): store subcategory and total spending per subcategory`

---

### T6: `buildMonthlySummary` com detalhamento por subcategoria

**What**: `shareBp(part, total)` e `breakdown: SubcategorySpend[]` em cada `CategorySummary`, a partir de `spentBySubcategory` (entrada opcional; sem ela, `breakdown` vazio).
**Where**: `src/lib/domain/budget.ts`
**Depends on**: T3, T5
**Reuses**: `buildMonthlySummary`, `TOTAL_BP`
**Requirement**: SUB-06, SUB-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Exemplo do Independent Test: Restaurante 30000 (6000 bp), Streaming 10000 (2000 bp), Sem subcategoria 10000 (2000 bp), soma 50000
- [x] Só linhas com gasto > 0; ordem decrescente de gasto; empate por ordem de criação e "Sem subcategoria" por último
- [x] Soma do `breakdown` === `spentCents` da categoria (SUB-07 AC 5), inclusive com arredondamento de participação
- [x] Participação que arredonda para 0 com gasto > 0 gera linha com `shareBp` 0 (edge case)
- [x] Meta, restante, estouro e `consumedPct` não mudam (SUB-07 AC 7): testes atuais de `buildMonthlySummary` passam sem alteração
- [x] Gate quick passa; ≥ 7 testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(budget): break category spending down by subcategory`

---

### T7: Filtro de transações (`parseTransactionFilter`, `filterTransactions`)

**What**: Funções puras do filtro da lista, conforme o design.
**Where**: `src/lib/domain/transaction-filter.ts`
**Depends on**: T3
**Reuses**: estilo de `parseMonth`
**Requirement**: SUB-09, SUB-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem parâmetros → "Todas" (lista completa, com ganhos)
- [x] Categoria → só gastos dela, sem ganhos (SUB-09 AC 3)
- [x] Subcategoria → só gastos dela (AC 4); `"nenhuma"` → só gastos da categoria sem subcategoria (AC 5)
- [x] Categoria ou subcategoria inexistente → ignorado como "Todas" (SUB-10 AC 9); subcategoria de outra categoria ou sem categoria → ignorada
- [x] Gate quick passa; ≥ 8 testes em `transaction-filter.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(transactions): add month list filter by category and subcategory`

---

### T8: `categorySetSchema` com subcategorias

**What**: Item do conjunto aceita `subcategories: { id?: uuid; name: string(trim) }[]` (padrão `[]`) e repassa as regras de T2 como issues com path aninhado.
**Where**: `src/lib/validation/category.ts`
**Depends on**: T2
**Reuses**: `superRefine` atual, `invalidInput`
**Requirement**: SUB-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nome inválido gera issue em `[i, "subcategories", j, "name"]`; limite em `[i, "subcategories"]`
- [x] Id de subcategoria que não é uuid → "Identificador inválido"
- [x] Payload sem `subcategories` continua válido (compatível com o editor atual)
- [x] Gate quick passa; ≥ 4 testes novos em `category.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(categories): accept subcategories in the category set input`

---

### T9: `transactionSchema` com `subcategoryId`

**What**: Gasto aceita `subcategoryId` uuid opcional ("" vira ausente); ganho com `subcategoryId` é rejeitado com "Ganho não tem subcategoria".
**Where**: `src/lib/validation/transaction.ts`
**Depends on**: None
**Reuses**: padrão de `categoryId` no ramo `income`
**Requirement**: SUB-04, SUB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gasto com uuid, sem campo e com "" passam (os dois últimos sem subcategoria)
- [x] Gasto com id que não é uuid → mensagem de validação
- [x] Ganho com `subcategoryId` → "Ganho não tem subcategoria" (SUB-05 AC 8)
- [x] Gate quick passa; ≥ 5 testes novos em `transaction.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(transactions): accept optional subcategory on expenses`

---

### T10: `saveCategories` salva subcategorias

**What**: A action repassa as subcategorias validadas ao `replaceSet` e devolve os erros aninhados e de bloqueio.
**Where**: `src/actions/categories.ts`
**Depends on**: T8, T4
**Reuses**: fluxo atual de `saveCategories`
**Requirement**: SUB-01, SUB-02, SUB-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Salvamento com subcategorias persiste e chama `revalidatePath("/")`
- [x] Nome repetido na categoria → `fieldErrors["0.subcategories.1.name"]`
- [x] Excluir subcategoria com gastos → erro com a contagem; nada persiste
- [x] Falha de banco → `SAVE_FAILED`
- [x] Gate full passa; ≥ 4 testes novos em `categories.int.test.ts` (actions)

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): save subcategories from the categories action`

---

### T11: Actions de transação conferem a subcategoria

**What**: `isOwnCategory` vira `checkOwnership`, que rejeita subcategoria inexistente ou de outra categoria com "Subcategoria não pertence à categoria" em `fieldErrors.subcategoryId`; create/update gravam `subcategoryId`.
**Where**: `src/actions/transactions.ts`
**Depends on**: T9, T5, T3
**Reuses**: `categoryNotFound`, `categoriesRepo.list`
**Requirement**: SUB-04, SUB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Criar gasto com subcategoria da categoria → persiste (SUB-04 AC 2); sem subcategoria → `null` (AC 3)
- [x] Subcategoria de outra categoria, inexistente ou de outro usuário → mensagem no campo; nada persiste (SUB-05 AC 4)
- [x] Editar trocando a subcategoria → atualizado (SUB-05 AC 6)
- [x] Gate full passa; ≥ 5 testes novos em `transactions.int.test.ts` (actions)

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): reject subcategories outside the expense category`

---

### T12: `SubcategoryEditor` na tela de Categorias

**What**: Componente que edita as subcategorias de uma categoria (adicionar, renomear, remover, erros por campo, "Adicionar subcategoria" desabilitado em 30), montado sob cada linha do `CategoryEditor`, que passa a guardar e enviar `subcategories` por linha.
**Where**: `src/components/subcategory-editor.tsx`
**Depends on**: T10
**Reuses**: `Input`, `Button`, `aria-label` numerado e `fieldErrors` do `category-editor.tsx`
**Requirement**: SUB-01, SUB-02, SUB-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): edit subcategories on the categories page`

---

### T13: Seletor de subcategoria no `TransactionForm`

**What**: Select de subcategoria dependente da categoria ("Sem subcategoria" + subcategorias dela), limpo ao trocar de categoria e desabilitado quando ela não tem subcategorias; o formulário de edição carrega a subcategoria atual.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T11
**Reuses**: `selectClass`, padrão do select de categoria
**Requirement**: SUB-04, SUB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): pick an optional subcategory in the expense form`

---

### T14: Detalhamento expansível na `SummaryTable`

**What**: `SummaryTable` vira client component com botão `aria-expanded` por categoria (só quando há gasto com subcategoria) e linhas `summary-subrow` com nome, R$ e participação com 1 casa; a página passa `spentBySubcategory` ao `buildMonthlySummary`.
**Where**: `src/components/summary-table.tsx`
**Depends on**: T6
**Reuses**: `Table*`, `formatBRL`
**Requirement**: SUB-06, SUB-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(summary): expand categories into subcategory spending`

---

### T15: Rótulo "Categoria › Subcategoria" na `TransactionList`

**What**: A lista mostra "Categoria › Subcategoria" ou só a categoria, e repassa a subcategoria ao formulário de edição.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: None (fase anterior concluída)
**Reuses**: mapa `categoryName` atual
**Requirement**: SUB-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): show the subcategory next to the category in the list`

---

### T16: `TransactionFilter` na lista do mês

**What**: Componente com os dois selects do filtro (URL `categoria`/`subcategoria`, preservando `mes`), ligado à página `/` com `parseTransactionFilter` + `filterTransactions` e a mensagem "Nenhum gasto encontrado para este filtro".
**Where**: `src/components/transaction-filter.tsx`
**Depends on**: T15
**Reuses**: `selectClass`, `useRouter`/`useSearchParams` como no `MonthPicker`
**Requirement**: SUB-09, SUB-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): filter the month list by category and subcategory`

---

### T17: `MonthPicker` preserva o filtro

**What**: Links de mês anterior/próximo e o `<input type="month">` trocam só `mes` e mantêm os demais parâmetros da URL.
**Where**: `src/components/month-picker.tsx`
**Depends on**: T16
**Reuses**: `href`/`param` atuais
**Requirement**: SUB-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `fix(ui): keep list filters when changing the month`

---

## Pre-Approval Validation

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | None | início da fase 1 | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T3, T2 | T3 → T4, T2 → T4 | ✅ Match |
| T5 | T1 | T1 → T5 | ✅ Match |
| T6 | T3, T5 | T3 → T6, T5 → T6 | ✅ Match |
| T7 | T3 | T3 → T7 | ✅ Match |
| T8 | T2 | T2 → T8 | ✅ Match |
| T9 | None | início de T9 → T11 | ✅ Match |
| T10 | T8, T4 | T8 → T10, T4 → T10 | ✅ Match |
| T11 | T9, T5, T3 | T9 → T11, T5 → T11, T3 → T11 | ✅ Match |
| T12 | T10 | T10 → T12 | ✅ Match |
| T13 | T11 | T11 → T13 | ✅ Match |
| T14 | T6 | T6 → T14 | ✅ Match |
| T15 | None (fase anterior) | início da cadeia T15 → T16 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |

Nenhuma dependência aponta para uma fase posterior.

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Schema + constraints | integration | integration | ✅ OK |
| T2 | Domínio | unit | unit | ✅ OK |
| T3 | Repositório (+ tipo de domínio) | integration | integration | ✅ OK |
| T4 | Repositório | integration | integration | ✅ OK |
| T5 | Repositório | integration | integration | ✅ OK |
| T6 | Domínio | unit | unit | ✅ OK |
| T7 | Domínio | unit | unit | ✅ OK |
| T8 | Validação | unit | unit | ✅ OK |
| T9 | Validação | unit | unit | ✅ OK |
| T10 | Server Action | integration | integration | ✅ OK |
| T11 | Server Action | integration | integration | ✅ OK |
| T12 | UI | none | none | ✅ OK |
| T13 | UI | none | none | ✅ OK |
| T14 | UI + página | none | none | ✅ OK |
| T15 | UI | none | none | ✅ OK |
| T16 | UI + página | none | none | ✅ OK |
| T17 | UI | none | none | ✅ OK |
