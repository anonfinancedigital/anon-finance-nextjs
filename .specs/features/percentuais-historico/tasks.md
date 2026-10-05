# Percentuais de Categoria com Histórico por Mês Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/percentuais-historico/design.md`
**Status**: Draft

Antes de qualquer comando: `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`. A árvore tem alterações não commitadas de outras features (design system, receita de referência): cada commit desta feature adiciona só os arquivos da própria task (`git add <arquivos>`, nunca `-A`).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (só avisa para ler os docs do Next antes de código Next), `.specs/STATE.md` AD-005 (e2e suspenso), `vitest.config.ts` (projetos `unit` e `integration`, sem threshold de cobertura).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain (`src/lib/domain`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Repository (`src/lib/db/repos`) | integration | Caminhos principais + erro/rollback; ACs de persistência e leitura por mês | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Schema / migração (`src/lib/db/schema.ts`, `drizzle/`) | integration | Constraints novas e backfill dos dados existentes | `src/lib/db/*.int.test.ts` | `npm run test:int` |
| Server Action (`src/actions`) | integration | Ajustes só se o comportamento mudar; testes existentes continuam verdes | `src/actions/*.int.test.ts` | `npm run test:int` |
| Páginas e componentes (UI) | none | Gate de build apenas; e2e suspenso (AD-005) | - | build gate |
| Utilitário de teste (`src/test`) | none | Coberto pelos testes que o usam | - | gate do teste que o usa |

## Gate Check Commands

> Generated from codebase (`package.json`) - confirm before Execute. Testes de integração exigem o Postgres de teste (Docker, AD-002); `DATABASE_URL` precisa terminar em `_test`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com unit | `npm run test:unit` |
| Full | Tasks com integration | `npm run test:unit && npm run test:int` |
| Build | Fim de fase e tasks de schema/UI | `npm run build && npm run lint && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Domínio

```
T1 → T2
```

### Phase 2: Schema expand

```
T3
```

### Phase 3: Repositório

```
T4 → T5 → T6 → T7
```

### Phase 4: Leitura no resumo

```
T8
```

### Phase 5: Contract

```
T9 → T10 → T11
```

---

## Task Breakdown

### T1: Função `resolvePercent`

**What**: Criar a função pura que resolve o percentual vigente de uma categoria em um mês.
**Where**: `src/lib/domain/percent-history.ts`
**Test files**: `src/lib/domain/percent-history.test.ts`
**Depends on**: None
**Reuses**: `src/lib/domain/month.ts` (`YearMonth`, `monthRange`)
**Requirement**: HIST-04, HIST-02
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `resolvePercent(versions, monthStart)` devolve o percentual da versão de maior `fromMonth` ≤ `monthStart` e `null` sem versão elegível
- [x] `monthStartOf(m)` devolve `AAAA-MM-01` (ex.: `{2026,3}` → `2026-03-01`)
- [x] Testes cobrem: sentinela `0001-01-01`, mês igual ao `fromMonth`, mês anterior à primeira versão (`null`), mês futuro usa a última versão, ordem de entrada embaralhada
- [x] Gate check passes: `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add resolvePercent for per-month category percent`

---

### T2: Omitir categoria sem vigência e sem gasto no resumo

**What**: `buildMonthlySummary` omite a linha de categoria com `hasPercent === false` e gasto 0; com gasto mantém a linha com meta 0 e `overspent`.
**Where**: `src/lib/domain/budget.ts`
**Test files**: `src/lib/domain/budget.test.ts`
**Depends on**: T1
**Reuses**: `buildMonthlySummary`, `Category` atuais
**Requirement**: HIST-05
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `Category` aceita `hasPercent?: boolean` (omitido = `true`); testes existentes passam sem mudança
- [x] Teste: `hasPercent: false` sem gasto → categoria ausente de `rows`
- [x] Teste: `hasPercent: false` com gasto → linha com `targetCents` 0, `overspent` verdadeiro, `overspentCents` = gasto
- [x] Teste: o total `spentCents` do resumo não muda ao omitir categorias sem gasto
- [x] Gate check passes: `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): omit categories with no percent and no spending from the summary`

---

### T3: Tabela `category_percent`, `deleted_from` e migração 0007 (expand)

**What**: Criar `category_percent`, adicionar `category.deleted_from`, tornar o índice de nome único parcial, relaxar `category.percent_micro` para nullable e fazer o backfill sentinela, sem remover a coluna ainda.
**Where**: `src/lib/db/schema.ts`
**Also changes**: `drizzle/0007_*.sql`, `drizzle/meta/*`
**Test files**: `src/lib/db/schema.int.test.ts`, `src/lib/db/migration-0007.int.test.ts`
**Depends on**: None
**Reuses**: `drizzle/0006_percent_micro.sql` (migração com SQL de dados editado à mão), `src/lib/db/schema.int.test.ts`
**Requirement**: HIST-06, HIST-08
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Migração gerada com `drizzle-kit` e editada: cria tabela (PK `(category_id, from_month)`, checks de faixa 1..100000000 e dia 1), `INSERT INTO category_percent SELECT id, '0001-01-01', percent_micro FROM category`, adiciona `deleted_from date`, recria `category_user_lower_name_unique` como parcial `WHERE deleted_from IS NULL`, `percent_micro DROP NOT NULL`
- [x] Teste de migração: aplica `0000`..`0006` em um schema Postgres de teste isolado, insere categorias, aplica a `0007` e confirma uma vigência `0001-01-01` por categoria com o mesmo percentual
- [x] Testes de constraint: percentual fora de 1..100000000 e `from_month` fora do dia 1 rejeitados; segunda linha com mesma `(category_id, from_month)` rejeitada; apagar categoria apaga as vigências; nome de categoria com `deleted_from` preenchido pode ser reutilizado, nome ativo duplicado continua rejeitado
- [x] Gate check passes: `npm run build && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes de integração existentes seguem verdes (nenhum removido)

**Tests**: integration
**Gate**: build

**Commit**: `feat(db): add category_percent history table and soft-delete column`

---

### T4: Helper de teste `insertCategory`

**What**: Helper que insere uma categoria e a vigência sentinela `0001-01-01`, para os testes não dependerem da coluna antiga.
**Where**: `src/test/db.ts`
**Depends on**: None
**Reuses**: `insertTestUser` e o padrão de `setupTestDb`
**Requirement**: HIST-06
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `insertCategory(userId, { name, percentMicro, color, fromMonth? })` retorna a linha de `category` e grava a vigência (`fromMonth` padrão `0001-01-01`)
- [x] Não escreve em `category.percent_micro`
- [x] Typecheck do build passa; usado pelos testes de T5
- [x] Gate check passes: `npm run build && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `test(db): add insertCategory helper with sentinel percent history`

---

### T5: `categoriesRepo.listForMonth` e `list` por vigência

**What**: Ler categorias com o percentual vigente no mês pedido, respeitando exclusão lógica; `list` passa a ser o mês corrente de `now`.
**Where**: `src/lib/db/repos/categories.ts`
**Test files**: `src/lib/db/repos/categories.int.test.ts`
**Depends on**: T4
**Reuses**: `resolvePercent`, `currentMonth`, a montagem de subcategorias de `list`
**Requirement**: HIST-04, HIST-05, HIST-08
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `listForMonth(userId, month, now)` carrega categorias do usuário com `deleted_from IS NULL OR month < deleted_from` e `percentMicro` resolvido; sem vigência elegível → `percentMicro: 0`, `hasPercent: false`
- [x] `list(userId, now)` = `listForMonth` no mês de `now` e não traz categoria excluída
- [x] Testes: mês passado usa vigência antiga e mês corrente a nova; mês futuro usa a última vigência; categoria com vigência só no mês corrente vem `hasPercent: false` em mês anterior; categoria excluída aparece em mês < `deleted_from` e some em mês ≥ `deleted_from`; só categorias do usuário pedido
- [x] Gate check passes: `npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): list categories with the percent in force for a month`

---

### T6: `replaceSet` grava vigências

**What**: `replaceSet` deixa de escrever `category.percent_micro` e grava vigência no mês corrente só quando o percentual muda; categoria nova ganha vigência no mês corrente.
**Where**: `src/lib/db/repos/categories.ts`
**Test files**: `src/lib/db/repos/categories.int.test.ts`
**Depends on**: T5
**Reuses**: transação e validação atuais de `replaceSet`; upsert do Drizzle (`onConflictDoUpdate`)
**Requirement**: HIST-01, HIST-03, HIST-07
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `replaceSet(userId, cats, now)` calcula o mês corrente de `now` e compara o percentual enviado com `resolvePercent(vigências, mês)`; só difere → upsert em `(categoria, mês)`
- [x] Testes: editar percentuais cria vigência no mês de `now` e `listForMonth` de mês anterior devolve os percentuais antigos; renomear/recolorir/mudar subcategorias não cria nem altera vigência; salvar duas vezes no mesmo mês deixa uma linha por categoria com o último valor; reenviar o mesmo percentual não grava; categoria nova recebe vigência com `fromMonth` = mês corrente e aparece `hasPercent: false` em mês anterior
- [x] Teste de rollback: falha forçada no meio do salvamento não deixa vigência, categoria nem subcategoria gravadas
- [x] Teste: `now` na virada de mês (31/out 23:30 vs 01/nov 00:30 em America/Sao_Paulo) grava no mês correspondente
- [x] Soma ≠ 100% continua rejeitada sem gravar vigência (mensagem existente)
- [x] Gate check passes: `npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): store percent changes as monthly versions in replaceSet`

---

### T7: Exclusão lógica em `replaceSet`

**What**: Categoria removida do conjunto recebe `deleted_from` = mês corrente em vez de ser apagada; só categorias ativas contam como existentes.
**Where**: `src/lib/db/repos/categories.ts`
**Test files**: `src/lib/db/repos/categories.int.test.ts`
**Depends on**: T6
**Reuses**: checagem de gastos e mensagem `expensesMessage` existentes
**Requirement**: HIST-08
**Status**: Done

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Remover categoria sem gastos preenche `deleted_from` (dia 1 do mês corrente) e mantém linha, vigências e subcategorias
- [x] Remover categoria com gastos retorna "Esta categoria tem N gasto(s) e não pode ser excluída" e não altera dado algum
- [x] Enviar `id` de categoria excluída retorna "Categoria não encontrada"
- [x] Criar categoria com o nome de uma excluída é aceito
- [x] Categoria excluída fica fora de `list`, presente em `listForMonth` de mês anterior ao `deleted_from` e ausente a partir dele
- [x] Testes existentes de exclusão ajustados ao novo comportamento sem enfraquecer asserções (contagem final de testes ≥ a anterior)
- [x] Gate check passes: `npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): soft-delete categories to preserve past months`

---

### T8: Resumo mensal lê o percentual do mês

**What**: A página de resumo usa `listForMonth(userId, month)`; teste de ponta a ponta de dados cobre o resumo de meses diferentes após edição.
**Where**: `src/app/(app)/page.tsx`
**Test files**: `src/lib/db/repos/categories-summary.int.test.ts`
**Depends on**: None
**Reuses**: `buildMonthlySummary`, `transactionsRepo.monthTotals`, `monthRange`
**Requirement**: HIST-02, HIST-04, HIST-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `page.tsx` troca `categoriesRepo.list(userId)` por `categoriesRepo.listForMonth(userId, month)`; filtro de transações recebe as mesmas categorias
- [ ] Teste de integração: com ganhos e gastos em um mês passado e no corrente, após `replaceSet` alterando percentuais, `buildMonthlySummary` do mês passado devolve metas idênticas às de antes da edição e o do mês corrente usa os novos; mês futuro usa os do corrente
- [ ] Teste: gasto em mês anterior à criação da categoria aparece com 0% e meta 0; mês anterior sem gasto omite a categoria; soma das metas dos meses passados mantém 100% do conjunto de então
- [ ] Gráficos e tabela não precisam de mudança (consomem o resumo); build passa
- [ ] Gate check passes: `npm run build && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: build

**Commit**: `feat(summary): compute monthly targets with the percent in force that month`

---

### T9: `transactions.int.test.ts` usa `insertCategory`

**What**: Trocar os 3 inserts diretos em `category` por `insertCategory`.
**Where**: `src/actions/transactions.int.test.ts`
**Depends on**: None
**Reuses**: `insertCategory` (T4)
**Requirement**: HIST-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum `insert(category)` restante no arquivo e nenhum `percentMicro` passado direto à tabela
- [ ] Mesma contagem de testes e todos passam
- [ ] Gate check passes: `npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `test(transactions): create categories through insertCategory`

---

### T10: `schema.int.test.ts` usa `insertCategory`

**What**: Trocar os inserts diretos em `category` (helper local e dois inserts de constraint) pelo helper, mantendo as asserções.
**Where**: `src/lib/db/schema.int.test.ts`
**Depends on**: T9
**Reuses**: `insertCategory` (T4)
**Requirement**: HIST-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Asserções de constraint de `percent_micro` em `category` migram para `category_percent` (já cobertas em T3) ou saem junto da coluna, sem reduzir o número de cenários cobertos no total do arquivo; contagem registrada no commit
- [ ] Nenhum `insert(category)` com `percentMicro` restante
- [ ] Gate check passes: `npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `test(schema): create categories through insertCategory`

---

### T11: Remover `category.percent_micro` (migração 0008, contract)

**What**: Remover a coluna antiga do schema e do banco, tornando `category_percent` a única fonte.
**Where**: `src/lib/db/schema.ts`
**Also changes**: `drizzle/0008_*.sql`, `drizzle/meta/*`
**Depends on**: T10
**Reuses**: `drizzle/0006_percent_micro.sql` (estilo de migração)
**Requirement**: HIST-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Migração remove o check `category_percent_micro_range` de `category` e a coluna `percent_micro`; `schema.ts` sem `category.percentMicro`
- [ ] `grep -rn "category.percentMicro\|percent_micro" src` não acha uso da coluna em `category` (a tabela `category_percent` mantém a sua)
- [ ] Teste de migração de T3 continua passando (aplica só até a 0007)
- [ ] Gate check passes: `npm run build && npm run lint && npm run test:unit && npm run test:int`
- [ ] `e2e/helpers.ts` (`seedCategories`) continua compilando (usa `replaceSet`)

**Tests**: integration
**Gate**: build

**Commit**: `feat(db): drop category.percent_micro in favor of category_percent`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2
Phase 2:  T3
Phase 3:  T4 ------→ T5 ------→ T6 ------→ T7
Phase 4:  T8
Phase 5:  T9 ------→ T10 -----→ T11
```

Execução estritamente sequencial. `Depends on: None` em primeira task de fase significa depender só da conclusão das fases anteriores. 11 tasks → mais de um lote de ~7: oferecer sub-agentes por lote (Fase 1-3 = 7 tasks; Fase 4-5 = 4 tasks).

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| HIST-01 | T6 |
| HIST-02 | T1, T8 |
| HIST-03 | T6 |
| HIST-04 | T1, T5, T8 |
| HIST-05 | T2, T5, T8 |
| HIST-06 | T3, T4, T9, T10, T11 |
| HIST-07 | T6 |
| HIST-08 | T3, T5, T7 |
