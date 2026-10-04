# Lançamento Flutuante Design

**Spec**: `.specs/features/lancamento-flutuante/spec.md`
**Status**: Draft

---

## Architecture Overview

Segue AD-001 (Server Component lê, Server Action escreve) e AD-005 (sem e2e novo). Nenhuma decisão ativa é substituída e nenhuma AD nova é necessária. Não há mudança de banco: `transaction.description` continua anulável, e a obrigatoriedade vive só no schema Zod, que as actions `createTransaction` e `updateTransaction` já usam.

Abordagem: um Client Component novo, `NewTransactionButton`, envolve o `Dialog` existente e o `TransactionForm` existente. A página Resumo troca a seção "Nova transação" por esse componente. Como `DialogContent` desmonta o conteúdo ao fechar, o formulário reabre em branco com um `id` novo, sem código extra (LANC-03, AC 4).

```mermaid
graph TD
    P[app/(app)/page.tsx - Server] -->|categories, defaultDate| NB[NewTransactionButton - Client]
    NB --> FAB[Button fixo bottom-right + Dialog]
    FAB --> TF[TransactionForm]
    TF -->|createTransaction| TA[actions/transactions.ts]
    TA --> VT[transactionSchema: descrição obrigatória]
    TA -->|revalidatePath /| P
    TF -->|onSaved| NB
    NB -->|fecha o Dialog| FAB
    TL[TransactionList - editar] --> TF
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger` | `src/components/ui/dialog.tsx` | Modal do formulário; o overlay (`z-50`) cobre o botão, que fica em `z-40` (LANC-03 AC 7) |
| `TransactionForm` com `onSaved` | `src/components/transaction-form.tsx:41` | Reusado sem mudar a estrutura; `onSaved` fecha o modal |
| Padrão de modal com formulário | `src/components/transaction-list.tsx:132` | Mesma composição usada na edição |
| `Button` (`size="icon-lg"`) | `src/components/ui/button.tsx` | Botão "+", com classe de posição fixa e tamanho mínimo 44px |
| `transactionSchema.description` | `src/lib/validation/transaction.ts:18` | Passa de opcional para obrigatório |
| `invalidInput` | `src/lib/action-result.ts` | Já leva o erro de `description` ao `fieldErrors`; sem mudança |
| `lucide-react` (`PlusIcon`) | já instalado (usado em `dialog.tsx`) | Ícone do botão |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Resumo (`page.tsx`) | Remove a `<section>` "Nova transação", renderiza `<NewTransactionButton categories defaultDate />` e dá `pb-24` ao contêiner para o botão não cobrir o fim da lista |
| `revalidatePath("/")` | Já chamado pelas actions; atualiza lista, totais e gráficos ao salvar (LANC-03 AC 5) |

---

## Components

### NewTransactionButton

- **Purpose**: Botão flutuante "+" que abre o modal com o formulário de nova transação.
- **Location**: `src/components/new-transaction-button.tsx`
- **Interfaces**:
  - `NewTransactionButton({ categories, defaultDate })` - mesmas props de categorias e data que o `TransactionForm` recebe hoje.
- **Dependencies**: `Dialog*`, `Button`, `TransactionForm`, estado local `open`.
- **Reuses**: `TransactionForm` (`onSaved={() => setOpen(false)}`), padrão de `Dialog` controlado de `transaction-list.tsx`.
- **Detalhes**:
  - Botão: `fixed bottom-4 right-4 z-40 size-12 rounded-full shadow-lg` (48px, acima do mínimo de 44px), `aria-label="Nova transação"`, ícone `PlusIcon`.
  - Modal: `DialogTitle` "Nova transação". O formulário mantém `aria-label="Nova transação"` no `<form>`.
  - O corpo do `DialogContent` rola em telas baixas (`max-h-[calc(100dvh-2rem)] overflow-y-auto`), porque o formulário com categoria e subcategoria é alto.

### TransactionForm (alterado)

- **Purpose**: Mesmo formulário; ajusta rótulo e fluxo pós-salvar.
- **Location**: `src/components/transaction-form.tsx`
- **Mudanças**:
  - Rótulo "Descrição (opcional)" vira "Descrição"; o `<Input>` ganha `required`? **Não**: a validação visível vem do servidor (`fieldErrors.description`), que já aparece sob o campo (LANC-06). Sem `required` nativo, para não haver duas mensagens diferentes.
  - Remove o ramo de entrada sequencial (`setValues` com novo id após salvar) e a mensagem "Transação salva" do modo de criação: o modal fecha ao salvar e o conteúdo é desmontado. Em edição nada muda.

### transactionSchema (alterado)

- **Location**: `src/lib/validation/transaction.ts:18`
- **Mudança**: `description` vira `z.string({ error: "Informe a descrição" }).trim().min(1, "Informe a descrição").max(120, "A descrição deve ter no máximo 120 caracteres")`. O `.transform(value || null)` sai; a saída passa a ser `string`. O repo já aceita `string | null`, e a leitura mantém `t.description ?? "Gasto"/"Ganho"` para linhas antigas sem descrição.

---

## Data Models

Sem mudança. `transaction.description varchar(120)` continua anulável (`src/lib/db/schema.ts:80`) para preservar as transações antigas (Out of Scope da spec).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Descrição vazia ou só espaços | Schema rejeita com `fieldErrors.description = "Informe a descrição"` | Mensagem sob o campo; modal aberto, valores mantidos |
| Descrição > 120 caracteres | Schema rejeita (mensagem já existente) | Mesma exibição |
| Falha de salvamento não ligada a campo | Action devolve `SAVE_FAILED`; o formulário mostra `role="alert"` | Modal aberto com o erro |
| Sem categorias e tipo Gasto | Formulário já mostra o link "Crie suas categorias primeiro" e desabilita Salvar | Sem mudança |
| Duplo clique em Salvar | `id` gerado na montagem + `if (pending) return` + insert idempotente | Uma transação |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Specs e2e existentes usam o formulário inline e o rótulo "Descrição (opcional)" | `e2e/transaction-form.spec.ts:6,17,67`, `e2e/summary.spec.ts:56`, `e2e/month-picker.spec.ts:64,69` | Quebram ao remover o formulário da página; AD-005 suspende e2e novo, não consertar os existentes | Task final ajusta os seletores desses specs para abrir o modal antes (barato: um helper `openNewTransaction(page)`); se o usuário mantiver e2e suspenso, registrar como dívida no handoff |
| Testes de unidade e de integração com descrição opcional | `src/lib/validation/transaction.test.ts`, `src/actions/transactions.int.test.ts`, `src/lib/db/repos/transactions.int.test.ts` | Casos que criam sem descrição passam a falhar | Atualizar esses casos na task do schema: fixtures ganham descrição e entram casos novos de vazio e só espaços |
| Linhas antigas com `description` nula não podem ser editadas sem preencher | `transaction-list.tsx:84` | Atrito ao editar uma transação antiga | Comportamento aceito e confirmado na spec; o campo vem vazio e o erro aponta o que falta |
| Botão fixo pode cobrir o fim da lista em telas pequenas | `page.tsx` (contêiner) | Última linha e botões Editar/Excluir ficam sob o "+" | `pb-24` no contêiner do Resumo |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Onde impor "descrição obrigatória" | Só no schema Zod, não no banco | Preserva dados antigos; uma regra única cobre criar e editar |
| Validação no navegador | Sem `required` nativo | O erro do servidor já aparece sob o campo; evita mensagens duplicadas e diferentes |
| Estado em branco ao reabrir | Desmontar o conteúdo do Dialog (comportamento do Radix) | Dispensa reset manual e gera `id` novo a cada abertura |
| Entrada sequencial | Removida da criação | Modal fecha ao salvar (confirmado); reabrir custa um toque |
