# Ajustar Categoria para Fechar 100% Specification

## Problem Statement

Na tela de Categorias o salvamento exige soma exatamente 100%. Quando a soma fica em 99,047973% ou 100,297973%, o usuário precisa calcular de cabeça a diferença e digitar o novo percentual com até 6 casas decimais em uma categoria. Isso é lento e propenso a erro. A feature deixa o usuário escolher uma categoria e ter o percentual dela ajustado automaticamente, para cima ou para baixo, até a soma chegar a 100%.

## Goals

- [ ] Com um clique na ação de uma categoria, a soma dos percentuais passa a ser exatamente 100% (100.000.000 micro-percentual) sempre que o ajuste for possível.
- [ ] O usuário não faz nenhuma conta mental nem digita casas decimais para fechar a soma.
- [ ] Após o ajuste o botão Salvar fica habilitado, sem outras mudanças no fluxo de salvamento.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Distribuir a diferença entre várias categorias | O pedido é escolher uma categoria que absorve a diferença |
| Ajuste automático sem ação do usuário | O usuário decide qual categoria absorve a diferença |
| Salvar automaticamente após o ajuste | O usuário revisa e clica em Salvar |
| Desfazer o ajuste com botão dedicado | O usuário pode redigitar o percentual anterior |
| Alterar a regra de validação do servidor | O servidor continua exigindo soma 100% |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Como o usuário escolhe a categoria | Botão por linha, com o texto "Ajustar para 100%" e `aria-label` "Ajustar categoria N para fechar 100%", ao lado de Remover | "Selecionar uma categoria" no pedido; um botão por linha é a menor interação e segue o padrão de Remover | n |
| Quando o botão aparece | Só enquanto a soma difere de 100% | Com soma 100% não há o que ajustar | n |
| Cálculo | novo percentual da linha = percentual atual da linha + (100.000.000 − soma), em micro-percentual inteiro; soma exata, sem arredondamento | Micro-percentual é inteiro, então a soma fecha exatamente | n |
| Valor atual da linha vazio ou inválido | Conta como 0 na soma (igual ao cálculo atual da soma) e o ajuste coloca o valor que falta | Mantém consistência com a soma exibida | n |
| Resultado fora do intervalo 0,000001 a 100 | O ajuste não altera nada e mostra a mensagem "Não é possível ajustar esta categoria: o percentual ficaria fora do intervalo de 0,000001% a 100%" | Evita percentual negativo ou zerado, que o servidor rejeita | n |
| Outras linhas com percentual inválido | Ajuste usa só os percentuais válidos, como a soma exibida; o Salvar segue bloqueado enquanto houver erro | Validação por linha permanece como hoje | n |
| Campo de valor em R$ da linha ajustada | Recalculado a partir do novo percentual, como acontece ao digitar o percentual | Comportamento atual preservado | n |
| Persistência | Nada novo é persistido; o ajuste só altera o estado local do formulário | Salvar continua enviando percentuais | n |
| Posição da mensagem de erro do ajuste | Abaixo da lista, junto à mensagem de soma, com `role="alert"` | Mesmo lugar dos demais avisos | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Fechar a soma em 100% a partir de uma categoria ⭐ MVP

**User Story**: Como usuário que edita as categorias, quero escolher uma categoria para ela absorver a diferença, para fechar 100% sem calcular e poder salvar.

**Why P1**: É o pedido inteiro; sem isso o usuário continua calculando de cabeça.

**Acceptance Criteria**:

1. WHILE a soma dos percentuais for diferente de 100%, the system SHALL exibir em cada linha de categoria um botão "Ajustar para 100%".  <!-- state-driven -->
2. WHILE a soma dos percentuais for exatamente 100%, the system SHALL ocultar os botões "Ajustar para 100%".  <!-- state-driven -->
3. WHEN o usuário clica em "Ajustar para 100%" em uma linha cuja soma está abaixo de 100%, the system SHALL aumentar o percentual dessa linha em 100% menos a soma, deixando a soma em exatamente 100%.  <!-- event-driven -->
4. WHEN o usuário clica em "Ajustar para 100%" em uma linha cuja soma está acima de 100%, the system SHALL reduzir o percentual dessa linha na quantidade excedente, deixando a soma em exatamente 100%.  <!-- event-driven -->
5. WHEN o ajuste fecha a soma em 100% e nenhuma linha tem erro de validação, the system SHALL habilitar o botão Salvar.  <!-- event-driven -->
6. WHEN o ajuste é aplicado, the system SHALL exibir o novo percentual da linha no formato dos campos atuais, com vírgula decimal e sem zeros à direita (exemplo: 6,297973 reduzido em 0,297973 mostra 6).  <!-- event-driven -->
7. WHEN o ajuste é aplicado e a receita de referência está preenchida, the system SHALL atualizar o valor em R$ da linha para o valor correspondente ao novo percentual.  <!-- event-driven -->
8. IF o percentual resultante da linha seria menor que 0,000001% ou maior que 100%, THEN the system SHALL manter todos os percentuais inalterados e exibir a mensagem "Não é possível ajustar esta categoria: o percentual ficaria fora do intervalo de 0,000001% a 100%".  <!-- unwanted-behavior -->
9. The system SHALL alterar apenas o percentual da linha escolhida e nenhum outro campo ou linha ao aplicar o ajuste.  <!-- ubiquitous -->

**Independent Test**: Com categorias somando 99,047973%, clicar em "Ajustar para 100%" na linha Torrar (6,297973) e ver 7,25; a soma mostra 100% e o Salvar fica habilitado.

---

## Edge Cases

- IF a linha escolhida tem o campo de percentual vazio THEN the system SHALL tratar o valor atual como 0 e preencher com a diferença que falta, quando ela estiver entre 0,000001% e 100%.
- IF a soma é 100,297973% e a linha escolhida tem 0,2% THEN the system SHALL exibir a mensagem do critério 8 e manter os percentuais.
- WHEN a mensagem de erro do ajuste está visível e o usuário edita qualquer campo de percentual, valor, nome ou cor THEN the system SHALL remover a mensagem.
- WHEN o usuário remove ou adiciona uma categoria depois do ajuste THEN the system SHALL exibir de novo os botões se a soma deixar de ser 100%.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AJUSTE-01 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-02 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-03 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-04 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-05 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-06 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-07 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-08 | P1: Fechar soma em 100% | - | Implemented |
| AJUSTE-09 | P1: Fechar soma em 100% | - | Implemented |

Mapeamento: AJUSTE-NN corresponde ao critério NN da história P1.

**Coverage:** 9 total, 9 implemented (percent.test.ts, e2e/categories.spec.ts)

---

## Success Criteria

- [ ] Do estado 99,047973% ao estado salvável em 1 clique.
- [ ] Zero cálculo manual para fechar 100%.
