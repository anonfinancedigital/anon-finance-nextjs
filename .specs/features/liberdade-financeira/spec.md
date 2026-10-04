# Liberdade Financeira Specification

## Problem Statement

O usuário controla o orçamento mensal, mas não tem como saber quanto precisa juntar para viver de renda e quanto investir por mês para chegar lá. Ele quer uma aba "Liberdade" onde informa a renda mensal desejada, o que já guardou, a data de nascimento e a idade de aposentadoria, e recebe o patrimônio-alvo, o progresso e o aporte mensal necessário.

## Goals

- [ ] Existe uma aba "Liberdade" na navegação principal, com um formulário que salva um objetivo por usuário.
- [ ] O resumo mostra valor guardado, patrimônio-alvo, valor que falta e progresso em porcentagem com barra.
- [ ] O resumo mostra o aporte mensal necessário para atingir o alvo na idade de aposentadoria, com juros de 8% ao ano.

## Out of Scope

Explicitamente excluído para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Inflação ou correção da renda desejada | Decidido: valores em termos reais, taxa fixa de 8% a.a. |
| Taxa de juros ou taxa de retirada configurável | Decidido: 8% a.a. fixo, patrimônio-alvo por perpetuidade. |
| Vários objetivos por usuário | Decidido: um objetivo por usuário. |
| Integrar o valor guardado às transações do orçamento | O valor guardado é informado manualmente. |
| Histórico de evolução do objetivo ou gráfico de projeção | Não pedido. |
| Imposto sobre rendimentos e taxas de corretagem | Não pedido. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Patrimônio-alvo | Renda mensal desejada × 12 ÷ 8% (perpetuidade: viver só dos juros, sem consumir o principal) | Escolha do usuário | y |
| Inflação | Nenhuma; renda desejada em valores de hoje | Escolha do usuário | y |
| Quantidade e persistência | Um objetivo por usuário, salvo no banco | Escolha do usuário | y |
| Taxa mensal de capitalização | i = 1,08^(1/12) − 1 (taxa efetiva equivalente a 8% a.a.) | Mantém 8% ao ano de fato após 12 meses; juros nominais 8%/12 renderiam mais que 8% | n |
| Fórmula do aporte | PMT = (alvo − guardado × (1+i)^n) × i ÷ ((1+i)^n − 1), com aportes no fim de cada mês | Valor futuro de série de aportes mensais mais o valor inicial; aporte no fim do mês é o padrão conservador | n |
| Número de meses n | Meses inteiros entre o mês de hoje e o mês do aniversário em que o usuário completa a idade de aposentadoria (n = diferença de meses de calendário, mínimo 0) | Granularidade mensal coerente com o orçamento | n |
| Arredondamento do aporte | Para cima, ao centavo | Garante atingir o alvo; arredondar para baixo ficaria abaixo dele | n |
| Valor guardado já ≥ alvo ou crescendo sozinho até o alvo | Aporte mensal = R$ 0,00 | Não há aporte necessário | n |
| Idade de aposentadoria ≤ idade atual | Rejeitada na validação ao salvar; se a idade atual passar a idade de aposentadoria depois de salvo (n = 0), o resumo mostra o valor que falta e "Prazo encerrado" no lugar do aporte | Evita divisão por zero e mantém o resumo legível | n |
| Limites dos campos | Renda desejada: R$ 0,01 a R$ 1.000.000,00; guardado: R$ 0,00 a R$ 999.999.999,99; idade de aposentadoria: inteiro de 1 a 120; nascimento: data passada, idade atual até 120 | Evita overflow e entradas absurdas | n |
| Barra de progresso acima de 100% | Barra limitada a 100%; o texto mostra o percentual real | Barra não transborda | n |
| Navegação | Link "Liberdade" na barra principal, rota `/liberdade` | Padrão dos links Resumo e Categorias | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation (LIB-02, LIB-03), failure states (LIB-10), data lifecycle (um objetivo por usuário, atualizado por substituição, LIB-04), auth boundary (LIB-11); remaining dimensions N/A for this scope (sem concorrência relevante: um usuário edita o próprio registro; sem chamadas externas; observabilidade inalterada).

---

## User Stories

### P1: Cadastrar o objetivo e ver o resumo ⭐ MVP

**User Story**: As a usuário, I want informar renda desejada, valor guardado, nascimento e idade de aposentadoria so that eu veja meu patrimônio-alvo e meu progresso.

**Why P1**: É o núcleo do pedido: formulário e resumo de progresso.

**Acceptance Criteria**:

1. The system SHALL exibir o link "Liberdade" na navegação principal, apontando para `/liberdade`.  <!-- ubiquitous -->
2. WHEN o usuário envia o formulário com renda mensal desejada, valor guardado, data de nascimento e idade de aposentadoria válidos THEN the system SHALL salvar o objetivo e exibir o resumo.  <!-- event-driven -->
3. WHILE o usuário não tem objetivo salvo the system SHALL exibir o formulário vazio e nenhum resumo.  <!-- state-driven -->
4. WHEN o usuário envia o formulário e já tem objetivo salvo THEN the system SHALL substituir os valores do objetivo existente, sem criar um segundo.  <!-- event-driven -->
5. WHILE o usuário tem objetivo salvo the system SHALL exibir o formulário preenchido com os valores salvos.  <!-- state-driven -->
6. The system SHALL calcular o patrimônio-alvo como renda mensal desejada × 12 ÷ 8%, arredondado para o centavo mais próximo (ex.: R$ 10.000,00 de renda → alvo de R$ 1.500.000,00).  <!-- ubiquitous -->
7. The system SHALL exibir no resumo o valor guardado, o patrimônio-alvo e o valor que falta, igual a max(0, alvo − guardado).  <!-- ubiquitous -->
8. The system SHALL exibir uma barra de progresso e o percentual atingido, igual a guardado ÷ alvo, com uma casa decimal (ex.: R$ 150.000,00 de R$ 1.500.000,00 → 10,0%).  <!-- ubiquitous -->
9. IF o valor guardado for maior ou igual ao alvo THEN the system SHALL limitar a barra a 100% e exibir o percentual real (ex.: 120,0%).  <!-- unwanted-behavior -->

**Independent Test**: Abrir `/liberdade`, salvar renda R$ 10.000,00 e guardado R$ 150.000,00, e ver alvo R$ 1.500.000,00, falta R$ 1.350.000,00 e 10,0% na barra.

---

### P1: Ver o aporte mensal necessário ⭐ MVP

**User Story**: As a usuário, I want ver quanto investir por mês so that eu atinja o alvo na idade de aposentadoria.

**Why P1**: É o retorno central pedido ("qual o valor mensal necessário").

**Acceptance Criteria**:

1. The system SHALL calcular o prazo n em meses de calendário entre o mês de hoje e o mês em que o usuário completa a idade de aposentadoria (nascimento + idade de aposentadoria anos).  <!-- ubiquitous -->
2. The system SHALL calcular o aporte mensal necessário por PMT = (alvo − guardado × (1+i)^n) × i ÷ ((1+i)^n − 1), com i = 1,08^(1/12) − 1, arredondado para cima ao centavo (ex.: guardado R$ 0,00, alvo R$ 1.500.000,00, n = 240 meses → R$ 2.636,21).  <!-- ubiquitous -->
3. The system SHALL exibir no resumo o aporte mensal necessário e o prazo restante em anos e meses.  <!-- ubiquitous -->
4. IF guardado × (1+i)^n for maior ou igual ao alvo THEN the system SHALL exibir aporte mensal de R$ 0,00.  <!-- unwanted-behavior -->
5. IF n for 0 e o valor guardado for menor que o alvo THEN the system SHALL exibir "Prazo encerrado" no lugar do aporte e manter o valor que falta.  <!-- unwanted-behavior -->

**Independent Test**: Salvar objetivo com renda R$ 10.000,00, guardado R$ 0,00 e prazo de 20 anos e ver aporte de R$ 2.636,21; salvar guardado igual ao alvo e ver R$ 0,00.

---

### P1: Validar o formulário ⭐ MVP

**User Story**: As a usuário, I want ser avisado de dados inválidos so that o resumo nunca mostre números sem sentido.

**Why P1**: Entradas inválidas quebram o cálculo.

**Acceptance Criteria**:

1. IF a renda mensal desejada for vazia, não numérica, menor que R$ 0,01 ou maior que R$ 1.000.000,00 THEN the system SHALL rejeitar o envio e exibir mensagem no campo.  <!-- unwanted-behavior -->
2. IF o valor guardado for vazio, negativo ou maior que R$ 999.999.999,99 THEN the system SHALL rejeitar o envio e exibir mensagem no campo.  <!-- unwanted-behavior -->
3. IF a data de nascimento for vazia, inválida, futura ou resultar em idade atual maior que 120 anos THEN the system SHALL rejeitar o envio e exibir mensagem no campo.  <!-- unwanted-behavior -->
4. IF a idade de aposentadoria não for inteiro entre 1 e 120, ou for menor ou igual à idade atual THEN the system SHALL rejeitar o envio e exibir mensagem no campo.  <!-- unwanted-behavior -->
5. IF o salvamento falhar no servidor THEN the system SHALL exibir mensagem de erro e manter o objetivo anterior inalterado.  <!-- unwanted-behavior -->
6. IF a requisição não tiver sessão válida THEN the system SHALL recusar a leitura e a gravação do objetivo.  <!-- unwanted-behavior -->
7. The system SHALL ler e gravar somente o objetivo do usuário da sessão.  <!-- ubiquitous -->

**Independent Test**: Enviar o formulário com idade de aposentadoria menor que a idade atual e ver o erro, sem alterar o resumo.

---

## Edge Cases

- WHEN o usuário faz aniversário e o prazo n diminui THEN the system SHALL recalcular o resumo na próxima leitura, sem novo envio.
- WHEN a idade de aposentadoria é atingida no mês corrente THEN the system SHALL tratar n como 0.
- IF o nascimento for 29/02 THEN the system SHALL considerar o aniversário em anos não bissextos como 28/02.
- WHEN o valor guardado é R$ 0,00 THEN the system SHALL exibir 0,0% na barra.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LIB-01 | P1: Cadastrar e resumo (AC 1: link na navegação) | Specify | Implemented |
| LIB-02 | P1: Cadastrar e resumo (AC 2, 3, 4, 5: salvar, estado vazio, substituir, preencher) | Specify | Implemented |
| LIB-03 | P1: Cadastrar e resumo (AC 6: patrimônio-alvo) | Specify | Implementing |
| LIB-04 | P1: Cadastrar e resumo (AC 7, 8, 9: falta, percentual, barra, limite 100%) | Specify | Implemented |
| LIB-05 | P1: Aporte mensal (AC 1: prazo n) e Edge Cases de data | Specify | Implemented |
| LIB-06 | P1: Aporte mensal (AC 2, 4: fórmula, arredondamento, aporte zero) | Specify | Implementing |
| LIB-07 | P1: Aporte mensal (AC 3, 5: exibição e prazo encerrado) | Specify | Implemented |
| LIB-08 | P1: Validar (AC 1, 2: renda e guardado) | Specify | Implementing |
| LIB-09 | P1: Validar (AC 3, 4: nascimento e idade de aposentadoria) | Specify | Implementing |
| LIB-10 | P1: Validar (AC 5: falha de salvamento) | Specify | Implemented |
| LIB-11 | P1: Validar (AC 6, 7: sessão e isolamento por usuário) | Specify | Implementing |

**Coverage:** 11 total, 0 mapped to tasks, 11 unmapped ⚠️

---

## Success Criteria

- [ ] O usuário salva o objetivo em menos de 1 minuto e vê alvo, progresso e aporte mensal sem sair da aba.
- [ ] O aporte exibido, aplicado como série mensal a 8% a.a. efetivos por n meses sobre o valor guardado, atinge o alvo com diferença menor que R$ 0,01 por mês de aporte.
