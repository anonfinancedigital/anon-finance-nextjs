# Lançamento Flutuante Specification

## Problem Statement

O formulário "Nova transação" ocupa espaço fixo na página Resumo, empurrando os dados para baixo. O usuário quer registrar gastos e ganhos a partir de um botão flutuante "+" que abre um modal, e quer que toda transação tenha descrição, para identificar o lançamento na lista.

## Goals

- [ ] O formulário de nova transação deixa de aparecer fixo no Resumo e passa a abrir em um modal acionado por um botão flutuante "+".
- [ ] Nenhuma transação nova ou editada é salva sem descrição.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Botão flutuante nas demais páginas (ex.: Categorias) | O pedido trata do Resumo; o botão cobre só essa página. |
| Tornar a coluna `description` NOT NULL no banco / migrar transações antigas | Transações já salvas sem descrição continuam válidas; a regra vale para novas gravações. |
| Mudar a edição inline na lista de transações | A edição já usa o mesmo formulário; ela herda só a regra de descrição obrigatória. |
| Atalho de teclado para abrir o modal | Não pedido. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Onde o botão aparece | Somente na página Resumo (`/`) | O pedido diz "não precisa mais ter ele fixo no resumo"; as outras páginas não lançam transações | y |
| Comportamento após salvar | O modal fecha e a lista, os totais e os gráficos refletem a nova transação | Hoje o formulário limpa e mantém aberto para entrada sequencial; num modal, fechar é o padrão e o botão reabre em um toque | y |
| Descrição obrigatória na edição | Vale também ao editar; editar uma transação antiga sem descrição exige preenchê-la | Uma regra única no schema de validação evita dois caminhos | y |
| Descrição só com espaços | Conta como vazia (o schema já faz `trim`) | Consistente com o `trim` existente | n |
| Limite da descrição | Mantém 120 caracteres | Limite já existente na coluna e no schema | y |
| Estado do formulário ao reabrir | Formulário em branco (tipo Gasto, data de hoje) | Evita reaproveitar valores de um lançamento já salvo | n |
| Fechar sem salvar | Esc, clique fora ou botão fechar descartam o que foi digitado | Comportamento padrão do Dialog existente | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation (coberta em LANC-04/05), failure states (LANC-06); remaining dimensions N/A for this scope (sem concorrência nova, auth inalterada: a action já exige sessão, retenção e observabilidade não mudam).

---

## User Stories

### P1: Registrar transação pelo botão flutuante ⭐ MVP

**User Story**: Como usuário, quero um botão "+" flutuante que abre um modal de nova transação, para registrar gastos e ganhos sem um formulário ocupando o Resumo.

**Why P1**: É o núcleo do pedido.

**Acceptance Criteria**:

1. The Resumo page SHALL NOT render the "Nova transação" form inline.
2. The Resumo page SHALL show a "+" button fixed at the bottom-right corner of the viewport, with accessible name "Nova transação".
3. WHEN the user clicks the "+" button THEN the system SHALL open a modal containing the transaction form with the Gasto/Ganho choice, valor, data, categoria, subcategoria and descrição fields.
4. WHEN the modal opens THEN the form SHALL start blank, with tipo Gasto and data de hoje (America/Sao_Paulo).
5. WHEN the user saves a valid transaction THEN the system SHALL close the modal and show the new transaction in "Transações do mês" and in the month totals without a manual reload.
6. WHEN the user presses Esc or clicks outside the modal THEN the system SHALL close it without saving.
7. WHILE the modal is open the system SHALL keep the "+" button from covering the modal content (the button stays behind the modal overlay).

**Independent Test**: Abrir `/`, ver que não há formulário na página, clicar em "+", preencher e salvar um gasto, e ver o modal fechar e a linha aparecer na lista.

---

### P1: Descrição obrigatória ⭐ MVP

**User Story**: Como usuário, quero que toda transação tenha descrição, para reconhecê-la depois na lista.

**Why P1**: Segundo requisito explícito do pedido.

**Acceptance Criteria**:

1. IF the description is empty or contains only whitespace THEN the system SHALL reject the create or update with the field error "Informe a descrição" and SHALL NOT save the transaction.
2. IF the description exceeds 120 characters THEN the system SHALL reject it with "A descrição deve ter no máximo 120 caracteres".
3. The form SHALL label the field "Descrição" without the "(opcional)" suffix.
4. IF the server rejects the description THEN the form SHALL show the error under the descrição field and keep the modal open with the typed values.
5. WHEN the user edits an existing transaction THEN the system SHALL apply the same required-description rule.

**Independent Test**: Enviar o formulário com descrição vazia e ver "Informe a descrição" sem criar a linha; preencher e ver salvar.

---

## Edge Cases

- IF the user has no categories and chooses Gasto THEN the modal SHALL show the existing "Crie suas categorias primeiro" link and the Salvar button SHALL stay disabled.
- WHEN the user double-clicks Salvar THEN the system SHALL create a single transaction (id gerado ao abrir o formulário, como hoje).
- IF the save fails for a non-field reason THEN the modal SHALL stay open and show the error message.
- WHEN the viewport is 360px wide THEN the "+" button SHALL stay fully visible and tappable (mínimo 44×44 px) without overlapping the page's main content controls permanently (a página tem espaço inferior para rolar além do botão).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LANC-01 | P1: Registrar pelo botão flutuante (AC 1: sem formulário inline) | Specify | Implemented |
| LANC-02 | P1: Registrar pelo botão flutuante (AC 2: botão "+" fixo) | Specify | Implemented |
| LANC-03 | P1: Registrar pelo botão flutuante (AC 3, 4, 5, 6, 7: modal, abertura em branco, salvar e fechar, descartar) | Specify | Implemented |
| LANC-04 | P1: Descrição obrigatória (AC 1, 2, 5: validação no schema para criar e editar) | Specify | Implemented |
| LANC-05 | P1: Descrição obrigatória (AC 3: rótulo sem "opcional") | Specify | Implemented |
| LANC-06 | P1: Descrição obrigatória (AC 4) e Edge Cases de falha | Specify | Implemented |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped ⚠️

---

## Success Criteria

- [ ] Registrar uma transação leva um clique no "+", o preenchimento e um clique em Salvar, sem sair do Resumo.
- [ ] Zero transações criadas ou editadas com descrição vazia.
- [ ] O Resumo não tem mais o bloco "Nova transação" inline.
