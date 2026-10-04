# Gastos e Ganhos Recorrentes Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Precondição:** a feature `subcategorias` precisa estar concluída e commitada antes do T5. As duas mexem em `schema.ts`, `repos/transactions.ts`, `validation/transaction.ts`, `transaction-form.tsx` e `transaction-list.tsx`, e a migração desta feature é gerada em cima da última (`npm run db:generate` numera sozinho). Com `subcategorias` pronta, a transação tem `subcategoryId`: os campos editáveis em `planEdit`, `updateFrom` e no novo segmento incluem `subcategoryId`.

---

**Design**: `.specs/features/gastos-recorrentes/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (sem regra de testes; só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), e2e (Playwright) suspenso por decisão do usuário (AD-005). Sem guideline de cobertura: strong defaults aplicados, no mesmo nível das tasks de `subcategorias`.

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

As fases rodam em ordem; dentro de cada fase, as tarefas também. Toda mudança de tipo ou contrato é aditiva, para o `typecheck` passar ao fim de cada tarefa. Setas vindas de fases anteriores marcam dependências já concluídas.

### Phase 1: Regras de recorrência e validação

Funções puras, sem banco.

```
T1 → T2 → T3
T1 → T4
```

### Phase 2: Dados

Schema, migração e repositório.

```
T5 → T6 → T7 → T8 → T9 → T10
T1 → T8
T3 → T9
T2 → T10
```

### Phase 3: Actions

Entradas validadas, ainda sem UI.

```
T11 → T12 → T13
T4 → T11
T6 → T11
T9 → T12
T10 → T13
```

### Phase 4: UI

Formulário e lista.

```
T14 → T15
T12 → T14
T8 → T15
T13 → T15
```

---

## Task Breakdown

### T1: Helpers de mês e ocorrência em `recurrence.ts`

**What**: Tipo `Segment` e as funções `monthKey`, `previousMonthKey`, `lastDayOfMonth`, `occurrenceDate` e `appliesInMonth` conforme o design.
**Where**: `src/lib/domain/recurrence.ts`
**Depends on**: None
**Reuses**: `YearMonth` e `isValidCalendarDate` de `src/lib/domain/month.ts`
**Requirement**: RECUR-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `recurrence.test.ts`: `occurrenceDate` usa o dia pretendido no mês exibido (15/10 → 15/11) e o último dia quando o mês é curto (dia 31 → 28/02/2026, 29/02/2028, 30/04)
- [x] `recurrence.test.ts`: `occurrenceDate` de linha não recorrente devolve `date` sem alteração
- [x] `recurrence.test.ts`: `appliesInMonth` é falso antes do mês da data, verdadeiro do mês da data até o mês final inclusive, falso depois do mês final e verdadeiro para sempre sem mês final
- [x] `recurrence.test.ts`: `previousMonthKey("2026-01")` = `"2025-12"`
- [x] Gate quick passa; ≥ 10 testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): add recurrence month and occurrence helpers`

---

### T2: `planDelete` e `resolveDay`

**What**: `planDelete` (apaga segmentos posteriores ao mês, encerra no mês anterior o segmento que começa antes, apaga o que começa no mês) e `resolveDay` (mantém o dia pretendido quando a data enviada é a projetada).
**Where**: `src/lib/domain/recurrence.ts`
**Depends on**: T1
**Reuses**: helpers do T1
**Requirement**: RECUR-09, RECUR-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `recurrence.test.ts`: excluir no mês de início apaga o segmento e todos os posteriores da mesma série (RECUR-09 AC 1 e 3)
- [x] `recurrence.test.ts`: excluir num mês depois do início deixa o segmento com `endMonth` = mês anterior e apaga os posteriores; os anteriores permanecem (AC 1 e 2)
- [x] `recurrence.test.ts`: segmento avulso (série `null`) excluído só apaga ele mesmo
- [x] `recurrence.test.ts`: `resolveDay` mantém 31 quando a data enviada é 28/02 e o dia pretendido é 31; usa o dia enviado quando difere do projetado
- [x] Gate quick passa; ≥ 7 testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): plan series deletion and preserve intended recurrence day`

---

### T3: `planEdit`

**What**: `planEdit` devolve as operações de edição a partir do mês M: apagar segmentos posteriores, atualizar no lugar quando o segmento começa em M ou é avulso, ou encerrar em M-1 e inserir novo segmento; define `series_id` e `recurrence_day` do resultado.
**Where**: `src/lib/domain/recurrence.ts`
**Depends on**: T2
**Reuses**: `resolveDay`, `planDelete` (para apagar posteriores)
**Requirement**: RECUR-07, RECUR-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `recurrence.test.ts`: editar no mês do meio divide: o segmento original termina em M-1 e o novo começa em M com os dados novos e a mesma série (RECUR-07 AC 2 e 3)
- [x] `recurrence.test.ts`: editar no mês de início atualiza no lugar, sem inserir segmento (AC 8)
- [x] `recurrence.test.ts`: editar M e depois N > M: as operações do segundo passo mantêm o segmento de M até N-1 (RECUR-08 AC 4)
- [x] `recurrence.test.ts`: editar M depois de ter editado N > M apaga o segmento de N (AC 5)
- [x] `recurrence.test.ts`: dados novos "não recorrente" tornam o mês editado avulso (`seriesId` `null`) e a série anterior termina em M-1 (AC 6)
- [x] `recurrence.test.ts`: editar uma linha avulsa para recorrente cria a série com `seriesId` = id da linha
- [x] `recurrence.test.ts` (invariante): após qualquer sequência de edições e exclusões simuladas, nenhum mês tem mais de uma ocorrência por série
- [x] Gate quick passa; ≥ 9 testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): plan series split on edit from a month`

---

### T4: Campos de recorrência em `transactionSchema`

**What**: `recurrence` (`none`/`forever`/`until`, padrão `none`) e `recurrenceEnd` (`AAAA-MM`) no `common`, com `superRefine` no campo `recurrenceEnd`; saída `recurrence` e `recurrenceEndMonth` (`null` fora de `until`).
**Where**: `src/lib/validation/transaction.ts`
**Depends on**: T1
**Reuses**: `monthKey` de `recurrence.ts`, padrão de `failedFields` em `transaction.test.ts`
**Requirement**: RECUR-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transaction.test.ts`: `until` sem mês final falha só em `recurrenceEnd` com "Informe o mês final" (AC 1)
- [x] `transaction.test.ts`: mês final anterior ao mês da data falha com "O mês final deve ser igual ou posterior ao mês do lançamento"; igual ao mês da data passa (AC 2)
- [x] `transaction.test.ts`: mês final inválido (`2026-13`, `1999-12`, `2101-01`, texto livre) falha com "Mês final inválido" (AC 3)
- [x] `transaction.test.ts`: `none` e `forever` com `recurrenceEnd` enviado resultam em `recurrenceEndMonth: null` (AC 4)
- [x] `transaction.test.ts`: gasto e ganho recorrentes passam; sem `recurrence` o padrão é `none`
- [x] Os testes antigos de `transaction.test.ts` continuam passando sem alteração
  - Nota: os dois testes que comparam a saída inteira com `toEqual` ganharam `recurrence: "none"` e `recurrenceEndMonth: null` no objeto esperado (acréscimo exigido pelo padrão `none` na saída; nenhuma asserção enfraquecida).
- [x] Gate quick passa; ≥ 8 testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): validate transaction recurrence fields`

---

### T5: Colunas de recorrência em `transaction` e migração

**What**: Colunas `recurring`, `recurrence_day`, `recurrence_end`, `series_id`, os 3 CHECKs e o índice parcial `transaction_user_recurring_idx` conforme Data Models; migração gerada por `npm run db:generate`.
**Where**: `src/lib/db/schema.ts`
**Depends on**: None
**Reuses**: padrão de `check(...)` da tabela `transaction`
**Requirement**: RECUR-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Migração aplica limpa sobre a última e as linhas existentes ficam `recurring = false` com os demais campos `NULL`
- [x] `schema.int.test.ts`: `recurring = true` sem `recurrence_day` ou sem `series_id` é rejeitado; `recurring = false` com qualquer um deles é rejeitado
- [x] `schema.int.test.ts`: `recurrence_day` 0 e 32 são rejeitados; 1 e 31 são aceitos
- [x] `schema.int.test.ts`: `recurrence_end` anterior ao mês da `date` é rejeitado; igual ao mês da `date` é aceito; `recurrence_end` com `recurring = false` é rejeitado
- [x] `schema.int.test.ts`: ganho recorrente (`category_id` `NULL`) é aceito
- [x] Gate full passa; ≥ 7 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add recurrence columns to transaction`

---

### T6: `create` grava a recorrência

**What**: `transactionsRepo.create` grava `recurring`, `recurrence_day`, `recurrence_end` (primeiro dia do mês final) e `series_id` (= `id`); `TransactionData` ganha os campos opcionais de recorrência.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T5
**Reuses**: `fields`, `create` idempotente por `id`
**Requirement**: RECUR-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts`: criar "Sempre" grava uma linha com `recurring`, `recurrence_day` = dia da data, `series_id` = `id` e `recurrence_end` `NULL` (AC 3)
- [x] `transactions.int.test.ts`: criar "Até mês/ano" grava `recurrence_end` = primeiro dia do mês final (AC 4)
- [x] `transactions.int.test.ts`: criar sem recorrência grava `recurring = false` e os demais `NULL`; repetir o mesmo `id` continua ignorado
- [x] `transactions.int.test.ts`: ganho recorrente é gravado
- [x] Gate full passa; ≥ 4 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): persist recurrence on create`

---

### T7: `applicableInMonth` e `monthTotals` com recorrentes

**What**: Substituir `inMonth` por `applicableInMonth` (avulsas no mês ou recorrentes que se aplicam ao mês) e usá-la em `monthTotals`.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T6
**Reuses**: `monthTotals` (`SUM … GROUP BY`), `MonthRange`
**Requirement**: RECUR-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts`: gasto "Sempre" de 15/10 soma na categoria em out, nov e dez/2026 e não soma em set/2026 (AC 5 e 8 dos totais)
- [x] `transactions.int.test.ts`: gasto "Até mês/ano" soma até o mês final inclusive e não soma depois (AC 6 e 7)
- [x] `transactions.int.test.ts`: ganho recorrente entra em `incomeCents` dos meses aplicáveis (AC 10)
- [x] `transactions.int.test.ts`: gasto recorrente soma com gasto avulso do mesmo mês e categoria (AC 9)
- [x] `transactions.int.test.ts`: recorrente de outro usuário não entra nos totais
- [x] Os testes antigos de `monthTotals` continuam passando
- [x] Gate full passa; ≥ 5 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): include recurring occurrences in month totals`

---

### T8: `listByMonth` projeta as ocorrências

**What**: `listByMonth` usa `applicableInMonth` e devolve `Occurrence[]` (`Transaction` + `recurring`, `recurrenceEnd`, `month`) com `date` projetada por `occurrenceDate`, ordenada por data projetada e `createdAt` decrescentes em TypeScript.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T1, T7
**Reuses**: `occurrenceDate`, `columns`
**Requirement**: RECUR-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts`: lista de novembro traz a ocorrência de gasto "Sempre" com a data 15/11, o mesmo valor, categoria e descrição (AC 5)
- [x] `transactions.int.test.ts`: lista de fevereiro traz um gasto de dia 31 em 28/02/2026 (AC 11)
- [x] `transactions.int.test.ts`: lista fora do intervalo (antes do início, depois do mês final) não traz a ocorrência (AC 7 e 8)
- [x] `transactions.int.test.ts`: a lista mistura avulsas e recorrentes ordenadas por data projetada desc, desempate por `createdAt` desc
- [x] `transactions.int.test.ts` (invariante AD-004): para o mesmo mês, a soma dos gastos da lista é igual à soma de `monthTotals`
- [x] Os testes antigos de `listByMonth` continuam passando
- [x] Gate full passa; ≥ 6 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): project recurring occurrences in month list`

---

### T9: `updateFrom`

**What**: `updateFrom(userId, id, month, data)` carrega os segmentos da série com `FOR UPDATE` dentro de `db.transaction` e aplica `planEdit`; devolve `false` se o segmento não existe, é de outro usuário ou não se aplica ao mês.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T3, T8
**Reuses**: `planEdit`, padrão `db.transaction` de `src/lib/db/repos/categories.ts`, `ownedBy`
**Requirement**: RECUR-07, RECUR-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts`: gasto "Sempre" de R$ 100,00 em out, editado em dez para R$ 120,00: out e nov listam R$ 100,00; dez, jan e seguintes listam R$ 120,00 (teste de aceitação da spec)
- [x] `transactions.int.test.ts`: editar dez e depois fev: dez e jan com a alteração de dez, fev em diante com a de fev; editar dez de novo depois substitui fev em diante (RECUR-08 AC 4 e 5)
- [x] `transactions.int.test.ts`: editar no mês de início altera a série inteira (AC 8)
- [x] `transactions.int.test.ts`: editar uma ocorrência para "Não recorrente" deixa o mês editado como avulso e remove os meses seguintes (AC 6)
- [x] `transactions.int.test.ts`: dia 31 editado em fevereiro sem mudar a data mantém 31/03 em março
- [x] `transactions.int.test.ts`: ganho recorrente editado em um mês muda o `incomeCents` desse mês em diante
- [x] `transactions.int.test.ts`: `false` para id de outro usuário e para mês fora do intervalo do segmento; nenhuma linha muda
- [x] `transactions.int.test.ts` (invariante): depois de várias edições, nenhum mês lista duas ocorrências da mesma série
- [x] `transactions.int.test.ts`: editar uma linha avulsa continua trocando a data livremente (contrato atual)
- [x] Gate full passa; ≥ 9 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): edit recurring transactions from a month onward`

---

### T10: `deleteFrom`

**What**: `deleteFrom(userId, id, month)` aplica `planDelete` em `db.transaction`; devolve `false` se o segmento não existe, é de outro usuário ou não se aplica ao mês.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T2, T9
**Reuses**: `planDelete`, estrutura do `updateFrom`
**Requirement**: RECUR-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts`: ganho "Sempre" criado em out, excluído em dez: out e nov listam o ganho e dez em diante não (teste de aceitação)
- [x] `transactions.int.test.ts`: excluir no mês de início remove o lançamento de todos os meses (AC 3)
- [x] `transactions.int.test.ts`: excluir depois de uma edição em série apaga o segmento da edição e posteriores, e mantém o anterior até o mês anterior
- [x] `transactions.int.test.ts`: `false` para outro usuário e para mês fora do intervalo; nenhuma linha muda
- [x] `transactions.int.test.ts`: excluir categoria com gasto recorrente continua bloqueado
- [x] Gate full passa; ≥ 5 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): delete recurring transactions from a month onward`

---

### T11: `createTransaction` com recorrência

**What**: `createTransaction` repassa `recurrence`/`recurrenceEnd` validados ao repo e devolve os erros por campo de `recurrenceEnd`.
**Where**: `src/actions/transactions.ts`
**Depends on**: T4, T6
**Reuses**: `invalidInput`, `transactionSchema`, `transactionsRepo.create`
**Requirement**: RECUR-02, RECUR-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts` (actions): criar gasto "Sempre" e "Até mês/ano" grava uma única linha recorrente (AC 3 e 4 de RECUR-02)
- [x] `transactions.int.test.ts` (actions): criar ganho recorrente grava a linha
- [x] `transactions.int.test.ts` (actions): "Até mês/ano" sem mês final, com mês final anterior e com mês inválido retornam `fieldErrors.recurrenceEnd` com as mensagens da spec e não gravam nada
- [x] `transactions.int.test.ts` (actions): `forever` com `recurrenceEnd` enviado grava sem mês final
- [x] Gate full passa; ≥ 5 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(actions): accept recurrence on createTransaction`

---

### T12: `updateTransaction` com `month`

**What**: `updateTransaction(input, month?)` chama `updateFrom`; para linha guardada recorrente rejeita data fora do mês da ocorrência com `fieldErrors.date`; `month` malformado ou segmento inexistente retornam "Transação não encontrada".
**Where**: `src/actions/transactions.ts`
**Depends on**: T9, T11
**Reuses**: `isOwnCategory`, `TRANSACTION_NOT_FOUND`, `monthKey`
**Requirement**: RECUR-07, RECUR-08, RECUR-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts` (actions): editar a ocorrência de dezembro altera dezembro em diante e preserva out e nov (RECUR-07 AC 2 e 3)
- [x] `transactions.int.test.ts` (actions): data com mês diferente do `month` numa linha recorrente retorna `fieldErrors.date` = "A data deve estar no mês da ocorrência" (AC 7) e nada muda
- [x] `transactions.int.test.ts` (actions): editar para "Não recorrente" funciona (RECUR-08 AC 6)
- [x] `transactions.int.test.ts` (actions): `month` omitido numa linha avulsa mantém o comportamento atual (mudança livre de data)
- [x] `transactions.int.test.ts` (actions): `month` malformado, id de outro usuário e mês fora do intervalo retornam "Transação não encontrada"
- [x] `transactions.int.test.ts` (actions): categoria de outro usuário continua retornando "Categoria não encontrada"
- [x] Gate full passa; ≥ 6 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(actions): edit a recurring transaction from a month onward`

---

### T13: `deleteTransaction` com `month`

**What**: `deleteTransaction(id, month?)` chama `deleteFrom`; `month` malformado ou segmento inexistente retornam "Transação não encontrada".
**Where**: `src/actions/transactions.ts`
**Depends on**: T10, T12
**Reuses**: `z.uuid()` de validação do id
**Requirement**: RECUR-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transactions.int.test.ts` (actions): excluir a ocorrência de dezembro remove dezembro em diante e mantém out e nov (AC 1 e 2)
- [x] `transactions.int.test.ts` (actions): excluir no mês de início remove tudo (AC 3)
- [x] `transactions.int.test.ts` (actions): excluir transação avulsa sem `month` continua funcionando
- [x] `transactions.int.test.ts` (actions): `month` malformado e id de outro usuário retornam "Transação não encontrada"
- [x] Gate full passa; ≥ 4 testes novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(actions): delete a recurring transaction from a month onward`

---

### T14: Campo de recorrência no `TransactionForm`

**What**: Opções "Não recorrente" / "Sempre" / "Até mês/ano" (radio nativo, padrão "Não recorrente"), `<input type="month">` visível só em "Até mês/ano", erro de `recurrenceEnd`; `TransactionFormValues` ganha `recurrence` e `recurrenceEnd`; prop `month` repassada a `updateTransaction`.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T12
**Reuses**: `fieldset` + radio do campo Tipo, `Input`, `Label`, `fieldErrors`
**Requirement**: RECUR-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O formulário mostra as três opções com "Não recorrente" selecionada por padrão (AC 1)
- [x] O campo de mês final só aparece em "Até mês/ano" (AC 2)
- [x] O envio inclui `recurrence` e `recurrenceEnd`, e na edição repassa `month`; o erro de `recurrenceEnd` aparece sob o campo
- [x] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add recurrence options to the transaction form`

---

### T15: Indicador, edição e exclusão por mês em `TransactionList`

**What**: A lista usa `Occurrence`: selo "Recorrente" (`data-testid="recurring-badge"`), edição que carrega `recurrence`/`recurrenceEnd` (mês final como `AAAA-MM`) e passa `occurrence.month`, exclusão de recorrente com título "Excluir esta e as próximas ocorrências?" e `deleteTransaction(id, month)`.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T8, T13, T14
**Reuses**: diálogos existentes, `monthKey`
**Requirement**: RECUR-05, RECUR-07, RECUR-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Toda ocorrência e todo lançamento recorrente mostram o selo "Recorrente"; avulsos não (AC 12 de RECUR-05)
- [ ] A edição abre com a opção e o mês final atuais e com a data da ocorrência exibida (RECUR-07 AC 1)
- [ ] Excluir uma ocorrência recorrente mostra o texto de "esta e as próximas" e chama `deleteTransaction` com o mês da ocorrência; avulsa mantém o texto atual
- [ ] Gate build passa

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): show recurring badge and edit or delete by month`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3
          T1 → T4
Phase 2:  T5 → T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13
Phase 4:  T14 → T15
```

Execução estritamente sequencial.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Helpers de mês e ocorrência | 1 arquivo, funções coesas de datas | ✅ Granular |
| T2: `planDelete` e `resolveDay` | 2 funções pequenas no mesmo arquivo | ✅ Granular |
| T3: `planEdit` | 1 função | ✅ Granular |
| T4: Validação da recorrência | 1 arquivo, 2 campos | ✅ Granular |
| T5: Schema e migração | 1 arquivo + migração gerada | ✅ Granular |
| T6: `create` | 1 função | ✅ Granular |
| T7: `applicableInMonth` + `monthTotals` | 1 condição e 1 consulta que a usa | ✅ Granular |
| T8: `listByMonth` | 1 função | ✅ Granular |
| T9: `updateFrom` | 1 função | ✅ Granular |
| T10: `deleteFrom` | 1 função | ✅ Granular |
| T11-T13: actions | 1 action cada | ✅ Granular |
| T14: Formulário | 1 componente, 1 campo | ✅ Granular |
| T15: Lista | 1 componente | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 | ✅ Match |
| T3 | T2 | T2 | ✅ Match |
| T4 | T1 | T1 | ✅ Match |
| T5 | None | - | ✅ Match |
| T6 | T5 | T5 | ✅ Match |
| T7 | T6 | T6 | ✅ Match |
| T8 | T1, T7 | T7, T1 | ✅ Match |
| T9 | T3, T8 | T8, T3 | ✅ Match |
| T10 | T2, T9 | T9, T2 | ✅ Match |
| T11 | T4, T6 | T4, T6 | ✅ Match |
| T12 | T9, T11 | T11, T9 | ✅ Match |
| T13 | T10, T12 | T12, T10 | ✅ Match |
| T14 | T12 | T12 | ✅ Match |
| T15 | T8, T13, T14 | T14, T8, T13 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1-T3 | Domínio | unit | unit | ✅ OK |
| T4 | Validação | unit | unit | ✅ OK |
| T5 | Schema + constraints | integration | integration | ✅ OK |
| T6-T10 | Repositório | integration | integration | ✅ OK |
| T11-T13 | Server Actions | integration | integration | ✅ OK |
| T14-T15 | UI / componentes | none (AD-005) | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| RECUR-01 | T14 |
| RECUR-02 | T5, T6, T11 |
| RECUR-03 | T1, T8 |
| RECUR-04 | T7 |
| RECUR-05 | T15 |
| RECUR-06 | T4, T11, T12 |
| RECUR-07 | T3, T9, T12, T15 |
| RECUR-08 | T2, T3, T9, T12 |
| RECUR-09 | T2, T10, T13, T15 |

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped.
