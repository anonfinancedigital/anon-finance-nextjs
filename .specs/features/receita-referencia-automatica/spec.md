# Receita de Referência Automática Specification

## Problem Statement

Na tela de Categorias o campo "Receita de referência (R$)" começa vazio e o usuário digita a receita toda vez, mesmo já tendo lançado os ganhos do mês. A feature pré-preenche o campo com o total de ganhos do mês corrente e, sem ganhos, mantém o comportamento atual (campo vazio com placeholder).

## Goals

- [ ] Ao abrir Categorias com ganhos no mês corrente, o campo vem preenchido com o total de ganhos e cada categoria já mostra seu valor em R$.
- [ ] Sem ganhos no mês corrente, a tela se comporta exatamente como hoje.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Seletor de mês na tela de Categorias | Não pedido; usa o mês corrente |
| Salvar a receita de referência no banco | Continua sendo valor de simulação (spec simulacao-categorias) |
| Fallback para o mês anterior ou média de meses | Não pedido; sem ganhos o campo fica vazio |
| Indicar na UI que o valor veio dos ganhos | Não pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| "Total de ganhos" | Soma das transações de tipo receita do mês corrente, a mesma de `monthTotals().incomeCents` usada no card "Receita" do resumo (inclui recorrentes) | Um único número de receita no app | y |
| Qual mês | Mês corrente em America/Sao_Paulo (mesma regra do resumo sem `?mes=`) | A tela não tem seletor de mês | y |
| "Não existe" | Total igual a 0 centavos (nenhuma transação de receita aplicável no mês) | Campo exige valor > 0 em `parseBRL` | n |
| Formato do valor inicial | Texto no padrão de entrada do campo, sem "R$" (ex.: "5.000,00") | Parseável por `parseBRL` | n |
| Edição | O campo continua editável; o usuário pode trocar o valor sem afetar os ganhos reais | Continua simulação | n |
| Total acima do limite do campo (> R$ 999.999.999,99) | Campo vazio com placeholder | `parseBRL` rejeitaria; evita erro na abertura | n |
| Após salvar categorias | Valor digitado pelo usuário é mantido (comportamento atual); o valor inicial só vale ao abrir a tela | Não sobrescreve edição em andamento | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Receita de referência vem dos ganhos ⭐ MVP

**User Story**: As o usuário do orçamento, I want ver a receita de referência já preenchida com meus ganhos so that eu simule os percentuais com a minha receita real sem digitar.

**Why P1**: É o pedido inteiro.

**Acceptance Criteria**:

1. WHEN o usuário abre Categorias e o total de ganhos do mês corrente é maior que zero THEN o sistema SHALL preencher "Receita de referência (R$)" com esse total formatado em BRL sem o prefixo "R$".
2. WHEN o campo é preenchido com o total de ganhos THEN o sistema SHALL mostrar em cada categoria com percentual válido o valor em R$ correspondente, sem ação do usuário.
3. IF o total de ganhos do mês corrente é zero THEN o sistema SHALL exibir o campo vazio com o placeholder "5.000,00".
4. IF o total de ganhos excede R$ 999.999.999,99 THEN o sistema SHALL exibir o campo vazio com o placeholder "5.000,00".
5. WHEN o usuário edita o campo preenchido THEN o sistema SHALL recalcular os valores em R$ com o valor digitado.
6. The sistema SHALL NOT persistir a receita de referência nem alterar transações ao preencher ou editar o campo.

**Independent Test**: Com uma receita de R$ 5.000,00 no mês corrente, abrir Categorias e ver o campo "5.000,00" e valores em R$ nas categorias; sem receitas, ver o campo vazio com placeholder.

---

## Edge Cases

- IF o usuário não tem categorias THEN o sistema SHALL mostrar o campo preenchido com o total de ganhos e nenhuma linha de valor.
- WHEN o total de ganhos é R$ 0,01 THEN o sistema SHALL preencher o campo com "0,01".

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REFINC-01 | P1: Receita vem dos ganhos | - | Pending |
| REFINC-02 | P1: Receita vem dos ganhos | - | Pending |
| REFINC-03 | P1: Receita vem dos ganhos | - | Pending |
| REFINC-04 | P1: Receita vem dos ganhos | - | Pending |
| REFINC-05 | P1: Receita vem dos ganhos | - | Pending |
| REFINC-06 | P1: Receita vem dos ganhos | - | Pending |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped ⚠️

---

## Success Criteria

- [ ] Com ganhos no mês, o usuário vê os valores em R$ por categoria ao abrir a tela sem digitar nada.
- [ ] Sem ganhos, a tela é idêntica à de hoje.
