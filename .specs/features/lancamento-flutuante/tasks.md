# Lançamento Flutuante Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/lancamento-flutuante/design.md`
**Status**: In Progress

**Dívida registrada (AD-005):** os specs e2e `e2e/transaction-form.spec.ts`, `e2e/summary.spec.ts` e `e2e/month-picker.spec.ts` usam o formulário inline e o rótulo "Descrição (opcional)". Eles vão quebrar com esta feature e não serão ajustados aqui, porque o e2e está suspenso. Reativar o e2e exige um helper que abra o modal e a troca do rótulo.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), e2e (Playwright) suspenso (AD-005). Sem guideline de cobertura: strong defaults aplicados, no mesmo padrão de `.specs/features/subcategorias/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Validação (`src/lib/validation/*`) | unit | Descrição: válida, vazia, só espaços, ausente, 120 e 121 caracteres, com a mensagem de cada rejeição | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Server Actions (`src/actions/*`) | integration | Criar e atualizar rejeitam descrição vazia com `fieldErrors.description` e não gravam; sucesso com descrição | `src/actions/*.int.test.ts` | `npm run test:int` |
| UI / páginas (`src/app/*`, `src/components/*`) | none | - (e2e suspenso, AD-005) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Descrição obrigatória

Regra no schema e cobertura nas actions, sem UI.

```
T1 → T2
```

### Phase 2: Modal e botão flutuante

Formulário ajustado, componente novo e troca na página Resumo. A seta vinda da fase 1 marca uma dependência já concluída.

```
T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Tornar a descrição obrigatória no schema

**What**: `transactionSchema.description` passa a exigir texto com `trim`, de 1 a 120 caracteres, com a mensagem "Informe a descrição" para ausente, vazio ou só espaços.
**Where**: `src/lib/validation/transaction.ts`
**Depends on**: None
**Reuses**: Schema `description` existente (`transaction.ts:18`), `invalidInput` em `src/lib/action-result.ts`
**Requirement**: LANC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `description` ausente, `""` e `"   "` são rejeitados com "Informe a descrição" em gasto e em ganho
- [x] 120 caracteres passam; 121 falham com "A descrição deve ter no máximo 120 caracteres"
- [x] A saída de descrição é `string` aparada (sem `null`)
- [x] O teste unitário "accepts a valid income without category or description" é reescrito para exigir descrição; os demais casos do arquivo ganham descrição onde faltava
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: os testes existentes do arquivo continuam e entram ao menos 4 novos (ausente, vazia, só espaços, ganho sem descrição); nenhum é removido sem ser reescrito

**Tests**: unit
**Gate**: quick

**Commit**: `feat(transactions): require a description on every transaction`

---

### T2: Cobrir a descrição obrigatória nas actions

**What**: Testes de integração mostram que criar e atualizar com descrição vazia devolvem `fieldErrors.description` e não gravam nem revalidam.
**Where**: `src/actions/transactions.int.test.ts`
**Depends on**: T1
**Reuses**: Fixtures e helpers do arquivo de teste existente
**Requirement**: LANC-04, LANC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `createTransaction` com descrição vazia e com só espaços devolve `ok: false` com `fieldErrors.description = "Informe a descrição"` e nenhuma linha é criada
- [x] `updateTransaction` com descrição vazia devolve o mesmo erro e a linha mantém a descrição anterior
- [x] `createTransaction` com descrição válida continua funcionando e chama `revalidatePath("/")`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: os testes existentes do arquivo continuam e entram ao menos 3 novos

**Tests**: integration
**Gate**: full

**Commit**: `test(transactions): cover the required description in create and update`

---

### T3: Ajustar o formulário para o modal

**What**: O rótulo vira "Descrição" e a criação deixa de manter o formulário aberto para entrada sequencial; a mensagem "Transação salva" sai.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T2
**Reuses**: `onSaved` e `fieldErrors` já existentes no componente
**Requirement**: LANC-05, LANC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O rótulo do campo é exatamente "Descrição", sem "(opcional)"
- [ ] O erro `fieldErrors.description` aparece sob o campo e os valores digitados permanecem
- [ ] Após salvar com sucesso, o componente só chama `onSaved` (sem resetar valores nem mostrar "Transação salva")
- [ ] O modo de edição continua igual
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: a suíte unit e a de integração têm o mesmo total de testes passando que ao fim da T2

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): drop the optional label and sequential entry from the form`

---

### T4: Criar o botão flutuante com o modal

**What**: Componente cliente com botão "+" fixo e um `Dialog` controlado que contém o `TransactionForm` e fecha em `onSaved`.
**Where**: `src/components/new-transaction-button.tsx`
**Depends on**: T3
**Reuses**: `Dialog*` de `src/components/ui/dialog.tsx`, padrão de `transaction-list.tsx:132`, `Button`, `PlusIcon` do `lucide-react`
**Requirement**: LANC-02, LANC-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O botão tem `aria-label="Nova transação"`, `fixed bottom-4 right-4 z-40`, 48px e ícone de "+"
- [ ] Clicar abre o modal com título "Nova transação" e o formulário em branco (tipo Gasto, data de hoje)
- [ ] Salvar com sucesso fecha o modal; Esc e clique fora fecham sem salvar
- [ ] O conteúdo do modal rola em telas baixas (`max-h-[calc(100dvh-2rem)] overflow-y-auto`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: mesmo total de testes passando que ao fim da T3

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add a floating button that opens the new transaction modal`

---

### T5: Trocar o formulário inline do Resumo pelo botão

**What**: A página Resumo remove a seção "Nova transação", renderiza `NewTransactionButton` e ganha `pb-24` no contêiner.
**Where**: `src/app/(app)/page.tsx`
**Depends on**: T4
**Reuses**: `categories` e `todayInSaoPaulo()` já calculados na página
**Requirement**: LANC-01, LANC-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A página não importa nem renderiza `TransactionForm` diretamente
- [ ] A seção "Transações do mês" ocupa a largura do contêiner (o grid de duas colunas sai)
- [ ] O botão aparece só no Resumo
- [ ] Verificação manual: criar um gasto e um ganho pelo "+" atualiza lista, totais e gráficos sem recarregar; descrição vazia mostra "Informe a descrição" sem fechar o modal
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: mesmo total de testes passando que ao fim da T4

**Tests**: none
**Gate**: build

**Commit**: `feat(summary): replace the inline form with the floating add button`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2
Phase 2:  T2 ------→ T3 ------→ T4 ------→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Schema da descrição | 1 arquivo, 1 campo | ✅ Granular |
| T2: Testes das actions | 1 arquivo de teste | ✅ Granular |
| T3: Ajuste do formulário | 1 componente | ✅ Granular |
| T4: Botão flutuante | 1 componente novo | ✅ Granular |
| T5: Página Resumo | 1 arquivo | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Validação | unit | unit | ✅ OK |
| T2 | Server Actions (só testes) | integration | integration | ✅ OK |
| T3 | UI | none | none | ✅ OK |
| T4 | UI | none | none | ✅ OK |
| T5 | UI | none | none | ✅ OK |

## Requirement Coverage

| Requirement ID | Tasks |
| -------------- | ----- |
| LANC-01 | T5 |
| LANC-02 | T4, T5 |
| LANC-03 | T4 |
| LANC-04 | T1, T2 |
| LANC-05 | T3 |
| LANC-06 | T2, T3 |

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped.
