# Recorrentes: pago e não pago Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/recorrentes-pago/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (sem regra de testes além do e2e suspenso, AD-005), `vitest.config.ts` (projetos `unit` e `integration`). Sem guideline de cobertura: strong defaults, como nas features `gastos-recorrentes` e `recorrencia-parcelas`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Vault e validação (`src/lib/vault/*`, `src/lib/validation/*`) | unit | Campo novo: válido, ausente, cada regra de rejeição | `src/lib/vault/*.test.ts`, `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) | integration | Caminhos de consulta principais, escopo por `userId`, caminhos de erro | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Schema e migração (`src/lib/db/schema.ts`, `drizzle/*`) | integration | Restrições novas (PK, CHECK, cascade) e dados migrados | `src/lib/db/schema.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso + cada erro + `revalidatePath` | `src/actions/*.int.test.ts` | `npm run test:int` |
| Tipos compartilhados (`src/lib/vault/types.ts`) | none | - (typecheck) | - | gate quick |
| UI (`src/components/*`) | none | - (e2e suspenso, AD-005; lógica testável vive em `src/lib/domain/paid.ts`) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up` ou um banco `*_test` privado via `DATABASE_URL` (memória do projeto: sessões paralelas colidem em `orcamento_test`). Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários ou só tipos | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

Fases em ordem; tarefas em ordem dentro da fase. Todo tipo ou parâmetro novo é opcional/aditivo (`paid` ausente = não pago), para o `typecheck` passar ao fim de cada tarefa.

### Phase 1: Regras puras

```
T1 → T2
```

### Phase 2: Dados

```
T2 → T3
T3 → T4 → T5 → T6 → T7 → T8 → T9
```

### Phase 3: Action

```
T9 → T10
```

### Phase 4: Interface

```
T10 → T11 → T12
```

### Phase 5: Exportar e importar

```
T12 → T13
T13 → T14 → T15 → T16 → T17 → T18
```

---

## Task Breakdown

### T1: Regras puras de pago em `paid.ts`

**What**: Criar `countsInTotals`, `orderByPaid`, `applyPaid`, `paidLabel`, `countedNetByDay` e `startsDay`.
**Where**: `src/lib/domain/paid.ts`
**Depends on**: None
**Reuses**: `src/lib/domain/day-total.ts` (`netByDay`)
**Requirement**: PAGO-02, PAGO-03, PAGO-04, PAGO-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `countsInTotals`: avulso conta; recorrente conta só com `paid === true` (`false`, `null` e ausente não contam)
- [x] `orderByPaid`: partição estável (contam primeiro, não pagas depois), ordem relativa mantida nos dois grupos
- [x] `applyPaid`: override só em recorrentes; avulso ignora override
- [x] `paidLabel`: "Pago"/"Não pago" para gasto e "Recebido"/"Não recebido" para ganho
- [x] `countedNetByDay`: saldo por dia só sobre linhas que contam
- [x] `startsDay(prev, row)`: verdadeiro na primeira linha e quando a data ou o grupo (conta/não conta) muda; um dia com linhas nos dois grupos gera dois cabeçalhos
- [x] Testes unitários em `src/lib/domain/paid.test.ts`, 1:1 com PAGO-02..05 e os edge cases (mês sem recorrentes, todas pagas, todas não pagas); sem import de servidor
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(paid): add the pure paid rules for recurring occurrences`

---

### T2: `computeMonthTotals` ignora ocorrências não pagas

**What**: Aceitar `recurring?` e `paid?` por ocorrência e pular quem não conta nos totais (ganho, categoria, subcategoria).
**Where**: `src/lib/vault/month-totals.ts`
**Depends on**: T1
**Reuses**: `countsInTotals` (T1)
**Requirement**: PAGO-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ganho recorrente não pago fora de `incomeCents`; gasto recorrente não pago fora de `spentByCategory` e `spentBySubcategory`
- [x] Recorrente pago e avulso (com ou sem `paid`) continuam somando como hoje
- [x] Testes unitários em `src/lib/vault/month-totals.test.ts` com valores esperados da spec (R$ 100 não pago → categoria 0; pago → 100)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(paid): leave unpaid recurring occurrences out of the month totals`

---

### T3: Tabela `recurring_paid` no schema e migração 0018

**What**: Declarar `recurringPaid` (PK série+mês, `user_id` cascade, CHECK dia 1, índice `(user_id, month)`) e gerar a migração com `npx drizzle-kit generate --name recurring_paid`.
**Where**: `src/lib/db/schema.ts`
**Depends on**: T2
**Reuses**: padrão de `push_dispatch` (PK composta, cascade)
**Requirement**: PAGO-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `drizzle/0018_recurring_paid.sql` criado pelo gerador, com a tabela, a PK, o CHECK e o índice
- [x] Teste de integração em `src/lib/db/schema.int.test.ts`: PK rejeita duplicata; CHECK rejeita `month` fora do dia 1; excluir o usuário apaga seus estados
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): add the recurring_paid table`

---

### T4: Migração marca como pagos os meses passados das séries existentes

**What**: Acrescentar à migração 0018 o `INSERT ... SELECT` que cria uma linha por mês de cada segmento recorrente, do mês de `date` até `least(coalesce(recurrence_end, mês_corrente - 1), mês_corrente - 1)`, com o mês corrente em `America/Sao_Paulo` e `ON CONFLICT DO NOTHING`.
**Where**: `drizzle/0018_recurring_paid.sql`
**Depends on**: T3
**Reuses**: nenhum
**Requirement**: PAGO-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O `INSERT` fica após um marcador `-- backfill` no arquivo, para o teste extraí-lo e executá-lo
- [x] Teste de integração em `src/lib/db/schema.int.test.ts` semeia séries e executa o trecho: série iniciada há 3 meses → 3 meses pagos e o corrente não; série encerrada no passado → todos os meses até o fim pagos; série que começa no mês corrente ou depois → nenhuma linha; série com segmentos divididos → um mês por segmento, sem duplicata; avulso → nenhuma linha
- [x] Executar o trecho duas vezes não duplica nem falha
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): backfill past months of existing series as paid`

---

### T5: Tipos compartilhados com `paid` e `paidMonths`

**What**: Adicionar `paid?: boolean | null` a `MonthPayload.occurrences` e `paidMonths?: { seriesId: string; month: string }[]` a `ExportPayload` e `ImportPayload`.
**Where**: `src/lib/vault/types.ts`
**Depends on**: T4
**Reuses**: nenhum
**Requirement**: PAGO-02, PAGO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `paid` documentado: `true` pago, `false` ou ausente não pago, `null` não recorrente
- [x] `paidMonths` documentado: `month` AAAA-MM; ausente = nenhum pago
- [x] Nenhum erro de TypeScript no projeto
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: quick

**Commit**: `feat(paid): add paid and paidMonths to the shared vault types`

---

### T6: Leitura do mês entrega `paid`

**What**: `listByMonthSealed` junta `recurring_paid` do mês e devolve `paid` (`null` em avulso); o tipo `Occurrence` ganha `paid?`.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T5
**Reuses**: `loadSeries`, `monthKey` e a consulta existente de `listByMonthSealed`
**Requirement**: PAGO-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Recorrente com linha em `recurring_paid` no mês → `paid: true`; sem linha → `false`; avulso → `null`
- [x] Estado de outro mês da mesma série não vaza para o mês lido; estado de outra conta não aparece
- [x] Testes de integração em `src/lib/db/repos/transactions.sealed.int.test.ts` para cada caso acima, incluindo série dividida em dois segmentos (estado vale para o mês, qualquer que seja o segmento)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): return the paid state with each month occurrence`

---

### T7: Repositório grava o estado (`setPaid`)

**What**: Criar `transactionsRepo.setPaid(userId, id, month, paid)`: valida dono, recorrência e mês via `lockSeries`; `paid` insere com `ON CONFLICT DO NOTHING`, `!paid` apaga; devolve `false` quando não aplica.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T6
**Reuses**: `lockSeries`, `appliesInMonth`
**Requirement**: PAGO-01, PAGO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Marcar mês M não altera os outros meses da série; desmarcar remove só M
- [ ] Marcar duas vezes mantém uma única linha; desmarcar duas vezes não falha
- [ ] Devolve `false` e não grava para: id de outro usuário, id inexistente, linha não recorrente, mês sem ocorrência da linha
- [ ] Testes de integração em `src/lib/db/repos/transactions.sealed.int.test.ts` para cada caso
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): add the repo write for the paid state`

---

### T8: Excluir a partir de um mês apaga os estados removidos

**What**: `deleteFrom` apaga de `recurring_paid` os meses `>= month` da série, na mesma transação do plano de exclusão.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T7
**Reuses**: `planDelete`
**Requirement**: PAGO-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Série com fevereiro pago, excluída a partir de março: fevereiro permanece, março em diante some
- [ ] Excluir a primeira ocorrência (série inteira) apaga todos os estados da série
- [ ] Avulso excluído não toca em `recurring_paid`; estados de outras séries não mudam
- [ ] Testes de integração em `src/lib/db/repos/transactions.sealed.int.test.ts` ou `transactions.int.test.ts` (onde `deleteFrom` já é testado)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): clear the paid months removed by a delete`

---

### T9: Editar a série poda estados só quando ela encurta ou vira avulsa

**What**: `updateFromSealed` apaga estados `>= month` quando a ocorrência editada vira "Não recorrente" e `> novo fim` quando o fim da série é definido ou encurtado; edição que mantém a série não toca nos estados.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T8
**Reuses**: `planEdit`
**Requirement**: PAGO-02, PAGO-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Editar valor, categoria, descrição ou dia (série dividida em novo segmento) mantém o estado de todos os meses
- [ ] Mudar para "Não recorrente" no mês M apaga estados `>= M` e mantém os anteriores
- [ ] Definir ou encurtar o fim em AAAA-MM apaga estados de meses posteriores ao fim; estender o fim não cria nem apaga estado
- [ ] Nenhum estado órfão após cada cenário (consulta confere que todo `(series_id, month)` tem ocorrência)
- [ ] Testes de integração em `src/lib/db/repos/transactions.sealed.int.test.ts` para cada cenário
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): keep the paid state through edits and prune it when a series shrinks`

---

### T10: Server Action `setOccurrencePaid`

**What**: Criar a ação que valida a entrada, exige sessão aprovada, chama `setPaid` e revalida `/`.
**Where**: `src/actions/transactions-paid.ts`
**Depends on**: T9
**Reuses**: `requireSessionForAction`, `logActionError`, `revalidatePath`, padrão de `src/actions/transactions-sealed.ts`
**Requirement**: PAGO-01, PAGO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sucesso devolve `{ ok: true }`, grava o estado e chama `revalidatePath("/")`
- [ ] `id` não uuid, `month` fora de AAAA-MM ou `paid` não booleano → rejeita sem gravar
- [ ] Ocorrência de outro usuário ou fora da série → `{ ok: false, error: "Transação não encontrada" }` sem gravar
- [ ] Sem sessão aprovada → resultado de `requireSessionForAction`
- [ ] Falha inesperada do repo → `{ ok: false, error: "Não foi possível atualizar o estado. Tente novamente." }`
- [ ] Testes de integração em `src/actions/transactions-paid.int.test.ts` para cada caso
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): add the setOccurrencePaid action`

---

### T11: Lista mostra ordem, opacidade, controle e cabeçalhos por grupo

**What**: `TransactionList` ganha `onTogglePaid` e `paidError` opcionais: botão `aria-pressed` com `paidLabel` só em recorrentes, `data-paid` e `opacity-50` nas não pagas, e cabeçalhos de dia por grupo com saldo só no grupo que conta.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T10
**Reuses**: `paidLabel`, `startsDay`, `countedNetByDay` (T1)
**Requirement**: PAGO-01, PAGO-03, PAGO-04

**Tools**:

- MCP: NONE
- Skill: `impeccable` (somente se o visual do controle pedir ajuste)

**Done when**:

- [ ] Linha recorrente não paga com `opacity-50`; demais com opacidade 1 (evidência `file:line`)
- [ ] Controle com rótulo "Pago"/"Não pago" (gasto) e "Recebido"/"Não recebido" (ganho); ausente em avulso
- [ ] Cabeçalho de dia no mobile sem saldo no grupo não pago; um dia com linhas nos dois grupos aparece duas vezes
- [ ] `paidError` exibido com `role="alert"`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(paid): show the paid control, order and dimming in the transaction list`

---

### T12: Visão Geral aplica override otimista, ordem e totais

**What**: `OverviewBody` guarda overrides `{ base, map }`, calcula `effective = applyPaid(...)`, totais e ritmo de gasto só sobre linhas que contam, `shown = orderByPaid(...)` e liga `onTogglePaid` a `setOccurrencePaid` com reversão em caso de erro.
**Where**: `src/components/overview-client.tsx`
**Depends on**: T11
**Reuses**: `applyPaid`, `orderByPaid`, `countsInTotals` (T1); `setOccurrencePaid` (T10)
**Requirement**: PAGO-04, PAGO-05, PAGO-06, PAGO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Resumo, metas e restante usam `computeMonthTotals(effective)`; ritmo de gasto recebe só ocorrências que contam (evidência `file:line`)
- [ ] Busca e filtro aplicados antes de `orderByPaid`
- [ ] Marcar atualiza lista e totais antes da resposta do servidor; override descartado quando `transactions` muda
- [ ] Em `ok: false` o override some e a mensagem "Não foi possível atualizar o estado. Tente novamente." aparece
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(paid): wire the paid toggle, order and totals into the overview`

---

### T13: Exportação lê os meses pagos

**What**: `exportRowsSealed` devolve `paidMonths` (`seriesId`, `month` AAAA-MM) só do usuário.
**Where**: `src/lib/db/repos/export.ts`
**Depends on**: T12
**Reuses**: consulta de `exportRowsSealed`
**Requirement**: PAGO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Estados do usuário aparecem ordenados por série e mês; estados de outro usuário não
- [ ] Conta sem estados devolve `paidMonths: []`
- [ ] Testes de integração em `src/lib/db/repos/export.int.test.ts`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(paid): include the paid months in the export rows`

---

### T14: Arquivo de exportação inclui `paidMonths`

**What**: `openExport` repassa `paidMonths` e o arquivo gerado o inclui.
**Where**: `src/lib/vault/export.ts`
**Depends on**: T13
**Reuses**: `OpenedExport`
**Requirement**: PAGO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `OpenedExport.paidMonths` preenchido a partir do payload; payload sem o campo gera `[]`
- [ ] Testes unitários em `src/lib/vault/export.test.ts`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(paid): write the paid months to the export file`

---

### T15: Leitura do arquivo aceita `paidMonths` opcional

**What**: O esquema do arquivo de importação aceita `paidMonths` (ausente = `[]`), com `seriesId` uuid e `month` AAAA-MM de 2000-01 a 2100-12, e exige que o `seriesId` exista entre as séries do arquivo.
**Where**: `src/lib/vault/import-file.ts`
**Depends on**: T14
**Reuses**: regras existentes de validação de série
**Requirement**: PAGO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Arquivo sem o campo importa com `paidMonths: []`
- [ ] Mês fora do intervalo, formato inválido ou `seriesId` sem série no arquivo rejeitam o arquivo
- [ ] Testes unitários em `src/lib/vault/import-file.test.ts` para cada caso
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(paid): accept paid months in the import file`

---

### T16: Payload de importação remapeia as séries dos meses pagos

**What**: `import-payload` troca o `seriesId` de cada `paidMonths` pelo id remapeado da série e o repassa no `ImportPayload`.
**Where**: `src/lib/vault/import-payload.ts`
**Depends on**: T15
**Reuses**: mapa `seriesIds`
**Requirement**: PAGO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cada estado aponta para o novo id da sua série; `month` preservado
- [ ] Arquivo sem estados gera `paidMonths: []`
- [ ] Testes unitários em `src/lib/vault/import-payload.test.ts`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(paid): remap paid months to the new series ids on import`

---

### T17: Validação do servidor aceita `paidMonths`

**What**: O esquema do servidor valida `paidMonths` do payload (uuid, `month` AAAA-MM no intervalo, série presente entre as transações recorrentes do payload; sem duplicata).
**Where**: `src/lib/validation/import-sealed.ts`
**Depends on**: T16
**Reuses**: regras de série existentes (`recurring`/`seriesId`)
**Requirement**: PAGO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Payload sem o campo é válido; payload com estados válidos é válido
- [ ] Série ausente, mês inválido ou par `(seriesId, month)` repetido rejeitam o payload
- [ ] Testes unitários em `src/lib/validation/import-sealed.test.ts` para cada caso
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(paid): validate paid months in the sealed import payload`

---

### T18: Importação grava os meses pagos

**What**: `importSealed` insere `paidMonths` em `recurring_paid` (mês como dia 1) em lotes, na mesma transação.
**Where**: `src/lib/db/repos/import.ts`
**Depends on**: T17
**Reuses**: `chunks`, `BATCH`
**Requirement**: PAGO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Estados do payload aparecem em `recurring_paid` com `user_id` do importador
- [ ] Payload sem estados importa todas as recorrentes como não pagas
- [ ] Falha ao gravar os estados desfaz a importação inteira
- [ ] Testes de integração em `src/lib/db/repos/import.int.test.ts`, incluindo ida e volta exportar → importar com os mesmos estados
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: build

**Commit**: `feat(paid): restore the paid months on import`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2
Phase 2:  T3 ------→ T4 ------→ T5 ------→ T6 ------→ T7 ------→ T8 ------→ T9
Phase 3:  T10
Phase 4:  T11 -----→ T12
Phase 5:  T13 -----→ T14 -----→ T15 -----→ T16 -----→ T17 -----→ T18
```

Execution is strictly sequential - there is no intra-phase parallelism.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 módulo de funções puras coesas | ✅ Granular |
| T2 | 1 função | ✅ Granular |
| T3 | 1 tabela | ✅ Granular |
| T4 | 1 statement SQL | ✅ Granular |
| T5 | 1 arquivo de tipos | ✅ Granular |
| T6 | 1 função de leitura | ✅ Granular |
| T7 | 1 função de escrita | ✅ Granular |
| T8 | 1 função (poda na exclusão) | ✅ Granular |
| T9 | 1 função (poda na edição) | ✅ Granular |
| T10 | 1 endpoint | ✅ Granular |
| T11 | 1 componente | ✅ Granular |
| T12 | 1 componente | ✅ Granular |
| T13-T18 | 1 função/esquema cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | none | ✅ Match |
| T2 | T1 | T1 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 | ✅ Match |
| T5 | T4 | T4 | ✅ Match |
| T6 | T5 | T5 | ✅ Match |
| T7 | T6 | T6 | ✅ Match |
| T8 | T7 | T7 | ✅ Match |
| T9 | T8 | T8 | ✅ Match |
| T10 | T9 | Phase 2 → Phase 3 | ✅ Match |
| T11 | T10 | Phase 3 → Phase 4 | ✅ Match |
| T12 | T11 | T11 | ✅ Match |
| T13 | T12 | Phase 4 → Phase 5 | ✅ Match |
| T14 | T13 | T13 | ✅ Match |
| T15 | T14 | T14 | ✅ Match |
| T16 | T15 | T15 | ✅ Match |
| T17 | T16 | T16 | ✅ Match |
| T18 | T17 | T17 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | Vault | unit | unit | ✅ OK |
| T3 | Schema | integration (restrições novas) | integration | ✅ OK |
| T4 | Migração | integration | integration | ✅ OK |
| T5 | Tipos compartilhados | none | none | ✅ OK |
| T6-T9 | Repositórios | integration | integration | ✅ OK |
| T10 | Server Actions | integration | integration | ✅ OK |
| T11-T12 | UI | none (AD-005) | none | ✅ OK |
| T13 | Repositório | integration | integration | ✅ OK |
| T14-T17 | Vault e validação | unit | unit | ✅ OK |
| T18 | Repositório | integration | integration | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| PAGO-01 | T7, T10, T11 |
| PAGO-02 | T1, T5, T6, T9 |
| PAGO-03 | T1, T11 |
| PAGO-04 | T1, T11, T12 |
| PAGO-05 | T1, T2, T12 |
| PAGO-06 | T12 |
| PAGO-07 | T4 |
| PAGO-08 | T3, T8, T9 |
| PAGO-09 | T5, T13-T18 |
| PAGO-10 | T7, T10, T12 |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped.
