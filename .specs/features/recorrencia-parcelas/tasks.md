# Recorrência com Mês Inicial e Parcelas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/recorrencia-parcelas/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (sem regra de testes), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura); e2e suspenso (AD-005). Sem guideline de cobertura: strong defaults, no mesmo nível da feature `gastos-recorrentes`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Campo novo: válido, cada regra de rejeição e mensagem | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) | integration | Caminhos de consulta principais, escopo por `userId`, caminhos de erro | `src/lib/db/**/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso + cada erro de validação + `revalidatePath` | `src/actions/*.int.test.ts` | `npm run test:int` |
| UI (`src/components/*`) | none | - (e2e suspenso, AD-005) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up` (ou um banco `*_test` privado via `DATABASE_URL`). Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

Fases em ordem; tarefas em ordem dentro da fase. Todo tipo ou parâmetro novo é opcional/aditivo, para o `typecheck` passar ao fim de cada tarefa.

### Phase 1: Regras puras

```
T1 → T2 → T3
```

### Phase 2: Dados

```
T4 → T5
T2 → T4
T3 → T4
T1 → T5
```

### Phase 3: Action

```
T6
T4 → T6
T5 → T6
```

### Phase 4: UI

```
T7 → T8
T6 → T7
T5 → T8
```

---

## Task Breakdown

### T1: Calcular início da série e parcela

**What**: Adicionar `startOfSeries(segments)` e `installmentOf(segments, month)` ao domínio.
**Where**: `src/lib/domain/recurrence.ts`
**Depends on**: None
**Reuses**: `Segment`, `monthKey`
**Requirement**: PARC-05, PARC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `startOfSeries` devolve o menor `monthKey(date)` dos segmentos
- [x] `installmentOf` devolve `{number, total}` (1/12 no início, 12/12 no fim de uma série de 12 meses; 1/1 com início = fim; 1/4 a 4/4 de 11/2026 a 02/2027)
- [x] Série com segmentos contíguos (editada no meio) conta N pelo início da série e T pelo fim do último segmento
- [x] Último segmento sem `endMonth` → `null`; linha avulsa → `null`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: ≥ 7 testes novos em `recurrence.test.ts`, nenhum removido

**Tests**: unit
**Gate**: quick

---

### T2: Data do segmento a partir do mês inicial na edição

**What**: Adicionar `startMonth` opcional a `EditedData` e fazer `planEdit` gravar `date = occurrenceDate(dia, startMonth)` só quando o segmento editado é o primeiro da série.
**Where**: `src/lib/domain/recurrence.ts`
**Depends on**: T1
**Reuses**: `planEdit`, `resolveDay`, `occurrenceDate`, `startOfSeries`
**Requirement**: PARC-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Editar o primeiro mês com novo `startMonth` move `date` para o dia do segmento no novo mês (dia 31 → último dia do mês, `recurringDay` continua 31)
- [x] Editar uma ocorrência do meio com `startMonth` presente ignora `startMonth` e mantém `next.date`
- [x] Avulso → recorrente "até" com `startMonth` usa o `startMonth`
- [x] `startMonth` ausente ou não recorrente mantém o comportamento atual (testes existentes de `planEdit` passam)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: ≥ 4 testes novos, nenhum removido

**Tests**: unit
**Gate**: quick

---

### T3: Validar Mês inicial

**What**: Aceitar `recurrenceStart`, validá-lo e comparar o fim com ele; saída `recurrenceStartMonth`.
**Where**: `src/lib/validation/transaction.ts`
**Depends on**: T2
**Reuses**: `isValidMonth`, `superRefine` existente
**Requirement**: PARC-01, PARC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] "until" sem início → "Informe o mês inicial" em `recurrenceStart`; início fora de 2000-01..2100-12 ou malformado → "Mês inicial inválido"
- [x] Fim anterior ao início → "O mês final deve ser igual ou posterior ao mês inicial" em `recurrenceEnd`; início = fim é aceito
- [x] "Informe o mês final" e "Mês final inválido" mantidos
- [x] "none"/"forever" ignoram `recurrenceStart` e devolvem `recurrenceStartMonth: null`; "until" devolve o início
- [x] Testes antigos que esperavam a mensagem "…ao mês do lançamento" atualizados para a nova mensagem
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: ≥ 6 testes novos; os alterados mantêm a contagem anterior

**Tests**: unit
**Gate**: quick

---

### T4: Gravar a primeira ocorrência pelo mês inicial

**What**: Fazer `create` e `updateFrom` usarem `recurrenceStartMonth` para a `date` da série.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T2, T3
**Reuses**: `recurrenceFields`, `planEdit`, `occurrenceDate`
**Requirement**: PARC-02, PARC-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `TransactionData.recurrenceStartMonth` opcional; `create` "until" grava `date` = dia da Data no mês inicial (dia 31 em mês de 30 dias → 30) e `recurrenceDay` = dia da Data
- [x] `create` "none"/"forever" segue usando a Data como está
- [x] `listByMonth` não mostra a série em mês anterior ao inicial e mostra a 1ª ocorrência no mês inicial
- [x] `updateFrom` no primeiro mês move o início; no meio da série ignora o início enviado; avulso → "until" usa o início
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: ≥ 5 testes de integração novos, nenhum removido

**Tests**: integration
**Gate**: full

---

### T5: Parcela e início da série na lista

**What**: `listByMonth` devolve `installment` e `seriesStart` por ocorrência; `findStored` devolve `seriesStart`.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T1, T4
**Reuses**: `startOfSeries`, `installmentOf`, `inArray`
**Requirement**: PARC-05, PARC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Série "até" de 05/2026 a 12/2026: 1/8 em maio, 3/8 em julho, 8/8 em dezembro
- [ ] Série "sempre" e avulso: `installment` null; `seriesStart` null só no avulso
- [ ] Série editada no meio (valor muda em dezembro) mantém N e T contados pela série inteira
- [ ] Após `deleteFrom` no mês M, o total T dos meses anteriores é recalculado até M-1
- [ ] Série cujo último segmento ficou "sem data final" → `installment` null em todas as ocorrências
- [ ] `findStored` devolve `seriesStart` (AAAA-MM) da série, null para avulso
- [ ] Séries de outro usuário não entram na conta
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥ 7 testes de integração novos, nenhum removido

**Tests**: integration
**Gate**: full

---

### T6: Action valida o fim contra o início efetivo

**What**: `updateTransaction` rejeita fim anterior ao início efetivo (mês inicial no primeiro mês; mês da ocorrência no meio da série).
**Where**: `src/actions/transactions.ts`
**Depends on**: T4, T5
**Reuses**: `findStored` (com `seriesStart`), `fieldErrors`
**Requirement**: PARC-03, PARC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `createTransaction` com Mês inicial grava a série no mês inicial e rejeita início ausente/inválido e fim anterior (mensagens da spec)
- [ ] `updateTransaction` do primeiro mês com novo início aplica o início; do meio da série com fim anterior ao mês da ocorrência → "O mês final deve ser igual ou posterior ao mês inicial" em `recurrenceEnd`
- [ ] "A data deve estar no mês da ocorrência" continua valendo
- [ ] `revalidatePath("/")` chamado em sucesso, não chamado nos erros
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥ 5 testes novos; testes que citavam a mensagem antiga atualizados

**Tests**: integration
**Gate**: full

---

### T7: Campos Mês inicial e Mês final no formulário

**What**: Mostrar Mês inicial antes do Mês final em "até mês/ano", preenchido com o mês da Data, desabilitável com `startLocked`, e enviar `recurrenceStart`.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T6
**Reuses**: bloco do Mês final, `field()`, `set()`
**Requirement**: PARC-01, PARC-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Ao escolher "até mês/ano" o Mês inicial aparece com o mês da Data; em "sem data final" e "não recorrente" fica oculto
- [ ] Erro de `recurrenceStart` aparece sob o campo, com `aria-invalid`
- [ ] Com `startLocked` o campo aparece desabilitado com o valor recebido
- [ ] `submit` envia `recurrenceStart` na criação e na edição
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: contagem de testes igual à da task anterior (UI sem teste, AD-005)

**Tests**: none
**Gate**: build

---

### T8: Parcela na lista e edição com mês inicial

**What**: Mostrar o badge "N/T" no lugar de "Recorrente" quando há parcela e passar `recurrenceStart`/`startLocked` ao formulário de edição.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T5, T7
**Reuses**: badge `recurring-badge`, `Occurrence.installment`, `Occurrence.seriesStart`
**Requirement**: PARC-03, PARC-05, PARC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Ocorrência com `installment` mostra `N/T` ao lado da descrição e não mostra "Recorrente"
- [ ] Série "sem data final" mostra "Recorrente"; avulso não mostra selo
- [ ] Edição preenche Mês inicial com `seriesStart` (ou o mês da data se avulso) e trava quando `seriesStart` ≠ mês da ocorrência
- [ ] Verificação manual no app (`npm run dev`): série 05/2026–12/2026 mostra 1/8 … 8/8 ao navegar; editar o mês inicial move o início
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: contagem de testes igual à da task anterior

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5
Phase 3:  T6
Phase 4:  T7 ------→ T8
```

Execução sequencial; 8 tarefas cabem em um único lote, sem sub-agentes. O Verifier roda sozinho depois da T8.

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | Domínio | unit | unit | ✅ OK |
| T3 | Validação | unit | unit | ✅ OK |
| T4 | Repositório | integration | integration | ✅ OK |
| T5 | Repositório | integration | integration | ✅ OK |
| T6 | Action | integration | integration | ✅ OK |
| T7 | UI | none | none | ✅ OK |
| T8 | UI | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| PARC-01 | T3, T7 |
| PARC-02 | T4 |
| PARC-03 | T2, T4, T6, T7, T8 |
| PARC-04 | T3, T6 |
| PARC-05 | T1, T5, T8 |
| PARC-06 | T1, T5, T8 |
