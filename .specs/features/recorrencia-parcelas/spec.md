# Recorrência com Mês Inicial e Parcelas Specification

## Problem Statement

Hoje, ao marcar um gasto ou ganho como "Todo mês, até um mês/ano", só dá para escolher o mês final; o início é sempre o mês da Data do lançamento. O usuário quer escolher também o mês inicial (ex.: uma compra parcelada que começa em outro mês) e, na lista de transações, ver em qual parcela cada ocorrência está (ex.: 3/12), em vez de apenas o selo "Recorrente".

## Goals

- [ ] Em "Todo mês, até um mês/ano", o formulário tem os campos Mês inicial e Mês final.
- [ ] A lista mostra a parcela "N/T" ao lado da descrição de cada ocorrência de uma recorrência com mês final.
- [ ] Recorrências "sem data final" e lançamentos avulsos não mudam de comportamento.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mês inicial para "Todo mês, sem data final" | O pedido é para recorrência com tempo de fim; sem fim não há parcela total |
| Informar o número de parcelas em vez do mês final | Decidido: o fim continua sendo um mês/ano |
| Parcela no resumo, em filtros ou em busca | O pedido é só a lista de transações |
| Valor total dividido em parcelas | Cada parcela repete o valor do lançamento, como já ocorre |
| Mudar o mês inicial de uma série pela edição de uma ocorrência que não seja a primeira | O início só muda editando o mês inicial da série |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Mês inicial vs. Data | Em "até mês/ano", Mês inicial define o primeiro mês da série; o dia vem do campo Data; o mês da Data não define o início | Decidido pelo usuário (Mês inicial substitui o mês da Data) | y |
| Valor inicial do Mês inicial | Ao escolher "até mês/ano", vem preenchido com o mês da Data; depois é independente dela | Mantém o comportamento atual se o usuário não mexer | n |
| Onde aparece a parcela | Só em recorrência com mês final; "sempre" não mostra parcela | Decidido pelo usuário | y |
| Selo "Recorrente" | Em recorrência com mês final, a parcela "N/T" substitui o selo "Recorrente"; "sempre" continua com "Recorrente" | Decidido pelo usuário (opção "só recorrência com mês final", sem selo duplicado) | y |
| Contagem após edição no meio da série | A parcela conta pela série inteira: N = meses desde o início da série; T = meses do início ao fim atual da série | Decidido pelo usuário | y |
| Fim atual da série | Mês final do último segmento da série; se o último segmento é "sempre", a série não tem total e não mostra parcela | Sem total não há "N/T" | n |
| Formato da parcela | "N/T" sem zeros à esquerda (ex.: 3/12, 1/1) | Formato do exemplo do usuário | n |
| Parcela após excluir a partir do mês M | O fim da série passa a ser M-1; o total T diminui de acordo | Consequência da exclusão "a partir deste mês" já existente | n |
| Mês inicial na edição | Editável só ao editar a ocorrência do mês inicial da série; nas demais ocorrências aparece preenchido com o início da série e desabilitado | Evita mover o início ao editar um mês do meio | n |
| Mover o mês inicial na edição do primeiro mês | A série começa no novo mês inicial; os meses antes dele deixam de ter ocorrência | O início define onde a série começa | n |
| Mensagens de validação do mês inicial | "Informe o mês inicial" e "Mês inicial inválido" no campo; mês inicial entre 2000-01 e 2100-12 | Mesmo domínio do mês final (AD-003) | n |
| Mensagem de mês final menor que o inicial | Troca "O mês final deve ser igual ou posterior ao mês do lançamento" por "O mês final deve ser igual ou posterior ao mês inicial" | O início agora é o mês inicial, não o mês da Data | n |
| Mês inicial igual ao final | Permitido; uma única parcela, 1/1 | Mesma regra do mês final igual ao da data | n |
| Mês final antes do mês da ocorrência editada | Ao editar uma ocorrência que não é a do mês inicial, o Mês final deve ser igual ou posterior ao mês da ocorrência; senão rejeita com a mesma mensagem "O mês final deve ser igual ou posterior ao mês inicial" no Mês final | A nova parte da série começa no mês editado; intervalo vazio é inválido | n |
| Dados existentes | Séries "até mês/ano" atuais passam a mostrar parcela contando do mês da sua data; nenhuma migração de dados | O início atual já é o mês da data | n |
| Data de uma ocorrência na edição | Mantém a regra existente: o mês da Data deve ser o da ocorrência editada ("A data deve estar no mês da ocorrência") | Não muda a edição por ocorrência | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Escolher mês inicial e mês final ⭐ MVP

**User Story**: As o usuário do orçamento, I want informar o mês inicial e o mês final de um gasto ou ganho recorrente so that eu lance contas com prazo que começam em qualquer mês.

**Why P1**: É o primeiro pedido.

**Acceptance Criteria**:

1. WHEN o usuário escolhe "Todo mês, até um mês/ano" no formulário THEN the system SHALL exibir os campos Mês inicial e Mês final, com o Mês inicial preenchido com o mês da Data.
2. WHERE a opção é "Não recorrente" ou "Todo mês, sem data final" the system SHALL ocultar o campo Mês inicial e iniciar a recorrência no mês da Data.
3. WHEN o usuário salva "até mês/ano" com Mês inicial S, Mês final E e dia D na Data THEN the system SHALL gravar uma única transação cuja primeira ocorrência é o dia D de S (último dia de S se S não tem o dia D) e cujo mês final é E.
4. WHEN o usuário vê o mês S de uma recorrência "até mês/ano" THEN the system SHALL incluir a primeira ocorrência na lista e no resumo do mês.
5. WHEN o usuário vê um mês anterior a S THEN the system SHALL NOT incluir ocorrência da recorrência na lista nem no resumo.
6. WHEN o usuário abre a edição da ocorrência do mês inicial da série THEN the system SHALL carregar o Mês inicial da série e permitir alterá-lo.
7. WHEN o usuário salva a edição do mês inicial da série com um novo Mês inicial THEN the system SHALL passar a mostrar ocorrências somente a partir do novo mês inicial.
8. WHEN o usuário abre a edição de uma ocorrência que não é a do mês inicial da série THEN the system SHALL exibir o Mês inicial da série desabilitado.

**Independent Test**: Lançar um gasto de R$ 40,00 com Data 10/04/2026, "até mês/ano", Mês inicial 05/2026 e Mês final 12/2026; ver a ocorrência de 10/05/2026 em maio e nada em abril.

---

### P1: Validar mês inicial e final ⭐ MVP

**User Story**: As o usuário, I want ser avisado de um intervalo inválido so that eu não grave uma recorrência que nunca aparece.

**Why P1**: Sem validação, dados inválidos chegam ao banco.

**Acceptance Criteria**:

1. IF a recorrência é "até mês/ano" e o Mês inicial não foi informado THEN the system SHALL rejeitar o salvamento com a mensagem "Informe o mês inicial" no campo Mês inicial.
2. IF o Mês inicial não é um mês válido entre 2000-01 e 2100-12 THEN the system SHALL rejeitar o salvamento com a mensagem "Mês inicial inválido" no campo Mês inicial.
3. IF o Mês final é anterior ao Mês inicial THEN the system SHALL rejeitar o salvamento com a mensagem "O mês final deve ser igual ou posterior ao mês inicial" no campo Mês final.
4. WHERE a recorrência é "Não recorrente" ou "sem data final" the system SHALL ignorar qualquer Mês inicial enviado e usar o mês da Data como início.
5. The system SHALL manter as mensagens "Informe o mês final" e "Mês final inválido" para o Mês final ausente ou fora de 2000-01 a 2100-12.

**Independent Test**: Escolher Mês inicial 06/2026 e Mês final 05/2026 e ver a mensagem no campo Mês final, sem gravar.

---

### P1: Parcela na lista de transações ⭐ MVP

**User Story**: As o usuário, I want ver ao lado da descrição em qual parcela está cada ocorrência so that eu saiba quanto falta para a conta acabar.

**Why P1**: É o segundo pedido.

**Acceptance Criteria**:

1. WHEN a lista de um mês mostra uma ocorrência de uma série com mês final THEN the system SHALL exibir ao lado da descrição a parcela "N/T", onde N é o número do mês na série (1 no mês inicial) e T é a quantidade de meses do mês inicial ao mês final, inclusive.
2. WHEN a lista mostra o mês inicial de uma série "até mês/ano" de 12 meses THEN the system SHALL exibir "1/12", e no mês final "12/12".
3. WHEN a lista mostra uma ocorrência de uma série com mês final THEN the system SHALL exibir a parcela no lugar do selo "Recorrente".
4. WHERE a série é "sem data final" the system SHALL manter o selo "Recorrente" sem parcela.
5. WHERE o lançamento é avulso the system SHALL NOT exibir parcela nem selo.
6. WHEN a série foi editada em um mês do meio THEN the system SHALL contar N a partir do mês inicial da série inteira e T até o mês final atual da série.
7. WHEN o usuário exclui as ocorrências a partir do mês M de uma série com mês final THEN the system SHALL exibir nos meses anteriores a M o total T recalculado até o mês M-1.
8. IF o último segmento da série é "sem data final" THEN the system SHALL NOT exibir parcela em nenhuma ocorrência da série e SHALL exibir o selo "Recorrente".

**Independent Test**: Com a série de R$ 40,00 de 05/2026 a 12/2026, ver "1/8" em maio, "3/8" em julho e "8/8" em dezembro, sem selo "Recorrente".

---

## Edge Cases

- WHEN o Mês inicial é igual ao Mês final THEN the system SHALL exibir uma única ocorrência com a parcela "1/1".
- WHEN a Data tem dia 31 e o Mês inicial tem 30 dias THEN the system SHALL posicionar a primeira ocorrência no dia 30.
- WHEN a série atravessa a virada de ano (ex.: 11/2026 a 02/2027) THEN the system SHALL contar as parcelas continuamente (1/4 em 11/2026, 4/4 em 02/2027).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PARC-01 | P1: Mês inicial e final (campos no formulário, ACs 1-2) | Done | Verified |
| PARC-02 | P1: Mês inicial e final (persistência e projeção, ACs 3-5) | Done | Verified |
| PARC-03 | P1: Mês inicial e final (edição do mês inicial, ACs 6-8) | Done | Verified |
| PARC-04 | P1: Validar mês inicial e final (ACs 1-5) | Done | Verified |
| PARC-05 | P1: Parcela na lista (cálculo e exibição, ACs 1-5) | Done | Verified |
| PARC-06 | P1: Parcela na lista (série editada, excluída ou sem fim, ACs 6-8) | Done | Verified |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped ⚠️

---

## Success Criteria

- [ ] Uma série de 12 meses mostra de 1/12 a 12/12 ao navegar pelos meses.
- [ ] Mês inicial e Mês final são editáveis no formulário e o resumo mensal conta as ocorrências só dentro do intervalo.
