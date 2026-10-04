# Gastos e Ganhos Recorrentes Specification

## Problem Statement

Gastos fixos (aluguel, assinaturas, mensalidades) e ganhos fixos (salário) se repetem todo mês, e hoje o usuário precisa lançá-los de novo a cada mês. O usuário quer marcar um gasto ou ganho como recorrente, escolhendo se ele se repete "sempre" ou até um mês/ano, e ver esse lançamento contado nos meses seguintes sem relançar. Quando o valor muda (reajuste de aluguel, aumento de salário), o usuário edita no mês atual e os meses seguintes assumem a última alteração.

## Goals

- [ ] Ao criar ou editar um gasto ou ganho, escolher entre "Não recorrente", "Sempre" e "Até mês/ano".
- [ ] Um lançamento recorrente conta no resumo mensal e aparece na lista de transações de cada mês aplicável, sem criar linhas novas no banco para cada mês.
- [ ] Editar uma ocorrência altera aquele mês e todos os seguintes; os meses anteriores não mudam.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Recorrência anual, semanal ou outra frequência | Decidido: a repetição é sempre mensal |
| Editar ou excluir só uma ocorrência, mantendo as seguintes como estavam | Decidido: a edição vale para o mês e os seguintes; exceção de um único mês pode virar feature futura |
| Gerar cópias reais da transação em cada mês | Decidido: as ocorrências são projetadas, não gravadas |
| Alterar os meses anteriores ao mês editado | Decidido: a alteração vale a partir do mês editado |
| Mudar o mês de uma ocorrência na edição | A data editada fica no mês exibido; para mudar o início da recorrência, excluir e lançar de novo |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Significado de "mês/ano" | Data final: o lançamento se repete todo mês até o mês/ano escolhido, inclusive; "Sempre" = sem data final | Decidido pelo usuário | y |
| Efeito nos meses seguintes | Projeção: o lançamento conta no resumo e aparece na lista de cada mês aplicável, sem uma linha por mês | Decidido pelo usuário | y |
| Ganhos | Também podem ser recorrentes, com as mesmas opções dos gastos | Decidido pelo usuário | y |
| Edição de uma ocorrência | Vale para o mês editado e todos os seguintes; os seguintes assumem a última alteração; os meses anteriores mantêm o valor anterior | Decidido pelo usuário | y |
| Modelo de armazenamento da edição | Fica para o Design (ex.: encerrar a série no mês anterior e iniciar uma nova no mês editado) | Decisão técnica, não de comportamento | n |
| Edições sucessivas | Cada edição substitui as anteriores nos meses de efeito: editar o mês M e depois o mês M+2 deixa M+1 com a alteração de M e M+2 em diante com a de M+2; editar M de novo depois sobrescreve M+2 em diante | "Última alteração" vence nos meses seguintes | n |
| Primeiro mês da recorrência | O mês da data do lançamento; meses anteriores não são afetados | A data do lançamento é o início natural | n |
| Dia da ocorrência | O mesmo dia do mês da data original; se o mês não tem esse dia (ex.: 31), usa o último dia do mês | Mantém a ocorrência sempre dentro do mês | n |
| Data de uma ocorrência na edição | O formulário mostra a data da ocorrência exibida; o mês da data não pode mudar, só o dia, que vale para as ocorrências seguintes | Evita mover a série para outro mês | n |
| Valor, categoria e descrição das ocorrências | Iguais aos do lançamento da série | Recorrência é repetição idêntica | n |
| Valor padrão do campo | "Não recorrente" | Mantém o comportamento atual | n |
| Mês/ano final menor que o mês da data | Rejeitado com a mensagem "O mês final deve ser igual ou posterior ao mês do lançamento" no campo | Intervalo vazio não faz sentido | n |
| Mês/ano final igual ao mês da data | Permitido; equivale a uma única ocorrência | Não precisa de regra especial | n |
| Formato do mês/ano final | Mês e ano do calendário (AAAA-MM), de 2000-01 a 2100-12 | Mesmo domínio de datas do app (AD-003) | n |
| Mudar uma ocorrência para "Não recorrente" | O mês editado vira um lançamento avulso e a série anterior termina no mês anterior; os meses seguintes deixam de ter ocorrência | Consequência de "a partir deste mês" | n |
| Editar o mês de início da série | A série inteira é alterada (não há meses anteriores) | Não existe mês anterior a preservar | n |
| Exclusão de uma ocorrência | Remove o mês exibido e todos os seguintes, após a confirmação já existente; os meses anteriores ficam | Coerente com a edição "a partir deste mês" | n |
| Marcação na lista | Cada ocorrência e o lançamento original mostram o indicador "Recorrente" | Distingue de lançamentos avulsos | n |
| Dados existentes | Todas as transações atuais ficam "Não recorrente" | Migração sem mudança de comportamento | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Marcar um gasto ou ganho como recorrente e vê-lo nos meses seguintes ⭐ MVP

**User Story**: As o usuário do orçamento, I want marcar um gasto ou ganho como recorrente "sempre" ou até um mês/ano so that eu não precise lançá-lo de novo todo mês.

**Why P1**: É o pedido inteiro.

**Acceptance Criteria**:

1. WHEN o usuário abre o formulário de um gasto ou ganho THEN the system SHALL oferecer as opções "Não recorrente", "Sempre" e "Até mês/ano", com "Não recorrente" selecionada por padrão.
2. WHEN o usuário escolhe "Até mês/ano" THEN the system SHALL exibir um campo de mês e ano final; nas outras opções o campo fica oculto.
3. WHEN o usuário salva um lançamento com "Sempre" THEN the system SHALL gravar uma única transação marcada como recorrente sem mês final.
4. WHEN o usuário salva um lançamento com "Até mês/ano" e um mês/ano final THEN the system SHALL gravar uma única transação marcada como recorrente com esse mês final.
5. WHEN o usuário vê um mês posterior ao mês da data de um lançamento recorrente "Sempre" THEN the system SHALL incluir uma ocorrência dele na lista de transações do mês, com o mesmo tipo, valor, categoria e descrição e o dia da data original.
6. WHEN o usuário vê um mês entre o mês da data e o mês final, inclusive, de um lançamento recorrente "Até mês/ano" THEN the system SHALL incluir uma ocorrência dele na lista do mês.
7. WHEN o usuário vê um mês posterior ao mês final de um lançamento recorrente THEN the system SHALL NOT incluir ocorrência dele na lista nem no resumo do mês.
8. WHEN o usuário vê um mês anterior ao mês da data de um lançamento recorrente THEN the system SHALL NOT incluir ocorrência dele na lista nem no resumo do mês.
9. WHEN o resumo de um mês é calculado THEN the system SHALL somar o valor de cada ocorrência de gasto aplicável ao gasto da sua categoria, junto com os gastos avulsos do mês.
10. WHEN o resumo de um mês é calculado THEN the system SHALL somar o valor de cada ocorrência de ganho aplicável aos ganhos do mês, e as metas por categoria usam esse total.
11. WHEN o dia da data original não existe no mês exibido THEN the system SHALL posicionar a ocorrência no último dia desse mês.
12. The system SHALL mostrar o indicador "Recorrente" em cada lançamento recorrente e em cada ocorrência na lista de transações.

**Independent Test**: Lançar um gasto de R$ 100,00 em 15/10/2026 como "Sempre"; ver em novembro/2026 a ocorrência de R$ 100,00 em 15/11/2026 na lista e somada no resumo; em setembro/2026 nada aparece. Repetir com um ganho de R$ 5.000,00 e ver a meta das categorias de novembro calculada sobre ele.

---

### P1: Validar a recorrência ⭐ MVP

**User Story**: As o usuário, I want ser avisado de uma recorrência inválida so that eu não grave um lançamento que nunca aparece.

**Why P1**: Sem validação, dados inválidos chegam ao banco.

**Acceptance Criteria**:

1. IF a recorrência é "Até mês/ano" e nenhum mês/ano final foi informado THEN the system SHALL rejeitar o salvamento com a mensagem "Informe o mês final" no campo do mês final.
2. IF o mês/ano final é anterior ao mês da data do lançamento THEN the system SHALL rejeitar o salvamento com a mensagem "O mês final deve ser igual ou posterior ao mês do lançamento" no campo do mês final.
3. IF o mês/ano final não é um mês válido entre 2000-01 e 2100-12 THEN the system SHALL rejeitar o salvamento com a mensagem "Mês final inválido" no campo do mês final.
4. WHERE o lançamento é salvo como "Não recorrente" ou "Sempre" the system SHALL ignorar qualquer mês final enviado e gravá-lo sem mês final.

**Independent Test**: Escolher "Até mês/ano" com 09/2026 para um lançamento de 15/10/2026 e ver a mensagem de erro no campo, sem gravar.

---

### P1: Editar uma ocorrência: o mês atual e os seguintes assumem a alteração ⭐ MVP

**User Story**: As o usuário, I want editar o valor de um lançamento recorrente no mês atual e ter os meses seguintes seguindo essa última alteração so that eu acompanhe reajustes sem mexer nos meses passados.

**Why P1**: É o segundo pedido explícito do usuário.

**Acceptance Criteria**:

1. WHEN o usuário abre a edição de uma ocorrência THEN the system SHALL carregar no formulário os dados da ocorrência daquele mês e a recorrência atual (opção e mês final).
2. WHEN o usuário salva a edição de uma ocorrência do mês M THEN the system SHALL aplicar tipo, valor, categoria, descrição, dia e recorrência informados ao mês M e a todos os meses seguintes aplicáveis.
3. WHEN o usuário salva a edição de uma ocorrência do mês M THEN the system SHALL manter inalteradas as ocorrências dos meses anteriores a M.
4. WHEN o usuário edita o mês M e depois o mês N posterior THEN the system SHALL exibir nos meses a partir de N a alteração de N e entre M e N a alteração de M.
5. WHEN o usuário edita o mês M depois de ter editado um mês N posterior THEN the system SHALL exibir nos meses a partir de M a alteração de M, substituindo a de N.
6. WHEN o usuário salva a edição de uma ocorrência com "Não recorrente" THEN the system SHALL manter só o mês editado como lançamento avulso e remover as ocorrências dos meses seguintes.
7. IF o usuário altera na edição de uma ocorrência o mês da data THEN the system SHALL rejeitar o salvamento com a mensagem "A data deve estar no mês da ocorrência" no campo da data.
8. WHEN o usuário edita a ocorrência do mês de início da série THEN the system SHALL aplicar a alteração à série inteira.

**Independent Test**: Criar um gasto "Sempre" de R$ 100,00 em outubro; editar a ocorrência de dezembro para R$ 120,00; ver R$ 100,00 em outubro e novembro e R$ 120,00 em dezembro, janeiro e seguintes.

---

### P2: Excluir uma ocorrência

**User Story**: As o usuário, I want remover um lançamento recorrente a partir de certo mês so that eu encerre contas que acabaram.

**Why P2**: Necessário no uso real, mas editar para "Até mês/ano" já cobre o encerramento.

**Acceptance Criteria**:

1. WHEN o usuário confirma a exclusão de uma ocorrência do mês M THEN the system SHALL remover as ocorrências de M e de todos os meses seguintes.
2. WHEN o usuário confirma a exclusão de uma ocorrência do mês M THEN the system SHALL manter as ocorrências dos meses anteriores a M.
3. WHEN o usuário confirma a exclusão da ocorrência do mês de início da série THEN the system SHALL remover o lançamento de todos os meses.

**Independent Test**: Criar um ganho "Sempre" em outubro; excluir a ocorrência de dezembro; ver o ganho em outubro e novembro e nenhum a partir de dezembro.

---

## Edge Cases

- WHEN o lançamento recorrente tem data 31/01/2026 THEN the system SHALL mostrar a ocorrência de fevereiro/2026 em 28/02/2026.
- WHEN o mês final é igual ao mês da data do lançamento THEN the system SHALL mostrar apenas o lançamento original, sem ocorrências em outros meses.
- IF a categoria de um gasto recorrente tem ocorrências THEN the system SHALL bloquear a exclusão da categoria, como já ocorre com gastos avulsos.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RECUR-01 | P1: Marcar como recorrente (opções no formulário, ACs 1-2) | Design | Pending |
| RECUR-02 | P1: Marcar como recorrente (persistência, ACs 3-4) | Design | Pending |
| RECUR-03 | P1: Marcar como recorrente (projeção na lista, ACs 5-8, 11) | Design | Pending |
| RECUR-04 | P1: Marcar como recorrente (resumo de gastos e ganhos, ACs 9-10) | Design | Pending |
| RECUR-05 | P1: Marcar como recorrente (indicador, AC 12) | Design | Pending |
| RECUR-06 | P1: Validar a recorrência | Design | Pending |
| RECUR-07 | P1: Editar uma ocorrência (ACs 1-3, 7-8) | Design | Pending |
| RECUR-08 | P1: Editar uma ocorrência (edições sucessivas e "Não recorrente", ACs 4-6) | Design | Pending |
| RECUR-09 | P2: Excluir uma ocorrência | - | Pending |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️

---

## Success Criteria

- [ ] Um lançamento recorrente criado uma vez aparece e soma no resumo em todos os meses entre a data e o mês final (ou indefinidamente em "Sempre").
- [ ] Nenhum mês fora do intervalo recebe a ocorrência.
- [ ] Editar o valor em um mês muda esse mês e os seguintes, e nenhum mês anterior.
