# Lista de Transações: Filtros e Ações Specification

## Problem Statement

Em "Transações do mês" (Resumo), busca e filtros empilham em três linhas e ocupam muito espaço vertical no desktop. Cada linha tem os textos soltos "Editar" e "Excluir", que poluem a tabela e favorecem cliques acidentais. Em telas grandes o botão flutuante "+" se perde no canto inferior direito; falta uma ação primária visível no bloco.

## Goals

- [ ] No desktop (≥ 768px), busca, categoria e subcategoria ficam na mesma linha horizontal.
- [ ] Cada linha da lista expõe Editar e Excluir por um único menu "⋯", sem textos soltos.
- [ ] No desktop, o bloco "Transações do mês" tem um botão primário "Nova transação" no cabeçalho.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar a lógica de filtro/busca (parâmetros `?categoria=`, `?subcategoria=`, `?busca=`, debounce de 300 ms) | Só o layout muda. |
| Mudar o diálogo de confirmação de exclusão e o formulário de edição | Reaproveitados como estão. |
| Ícones de lápis/lixeira no hover | Descartado a favor do menu "⋯", que funciona em toque. |
| Botão "Nova transação" em outras páginas | O pedido trata do Resumo. |
| Outros itens do backlog (seletor de mês, percentuais, gráfico redundante) | Specs próprias. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Menu "⋯" ou ícones no hover | Menu "⋯" (dropdown) | O pedido aceita ambos; hover não existe em toque e o menu evita cliques acidentais | n |
| Itens do menu | "Editar" e "Excluir"; "Excluir" continua abrindo a confirmação existente | Mantém a proteção contra exclusão acidental | n |
| Nome acessível do gatilho do menu | "Ações do lançamento" | Texto fixo e testável; a descrição pode ser vazia em transações antigas | n |
| Breakpoint de "desktop" | ≥ 768px (`md`, o mesmo do botão flutuante atual) | Coerência com o breakpoint já usado | n |
| Botão flutuante em desktop | Permanece em todas as larguras, inalterado | Decisão do usuário: manter o "+" no desktop mesmo redundante com o botão do cabeçalho | y |
| Botão do cabeçalho em mobile | Oculto em < 768px | O flutuante já cobre o mobile | n |
| Nome acessível duplicado no desktop | Os dois botões se chamam "Nova transação"; testes escopam pelo bloco da lista ou pelo `fixed` do flutuante | Manter o texto pedido no backlog e o nome atual do flutuante | n |
| Rótulo do botão | "Nova transação" (texto do backlog; nome já usado pelo flutuante) | O título do modal continua "Registrar Lançamento" | n |
| Rótulos dos campos de filtro | Mantidos visíveis ("Buscar por descrição", "Filtrar por categoria", "Filtrar por subcategoria") | Acessibilidade e testes existentes; só a disposição muda | n |
| Layout abaixo de 768px | Campos empilhados como hoje | O pedido restringe a mudança ao desktop | n |
| Mesmo modal para os dois botões | Ambos abrem o mesmo formulário em branco (tipo Gasto, data de hoje) | Regra única, herda LANC-04 de lancamento-flutuante | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: state-transition integrity (cobertas em LISTA-04/05, menu e confirmação); remaining dimensions N/A for this scope (sem persistência nova, auth, concorrência ou chamadas externas: só apresentação).

---

## User Stories

### P1: Filtros em uma linha ⭐ MVP

**User Story**: Como usuário no desktop, quero busca e filtros na mesma linha, para ver mais transações sem rolar.

**Why P1**: Primeiro item do pedido; ganho vertical direto.

**Acceptance Criteria**:

1. WHILE the viewport width is ≥ 768px the "Transações do mês" block SHALL render the search field, the categoria select and the subcategoria select side by side on one row (same vertical offset, within 2px).
2. WHILE the viewport width is < 768px the block SHALL render the three controls stacked vertically.
3. The three controls SHALL keep their visible labels "Buscar por descrição", "Filtrar por categoria" and "Filtrar por subcategoria".
4. WHEN the user types in the search field or changes a select THEN the system SHALL update `?busca=`, `?categoria=` and `?subcategoria=` exactly as before this change.

**Independent Test**: A 1280px de largura, abrir `/` e verificar que os três campos têm a mesma posição vertical; a 390px, que estão empilhados.

---

### P1: Menu de ações por linha ⭐ MVP

**User Story**: Como usuário, quero um menu "⋯" em cada transação, para editar ou excluir sem textos soltos e sem clicar sem querer.

**Why P1**: Segundo item do pedido.

**Acceptance Criteria**:

1. The system SHALL NOT render "Editar" or "Excluir" as always-visible buttons in a transaction row.
2. The system SHALL render in each row one button with accessible name "Ações do lançamento", showing a "⋯" icon.
3. WHEN the user activates the "Ações do lançamento" button THEN the system SHALL open a menu with exactly two items, "Editar" and "Excluir".
4. WHEN the user selects "Editar" THEN the system SHALL open the "Editar Lançamento" form for that row's transaction.
5. WHEN the user selects "Excluir" THEN the system SHALL open the "Excluir transação?" (or, for recurring, "Excluir esta e as próximas ocorrências?") confirmation dialog without deleting anything yet.
6. WHEN the user presses Esc with the menu open THEN the system SHALL close the menu without opening any dialog.
7. The "Ações do lançamento" button SHALL be operable by keyboard (Tab to focus, Enter or Space to open, arrow keys to move between items).

**Independent Test**: Em `/` com uma transação, ver que não há textos "Editar"/"Excluir" soltos; abrir o menu, escolher Excluir, ver a confirmação e que a linha segue na lista até confirmar.

---

### P1: Botão "Nova transação" no cabeçalho do bloco ⭐ MVP

**User Story**: Como usuário no desktop, quero um botão primário "Nova transação" no bloco de transações, para achar a ação principal sem procurar o "+" no canto.

**Why P1**: Terceiro item do pedido.

**Acceptance Criteria**:

1. WHILE the viewport width is ≥ 768px the "Transações do mês" block header SHALL show a primary-style button with the visible text "Nova transação" and a "+" icon.
2. WHEN the user clicks that button THEN the system SHALL open the "Registrar Lançamento" modal with the form blank, tipo Gasto and data de hoje (America/Sao_Paulo).
3. The system SHALL show the floating "+" button, with accessible name "Nova transação", at every viewport width.
4. WHILE the viewport width is < 768px the system SHALL NOT show the header button.
5. WHEN the user saves a valid transaction from either button THEN the system SHALL close the modal and show the new transaction in the list.

**Independent Test**: A 1280px, ver o botão "Nova transação" no cabeçalho do bloco e o "+" flutuante; clicar, salvar um gasto e vê-lo na lista. A 390px, ver só o "+" flutuante. Os dois abrem o mesmo modal.

---

## Edge Cases

- IF the transaction has no description THEN the menu button SHALL still be named "Ações do lançamento" and the row SHALL open Editar/Excluir normally.
- WHEN the menu opens for the last row of the list THEN the menu SHALL stay fully inside the viewport (flips upward if needed).
- WHILE the list is empty THEN the system SHALL still show the header "Nova transação" button (≥ 768px).
- WHEN the user deletes a transaction from the "Editar" form THEN the system SHALL keep today's behavior (confirmation dialog, then close both).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LISTA-01 | P1: Filtros em uma linha (AC 1-3) | Implementing | Pending |
| LISTA-02 | P1: Filtros em uma linha (AC 4) | Implementing | Pending |
| LISTA-03 | P1: Menu de ações (AC 1-2) | Implementing | Pending |
| LISTA-04 | P1: Menu de ações (AC 3-4, 6-7) | Implementing | Pending |
| LISTA-05 | P1: Menu de ações (AC 5) | Implementing | Pending |
| LISTA-06 | P1: Botão no cabeçalho (AC 1-2, 5) | Implementing | Pending |
| LISTA-07 | P1: Botão no cabeçalho (AC 3-4) | Implementing | Pending |

**Coverage:** 7 total, 0 mapped to tasks, 7 unmapped ⚠️

---

## Success Criteria

- [ ] A 1280px a área de filtros ocupa uma linha; a 390px não muda.
- [ ] Nenhum texto "Editar"/"Excluir" visível numa linha sem abrir o menu.
- [ ] A 1280px ficam visíveis o botão "Nova transação" do cabeçalho e o "+" flutuante; a 390px, só o flutuante.
