# Categorias Novas Visíveis em Meses Anteriores Specification

## Problem Statement

Uma categoria criada hoje só aparece no resumo do mês corrente e dos seguintes. Em meses anteriores ela fica oculta (`hasPercent: false` e sem gasto, omitida por `buildMonthlySummary`), então o usuário não vê que a categoria existe ao navegar pelo histórico. O percentual por vigência (`percentuais-historico`) deve continuar intacto: meses passados não ganham meta. A feature exibe a categoria nesses meses, sem meta.

## Goals

- [ ] Toda categoria ativa em um mês aparece na tabela do resumo desse mês, mesmo sem percentual vigente nele.
- [ ] Nenhuma meta, percentual ou soma de meses anteriores muda por causa dessa exibição.
- [ ] Uma categoria sem percentual vigente no mês é identificada como "Sem meta", sem estouro nem consumo calculados.
- [ ] Uma categoria excluída que não tem percentual nem gasto no mês não aparece.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Replicar o percentual da categoria nova para meses anteriores | Alteraria metas de meses passados e a soma de 100% (decisão do usuário) |
| Alterar o modelo de vigência (`category_percent`) ou `replaceSet` | A regra de gravação continua a de `percentuais-historico` |
| Limitar a exibição a meses a partir da criação da categoria | `category` não guarda mês de início; exibir em todos os meses em que está ativa é o pedido |
| Mudar a tela de Categorias | Ela mostra só o mês corrente |
| Testes e2e novos | Suspensos pela AD-005 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Mês "em que a categoria está ativa" | Critério atual de `listForMonth`: `deleted_from` nulo ou posterior ao mês | Reaproveita a regra existente; categoria excluída continua some a partir do mês de exclusão | y |
| Texto do indicador | "Sem meta" no lugar da meta em R$ | Rótulo curto e direto em pt-BR, coerente com a UI | n |
| Coluna de percentual sem vigência | Exibe "—" no lugar de "0%" | Evita sugerir percentual 0 | n |
| Linha sem meta (com ou sem gasto) | Nunca estoura nem excede: `overspent` e `exceeded` falsos, `overspentCents` 0; restante e consumo exibem "—" | Sem meta não há o que estourar (pedido do usuário, revisa o comportamento de `percentuais-historico`) | y |
| Gasto em categoria sem meta | O gasto continua na coluna Gasto e no total do mês | O gasto não pode sumir | y |
| Categoria excluída sem meta e sem gasto | Omitida do resumo. "Excluída" = `deleted_from` não nulo. Com gasto no mês, a linha continua visível | Categoria que não existe mais não ajuda o usuário; gasto real não some | y |
| Gráficos | A rosca de participação já filtra gasto 0 (`budget-charts.tsx:103-105`); o gráfico de barras mostra a categoria sem meta com barras vazias | Gasto real continua visível; sem mudança de código nos gráficos | y |
| Concorrência / falha / validação | N/A: leitura somente, sem gravação, entrada do usuário ou chamada externa | Mudança só na camada de leitura e apresentação | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Ver categorias cadastradas em meses anteriores ⭐ MVP

**User Story**: Como usuário, quero ver no resumo de meses anteriores as categorias que cadastrei depois, marcadas como sem meta, para saber que elas existem sem alterar o histórico.

**Why P1**: É o pedido central; a omissão atual esconde categorias cadastradas.

**Acceptance Criteria**:

1. WHEN o resumo de um mês anterior à vigência de uma categoria ativa é exibido THEN the system SHALL incluir a linha dessa categoria, com meta R$ 0,00 e gasto do mês.  <!-- event-driven -->
2. WHEN a categoria exibida não tem percentual vigente no mês THEN the system SHALL mostrar o texto "Sem meta" na coluna de meta e "—" na coluna de percentual.  <!-- event-driven -->
3. WHEN a categoria exibida não tem percentual vigente no mês THEN the system SHALL NOT marcá-la como estourada nem como excedida, com ou sem gasto, e SHALL exibir "—" nas colunas de restante e consumo.  <!-- event-driven -->
4. WHEN a categoria sem meta tem gasto no mês THEN the system SHALL exibir o gasto na coluna Gasto e incluí-lo no total gasto do mês.  <!-- event-driven -->
5. WHEN o resumo de qualquer mês é exibido THEN the system SHALL manter inalterados o percentual, a meta e o gasto de toda categoria que já tem percentual vigente nesse mês.  <!-- event-driven -->
6. WHEN uma categoria foi excluída em um mês M THEN the system SHALL omiti-la do resumo dos meses a partir de M e mantê-la nos meses anteriores.  <!-- event-driven -->
7. The system SHALL NOT incluir no gráfico de participação do gasto a fatia de categoria com gasto R$ 0,00 no mês.  <!-- ubiquitous -->
8. WHEN uma categoria excluída não tem percentual vigente nem gasto no mês THEN the system SHALL omiti-la do resumo.  <!-- event-driven -->

**Independent Test**: Criar a categoria "Nova" com 10% hoje e abrir o resumo do mês anterior: a linha "Nova" aparece com "Sem meta", gasto R$ 0,00 e sem alerta; as metas das demais categorias são as mesmas de antes.

---

## Edge Cases

- WHEN uma categoria excluída sem meta recebe gasto lançado nesse mês THEN the system SHALL exibir a linha com o valor gasto e "Sem meta".
- WHEN todas as categorias do mês anterior têm percentual vigente THEN the system SHALL exibir o mesmo conjunto de linhas de antes da feature.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CATMES-01 | P1: Ver categorias cadastradas em meses anteriores (AC 1, 3, 4) | Execute | Pending |
| CATMES-02 | P1: Ver categorias cadastradas em meses anteriores (AC 2) | Execute | Pending |
| CATMES-03 | P1: Ver categorias cadastradas em meses anteriores (AC 5, 6) | Execute | Pending |
| CATMES-04 | P1: Ver categorias cadastradas em meses anteriores (AC 7) | Execute | Pending |
| CATMES-05 | P1: Ver categorias cadastradas em meses anteriores (AC 8) | Execute | Pending |

**ID format:** `CATMES-NN`

**Coverage:** 5 total, 0 mapped to tasks, 5 unmapped ⚠️

---

## Success Criteria

- [ ] Categoria criada hoje aparece com "Sem meta" no resumo de qualquer mês anterior.
- [ ] Categoria excluída sem meta e sem gasto não aparece.
- [ ] Nenhuma meta de mês anterior difere do valor anterior à feature.
