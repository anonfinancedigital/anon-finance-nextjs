# Busca de Transações Specification

## Problem Statement

A lista "Transações do mês" já filtra por categoria e subcategoria (`?categoria=`, `?subcategoria=`), mas não há como achar um lançamento pela descrição. Com muitos lançamentos no mês, o usuário rola a lista inteira para encontrar um gasto específico.

## Goals

- [ ] O usuário encontra transações do mês digitando parte da descrição.
- [ ] A busca combina com o filtro de categoria e subcategoria já existente (ambos valem ao mesmo tempo).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Refazer o filtro por categoria e subcategoria | Já implementado em `TransactionFilter`; esta feature só o mantém funcionando junto com a busca. |
| Busca por valor, data ou tipo | Não pedido. |
| Busca entre meses | A lista é do mês selecionado; a busca age sobre ele. |
| Busca no servidor / paginação | A lista do mês já é carregada inteira; filtra-se em memória como o filtro atual. |
| Mudar o resumo, totais e gráficos | Seguem mostrando o mês inteiro, como no filtro atual. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Estado da busca | Parâmetro de URL `?busca=` | Mesmo padrão do filtro atual; sobrevive a recarregar e a trocar de mês | n |
| Tipo de correspondência | Trecho contido na descrição, sem diferenciar maiúsculas/minúsculas nem acentos | Busca tolerante é o esperado em português ("cafe" acha "Café") | n |
| Texto só com espaços | Conta como busca vazia (`trim`) | Consistente com o tratamento de descrição existente | n |
| Transações sem descrição (antigas) | Não aparecem enquanto há busca ativa | Não há texto a casar | n |
| Receitas com busca ativa | A busca inclui ganhos e gastos | Descrição vale para ambos; só o filtro de categoria esconde ganhos (comportamento existente, mantido) | n |
| Momento de aplicar | Atualiza enquanto digita, com atraso de 300 ms | Evita uma navegação por tecla | n |
| Limite do texto | 120 caracteres, igual à descrição | Limite já existente | n |
| Trocar de mês | Mantém a busca e o filtro | O `MonthPicker` monta o link a partir dos `searchParams` atuais (`monthHref`); a confirmar no design que preserva `busca` | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation (BUSCA-04); remaining dimensions N/A for this scope (somente leitura, sem persistência, auth inalterada pois a página já exige sessão, sem chamadas externas).

---

## User Stories

### P1: Buscar transações por descrição ⭐ MVP

**User Story**: Como usuário, quero buscar pela descrição na lista "Transações do mês", para achar um lançamento sem rolar a lista toda.

**Why P1**: É o pedido.

**Acceptance Criteria**:

1. The "Transações do mês" section SHALL show a search field labeled "Buscar por descrição" next to the category and subcategory filters.
2. WHEN the user types text in the search field THEN the system SHALL list only transactions whose description contains the text, ignoring case and accents.
3. WHEN the search text is empty or only whitespace THEN the system SHALL list all transactions allowed by the category and subcategory filter.
4. IF the search text exceeds 120 characters THEN the system SHALL ignore the excess beyond 120 characters.
5. WHILE a search is active the system SHALL NOT list transactions without a description.
6. IF no transaction matches the search THEN the list SHALL show "Nenhuma transação encontrada para esta busca".

**Independent Test**: Criar "Café da manhã" e "Aluguel", digitar "cafe" e ver só a primeira; limpar o campo e ver as duas.

---

### P1: Busca combinada com o filtro ⭐ MVP

**User Story**: Como usuário, quero usar a busca junto com categoria e subcategoria, para estreitar a lista.

**Why P1**: O pedido trata os três controles como uma só ferramenta.

**Acceptance Criteria**:

1. WHEN a category filter and a search text are both active THEN the system SHALL list only transactions that satisfy both.
2. WHEN the user changes the category THEN the system SHALL keep the search text.
3. WHEN the user changes the month THEN the system SHALL keep the search text and the category and subcategory filter.
4. The search text SHALL live in the URL as `?busca=` so that reloading the page keeps it.
5. The summary cards, "Gastos por categoria" table and charts SHALL keep showing the whole month regardless of the search.

**Independent Test**: Filtrar por "Alimentação", buscar "cafe": a lista mostra só os cafés de Alimentação; recarregar mantém o resultado.

---

## Edge Cases

- WHEN a recurring occurrence is projected into the month list THEN the search SHALL match it by its description like any other transaction.
- WHEN the search contains regex or SQL characters (`%`, `_`, `(`, `*`) THEN the system SHALL match them as literal text.
- WHEN the user types quickly THEN the system SHALL update the URL at most once per 300 ms pause.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| BUSCA-01 | P1: Buscar por descrição (AC 1: campo rotulado) | Specify | Pending |
| BUSCA-02 | P1: Buscar por descrição (AC 2, 3, 5 e Edge Cases: correspondência) | Specify | Pending |
| BUSCA-03 | P1: Buscar por descrição (AC 6: estado vazio) | Specify | Pending |
| BUSCA-04 | P1: Buscar por descrição (AC 4: limite de 120) | Specify | Pending |
| BUSCA-05 | P1: Busca combinada (AC 1, 2: combina com o filtro) | Specify | Pending |
| BUSCA-06 | P1: Busca combinada (AC 3, 4: URL e troca de mês) | Specify | Pending |
| BUSCA-07 | P1: Busca combinada (AC 5: resumo inalterado) | Specify | Pending |

**Coverage:** 7 total, 0 mapped to tasks, 7 unmapped ⚠️

---

## Success Criteria

- [ ] Achar um lançamento pela descrição leva digitar um trecho, sem rolar a lista.
- [ ] Busca e filtro por categoria e subcategoria funcionam juntos e sobrevivem a recarregar a página.
- [ ] Totais, tabela de categorias e gráficos não mudam com a busca.
