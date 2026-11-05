# Recorrentes: pago e não pago Specification

## Problem Statement

Hoje toda ocorrência de um gasto ou ganho recorrente conta no mês e aparece na lista como se já tivesse sido paga ou recebida. O usuário quer saber o que ainda falta pagar no mês: cada ocorrência recorrente passa a ter o estado "pago" ou "não pago". As não pagas ficam no fim da lista, com opacidade reduzida, e não entram nos totais do mês até serem marcadas como pagas.

## Goals

- [ ] Cada ocorrência mensal de um lançamento recorrente (gasto ou ganho) tem estado pago ou não pago, independente dos outros meses da série.
- [ ] Na lista do mês, ocorrências recorrentes não pagas aparecem depois de todas as demais e com opacidade 0,5.
- [ ] Ocorrências recorrentes não pagas ficam fora de todos os totais do mês (ganho, gasto, restante, metas por categoria e subcategoria).
- [ ] Os meses anteriores ao atual de séries existentes mantêm seus totais atuais após a migração.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Estado pago/não pago em lançamentos não recorrentes | Decidido: a feature é só para recorrentes; avulsos contam como hoje |
| Marcar vários meses ou toda a série como pago de uma vez | Decidido: o estado é por mês |
| Lembretes, notificações push ou vencimento por estado | Outra feature; o push atual não muda |
| Filtro por estado pago/não pago na lista | Não pedido; a ordenação já separa os grupos |
| Data ou hora em que a ocorrência foi paga | Não pedido; guarda-se só o estado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Granularidade do estado | Por ocorrência: série + mês. Marcar novembro não altera dezembro | Decidido pelo usuário | y |
| Estado inicial | Não pago para toda ocorrência nova, futura ou do mês atual | Decidido pelo usuário | y |
| Efeito nos totais | Ocorrência recorrente não paga não soma em nenhum total do mês; avulsos e pagas somam | Decidido pelo usuário | y |
| Tipos cobertos | Gastos e ganhos recorrentes | Decidido pelo usuário | y |
| Dados existentes | Ocorrências de meses anteriores ao mês corrente (America/Sao_Paulo) de séries existentes na migração nascem pagas; mês corrente e futuros nascem não pagos | Decidido pelo usuário; preserva o histórico dos totais (princípio da AD-007) | y |
| Série criada depois da migração em mês passado | Todas as ocorrências nascem não pagas, inclusive as de meses passados | Só a migração marca o passado como pago; regra única e simples | n |
| Rótulos | Gasto: "Pago" e "Não pago". Ganho: "Recebido" e "Não recebido" | "Pago" não descreve um ganho | n |
| Onde marcar | Controle na linha da ocorrência recorrente na lista do mês, com ação em um toque e sem confirmação | Marcar e desmarcar é reversível | n |
| Ordem na lista | Primeiro lançamentos avulsos e ocorrências pagas, depois as não pagas; dentro de cada grupo mantém-se a ordem atual (data mais recente primeiro) | Pedido: não pagas "por último" | n |
| Cabeçalhos de dia (mobile) | Cada grupo tem seus próprios cabeçalhos; um dia com linhas nos dois grupos aparece duas vezes. O saldo do dia soma só linhas que contam nos totais; cabeçalho sem linha contada não mostra saldo | Coerência com os totais | n |
| Efeito da edição de uma ocorrência | Editar valor, categoria, descrição ou dia não altera o estado de nenhum mês; o estado pertence à série e ao mês | A edição divide a série mas o mês continua o mesmo | n |
| Exclusão de ocorrência "a partir deste mês" | Os estados dos meses removidos são apagados junto | Evita estado órfão | n |
| Recorrente → "Não recorrente" | O mês editado vira avulso e passa a contar; os estados dos meses removidos são apagados | Consequência da regra "a partir deste mês" | n |
| Estado é dado do usuário | Fica em claro no servidor como a recorrência (série, mês, booleano); não contém valor, nome ou descrição | Mesmo nível de exposição de `recurring`/`series_id` (AD-011) | n |
| Exportação e importação | Exportação inclui o estado pago por série e mês; importação o restaura; arquivo sem o estado importa tudo como não pago | Backup completo sem quebrar arquivos antigos | n |
| Push | Sem mudança | Fora de escopo | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Marcar uma ocorrência recorrente como paga ⭐ MVP

**User Story**: As o usuário do orçamento, I want marcar a ocorrência de um mês de um gasto ou ganho recorrente como paga ou não paga so that eu veja o que ainda falta pagar.

**Why P1**: É o pedido inteiro; sem o estado nada mais existe.

**Acceptance Criteria**:

1. WHEN o usuário aciona o controle de uma ocorrência recorrente não paga THEN the system SHALL marcá-la como paga somente naquele mês e manter os demais meses da série como estavam.
2. WHEN o usuário aciona o controle de uma ocorrência recorrente paga THEN the system SHALL marcá-la como não paga somente naquele mês.
3. WHEN uma ocorrência recorrente é criada, projetada para um mês futuro ou chega ao mês corrente sem marcação THEN the system SHALL tratá-la como não paga.
4. The system SHALL mostrar o controle de estado apenas em ocorrências recorrentes, nunca em lançamentos avulsos.
5. The system SHALL rotular o estado como "Pago"/"Não pago" em gastos e "Recebido"/"Não recebido" em ganhos.
6. IF o usuário tenta marcar uma ocorrência que não pertence a ele ou cujo mês não pertence à série THEN the system SHALL rejeitar a ação sem alterar nenhum estado.
7. WHEN o usuário edita uma ocorrência recorrente (valor, categoria, descrição ou dia) THEN the system SHALL manter inalterado o estado pago/não pago de todos os meses da série.

**Independent Test**: Criar um gasto recorrente "Sempre", marcar o mês corrente como pago, abrir o mês seguinte e ver a ocorrência ainda não paga.

---

### P1: Não pagas por último e com opacidade reduzida ⭐ MVP

**User Story**: As o usuário do orçamento, I want ver as ocorrências não pagas no fim da lista e esmaecidas so that o que já foi pago fique em destaque e o pendente fique visível sem atrapalhar.

**Why P1**: É o segundo pedido explícito.

**Acceptance Criteria**:

1. The system SHALL listar as ocorrências recorrentes não pagas depois de todos os lançamentos avulsos e de todas as ocorrências recorrentes pagas do mês.
2. The system SHALL manter, dentro de cada um dos dois grupos, a ordem atual da lista (data mais recente primeiro).
3. The system SHALL renderizar cada linha de ocorrência não paga com opacidade 0,5 e as demais com opacidade 1.
4. WHEN o usuário marca uma ocorrência como paga THEN the system SHALL movê-la para o grupo de cima e restaurar a opacidade 1 sem recarregar a página.
5. WHEN o usuário marca uma ocorrência como não paga THEN the system SHALL movê-la para o fim da lista e aplicar a opacidade 0,5.
6. WHILE o usuário usa a visão em dias (abaixo de `sm`), the system SHALL exibir cabeçalhos de dia separados por grupo e calcular o saldo do dia só sobre as linhas que contam nos totais.
7. WHERE o mês tem busca por descrição ou filtro ativo, the system SHALL aplicar a mesma ordenação e opacidade ao resultado.

**Independent Test**: Num mês com um avulso, um recorrente pago e um recorrente não pago, ver a ordem avulso/pago/não pago e a opacidade 0,5 só na última linha.

---

### P1: Não pagas fora dos totais ⭐ MVP

**User Story**: As o usuário do orçamento, I want que ocorrências não pagas não somem nos totais so that o resumo reflita só o que de fato já foi pago ou recebido.

**Why P1**: Decisão de produto do usuário; muda o resumo, as metas e o restante.

**Acceptance Criteria**:

1. The system SHALL excluir ocorrências recorrentes não pagas do total de ganhos do mês.
2. The system SHALL excluir ocorrências recorrentes não pagas do gasto por categoria e por subcategoria do mês.
3. The system SHALL derivar de totais que ignoram as não pagas o restante, o excedente, o progresso das metas por categoria e qualquer outro valor calculado a partir dos totais do mês.
4. WHEN uma ocorrência é marcada como paga ou não paga THEN the system SHALL atualizar os totais exibidos do mês sem recarregar a página.
5. The system SHALL contar lançamentos avulsos nos totais independentemente de qualquer estado.

**Independent Test**: Mês com um gasto recorrente de R$ 100 não pago: gasto da categoria R$ 0; ao marcar como pago, R$ 100.

---

### P1: Migração preserva o histórico ⭐ MVP

**User Story**: As o usuário do orçamento, I want que meses passados continuem com os mesmos totais após a feature so that o histórico não mude sozinho.

**Why P1**: Sem isso os totais de todo o passado caem para zero nas recorrentes.

**Acceptance Criteria**:

1. WHEN a migração roda THEN the system SHALL marcar como paga cada ocorrência de série existente cujo mês é anterior ao mês corrente (America/Sao_Paulo).
2. WHEN a migração roda THEN the system SHALL deixar não pagas as ocorrências do mês corrente e dos meses futuros de séries existentes.
3. The system SHALL produzir, para qualquer mês anterior ao corrente, os mesmos totais de antes da migração.

**Independent Test**: Teste de integração: série existente iniciada há 3 meses; após a migração os 3 meses passados estão pagos e o mês corrente não.

---

### P2: Ciclo de vida do estado

**User Story**: As o usuário do orçamento, I want que o estado acompanhe excluir, editar e exportar so that não restem estados soltos nem perca dados no backup.

**Why P2**: Integridade; não bloqueia o uso principal.

**Acceptance Criteria**:

1. WHEN o usuário exclui uma ocorrência recorrente THEN the system SHALL apagar os estados dos meses removidos e manter os dos meses anteriores.
2. WHEN o usuário muda uma ocorrência recorrente para "Não recorrente" THEN the system SHALL apagar os estados dos meses removidos e contar o lançamento avulso resultante nos totais.
3. WHEN o usuário exporta os dados THEN the system SHALL incluir o estado pago de cada ocorrência marcada, por série e mês.
4. WHEN o usuário importa um arquivo com estados THEN the system SHALL restaurá-los por série e mês.
5. WHEN o usuário importa um arquivo sem estados THEN the system SHALL importar todas as ocorrências recorrentes como não pagas.
6. WHEN o usuário exclui a conta THEN the system SHALL apagar todos os seus estados.

**Independent Test**: Excluir a partir de março numa série com fevereiro pago: o estado de fevereiro permanece, os de março em diante somem.

---

## Edge Cases

- WHEN o mês exibido não tem ocorrências recorrentes THEN the system SHALL listar como hoje, sem separação nem opacidade.
- WHEN todas as ocorrências recorrentes do mês estão pagas THEN the system SHALL listar na ordem atual, sem esmaecer nenhuma linha.
- WHEN todas as linhas do mês são recorrentes não pagas THEN the system SHALL exibir todas com opacidade 0,5 e totais zerados.
- IF duas marcações do mesmo mês chegam ao mesmo tempo THEN the system SHALL manter um único estado final, o da última recebida, sem duplicar registro.
- IF a ação de marcar falha no servidor THEN the system SHALL restaurar o estado anterior da linha e exibir a mensagem "Não foi possível atualizar o estado. Tente novamente."

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PAGO-01 | P1: Marcar uma ocorrência recorrente como paga (AC 1-2, 6) | Design | Pending |
| PAGO-02 | P1: Marcar uma ocorrência recorrente como paga (AC 3-5, 7) | Design | Pending |
| PAGO-03 | P1: Não pagas por último e com opacidade reduzida (AC 1-3) | Design | Pending |
| PAGO-04 | P1: Não pagas por último e com opacidade reduzida (AC 4-7) | Design | Pending |
| PAGO-05 | P1: Não pagas fora dos totais (AC 1-3, 5) | Design | Pending |
| PAGO-06 | P1: Não pagas fora dos totais (AC 4) | Design | Pending |
| PAGO-07 | P1: Migração preserva o histórico | Design | Pending |
| PAGO-08 | P2: Ciclo de vida do estado (AC 1-2, 6) | Design | Pending |
| PAGO-09 | P2: Ciclo de vida do estado (AC 3-5) | Design | Pending |
| PAGO-10 | Edge Cases (falha e concorrência) | Design | Pending |

**Coverage:** 10 total, 0 mapped to tasks, 10 unmapped ⚠️

---

## Success Criteria

- [ ] Mês com avulso, recorrente pago e recorrente não pago lista nessa ordem, com opacidade 0,5 só na última linha.
- [ ] Marcar o mês corrente como pago não altera o estado de nenhum outro mês da série.
- [ ] Totais de qualquer mês anterior ao corrente são idênticos antes e depois da migração.
- [ ] Gasto recorrente não pago não soma em categoria, restante nem metas.
