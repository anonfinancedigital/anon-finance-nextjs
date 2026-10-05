# Resumo: Visões da Categoria e Ritmo de Gastos Specification

## Problem Statement

Na Visão Geral, o card "Gasto × meta por categoria" repete os dados da tabela "Gastos por categoria" (meta, gasto e consumo), então a página mostra a mesma informação duas vezes. O gráfico ocupa o lugar de uma visão que acrescentaria algo novo: a velocidade com que o orçamento do mês é consumido, dia a dia.

## Goals

- [ ] O card "Gastos por categoria" alterna entre Tabela e Barras, sem exibir os dois ao mesmo tempo.
- [ ] O card "Gasto × meta por categoria" deixa de existir como card separado.
- [ ] Um novo card "Ritmo de gastos" mostra o gasto acumulado por dia do mês contra o ritmo ideal da meta total.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Alterar o donut "Participação no gasto do mês" | Mostra informação distinta; segue como está. |
| Ritmo por categoria ou por subcategoria | O pedido trata do ritmo do mês inteiro. |
| Projeção de fechamento do mês (extrapolar o ritmo atual) | Não pedido; evita regra de previsão. |
| Persistir a visão escolhida (URL, cookie, localStorage) | Não pedido; a escolha vale só na sessão da página. |
| Novas consultas ao banco | O ritmo usa as ocorrências do mês que a página já carrega. |
| Outros itens do backlog (seletor de data, percentuais, filtros) | Specs próprias. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Posição do seletor | Dentro do card "Gastos por categoria", na área de ação do cabeçalho, com duas opções: "Tabela" e "Barras" | Pedido do usuário: seletor no próprio card | y |
| Visão inicial | "Tabela" | A tabela é a visão principal e hoje é o que o usuário vê primeiro | n |
| Título do card ao alternar | O título permanece "Gastos por categoria" nas duas visões; o conteúdo "Barras" é o gráfico hoje chamado "Gasto × meta por categoria" | Um card, um título; a visão é indicada pelo seletor | n |
| Escolha de visão | Estado local do cliente; volta a "Tabela" ao recarregar ou trocar de mês | Persistência fora do escopo | n |
| Série do ritmo | Gasto acumulado (soma de despesas, em centavos) ao fim de cada dia, do dia 1 ao último dia do mês | "Velocidade de queima do orçamento ao longo dos 30 dias" | n |
| Linha de referência | Reta do ritmo ideal: meta total do mês (soma das metas das categorias) dividida igualmente entre os dias, acumulada | Dá o que comparar; sem ela a curva não diz se o ritmo está bom | n |
| Despesas recorrentes | Contam na data da ocorrência projetada do mês, igual à lista de transações | Coerência com AD-004 | n |
| Receitas | Não entram na série | O gráfico mede consumo do orçamento de gastos | n |
| Mês corrente | A curva de gasto termina no dia de hoje (America/Sao_Paulo); os dias futuros mostram só a referência | Não existe gasto futuro conhecido; uma curva plana até o fim sugeriria ritmo parado | n |
| Mês passado | Curva completa até o último dia do mês | Todos os dias já ocorreram | n |
| Mês futuro | Curva de gasto vazia dos dias sem ocorrência passada; mostra só a referência | Mesma regra: sem dias decorridos não há curva | n |
| Meta total zero | Sem linha de referência; só a curva de gasto | Evita referência plana em zero que parece dado | n |
| Mês sem gastos | Mensagem "Sem gastos no mês" no lugar do gráfico, igual ao donut | Padrão já usado em "Participação no gasto do mês" | n |
| Posição do card | Na grade de duas colunas (lg), ao lado do donut, no lugar do gráfico de barras atual | Reaproveita o espaço liberado | n |
| Gasto acima da meta total | A curva ultrapassa a referência; o rótulo textual "Acima do ritmo ideal" aparece junto ao gráfico | Cor sozinha não basta para acessibilidade | n |
| Gasto de investimento (categoria de aporte) | Entra na série como qualquer despesa | O resumo trata aporte como categoria; separar é outro pedido do backlog | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation & bounds (meses de 28 a 31 dias, meta zero, mês sem gastos), state-transition integrity (alternância Tabela/Barras), concurrency N/A; remaining dimensions N/A for this scope (somente apresentação de dados já carregados: sem persistência nova, auth, chamadas externas ou expiração).

---

## User Stories

### P1: Seletor Tabela / Barras no card de categorias ⭐ MVP

**User Story**: Como usuário, quero alternar o card "Gastos por categoria" entre tabela e barras, para ver os mesmos dados na forma que prefiro sem duplicar a página.

**Why P1**: Elimina a redundância apontada no backlog.

**Acceptance Criteria**:

1. The "Gastos por categoria" card SHALL show a selector with exactly two options, "Tabela" and "Barras", in its header.
2. WHEN the page loads THEN the system SHALL select "Tabela" and render the summary table in the card.
3. WHEN the user selects "Barras" THEN the system SHALL replace the table with the spent × target bar chart in the same card.
4. WHEN the user selects "Tabela" after "Barras" THEN the system SHALL show the summary table again with its subcategory expansion state reset.
5. WHILE one view is selected the system SHALL NOT render the other view in the page.
6. The system SHALL NOT render a card titled "Gasto × meta por categoria".
7. The selector SHALL expose the selected option to assistive technology (selected state) and SHALL be operable by keyboard (Tab to focus, arrow keys to move between options).
8. IF the month has no categories THEN the system SHALL show the existing "Crie suas categorias primeiro" link and SHALL NOT show the selector.

**Independent Test**: Em `/` com categorias, ver a tabela e o seletor; escolher "Barras" e ver o gráfico no lugar da tabela; voltar a "Tabela". Não existe mais o card "Gasto × meta por categoria".

---

### P1: Card "Ritmo de gastos" ⭐ MVP

**User Story**: Como usuário, quero ver como o gasto acumulado evolui dia a dia contra o ritmo ideal da meta, para saber se estou queimando o orçamento rápido demais.

**Why P1**: Substitui o gráfico redundante por informação nova.

**Acceptance Criteria**:

1. The Visão Geral page SHALL render a card titled "Ritmo de gastos" in the charts grid, beside "Participação no gasto do mês".
2. The chart SHALL plot one point per calendar day of the selected month, from day 1 to the month's last day (28 to 31 points).
3. The spent curve value on day D SHALL equal the sum, in cents, of expense occurrences dated day 1 through day D of the selected month, recurring occurrences included at their projected date.
4. The spent curve SHALL NOT include income transactions.
5. WHERE the month's total target is greater than zero the chart SHALL draw a reference line whose value on day D equals the total target × D ÷ number of days in the month.
6. IF the month's total target equals zero THEN the chart SHALL NOT draw the reference line.
7. WHILE the selected month is the current month (America/Sao_Paulo) the spent curve SHALL end at today's day and SHALL have no points after it.
8. WHILE the selected month is in the future the spent curve SHALL have no points.
9. WHILE the selected month is in the past the spent curve SHALL extend to the month's last day.
10. WHEN the user hovers or focuses a day THEN the system SHALL show a tooltip with the day, the accumulated spent in BRL and, when the reference line exists, the ideal accumulated value in BRL.
11. IF the month has no expense occurrences THEN the system SHALL show the text "Sem gastos no mês" in place of the chart.
12. WHERE the spent curve's last value exceeds the reference value on the same day the card SHALL show the text "Acima do ritmo ideal"; otherwise it SHALL NOT show that text.
13. The chart SHALL include a legend naming the two series "Gasto acumulado" and "Ritmo ideal" (the second only when the reference line exists).

**Independent Test**: Com um mês passado de 30 dias, metas somando R$ 3.000 e gastos de R$ 100 no dia 1 e R$ 200 no dia 10, ver a curva com R$ 100 até o dia 9 e R$ 300 do dia 10 em diante, e a referência chegando a R$ 3.000 no dia 30.

---

## Edge Cases

- WHEN the month is February (28 or 29 days) THEN the system SHALL plot 28 or 29 points and the reference line SHALL reach the total target on the last day.
- WHEN several expenses fall on the same day THEN the system SHALL sum them into one point for that day.
- IF a category was deleted after the selected month THEN the system SHALL still count its expenses and target in that month, as the summary does.
- WHEN the viewport is narrower than 1024px THEN the system SHALL stack "Ritmo de gastos" and "Participação no gasto do mês" in one column.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| VISOES-01 | P1: Seletor (AC 1, 7) | Specify | Pending |
| VISOES-02 | P1: Seletor (AC 2-5) | Specify | Pending |
| VISOES-03 | P1: Seletor (AC 6, 8) | Specify | Pending |
| RITMO-01 | P1: Ritmo (AC 1, 11) | Specify | Pending |
| RITMO-02 | P1: Ritmo (AC 2-4) | Implementing | Pending |
| RITMO-03 | P1: Ritmo (AC 5-6, 12-13) | Implementing | Pending |
| RITMO-04 | P1: Ritmo (AC 7-9) | Implementing | Pending |
| RITMO-05 | P1: Ritmo (AC 10) | Specify | Pending |

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️

---

## Success Criteria

- [ ] A página mostra o conteúdo de categorias uma única vez (tabela ou barras), nunca os dois.
- [ ] Nenhum card "Gasto × meta por categoria" na página.
- [ ] A curva de "Ritmo de gastos" fecha o mês no mesmo total do card "Gasto" da Visão Geral.
