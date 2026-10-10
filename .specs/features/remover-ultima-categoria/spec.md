# Remover a Última Categoria Specification

## Problem Statement

Na tela Alocação, com uma única categoria, clicar na lixeira remove a linha do editor, a tela entra no estado vazio e o botão Salvar deixa de ser renderizado (`showSave` exige 1+ linhas). A remoção fica só no estado local e não há como gravá-la. Mesmo que o botão existisse, o navegador rejeitaria a lista vazia porque exige soma 100%. O usuário não consegue apagar a última categoria.

## Goals

- [ ] O usuário remove a última categoria e grava a remoção com Salvar, e após recarregar a tela Alocação mostra o estado vazio.
- [ ] Remover a última categoria nunca deixa a tela sem um caminho visível para gravar a remoção.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Remover categoria que tem lançamentos | A regra atual do servidor continua: bloqueia com a mensagem de lançamentos existentes |
| Salvar automaticamente ao clicar na lixeira | O editor é local até Salvar (categorias-estado-vazio) |
| Mudar a regra de soma 100% para 1+ categorias | Só a lista vazia vira exceção |
| Mudar o diálogo de confirmação de categoria com subcategorias | Já existe e continua |
| Teste e2e novo | Suspenso pela AD-005 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Lista vazia é um conjunto válido | Salvar com 0 linhas é permitido e apaga todas as categorias do usuário | O servidor já aceita lista vazia (`replaceSetSealed` não exige 1+); o pedido é poder apagar a última | n |
| Quando o Salvar aparece com 0 linhas | Só quando o conjunto gravado tem categorias e o editor está vazio (há algo a gravar); com 0 linhas e nada gravado, continua oculto | Preserva o estado vazio da primeira visita sem botão desabilitado (categorias-estado-vazio, AC 3) | n |
| Texto do estado vazio após remover a última | Mesmo texto e botão de categorias-estado-vazio, acrescido do Salvar | Reaproveita o bloco existente | n |
| Soma na lista vazia | Não gera erro de soma; o aviso `A soma deve ser 100%` continua oculto com 0 linhas | categorias-estado-vazio, AC 3 | n |
| Remoção bloqueada por lançamentos | Salvar mostra a mensagem do servidor e o editor mantém 0 linhas, sem restaurar a categoria | Comportamento atual de remoção de qualquer categoria | n |
| Salvar com sucesso | O editor recomeça do conjunto enviado pelo servidor (vazio) e mostra "Categorias salvas" | Fluxo atual de salvamento | n |
| Percentuais com vigência de categorias removidas | Sem mudança; segue a regra do servidor para categorias removidas | Fora do escopo | n |
| Dimensões restantes (concorrência, auth, observabilidade, expiração) | N/A: remaining dimensions N/A for this scope | Nenhuma muda; a gravação reutiliza a ação existente | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Gravar a remoção da última categoria ⭐ MVP

**User Story**: Como usuário com uma única categoria, quero removê-la e salvar, para ficar sem categorias.

**Why P1**: É o pedido inteiro; hoje a ação é impossível.

**Acceptance Criteria**:

1. WHILE o editor tem 0 linhas e o conjunto gravado tem 1+ categorias, the system SHALL renderizar o botão Salvar habilitado.  <!-- state-driven; REMOVE-01 -->
2. WHILE o editor tem 0 linhas e o conjunto gravado tem 0 categorias, the system SHALL NOT renderizar o botão Salvar.  <!-- state-driven; REMOVE-02 -->
3. WHEN o usuário clica em Salvar com 0 linhas e o conjunto gravado tem 1+ categorias THEN the system SHALL enviar a lista vazia ao servidor sem exibir erro de soma.  <!-- event-driven; REMOVE-03 -->
4. WHEN o servidor confirma o salvamento da lista vazia THEN the system SHALL exibir "Categorias salvas" e o estado vazio.  <!-- event-driven; REMOVE-04 -->
5. WHEN a tela Alocação é recarregada após salvar a lista vazia THEN the system SHALL mostrar o estado vazio.  <!-- event-driven; REMOVE-05 -->
6. IF a categoria removida tem lançamentos THEN the system SHALL exibir a mensagem de lançamentos existentes retornada pelo servidor e manter o editor com 0 linhas.  <!-- unwanted-behavior; REMOVE-06 -->
7. WHEN o usuário remove a última categoria THEN the system SHALL NOT exibir o aviso `A soma deve ser 100%`.  <!-- event-driven; REMOVE-07 -->

8. WHEN o servidor recebe a lista vazia e nenhuma categoria tem lançamentos THEN the system SHALL marcar todas as categorias do usuário como removidas e retornar sucesso.  <!-- event-driven; REMOVE-09 -->
9. The system SHALL aceitar a lista vazia na validação do navegador e continuar exigindo soma 100% para listas com 1+ categorias.  <!-- ubiquitous; REMOVE-10 -->

**Independent Test**: Com uma categoria sem lançamentos, clicar na lixeira, ver o Salvar, clicar em Salvar, ver "Categorias salvas" e, ao recarregar, o estado vazio.

---

### P2: Voltar atrás antes de salvar

**User Story**: Como usuário que removeu a última categoria por engano, quero adicionar outra e salvar normalmente.

**Why P2**: A remoção é local; o fluxo de adicionar não pode quebrar.

**Acceptance Criteria**:

1. WHEN o usuário adiciona uma categoria com 0 linhas e o conjunto gravado tem 1+ categorias THEN the system SHALL voltar a exigir soma 100% para habilitar o Salvar.  <!-- event-driven; REMOVE-08 -->

**Independent Test**: Remover a única categoria, clicar em "Adicionar primeira categoria" e ver o Salvar desabilitado com a dica `Some 100% para salvar`.

---

## Edge Cases

- WHEN o usuário remove a última categoria que tem subcategorias THEN the system SHALL exibir o diálogo de confirmação atual antes de remover.
- IF o salvamento da lista vazia falha por erro de rede THEN the system SHALL exibir a mensagem de falha de salvamento atual e manter o editor com 0 linhas.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REMOVE-01 | P1: Gravar a remoção | - | Implementing |
| REMOVE-02 | P1: Gravar a remoção | - | Implementing |
| REMOVE-03 | P1: Gravar a remoção | - | Implementing |
| REMOVE-04 | P1: Gravar a remoção | - | Implementing |
| REMOVE-05 | P1: Gravar a remoção | - | Implementing |
| REMOVE-06 | P1: Gravar a remoção | - | Implementing |
| REMOVE-07 | P1: Gravar a remoção | - | Implementing |
| REMOVE-08 | P2: Voltar atrás | - | Implementing |
| REMOVE-09 | P1: Gravar a remoção | - | Implementing |
| REMOVE-10 | P1: Gravar a remoção | - | Implementing |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Remover a única categoria e salvar leva ao estado vazio persistido, sem erro.
- [ ] Nenhum teste de regressão de categorias-estado-vazio quebra (primeira visita continua sem Salvar).
