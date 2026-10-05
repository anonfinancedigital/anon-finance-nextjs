# Percentuais de Categoria com Histórico por Mês Specification

## Problem Statement

O percentual de cada categoria vive em uma única coluna (`category.percent_micro`) e a meta de cada mês é calculada na leitura com o percentual atual (`buildMonthlySummary` / `allocateCents`). Editar os percentuais na tela de Categorias muda, de forma retroativa, a meta de todos os meses passados. A feature guarda o percentual por vigência mensal para que meses passados mantenham os percentuais que valiam na época.

## Goals

- [ ] Depois de editar percentuais, o resumo de qualquer mês anterior ao mês corrente exibe exatamente as mesmas metas de antes da edição.
- [ ] Toda tela que calcula meta por categoria (resumo mensal, gráficos) usa o percentual vigente no mês exibido.
- [ ] Os meses existentes antes da feature continuam exibindo o mesmo resultado que exibem hoje.

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Editar percentuais de um mês passado ou futuro | Edição vale só a partir do mês corrente (pedido do usuário) |
| Tela ou lista de histórico de versões de percentuais | Não pedido |
| Seletor de mês na tela de Categorias | A tela continua mostrando o mês corrente (spec receita-referencia-automatica) |
| Histórico de nome, cor e subcategorias | Só o percentual tem vigência; os demais atributos continuam únicos por categoria |
| Mudança em liberdade financeira | `freedom.ts` e a página Liberdade não usam percentuais de categoria (verificado no código) |
| Testes e2e novos | Suspensos pela AD-005 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Modelo de dados | Tabela de vigência `category_percent` (categoria, mês inicial como `date` no dia 1, `percent_micro`), com unicidade por (categoria, mês inicial); vigente em M = linha de maior mês inicial ≤ M | Guarda só mudanças, não uma cópia da categoria por mês; mês futuro cai naturalmente na última vigência | n |
| Unidade do percentual | Micro-percentual inteiro (1% = 1.000.000), mesma faixa 1..100.000.000 da `category_percent_micro_range` (AD-006); mês inicial como `date` do calendário sem fuso (AD-003) | Mantém as decisões vigentes | n |
| Coluna `category.percent_micro` | Sai de `category` depois do backfill; a vigência é a única fonte do percentual | Evita duas fontes divergentes. A migração Drizzle é nova (0007) | n |
| Backfill dos meses existentes | A migração cria, para cada categoria existente, uma vigência com mês inicial sentinela `0001-01-01` e o percentual atual | Todo mês existente, incluindo anteriores à criação da categoria, mantém o resultado de hoje | n |
| Mês corrente | Mês em America/Sao_Paulo (`currentMonth`) calculado no momento do salvamento | Mesma regra do resumo sem `?mes=` | y |
| Meses futuros | Usam a vigência de maior mês inicial (a do mês corrente, pois só se grava vigência no mês corrente) | Pedido do usuário | y |
| O que cria vigência | Só mudança de percentual de uma categoria existente em relação ao percentual vigente no mês corrente; nome, cor e subcategorias não gravam vigência | Pedido do usuário | y |
| Salvar várias vezes no mesmo mês | Upsert da vigência do mês corrente: sobrescreve, sem acumular versões. Percentual voltando ao valor anterior mantém a linha do mês com esse valor | Pedido do usuário; simplicidade | y |
| Categoria criada no mês corrente | Recebe vigência com mês inicial = mês corrente e não aparece como linha em meses anteriores, exceto se tiver gasto lançado naquele mês | A soma de cada mês passado continua 100% | y |
| Gasto em mês sem vigência da categoria | A categoria aparece naquele mês com percentual 0% e meta R$ 0,00 (gasto fica excedido), para o gasto não sumir do resumo | Transações podem ter qualquer data, inclusive anterior à criação da categoria | y |
| Categoria excluída | A exclusão passa a ser lógica: guarda o mês de exclusão (mês corrente); a categoria some da tela de Categorias, dos formulários e dos meses a partir desse mês, e continua nos meses anteriores com seu percentual da época. Hoje só se exclui categoria sem gastos (FK `restrict`) e isso não muda | Preserva a soma 100% e as metas exibidas nos meses passados; exclusão física apagaria a vigência e quebraria essa soma | y |
| Nome de categoria excluída | O nome de uma categoria excluída fica livre para nova categoria (unicidade vale só entre categorias ativas) | Hoje o nome volta a ficar livre ao excluir | y |
| Validação "soma deve ser 100%" | Inalterada: vale sobre o conjunto enviado, que vira o conjunto do mês corrente | Cada salvamento define o conjunto inteiro do mês corrente | y |
| Tela de Categorias | Mostra os percentuais vigentes no mês corrente e a Receita de referência como hoje | Pedido do usuário | y |
| Atomicidade e concorrência | O salvamento roda em uma transação; a unicidade (categoria, mês inicial) torna dois salvamentos simultâneos seguros (o último vence) | `replaceSet` já é transacional | n |
| Virada de mês durante a edição | O mês de vigência é o do instante do salvamento, não o da abertura da tela | Evita gravar no mês errado | n |
| Testes | Unit (resolução da vigência, resumo por mês) e integration (migração/backfill, `replaceSet`, `list` por mês) obrigatórios; e2e não exigido (AD-005) | AD-005 | y |
| Registro de decisão | A mudança de modelo registra uma nova AD em `.specs/STATE.md` (substitui, para o percentual, o "uma coluna em `category`" da AD-006) | Mantém o log de decisões consistente | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Editar percentuais sem alterar o passado ⭐ MVP

**User Story**: Como usuário, quero que a edição de percentuais valha só do mês corrente em diante para que as metas dos meses passados não mudem.

**Why P1**: É o problema central; sem isso o histórico mensal perde o sentido.

**Acceptance Criteria**:

1. WHEN o usuário salva percentuais diferentes na tela de Categorias THEN the system SHALL gravar a vigência de cada categoria alterada com mês inicial igual ao mês corrente em America/Sao_Paulo.  <!-- event-driven -->
2. WHEN o resumo de um mês anterior ao mês corrente é exibido após uma edição de percentuais THEN the system SHALL calcular cada meta com o percentual vigente naquele mês, igual ao exibido antes da edição.  <!-- event-driven -->
3. WHEN o usuário salva alterando apenas nome, cor ou subcategorias THEN the system SHALL NOT criar nem alterar nenhuma vigência de percentual.  <!-- event-driven -->
4. WHEN o usuário salva mais de uma vez no mesmo mês THEN the system SHALL manter uma única vigência por categoria para o mês corrente, com o percentual do último salvamento.  <!-- event-driven -->
5. IF o conjunto enviado não soma 100% THEN the system SHALL rejeitar o salvamento com a mensagem existente "A soma dos percentuais deve ser 100% (atual: X)" e SHALL NOT gravar nenhuma vigência.  <!-- unwanted-behavior -->
6. IF a gravação de qualquer vigência falha THEN the system SHALL desfazer todo o salvamento (categorias, subcategorias e vigências) e retornar o erro de salvamento existente.  <!-- unwanted-behavior -->

**Independent Test**: Com a categoria A a 50% em um mês passado e no corrente, editar A para 40% e B para 60% na tela de Categorias; o resumo do mês passado ainda mostra A a 50% e o do mês corrente mostra A a 40%.

---

### P1: Resumo e gráficos usam o percentual do mês exibido ⭐ MVP

**User Story**: Como usuário, quero ver em cada mês as metas calculadas com os percentuais daquela época.

**Why P1**: Sem a leitura por mês, a gravação do histórico não tem efeito visível.

**Acceptance Criteria**:

1. WHEN o resumo é exibido para o mês M THEN the system SHALL usar, para cada categoria, a vigência de maior mês inicial menor ou igual a M para calcular `allocateCents` e a coluna de percentual.  <!-- event-driven -->
2. WHEN o mês exibido é posterior ao mês corrente THEN the system SHALL usar as vigências do mês corrente.  <!-- event-driven -->
3. The system SHALL calcular as metas dos gráficos a partir do mesmo resumo por mês, sem leitura separada de percentuais.  <!-- ubiquitous -->
4. WHEN o mês M é anterior à primeira vigência de uma categoria que tem gasto em M THEN the system SHALL exibir a categoria em M com percentual 0% e meta R$ 0,00.  <!-- event-driven -->
5. WHEN o mês M é anterior à primeira vigência de uma categoria sem gasto em M THEN the system SHALL omitir a categoria do resumo de M.  <!-- event-driven -->

**Independent Test**: Abrir `?mes=` de um mês passado e do corrente após editar percentuais e conferir metas e coluna de percentual diferentes em cada um.

---

### P1: Meses existentes não mudam com a migração ⭐ MVP

**User Story**: Como usuário, quero que os meses já lançados mantenham o que exibem hoje.

**Why P1**: A migração não pode alterar dados exibidos.

**Acceptance Criteria**:

1. WHEN a migração roda THEN the system SHALL criar uma vigência para cada categoria existente com mês inicial `0001-01-01` e o percentual que a categoria tem na coluna `percent_micro`.  <!-- event-driven -->
2. WHEN o resumo de qualquer mês existente é exibido logo após a migração THEN the system SHALL exibir metas e percentuais idênticos aos exibidos antes dela.  <!-- event-driven -->

**Independent Test**: Integration: popular categorias e transações, aplicar a migração e comparar `buildMonthlySummary` antes e depois para vários meses.

---

### P2: Categoria criada ou excluída no meio do histórico

**User Story**: Como usuário, quero que criar ou excluir uma categoria não reescreva os meses passados.

**Why P2**: Sem isso, os meses passados deixariam de somar 100%.

**Acceptance Criteria**:

1. WHEN o usuário cria uma categoria THEN the system SHALL gravar sua vigência com mês inicial igual ao mês corrente.  <!-- event-driven -->
2. WHEN o usuário exclui uma categoria sem gastos THEN the system SHALL registrar o mês corrente como mês de exclusão e SHALL manter suas vigências.  <!-- event-driven -->
3. WHILE o mês exibido é anterior ao mês de exclusão de uma categoria, the system SHALL incluir a categoria no resumo com o percentual vigente naquele mês.  <!-- state-driven -->
4. WHILE o mês exibido é igual ou posterior ao mês de exclusão de uma categoria, the system SHALL omitir a categoria do resumo.  <!-- state-driven -->
5. The system SHALL omitir categorias excluídas da tela de Categorias, dos seletores de categoria e da validação de propriedade das transações.  <!-- ubiquitous -->
6. WHEN o usuário cria uma categoria com o nome de uma categoria excluída THEN the system SHALL aceitar o salvamento.  <!-- event-driven -->
7. IF o usuário exclui uma categoria que tem gastos THEN the system SHALL manter a mensagem existente "Esta categoria tem N gasto(s) e não pode ser excluída" e SHALL NOT alterar nenhum dado.  <!-- unwanted-behavior -->

**Independent Test**: Criar a categoria C no mês corrente e excluir D; o resumo de um mês passado mostra D e não mostra C; o do mês corrente mostra C e não mostra D.

---

## Edge Cases

- WHEN o salvamento ocorre depois da virada do mês com a tela aberta desde o mês anterior THEN the system SHALL gravar as vigências no mês do instante do salvamento.
- WHEN o usuário salva um percentual igual ao vigente no mês corrente THEN the system SHALL NOT criar vigência para essa categoria.
- WHILE uma categoria tem vigência só a partir do mês corrente, the system SHALL mostrar na tela de Categorias o percentual dessa vigência.
- IF dois salvamentos concorrentes gravam a mesma categoria no mesmo mês THEN the system SHALL manter uma única linha (categoria, mês), com o valor do último a confirmar.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| HIST-01 | P1: Editar percentuais sem alterar o passado (AC 1, 3, 4) | Design | Implementing |
| HIST-02 | P1: Editar percentuais sem alterar o passado (AC 2) | Design | Implementing |
| HIST-03 | P1: Editar percentuais sem alterar o passado (AC 5, 6) | Design | Implementing |
| HIST-04 | P1: Resumo e gráficos (AC 1, 2, 3) | Design | Implementing |
| HIST-05 | P1: Resumo e gráficos (AC 4, 5) | Design | Implementing |
| HIST-06 | P1: Meses existentes (AC 1, 2) | Design | Pending |
| HIST-07 | P2: Categoria criada no meio do histórico (AC 1) | Design | Implementing |
| HIST-08 | P2: Categoria excluída (AC 2, 3, 4, 5, 6, 7) | Design | Implementing |

**ID format:** `HIST-NN`

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️

---

## Success Criteria

- [ ] Após editar percentuais, `?mes=` de qualquer mês passado exibe metas idênticas às de antes da edição.
- [ ] Após a migração, o resumo de cada mês existente é idêntico ao anterior.
- [ ] Todo mês, passado ou corrente, soma 100% nas categorias exibidas sem gasto fora de vigência.
