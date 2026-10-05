# Modal de Transação Specification

## Problem Statement

O modal de incluir e editar transação ([transaction-form.tsx](../../../src/components/transaction-form.tsx)) ocupa muito espaço vertical: o seletor de categoria é um acordeão com dezenas de radios, a descrição fica abaixo dele, Tipo e Repetir são grupos de radios pequenos e o valor é um campo comum ao lado da data. Na edição só existe "Salvar", sem "Cancelar" nem "Excluir". O usuário quer um formulário curto, na ordem em que pensa (quanto, no quê, qual categoria, quando) e com as ações de fechar e excluir à mão.

## Goals

- [ ] O modal de nova transação e o de edição passam a ter menos da metade da altura atual no viewport de 390×844 (mobile) para um gasto, medido com 6 categorias, uma delas com 5 subcategorias.
- [ ] Valor é o campo de maior destaque tipográfico e a ordem dos campos é Tipo e Valor, Descrição, Categoria e Subcategoria, Data e Recorrência.
- [ ] A edição oferece "Cancelar" e "Excluir"; a criação oferece "Cancelar".

## Out of Scope

Explicitamente excluído para evitar crescimento de escopo.

| Feature | Reason |
| ------- | ------ |
| Recorrência anual, semanal ou outra frequência | Decidido em `gastos-recorrentes`: a repetição é sempre mensal; o pedido cita "mensal, anual", mas só o mensal existe |
| Mudar regras de negócio de recorrência, validação ou server actions | A mudança é só de interface; `createTransaction`, `updateTransaction`, `deleteTransaction` e o schema ficam como estão |
| Busca por texto dentro da lista de categorias | Resolvido pela lista compacta (6 categorias no caso medido); fica como P3 |
| Mudar a lista de transações, filtros ou o botão flutuante "+" | Pedido trata só do conteúdo do modal |
| Máscara de moeda com prefixo "R$" dentro do valor digitado | O rótulo "Valor (R$)" já indica a moeda; ver Assumptions |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Seletor de categoria | Dois controles nativos de seleção (`NativeSelect` existente): "Categoria" e, abaixo, "Subcategoria" | Mínimo de altura, acessível por teclado e touch sem biblioteca nova; a lição L-003 recomenda controles nativos como padrão | n |
| Campo Subcategoria | Aparece só quando a categoria escolhida tem subcategorias; a primeira opção é "Sem subcategoria" (valor `""`) | Mantém o contrato atual de `subcategoryId` | n |
| Trocar a categoria | Zera a subcategoria para "Sem subcategoria" | Evita subcategoria de outra categoria (já é o comportamento de `pickSelection`) | n |
| Tipo Gasto/Ganho | Controle segmentado de largura total, dois botões `role="radio"` num `radiogroup` rotulado "Tipo" | Mantém semântica de radio para teclado e testes; só muda a aparência | n |
| Cores do tipo | Gasto usa o token `destructive` suave; Ganho usa o token `success` (ambos existem no design system, DS-02) | Reaproveita tokens, sem cor nova | n |
| Máscara de moeda | O campo digita-e-formata: a cada tecla mostra o texto no padrão pt-BR `1.234,56` (dígitos viram centavos da direita para a esquerda); não mostra "R$" dentro do campo | O valor enviado à action segue sendo o texto pt-BR que `parseBRL` já aceita; sem mudança de contrato | n |
| Cor do valor | Verde (`success`) quando Ganho; cor padrão do texto quando Gasto | Pedido diz "neutro/coral para gasto"; neutro evita alarme em todo lançamento | n |
| Recorrência | Um switch "Transação recorrente" substitui os 3 radios; ligado, mostra "Frequência" com as opções "Todo mês, sem data final" (`forever`) e "Todo mês, até um mês/ano" (`until`); em `until` aparece "Mês final" | Preserva os três estados de `recurrence` do schema; frequência mensal é a única existente | n |
| Componente switch | Novo primitivo `ui/switch.tsx` (Radix `Switch`, já disponível no pacote `radix-ui`) com `role="switch"` | Não existe Switch em `ui/`; o design confirma a disponibilidade antes das tasks (L-003) | n |
| Valor inicial da recorrência ao ligar | `forever` | Escolha mais comum para gastos fixos e a de menor atrito | n |
| Desligar o switch | Volta `recurrence` para `none` e descarta o mês final digitado | Evita enviar `recurrenceEnd` residual | n |
| Excluir na edição | Botão "Excluir" no rodapé do modal de edição abre a mesma confirmação já usada na lista (texto e comportamento inalterados) e, ao confirmar, fecha os dois modais | Reuso evita duas regras de exclusão | n |
| "Cancelar" | Fecha o modal sem salvar e descarta o que foi digitado | Mesmo efeito de Esc e clique fora | n |
| Rodapé no mobile | Largura < 640px: o rodapé com as ações fica fixo na base do modal (sticky), com o botão primário de largura total; o conteúdo rola acima dele | Pedido de alcance do polegar | n |
| Rótulo do botão primário | "Salvar" na criação e "Salvar alterações" na edição | Pedido | n |
| Erros de campo | Mantêm as mensagens e o posicionamento atuais, por campo | Sem mudança de validação | n |
| Ganho | Esconde Categoria e Subcategoria (como hoje) | Ganho não tem categoria (schema) | n |
| Sem categorias cadastradas (gasto) | Mantém o link "Crie suas categorias primeiro" e o botão primário desabilitado | Comportamento atual preservado | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation (MODT-04, MODT-05, MODT-12), failure states (MODT-11), state-transition integrity (MODT-07, MODT-08); remaining dimensions N/A for this scope (interface only: sem novas chamadas externas, auth, concorrência, retenção ou observabilidade).

---

## User Stories

### P1: Escolher categoria e subcategoria em dois campos compactos ⭐ MVP

**User Story**: Como usuário, quero escolher categoria e subcategoria em dois seletores, para preencher o gasto sem rolar uma lista longa.

**Why P1**: É o maior gargalo de altura e de confusão apontado no pedido.

**Acceptance Criteria**:

1. WHEN the transaction form shows tipo Gasto THEN the system SHALL render a select with accessible name "Categoria" listing every category by `categoryDisplayName`, in the same order as today.
2. WHILE no category is selected the system SHALL NOT render the "Subcategoria" select.
3. WHEN the user selects a category with at least one subcategory THEN the system SHALL render a select with accessible name "Subcategoria" whose first option is "Sem subcategoria" followed by that category's subcategories.
4. WHEN the user selects a category with no subcategories THEN the system SHALL NOT render the "Subcategoria" select.
5. WHEN the user changes the category THEN the system SHALL reset the subcategory to "Sem subcategoria".
6. WHEN the user saves with the placeholder option of "Categoria" selected THEN the system SHALL show the message "Selecione uma categoria" under the "Categoria" select.
7. WHEN the edit form opens for a transaction with a category and a subcategory THEN the system SHALL show both selects already set to those values.
8. WHILE the form shows no category list (tipo Ganho) the system SHALL NOT render "Categoria" nor "Subcategoria".

**Independent Test**: Abrir "+", escolher uma categoria com subcategorias, ver o segundo select aparecer, trocar de categoria e ver a subcategoria voltar a "Sem subcategoria".

---

### P1: Tipo e valor em destaque, na ordem do raciocínio ⭐ MVP

**User Story**: Como usuário, quero ver tipo e valor no topo, com o valor grande e formatado, e os campos na ordem em que penso, para lançar rápido sem erro de digitação.

**Why P1**: O valor é o dado principal de um app financeiro e a ordem atual quebra o fluxo.

**Acceptance Criteria**:

1. The transaction form SHALL render its fields in this order: Tipo, Valor, Descrição, Categoria, Subcategoria, Data, Transação recorrente.
2. The "Tipo" control SHALL be a full-width segmented control of two options, "Gasto" and "Ganho", exposed with `role="radiogroup"` named "Tipo" and `role="radio"` options.
3. WHEN the user activates the other option of "Tipo" THEN the system SHALL change the selected option and SHALL show or hide Categoria and Subcategoria accordingly.
4. The "Valor (R$)" input SHALL render with a font size of at least 30px (`text-3xl`) and the display font of the design system.
5. WHEN the user types digits in "Valor (R$)" THEN the system SHALL show them formatted as pt-BR currency text with thousands dots and two decimals, filling the cents from the right (typing `1`, `2`, `3`, `4`, `5`, `6` shows `0,01`, `0,12`, `1,23`, `12,34`, `123,45`, `1.234,56`).
6. WHEN the user types a non-digit character in "Valor (R$)" THEN the system SHALL ignore it and keep the current text.
7. WHEN the user clears the "Valor (R$)" input THEN the system SHALL show an empty field with the placeholder `0,00`.
8. WHILE tipo Ganho is selected the system SHALL render the valor text in the `success` color token.
9. WHEN the user saves THEN the system SHALL send to the action the same pt-BR text shown in the field (e.g. `1.234,56`) and the system SHALL NOT change the shape of the action input.
10. IF the valor is empty on save THEN the system SHALL show "Informe o valor" under the valor input.
11. WHEN the typed digits are all zeros THEN the system SHALL show the field empty (so `0` and `0,00` can never be submitted and backspace always reaches the empty state).

**Independent Test**: Digitar `123456` no valor e ver `1.234,56`; alternar para Ganho e ver o valor em verde e a categoria sumir.

---

### P1: Cancelar e excluir no rodapé ⭐ MVP

**User Story**: Como usuário, quero "Cancelar" e "Excluir" no modal de edição, para sair ou apagar sem voltar à lista.

**Why P1**: A edição hoje só tem "Salvar"; faltar saída explícita e exclusão foi apontado como lacuna crítica.

**Acceptance Criteria**:

1. WHEN the new-transaction modal is open THEN the system SHALL show the buttons "Cancelar" and "Salvar" in the footer and SHALL NOT show "Excluir".
2. WHEN the edit modal is open THEN the system SHALL show the buttons "Excluir", "Cancelar" and "Salvar alterações" in the footer.
3. WHEN the user activates "Cancelar" THEN the system SHALL close the modal without calling any action.
4. WHEN the user activates "Excluir" THEN the system SHALL open the existing confirmation dialog with the same title and description the list uses today, for the same transaction and month.
5. WHEN the user confirms the exclusion THEN the system SHALL call `deleteTransaction(id, month)`, close both dialogs and remove the transaction from the list without a manual reload.
6. IF `deleteTransaction` returns an error THEN the system SHALL keep the confirmation dialog open and show the returned error message with `role="alert"`.
7. WHILE a save or delete is pending the system SHALL disable "Salvar"/"Salvar alterações" and "Excluir".
8. The "Excluir" button SHALL use the `destructive` variant and SHALL be visually separated from "Cancelar" and the primary button (aligned to the opposite edge of the footer).

**Independent Test**: Abrir a edição de uma transação, clicar em "Excluir", confirmar e ver a linha sumir; reabrir outra e clicar em "Cancelar" sem alterar dados.

---

### P2: Recorrência por switch

**User Story**: Como usuário, quero um switch "Transação recorrente" que revela a frequência e o mês final, para não ver 3 radios em todo lançamento.

**Why P2**: Reduz altura e ruído, mas a função já existe e funciona nos radios.

**Acceptance Criteria**:

1. The transaction form SHALL render a switch with `role="switch"` and accessible name "Transação recorrente".
2. WHEN the form opens for a new transaction THEN the system SHALL show the switch off and SHALL NOT show "Frequência" nor "Mês final".
3. WHEN the user turns the switch on THEN the system SHALL set `recurrence` to `forever` and SHALL show a radiogroup named "Frequência" with the options "Todo mês, sem data final" (selected) and "Todo mês, até um mês/ano".
4. WHEN the user selects "Todo mês, até um mês/ano" THEN the system SHALL show the "Mês final" month input.
5. WHEN the user selects "Todo mês, sem data final" THEN the system SHALL hide the "Mês final" input.
6. WHEN the user turns the switch off THEN the system SHALL set `recurrence` to `none`, hide "Frequência" and "Mês final", and clear the typed mês final.
7. WHEN the edit form opens for a series with `recurrence` `forever` or `until` THEN the system SHALL show the switch on with the matching option selected and, for `until`, the "Mês final" filled.
8. IF the user saves with "Todo mês, até um mês/ano" and an empty "Mês final" THEN the system SHALL show "Informe o mês final" under the "Mês final" input.

**Independent Test**: Ligar o switch, escolher "até um mês/ano", preencher o mês e salvar; reabrir a edição e ver o switch ligado com o mês preenchido.

---

### P2: Rodapé fixo no mobile e modal contido na tela

**User Story**: Como usuário no celular, quero o botão de salvar sempre visível na base do modal, para alcançá-lo com o polegar sem rolar.

**Why P2**: Melhora ergonomia, mas depende das P1 já reduzirem a altura.

**Acceptance Criteria**:

1. WHILE the viewport width is below 640px the system SHALL keep the footer fixed at the bottom of the modal and SHALL render the primary button at full width.
2. WHILE the form content is taller than the modal the system SHALL scroll the content above the footer and SHALL keep the footer visible.
3. WHILE the viewport width is 640px or more the system SHALL render the footer buttons at their natural width on one row.
4. The transaction modal SHALL NOT exceed `100dvh - 2rem` in height.
5. WHEN the modal opens THEN the system SHALL move focus to the valor input.

**Independent Test**: No viewport 390×844 abrir o modal com o teclado de rolagem e ver "Salvar" sempre na base.

---

### P3: Corte de espaço vertical na edição de gasto simples

**User Story**: Como usuário, quero ver o formulário inteiro de um gasto simples sem rolar no celular.

**Why P3**: Consequência desejável das histórias acima; serve de meta mensurável.

**Acceptance Criteria**:

1. WHEN the new-transaction modal opens at viewport 390×844 with tipo Gasto, no category selected and recorrência off THEN the system SHALL render every field and the footer inside the modal without vertical scroll.

**Independent Test**: Abrir o modal em 390×844 e conferir que `scrollHeight` do conteúdo é menor ou igual a `clientHeight`.

---

## Edge Cases

- IF the user switches tipo from Gasto to Ganho with a category selected THEN the system SHALL send no `categoryId` nor `subcategoryId` on save (schema rejects them for income).
- IF the user switches back from Ganho to Gasto in the same session THEN the system SHALL restore the previously selected category and subcategory.
- WHEN the valor reaches 11 digits (maximum R$ 999.999.999,99) THEN the system SHALL ignore further digits.
- IF the category list is empty and tipo is Gasto THEN the system SHALL show the link "Crie suas categorias primeiro" and SHALL disable the primary button.
- IF the edited transaction has a category that no longer appears in the list THEN the system SHALL show the "Categoria" select on its placeholder and the save SHALL fail with "Selecione uma categoria".
- WHEN the user double-clicks "Salvar" THEN the system SHALL create exactly one transaction (id generated on mount, as today).

---

## Requirement Traceability

| Requirement ID | Story                                           | Phase  | Status  |
| -------------- | ----------------------------------------------- | ------ | ------- |
| MODT-01        | P1: Categoria e subcategoria em dois campos     | Design | Pending |
| MODT-02        | P1: Categoria e subcategoria em dois campos     | Design | Pending |
| MODT-03        | P1: Tipo e valor em destaque, na ordem         | Design | Pending |
| MODT-04        | P1: Tipo e valor em destaque, na ordem         | Design | Pending |
| MODT-05        | P1: Tipo e valor em destaque, na ordem         | Design | Pending |
| MODT-06        | P1: Cancelar e excluir no rodapé                | Design | Pending |
| MODT-07        | P1: Cancelar e excluir no rodapé                | Design | Pending |
| MODT-08        | P1: Cancelar e excluir no rodapé                | Design | Pending |
| MODT-09        | P2: Recorrência por switch                      | -      | Pending |
| MODT-10        | P2: Recorrência por switch                      | -      | Pending |
| MODT-11        | P2: Rodapé fixo no mobile e modal contido       | -      | Pending |
| MODT-12        | P3: Corte de espaço vertical                    | -      | Pending |

Mapeamento dos critérios: MODT-01 = categoria AC1-AC5, AC7, AC8; MODT-02 = categoria AC6 e edge case de categoria removida; MODT-03 = tipo/valor AC1-AC3; MODT-04 = valor AC4-AC8 e limite de 11 dígitos; MODT-05 = valor AC9-AC11; MODT-06 = rodapé AC1-AC3; MODT-07 = rodapé AC4-AC6; MODT-08 = rodapé AC7-AC8; MODT-09 = switch AC1-AC8; MODT-10 = edge cases de tipo; MODT-11 = rodapé mobile AC1-AC5; MODT-12 = P3 AC1.

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️

---

## Success Criteria

- [ ] Um gasto simples é lançado no celular (390×844) sem rolar o modal.
- [ ] Editar e excluir uma transação é possível sem sair do modal de edição.
- [ ] Nenhuma mudança em `src/actions/transactions.ts`, `src/lib/validation/transaction.ts` ou no schema do banco; os testes de integração e de validação existentes seguem verdes.
