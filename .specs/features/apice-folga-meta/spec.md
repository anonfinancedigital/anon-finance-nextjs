# Ápice: Folga sobre a Meta Specification

## Problem Statement

Quando o patrimônio atual, rendendo, já chega ao alvo antes da idade escolhida (aporte necessário 0), a tela trata a boa notícia como valor ausente. O card diz "Sem aporte necessário", mostra "em 14 anos e 11 meses" (o prazo até a idade-alvo, não até a meta) e rotula o marco de 100% como "Aos 48 anos (Meta)" (idade-alvo, não a idade em que a projeção cruza o alvo). Nada diz ao usuário quanto sobra nem o que fazer com a folga. Exemplo de referência: renda R$ 5 mil/mês aos 48 anos, retirada 5%, 8% real a.a., R$ 565 mil guardados. A meta de R$ 1,2 mi é alcançada em 118 meses (aos 43 anos); aos 48 o patrimônio chega a R$ 1,78 mi, que geram R$ 7,4 mil/mês.

Substitui as regras de aporte 0 com guardado abaixo do alvo de `apice-meta-alcancada` (APM-02, APM-03 e a parte de APM-04 sobre o prazo) e amplia AP-09 de `apice-clareza` para o estado "Ápice já atingido".

## Goals

- [ ] Aporte 0 com guardado abaixo do alvo aparece como conquista ("R$ 0" com check) e informa a idade em que a meta é alcançada e quanto antes do previsto.
- [ ] A idade do marco de 100% e todo texto de "meta aos N anos" vêm da projeção, não da idade-alvo.
- [ ] O usuário vê a folga e aplica, com um clique, "mais renda" ou "parar antes" como prévia na gaveta.
- [ ] A conclusão informa se resiste a uma rentabilidade real de 6% a.a.
- [ ] Guardado maior ou igual ao alvo mostra "Você já atingiu seu Ápice" e quanto o patrimônio gera por mês hoje.
- [ ] A barra de marcos e o gráfico contam a história da folga.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Salvar direto pelos botões da folga | Os botões só preenchem o rascunho; salvar continua na gaveta |
| Bloco de folga na simulação sem objetivo salvo (estado vazio) | Estado vazio só herda os textos do indicador e da frase |
| Mudar o cálculo do aporte necessário quando é maior que 0 | Sem relação com o pedido |
| Sugerir combinação de renda maior e idade menor | Duas opções simples bastam |
| Nova rentabilidade ou retirada nos botões | Só renda e idade mudam |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Definição de "idade da meta" N | Menor idade inteira N, com N menor ou igual à idade-alvo, tal que o guardado rendendo sem aportes até o mês do aniversário de N alcança o alvo (no exemplo, 43) | É a idade que "Antecipar para N" aplica e que dá aporte 0; um único número em texto, marco e botão | n |
| Idade do marco de 100% | Usa N; os marcos de 25, 50 e 75% mantêm a regra atual de anos completos | O pedido corrige só o marco da meta | n |
| Rótulo do marco de 100% | "Aos 43 anos (Meta)" (mesmo padrão de hoje, idade corrigida), não "Meta atingida aos 43" | A meta ainda não foi atingida; o futuro não vira "atingida" | n |
| Rentabilidade do teste de robustez | 6% real a.a. mantendo a retirada e o alvo do objetivo; omitido quando a rentabilidade do objetivo já é 6% ou menos | O preset conservador troca também a retirada (4%) e mudaria o alvo; aqui só a rentabilidade varia | n |
| Valor de "Ter mais renda" | Patrimônio no prazo sem aportes × retirada ÷ 12, arredondado para baixo em reais inteiros | O arredondamento para baixo garante que o botão leve ao aporte 0, sem passar do patrimônio | y |
| Limiar para exibir "Ter mais renda" | A renda extra é pelo menos 5% maior que a renda desejada | Evita oferecer R$ 5.032 depois de aplicar "Antecipar" | n |
| Limiar para exibir "Parar antes" | N é menor que a idade-alvo | Sem antecipação não há opção | y |
| Escala da barra na folga | O fim da barra é o patrimônio no prazo sem aportes; os marcos de 25, 50, 75 e 100% ficam em valor ÷ esse patrimônio; o trecho depois do marco de 100% usa a cor de rendimentos e o rótulo "Folga" | A barra mede patrimônio, não idade; o trecho extra só cabe numa escala maior | n |
| Cor e ícone do "R$ 0" | Texto na cor de sucesso (`income`) com ícone `Check` ao lado | Padrão de sucesso do app | y |
| Frase-resumo no estado "já atingiu" | "Você já atingiu seu Ápice." no lugar de "Você já tem o necessário." | Texto de referência; o indicador segue "Meta alcançada" (já existente) | y |
| Estado "já atingiu": o que o card mostra no lugar do prazo | Linha "Seu patrimônio já gera R$ X/mês" (patrimônio × retirada ÷ 12, compacto) | Texto de referência | y |
| Aviso quando o teste de robustez falha | Linha em cor de atenção (`warning`), sem alarme | "Alerta suave" do pedido | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Aporte 0 como conquista ⭐ MVP

**User Story**: As a usuário cujo patrimônio já basta, I want ver "R$ 0" com check e quando chego à meta so that eu entenda que está tudo certo.

**Why P1**: É a correção do estado e dos dois erros de idade.

**Acceptance Criteria**:

1. WHEN `monthlyCents` é 0 e o guardado é menor que o alvo THEN the system SHALL render "R$ 0" no indicador "Aporte mensal necessário" na cor de sucesso, com o ícone de check ao lado.  <!-- event-driven -->
2. WHEN `monthlyCents` é 0 e o guardado é menor que o alvo THEN the system SHALL render abaixo do indicador "Seu patrimônio atual já te leva lá: você atinge a meta aos {N} anos, {D} antes do previsto." com D igual à idade-alvo menos N, em "1 ano" ou "{D} anos".  <!-- event-driven -->
3. WHEN `monthlyCents` é 0, o guardado é menor que o alvo e N é igual à idade-alvo THEN the system SHALL render "Seu patrimônio atual já te leva lá: você atinge a meta aos {N} anos, no prazo previsto.".  <!-- event-driven -->
4. WHEN `monthlyCents` é 0 e o guardado é menor que o alvo THEN the system SHALL NOT render "em {prazo}" nem "Sem aporte necessário".  <!-- event-driven -->
5. WHEN `monthlyCents` é 0 e o guardado é menor que o alvo THEN the system SHALL render a frase-resumo "Para ter {renda}/mês aos {idade} anos, você precisa de {meta}. Seu patrimônio atual, rendendo, chega lá aos {N}, sem novos aportes." (ex.: "Para ter R$ 5 mil/mês aos 48 anos, você precisa de R$ 1,2 mi. Seu patrimônio atual, rendendo, chega lá aos 43, sem novos aportes.").  <!-- event-driven -->
6. WHEN `monthlyCents` é 0 e o guardado é menor que o alvo THEN the system SHALL render no marco de 100% o rótulo "Aos {N} anos (Meta)".  <!-- event-driven -->
7. WHEN `monthlyCents` é maior que 0 THEN the system SHALL keep o indicador, o prazo, a frase e o rótulo do marco de 100% como em AP-04 a AP-06 e LEX-13.  <!-- event-driven -->

**Independent Test**: Cenário de referência (renda R$ 5 mil, 48 anos, 8%/5%, R$ 565 mil guardados): indicador "R$ 0" com check, linha "aos 43 anos, 5 anos antes do previsto", marco "Aos 43 anos (Meta)" e nenhuma ocorrência de "14 anos e 11 meses" no card.

---

### P1: Ápice já atingido ⭐ MVP

**User Story**: As a usuário que já tem o patrimônio-alvo, I want ver que atingi meu Ápice e quanto ele gera so that eu saiba onde estou hoje.

**Why P1**: Estado vizinho do mesmo bug; hoje cai em "Você já tem o necessário.".

**Acceptance Criteria**:

1. WHEN o guardado é maior ou igual ao alvo THEN the system SHALL render a frase-resumo "Para ter {renda}/mês aos {idade} anos, você precisa de {meta}. Você já atingiu seu Ápice.".  <!-- event-driven -->
2. WHEN o guardado é maior ou igual ao alvo THEN the system SHALL render no indicador "Aporte mensal necessário" o texto "Meta alcançada" e SHALL NOT render "em {prazo}".  <!-- event-driven -->
3. WHEN o guardado é maior ou igual ao alvo THEN the system SHALL render a linha "Seu patrimônio já gera {X}/mês", com X igual a guardado × retirada ÷ 12 em valor compacto.  <!-- event-driven -->
4. WHEN o guardado é maior ou igual ao alvo THEN the system SHALL render os 4 marcos como "Atingido" com check e a barra completa.  <!-- event-driven -->
5. WHEN o guardado é maior ou igual ao alvo THEN the system SHALL NOT render o bloco "Você tem folga" nem a linha de robustez.  <!-- event-driven -->

**Independent Test**: Com R$ 1,3 mi guardados e alvo R$ 1,2 mi (retirada 5%): "Você já atingiu seu Ápice.", "Meta alcançada" e "Seu patrimônio já gera R$ 5,4 mil/mês".

---

### P2: Bloco "Você tem folga" ⭐

**User Story**: As a usuário com folga, I want ver quanto mais de renda ou quantos anos a menos eu posso ter so that eu use a folga.

**Why P2**: É o ganho de valor do pedido; depende dos dados corretos do P1.

**Acceptance Criteria**:

1. WHEN `monthlyCents` é 0, o guardado é menor que o alvo e há ao menos uma opção THEN the system SHALL render abaixo dos dois indicadores o bloco "Você tem folga" com a linha "Sem novos aportes, aos {idade} anos seu patrimônio chega a {patrimônio compacto}." e uma linha por opção.  <!-- event-driven -->
2. WHERE a renda extra é pelo menos 5% maior que a renda desejada the system SHALL render a opção "Ter mais renda" com o resultado "{renda extra compacta}/mês aos {idade} anos" e o botão "Usar {renda extra compacta}".  <!-- optional-feature -->
3. WHERE N é menor que a idade-alvo the system SHALL render a opção "Parar antes" com o resultado "{renda desejada compacta}/mês aos {N} anos" e o botão "Antecipar para {N}".  <!-- optional-feature -->
4. WHEN o usuário aciona "Usar {renda extra}" THEN the system SHALL preencher o campo de renda do rascunho com a renda extra em reais inteiros (ex.: "7.420,00"), abrir a gaveta e exibir a prévia recalculada.  <!-- event-driven -->
5. WHEN o usuário aciona "Antecipar para {N}" THEN the system SHALL preencher o campo da idade da independência do rascunho com N, abrir a gaveta e exibir a prévia recalculada.  <!-- event-driven -->
6. The system SHALL NOT salvar o objetivo ao acionar um botão da folga.  <!-- ubiquitous -->
7. WHEN nenhuma opção está disponível THEN the system SHALL NOT render o bloco "Você tem folga".  <!-- event-driven -->
8. The system SHALL render os botões da folga como botões focáveis por teclado com o texto do rótulo como nome acessível.  <!-- ubiquitous -->

**Independent Test**: No cenário de referência o bloco mostra "R$ 7,4 mil/mês aos 48 anos" com "Usar R$ 7,4 mil" e "R$ 5 mil/mês aos 43 anos" com "Antecipar para 43". Acionar o primeiro abre a gaveta com renda "7.420,00" e "Prévia"; o objetivo salvo não muda até "Salvar".

---

### P2: Robustez da conclusão

**User Story**: As a usuário, I want saber se a conclusão resiste a uma rentabilidade menor so that eu não dependa só da taxa escolhida.

**Why P2**: Evita falsa segurança; uma linha discreta.

**Acceptance Criteria**:

1. WHERE `monthlyCents` é 0, o guardado é menor que o alvo e a rentabilidade do objetivo é maior que 6% a.a. the system SHALL render o teste de robustez com rentabilidade real de 6% a.a., mantendo prazo, alvo e retirada do objetivo.  <!-- optional-feature -->
2. WHEN o teste de robustez alcança o alvo sem aportes THEN the system SHALL render "Mesmo com 6% real a.a., você chega à meta. Isso considera que você não retira nada do patrimônio até lá.".  <!-- event-driven -->
3. WHEN o teste de robustez exige aporte {A} THEN the system SHALL render em cor de atenção "Com 6% real a.a., seria preciso aportar {A}/mês." com A em reais inteiros.  <!-- event-driven -->
4. IF a rentabilidade do objetivo é 6% a.a. ou menos THEN the system SHALL NOT render o teste de robustez.  <!-- unwanted-behavior -->

**Independent Test**: No cenário de referência a linha diz "Mesmo com 6% real a.a., você chega à meta…" (R$ 565 mil a 6% chegam a R$ 1,35 mi). Com guardado R$ 400 mil a linha de atenção traz o aporte a 6%.

---

### P3: Barra e gráfico contam a folga

**User Story**: As a usuário, I want ver a folga na barra e o ponto em que a curva cruza a meta so that eu entenda o resultado visualmente.

**Why P3**: Reforço visual; os textos já carregam a informação.

**Acceptance Criteria**:

1. WHILE `monthlyCents` é 0 e o guardado é menor que o alvo, the system SHALL render a barra com fim no patrimônio do prazo sem aportes e os marcos de 25, 50, 75 e 100% posicionados em valor ÷ esse patrimônio.  <!-- state-driven -->
2. WHILE `monthlyCents` é 0 e o guardado é menor que o alvo, the system SHALL render o trecho da barra depois do marco de 100% na cor de rendimentos, com o rótulo final "{patrimônio compacto}" e "Aos {idade} anos (Folga)".  <!-- state-driven -->
3. WHILE `monthlyCents` é 0, o guardado é menor que o alvo e N é menor que a idade-alvo, the system SHALL render no gráfico um ponto sobre a linha da meta na idade em que a curva a cruza, com o rótulo "Meta aos {N}".  <!-- state-driven -->
4. WHILE `monthlyCents` é 0 the system SHALL keep a série "Total investido" constante no valor guardado.  <!-- state-driven -->
5. WHEN `monthlyCents` é maior que 0 THEN the system SHALL render a barra e o gráfico como hoje, sem trecho de folga nem ponto de cruzamento.  <!-- event-driven -->

**Independent Test**: No cenário de referência o marco de R$ 1,2 mi fica a cerca de 67% da barra, o trecho até o fim usa outra cor e o gráfico mostra o ponto "Meta aos 43".

---

## Edge Cases

- WHEN o guardado é R$ 0 THEN the system SHALL NOT render o bloco de folga nem o teste de robustez (aporte necessário é maior que 0).
- WHEN `months` é 0 e o guardado é menor que o alvo THEN the system SHALL keep "Prazo encerrado" (aporte nulo), sem o bloco de folga.
- WHEN o guardado é 1 centavo menor que o alvo e há prazo THEN the system SHALL render N como a idade em que o rendimento cobre o centavo e o bloco de folga conforme os limiares.
- WHEN o usuário altera a gaveta THEN the system SHALL recalcular indicador, frases, bloco, robustez, barra e gráfico com o resumo do rascunho (AP-07).
- WHEN a renda extra aplicada leva o rascunho a nenhuma opção restante THEN the system SHALL ocultar o bloco.
- WHEN o rascunho ficou inválido THEN the system SHALL keep o último resumo válido, como hoje.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| APF-01 | P1: Aporte 0 como conquista (AC 1, 4) | Phase 1 | Implementing |
| APF-02 | P1: Aporte 0 como conquista (AC 2, 3) | Phase 1 | Implementing |
| APF-03 | P1: Aporte 0 como conquista (AC 5) | Phase 1 | Implementing |
| APF-04 | P1: Aporte 0 como conquista (AC 6) | - | Pending |
| APF-05 | P1: Aporte 0 como conquista (AC 7) | Phase 1 | Implementing |
| APF-06 | P1: Ápice já atingido (AC 1, 2) | Phase 1 | Implementing |
| APF-07 | P1: Ápice já atingido (AC 3) | Phase 1 | Implementing |
| APF-08 | P1: Ápice já atingido (AC 4, 5) | - | Pending |
| APF-09 | P2: Bloco "Você tem folga" (AC 1, 7) | Phase 1 | Implementing |
| APF-10 | P2: Bloco "Você tem folga" (AC 2, 3) | Phase 1 | Implementing |
| APF-11 | P2: Bloco "Você tem folga" (AC 4, 5, 6) | Phase 1 | Implementing |
| APF-12 | P2: Bloco "Você tem folga" (AC 8) | - | Pending |
| APF-13 | P2: Robustez da conclusão (AC 1, 4) | Phase 1 | Implementing |
| APF-14 | P2: Robustez da conclusão (AC 2, 3) | Phase 1 | Implementing |
| APF-15 | P3: Barra e gráfico contam a folga (AC 1, 2, 5) | - | Pending |
| APF-16 | P3: Barra e gráfico contam a folga (AC 3, 4) | Phase 1 | Implementing |

**Coverage:** 16 total, 16 mapped to tasks, 0 unmapped; 12 Implementing, 4 Pending

---

## Success Criteria

- [ ] No cenário de referência nenhum texto da tela usa a idade-alvo como idade em que a meta é alcançada.
- [ ] O usuário aplica "mais renda" ou "parar antes" em um clique e salva pela gaveta.
- [ ] Nenhum estado com guardado abaixo do alvo exibe "Meta alcançada", "Você já tem o necessário." ou "Você já atingiu seu Ápice.".
