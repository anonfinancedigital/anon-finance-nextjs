# Ápice: Meta alcançada e check nos marcos Specification

## Problem Statement

Em `/liberdade` (Ápice) o indicador "Aporte mensal necessário" mostra "Meta alcançada" e a frase-resumo diz "Você já tem o necessário" sempre que o aporte é 0, mesmo com o patrimônio abaixo do alvo (ex.: R$ 565 mil de R$ 1,2 mi, 47,1%, com 14 anos e 11 meses de prazo). O aporte é 0 porque o guardado, rendendo, chega ao alvo no prazo; a meta ainda não foi alcançada. O código aplica o texto a `monthlyCents === 0`, mas o spec de `apice-clareza` (AP-09) o restringe a `months === 0`. Além disso, o marco atingido perdeu o ícone de check ao ser refeito na barra de progresso (commit d6daa4b), contrariando AJL-02 de `liberdade-ajustes-ux`.

## Goals

- [ ] "Meta alcançada" e "Você já tem o necessário." aparecem somente quando o guardado já é maior ou igual ao alvo.
- [ ] Aporte 0 com guardado abaixo do alvo comunica que o patrimônio atual chega lá sem novos aportes.
- [ ] Todo marco atingido na barra exibe o círculo preenchido com o ícone de check.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar o cálculo do aporte, dos marcos ou da projeção | O cálculo está correto: 565 mil a 8% real em 14a11m passam de R$ 1,2 mi |
| Mudar o texto de "Prazo encerrado" | Sem relação com o bug |
| Redesenho da barra de progresso | Só o ícone de check é restaurado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Texto do indicador com aporte 0 e meta ainda não alcançada | "Sem aporte necessário", mantendo "em {prazo}" abaixo | Diz o que é verdade (não precisa guardar) sem afirmar que a meta foi atingida | y |
| Frase-resumo com aporte 0 e meta ainda não alcançada | "Seu patrimônio atual, rendendo, chega lá sem novos aportes." no lugar de "Isso exige guardar…" | Mantém a estrutura da frase e explica por que o aporte é 0 | y |
| Critério de "meta alcançada" | `savedCents >= targetCents`, o mesmo de `Checkpoint.reached` do marco de 100% | Uma única definição; o marco de 100% e o indicador não divergem | y |
| Aporte 0 com `months` 0 e guardado abaixo do alvo | Impossível: com `months` 0 o aporte é 0 só se o guardado alcança o alvo, senão é nulo ("Prazo encerrado") | Já garantido por `summarize` | y |
| Tamanho e cor do check | Ícone `Check` de 12 px (`size-3`), traço 3, sobre o círculo de 16 px preenchido, como antes de d6daa4b | Restaura o comportamento anterior | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Meta alcançada só quando alcançada ⭐ MVP

**User Story**: As a usuário com patrimônio abaixo do alvo, I want não ver "Meta alcançada" enquanto não cheguei lá so that eu não me engane sobre meu progresso.

**Why P1**: É o bug reportado.

**Acceptance Criteria**:

1. WHEN `savedCents` é maior ou igual a `targetCents` THEN the system SHALL render "Meta alcançada" no indicador "Aporte mensal necessário" e "Você já tem o necessário." na frase-resumo.  <!-- event-driven -->
2. WHEN `monthlyCents` é 0 e `savedCents` é menor que `targetCents` THEN the system SHALL render "Sem aporte necessário" no indicador "Aporte mensal necessário".  <!-- event-driven -->
3. WHEN `monthlyCents` é 0 e `savedCents` é menor que `targetCents` THEN the system SHALL render a frase-resumo "Para ter {renda}/mês aos {idade} anos, você precisa de {meta}. Seu patrimônio atual, rendendo, chega lá sem novos aportes."  <!-- event-driven -->
4. WHILE `months` é maior que 0 the system SHALL render "em {prazo}" abaixo do indicador, inclusive quando o aporte é 0.  <!-- state-driven -->
5. WHEN `savedCents` é maior ou igual a `targetCents` THEN the system SHALL omit "em {prazo}" abaixo do indicador.  <!-- event-driven -->
6. WHEN `monthlyCents` é nulo THEN the system SHALL keep "Prazo encerrado" e a frase sem a cláusula de aporte, como em AP-08.  <!-- event-driven -->

**Independent Test**: Objetivo com R$ 5 mil/mês aos 48 anos, nascido há 33 anos, R$ 565 mil guardados, cenário moderado: o indicador mostra "Sem aporte necessário" e "em 14 anos e 11 meses", sem "Meta alcançada". Com R$ 1,3 mi guardados mostra "Meta alcançada" sem prazo.

---

### P1: Check nos marcos atingidos ⭐ MVP

**User Story**: As a usuário, I want ver o ícone de check nos marcos já atingidos so that o progresso seja claro de relance.

**Why P1**: Regressão de AJL-02.

**Acceptance Criteria**:

1. WHEN um marco tem `reached` verdadeiro THEN the system SHALL render nele o círculo preenchido com a cor de progresso e o ícone de check.  <!-- event-driven -->
2. WHEN um marco tem `reached` falso THEN the system SHALL render o círculo menor vazio e SHALL NOT render o ícone de check.  <!-- event-driven -->
3. The system SHALL keep the marker decorative (`aria-hidden`), sem foco nem interação, e o rótulo "Atingido" em texto.  <!-- ubiquitous -->

**Independent Test**: Com R$ 565 mil de R$ 1,2 mi, o marco de R$ 300 mil mostra o check e os de R$ 600 mil, R$ 900 mil e R$ 1,2 mi não.

---

## Edge Cases

- WHEN `savedCents` é exatamente igual a `targetCents` THEN the system SHALL render "Meta alcançada".
- WHEN o guardado é 1 centavo menor que o alvo e o aporte é 0 THEN the system SHALL render "Sem aporte necessário".
- WHEN o rascunho da gaveta muda os valores THEN the system SHALL atualizar o indicador e a frase com o novo resumo, como em AP-07.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| APM-01 | P1: Meta alcançada só quando alcançada (AC 1) | - | Verified |
| APM-02 | P1: Meta alcançada só quando alcançada (AC 2) | - | Verified |
| APM-03 | P1: Meta alcançada só quando alcançada (AC 3) | - | Verified |
| APM-04 | P1: Meta alcançada só quando alcançada (AC 4, 5) | - | Verified |
| APM-05 | P1: Meta alcançada só quando alcançada (AC 6) | - | Verified |
| APM-06 | P1: Check nos marcos atingidos (AC 1, 2) | - | Verified |
| APM-07 | P1: Check nos marcos atingidos (AC 3) | - | Verified |

**Coverage:** 7 total, 7 implemented

---

## Success Criteria

- [ ] Nenhum estado com guardado abaixo do alvo exibe "Meta alcançada" ou "Você já tem o necessário.".
- [ ] Todo marco com `reached` verdadeiro exibe o check.
