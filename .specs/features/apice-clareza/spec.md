# Ápice: Clareza do Objetivo, Premissas, Gráfico, Gaveta e Estado Vazio Specification

## Problem Statement

A tela Ápice (`/liberdade`) calcula o patrimônio necessário e o aporte mensal, mas a hierarquia não comunica a cadeia **renda desejada → patrimônio necessário → aporte mensal → prazo**: a renda, que o usuário define, é uma pílula pequena; meta e aporte competem com o mesmo peso; as premissas (cenário, retirada, "R$ de hoje") só aparecem dentro da gaveta; o recálculo ao vivo da gaveta não é sinalizado; o estado vazio é denso e abre a gaveta em vez de simular na página. Este backlog (AP-01 a AP-20) reorganiza a tela em torno da renda desejada sem mudar nenhuma fórmula financeira.

## Goals

- [ ] No cenário de aceite (R$ 20.000/mês, R$ 565.000 guardados, 8% real, retirada 5%, ápice aos 48, nascido aos 33 anos), a tela mostra a renda desejada como maior número, "R$ 4,8 mi" de patrimônio necessário e "R$ 9.027/mês" de aporte necessário com "14 anos e 11 meses".
- [ ] As premissas ativas (cenário, rentabilidade, retirada, "Valores em R$ de hoje") ficam visíveis na página como chips, inclusive as personalizadas.
- [ ] A gaveta mostra o aporte mensal necessário da prévia em tempo real, com a variação em relação ao salvo e o rótulo "Prévia".
- [ ] O estado vazio simula o objetivo na própria página, com a mesma lógica de cálculo da gaveta, e salva o objetivo sem abrir a gaveta.
- [ ] O gráfico tem eixo Y em passos regulares, tooltip por idade, rótulo da meta sem sobreposição e cores com significado único.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar fórmulas (meta, aporte, prazo, juros), presets 6→4 / 8→5 / 10→6 ou a faixa de taxas | Regras financeiras intencionais; o backlog é de UX e copy. |
| Mudar schema do banco, colunas ou o contrato de `saveGoal` | Só apresentação e interação; a persistência atual atende. |
| Marcos sobre a curva do gráfico (AP-07) | Decisão do backlog: não adicionar. |
| Simulação rápida em painel recolhível na página (AP-20) | P2 "a considerar"; depende de decisão de produto (temporário vs. salvar) e o backlog manda avaliar depois do restante. Fica para uma feature própria. |
| Novas premissas personalizáveis (inflação, aportes extras) | O comportamento de "Personalizar premissas" não muda. |
| Testes e2e novos | Suspensos pela AD-005; unit e integration continuam obrigatórios. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| AP-20 (simulação rápida na página) | Fora desta feature | Backlog: "avaliar depois do restante"; decisão pendente de produto | y |
| Formato de valores no card e na frase-resumo | Renda e patrimônio compactos ("R$ 20 mil/mês", "R$ 4,8 mi"); aporte arredondado ao real ("R$ 9.027/mês"), como nos exemplos do backlog. O valor exato em centavos continua em `GoalSummary` e no "Como calculamos?" | Exemplos do backlog; evita falsa precisão numa simulação | n |
| Renda como "maior valor numérico" | Renda desejada em `text-4xl`; patrimônio e aporte em `text-2xl`, mesmo estilo entre si. Textos de gráfico e marcos não entram na comparação | Critério AP-02 é tipográfico entre os cards | n |
| Cor do card de aporte | Cor neutra do card (sem verde); roxo só em "dinheiro aportado" (AP-13) | Backlog: nunca a cor de rendimentos | n |
| Tokens de cor (AP-13) | `--color-invested` = roxo atual `--viz-target`; `--color-returns` = verde atual `--viz-spent`; `--color-progress` = valor próprio, distinto dos dois, aplicado à barra e aos marcos | Reaproveita os valores já usados no gráfico; o verde de progresso hoje é `--income` e passa a `--color-progress` | n |
| Idade atual na barra "Hoje" | Idade atual calculada da data de nascimento do objetivo (`ageOn`) | Já existe no domínio; o resumo hoje não a expõe, então `GoalSummary` ganha `currentAge` só para exibição | n |
| Data de nascimento no estado vazio | Sempre pedida como 4º campo; não existe nascimento fora do objetivo (`birth_date` vive na tabela do objetivo) | "Se ainda não houver no perfil" não se aplica: não há perfil com nascimento | n |
| Cenário no estado vazio | Moderado (8% real, retirada 5%) por padrão, editável pelo mesmo chip "Ajustar" que abre a gaveta de premissas | AP-19 pede chip editável reaproveitando AP-04; premissas avançadas ficam na gaveta | n |
| Prévia na página atrás da gaveta | A página por trás reflete a prévia (já é o comportamento atual) e o rótulo "Prévia" aparece na gaveta e junto aos cards enquanto houver alteração não aplicada | AP-14 aceita refletir desde que rotulado | n |
| "Alterações não aplicadas" | Existem quando os valores do formulário diferem dos salvos (comparação por valor, não por toque no campo) | Evita aviso falso ao digitar e desfazer | n |
| Confirmação ao descartar | Diálogo leve "Descartar alterações?" com "Descartar" e "Continuar editando", só quando há alterações; sem alterações, fecha direto | AP-18 | n |
| Variação "vs. atual" (AP-14) | Diferença do aporte mensal da prévia menos o do objetivo salvo, em R$ inteiros, com ↑ (aumento) ou ↓ (redução); só quando há objetivo salvo e a diferença é diferente de zero | Critério AP-14 | n |
| Animação do número (AP-14) | Destaque (highlight) de 300 ms no valor que muda; sem contagem. Com `prefers-reduced-motion`, sem animação | Mais simples e acessível | n |
| Eixo Y (AP-08) | Passo "redondo" da sequência 1·2·5×10ⁿ que gere de 4 a 6 ticks; máximo = menor múltiplo do passo ≥ maior entre meta e patrimônio final. Substitui `chartYMax` (107%) | Garante ticks igualmente espaçados para 500 mil, 4,8 mi e 20 mi | n |
| Slider com rótulo flutuante (AP-16) | O rótulo "48 anos" acima do handle repete o valor do campo; o campo numérico continua para digitação | Backlog: "continua editável por clique/teclado" | n |
| "Personalizado" (AP-17) | Quarto cartão "Personalizado" selecionado quando o par digitado não é preset (hoje vira só o botão "Personalizar premissas" realçado); o botão continua abrindo os campos de taxa | Pedido do AP-17 | n |
| Nascimento futuro ou inválido (AP-15) | Erro inline com os textos atuais do `goalSchema` ("Data de nascimento inválida", "A data de nascimento não pode ser futura"); a gaveta e o estado vazio não calculam enquanto houver erro | Lição L-002: mensagem exata na spec | n |
| Termos proibidos | Mantém a regra da feature `liberdade-copy-hierarquia`: nenhum texto promete renda, taxa "segura" ou preserva principal | Regra já vigente | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation (APICE-15, APICE-19, APICE-20), failure states (prazo encerrado e meta já atingida em APICE-02, APICE-19), state transitions (vazio → preenchido, prévia ↔ salvo, APICE-14, APICE-18, APICE-19), accessibility (tooltips por foco, slider por teclado, `prefers-reduced-motion`). Auth, concurrency, idempotency, data lifecycle, observability and external-dependency failure N/A because a feature não muda gravação, dados nem chamadas externas (a ação `saveGoal` e a autorização atuais permanecem).

---

## User Stories

### P1: Renda desejada como protagonista ⭐ MVP

**User Story**: As a usuário, I want ver minha renda desejada em destaque e a cadeia até o aporte mensal, so that eu entenda o que a tela responde.

**Why P1**: Muda a compreensão da página (AP-01, AP-02, AP-03).

**Acceptance Criteria**:

1. The system SHALL render the subtitle "Quanto você precisa juntar para viver de renda — e quanto guardar por mês para chegar lá." below the title "Ápice" in both the empty and the filled states.
2. The system SHALL render the subtitle in secondary text style on a single line at a 1280 px viewport.
3. WHEN a summary exists THEN the system SHALL render a main card with the label "Renda desejada" and the value "{renda compacta}/mês aos {idade} anos" (ex.: "R$ 20 mil/mês aos 48 anos") as the largest numeric value on the page.
4. WHEN a summary exists THEN the system SHALL render below the main card two indicators side by side with the same type size: "Patrimônio necessário" with the compact target (ex.: "R$ 4,8 mi") and "Aporte mensal necessário" with the deposit rounded to whole reais (ex.: "R$ 9.027/mês").
5. WHILE `months` is greater than 0 the system SHALL render the term "em {prazo}" (ex.: "em 14 anos e 11 meses") next to the deposit indicator.
6. WHEN a summary exists THEN the system SHALL render the summary sentence "Para ter {renda}/mês aos {idade} anos, você precisa de {meta}. Isso exige guardar {aporte}/mês por {prazo}." (ex.: "Para ter R$ 20 mil/mês aos 48 anos, você precisa de R$ 4,8 mi. Isso exige guardar R$ 9.027/mês por 14 anos e 11 meses.") with values from the current summary.
7. WHEN the draft values change in the drawer THEN the system SHALL update the summary sentence with the new summary.
8. IF `months` is 0 and `monthlyCents` is null THEN the system SHALL render "Prazo encerrado" in the deposit indicator and SHALL omit the "Isso exige guardar" clause from the sentence.
9. IF `months` is 0 and `monthlyCents` is 0 THEN the system SHALL render "Meta alcançada" in the deposit indicator and SHALL omit the term; the summary sentence SHALL replace the "Isso exige guardar" clause with "Você já tem o necessário." (ex.: "Para ter R$ 20 mil/mês aos 48 anos, você precisa de R$ 4,8 mi. Você já tem o necessário.").
10. The system SHALL NOT render the pill "Renda de {renda}/mês · retirada inicial de {taxa} a.a.".
11. The system SHALL replace "Aporte Estratégico Mensal" and "Aporte Mensal" with "Aporte mensal necessário", "Meta Patrimonial" with "Patrimônio necessário", and "Calibrar Parâmetros" (botão e título da gaveta) with "Ajustar objetivo" on the page, the drawer, the tooltips and the "Como calculamos?" text.
12. The system SHALL render the drawer description "Altere os valores e veja o aporte mensal mudar na hora." in place of "Simule o ápice: renda, patrimônio e idade."

**Independent Test**: Com o cenário de aceite, abrir `/liberdade`: subtítulo, card "Renda desejada R$ 20 mil/mês aos 48 anos", dois indicadores, a frase-resumo e nenhuma ocorrência dos termos antigos; abrir a gaveta e mudar a renda: a frase muda.

---

### P1: Premissas visíveis em chips ⭐ MVP

**User Story**: As a usuário, I want ver na página as premissas que definem o resultado, so that eu saiba que os valores são reais e de que cenário vêm.

**Why P1**: O cenário define todo o resultado e hoje só aparece na gaveta (AP-04, AP-05).

**Acceptance Criteria**:

1. WHEN a summary exists THEN the system SHALL render below the main card the chips "Cenário {nome}", "{taxa}% real a.a.", "Retirada de {taxa}% a.a." and "Valores em R$ de hoje" (ex.: "Cenário moderado", "8% real a.a.", "Retirada de 5% a.a.", "Valores em R$ de hoje") and a "Ajustar" link.
2. WHEN the pair of rates matches no preset THEN the system SHALL render the first chip as "Cenário personalizado" and the other two chips with the custom rates.
3. WHEN the user activates "Ajustar" THEN the system SHALL open the "Ajustar objetivo" drawer.
4. WHEN the user hovers or focuses the chip "Valores em R$ de hoje" THEN the system SHALL show the tooltip "Todos os valores já descontam a inflação."
5. WHEN the user hovers or focuses the info icon (ⓘ) on the chip "Retirada de {taxa}% a.a." THEN the system SHALL show the tooltip "Percentual do patrimônio que você saca por ano para gerar sua renda. Com {taxa}%, {meta} geram {renda anual}/ano ({renda}/mês)." (ex.: "Com 5%, R$ 4,8 mi geram R$ 240 mil/ano (R$ 20 mil/mês).") with the current values.
6. The system SHALL show the same tooltip text, with the cenário's own rate and the current income, on the "Retirada" line of each scenario card in the drawer.
7. The system SHALL make every tooltip reachable by keyboard focus and dismissible with Escape.

**Independent Test**: Com 8%/5%, ver os quatro chips e "Ajustar"; trocar para 6%/6,5% na gaveta: o primeiro chip vira "Cenário personalizado"; focar o ⓘ da retirada com Tab e ler o exemplo com os valores atuais.

---

### P1: Gaveta "Ajustar objetivo" com recálculo evidente ⭐ MVP

**User Story**: As a usuário, I want ver o aporte mudar enquanto digito e descartar a prévia sem salvar, so that eu avalie se o objetivo é palpável sem medo de alterar o salvo.

**Why P1**: A simulação ao vivo já existe mas não é percebida (AP-14, AP-18).

**Acceptance Criteria**:

1. The system SHALL render at the top of the drawer a fixed summary with "Aporte mensal necessário" in the largest type and "Patrimônio necessário" in smaller type beside it.
2. WHEN the user edits any drawer field to a valid value THEN the system SHALL update the summary within 100 ms without requiring blur or click.
3. WHEN the summary value changes THEN the system SHALL highlight the changed number for 300 ms, except WHERE the user prefers reduced motion, where the system SHALL NOT animate.
4. WHEN a saved goal exists and the deposit of the preview differs from the saved deposit THEN the system SHALL show the variation "{↑|↓} {diferença} vs. atual" (ex.: "↑ R$ 1.240 vs. atual") next to the deposit.
5. WHILE the preview deposit equals the saved deposit the system SHALL NOT show the variation.
6. WHILE the form values differ from the saved values the system SHALL show the label "Prévia" in the drawer and on the page summary.
7. WHILE the form values equal the saved values the system SHALL NOT show the label "Prévia".
8. The system SHALL render the drawer footer fixed at the bottom, visible without scrolling, with the buttons "Aplicar" and "Cancelar".
9. WHEN the user activates "Aplicar" with valid values THEN the system SHALL save the goal and close the drawer.
10. WHEN the user activates "Cancelar" or the close "X" and the form values differ from the saved values THEN the system SHALL ask "Descartar alterações?" with the options "Descartar" and "Continuar editando".
11. WHEN the user chooses "Descartar" THEN the system SHALL close the drawer and restore the page to the saved goal.
12. WHEN the user chooses "Continuar editando" THEN the system SHALL keep the drawer open with the edited values.
13. WHEN the user activates "Cancelar" or "X" and the form values equal the saved values THEN the system SHALL close the drawer without asking.
14. IF the values are invalid THEN the system SHALL keep the last valid summary and the "Prévia" label.

**Independent Test**: Com objetivo salvo, abrir "Ajustar objetivo", aumentar a renda: o aporte muda sem sair do campo, aparece "↑ … vs. atual" e "Prévia"; clicar em "X": diálogo "Descartar alterações?"; "Descartar" volta aos valores salvos.

---

### P1: Estado vazio com simulação inline ⭐ MVP

**User Story**: As a usuário novo, I want informar renda, valor guardado e idade na própria página e ver quanto guardar por mês, so that eu entenda o resultado antes de salvar.

**Why P1**: O estado vazio atual é denso, sem prévia e tira o usuário do contexto (AP-19).

**Acceptance Criteria**:

1. WHILE no goal is saved the system SHALL render the headline "Quanto você precisa para viver de renda?" and the support line "Diga a renda que quer ter e veja quanto guardar por mês para chegar lá."
2. WHILE no goal is saved the system SHALL render the inline fields "Renda mensal desejada", "Quanto você já tem guardado", "Com que idade quer chegar lá" and "Data de nascimento", using the same masks as the drawer.
3. WHILE no goal is saved the system SHALL apply the Moderado scenario by default and render its chips as in the filled state, with "Ajustar" opening the drawer.
4. WHEN a valid income and a valid age are filled THEN the system SHALL render below the fields the summary sentence and the deposit indicator, computed with the same `summarize` and `goalSchema` used by the drawer.
5. WHILE income, age or birth date is missing the system SHALL render the placeholder "Preencha a renda e a idade para ver o aporte". An empty "Quanto você já tem guardado" counts as R$ 0 when evaluating the draft and when saving (sent as "0,00"); `goalSchema` still rejects an empty value, and empty versus "0,00" is not a change (APICE-14.7).
6. IF the user has not interacted with a field THEN the system SHALL NOT render an error message for that field.
7. IF a field the user has interacted with is invalid THEN the system SHALL render the error message of `goalSchema` for that field below it.
8. WHILE the income or the age is empty the system SHALL render a faded example chart in the background.
9. WHEN the user activates "Salvar objetivo" with valid values THEN the system SHALL save the goal and render the filled state without opening the drawer.
10. IF the save fails THEN the system SHALL render the returned error below the button and keep the typed values.
11. The system SHALL use the same calculation module for the empty state and the drawer and SHALL NOT duplicate the formulas.

**Independent Test**: Sem objetivo, abrir `/liberdade`: título, quatro campos, chip "Cenário moderado" e placeholder; digitar renda 20.000, guardado 565.000, nascimento e idade 48: aparecem a frase-resumo e o aporte; "Salvar objetivo" leva ao estado preenchido; recarregar a página sem digitar nada não mostra erros.

---

### P2: Progresso na barra de marcos

**User Story**: As a usuário, I want ver onde estou na barra de progresso sem parecer um controle interativo, so that eu não tente arrastá-la.

**Why P2**: Melhora de usabilidade, não muda a compreensão (AP-06, AP-07).

**Acceptance Criteria**:

1. The system SHALL render the current position as a dot without a handle appearance, with the label "Hoje · {guardado compacto} ({percentual}) · {idade} anos" (ex.: "Hoje · R$ 565 mil (11,8%) · 33 anos").
2. The system SHALL render reached milestones as filled circles and future milestones as smaller hollow circles.
3. The system SHALL NOT apply a pointer cursor or hover/focus state to any element of the progress bar.
4. The system SHALL NOT render "{guardado} acumulados ({percentual} do alvo)" in the main card.
5. The system SHALL render the progress percentage only in the "Hoje" label.
6. The system SHALL NOT add milestone markers over the chart curve.
7. IF the progress is above 100% THEN the system SHALL render the "Hoje" dot at the end of the bar and the label with the real percentage.

**Independent Test**: Com o cenário de aceite, a barra mostra "Hoje · R$ 565 mil (11,8%) · 33 anos"; passar o mouse sobre o ponto e os marcos não muda o cursor; o texto "acumulados" não existe.

---

### P2: Campos da gaveta mais claros

**User Story**: As a usuário, I want digitar a data com máscara, ajustar a idade num slider legível e ler os cenários com hierarquia, so that eu preencha a gaveta sem dúvida.

**Why P2**: Refinamento de usabilidade (AP-15, AP-16, AP-17).

**Acceptance Criteria**:

1. The system SHALL keep the birth date mask "dd/mm/aaaa" and render the calculated age beside the field (ex.: "33 anos") WHEN the date is valid.
2. IF the birth date is incomplete or invalid THEN the system SHALL render the inline error "Data de nascimento inválida" (mensagem atual do `goalSchema`) and SHALL NOT render the age.
3. IF the birth date is later than today THEN the system SHALL render the inline error "A data de nascimento não pode ser futura".
4. The system SHALL use the current age plus 1 as the minimum of the retirement age slider and field.
5. The system SHALL render the retirement age slider at full width with the current value above the handle (ex.: "48 anos") and the limits ("{mínimo} anos" and "90 anos") at its ends.
6. WHEN the user presses an arrow key on the slider THEN the system SHALL change the age by 1 year.
7. The system SHALL keep the retirement age field and the slider synchronized in both directions.
8. WHERE the birth date is missing the system SHALL disable the slider and render "Informe a data de nascimento para usar o controle".
9. The system SHALL render each scenario card with the hierarchy name, then rentabilidade, then retirada, with the retirada line carrying the info icon of the P1 tooltip.
10. The system SHALL render the selected scenario with an accent border, accent background and a check icon.
11. WHEN the rates match no preset THEN the system SHALL render a fourth card "Personalizado" selected and no preset card selected.
12. The system SHALL render the scenario cards without clipped text or horizontal scroll at 320 px.

**Independent Test**: Digitar uma data futura: erro inline; digitar 15/03/1992: "33 anos" ao lado e slider começa em 34; setas movem 1 ano; clicar em "Personalizar premissas" e mudar a retirada: o quarto cartão "Personalizado" fica selecionado.

---

### P2: Gráfico legível e com significado de cores

**User Story**: As a usuário, I want um gráfico com eixos regulares, rótulos sem sobreposição e cores consistentes com o resto da página, so that eu leia a trajetória sem esforço.

**Why P2**: Refinamento da leitura do gráfico (AP-08 a AP-13).

**Acceptance Criteria**:

1. The system SHALL generate the Y axis ticks equally spaced at a round step (1, 2 or 5 × 10ⁿ), starting at 0, with 4 to 6 ticks and a maximum equal to the smallest multiple of the step not below the larger of the target and the final patrimony. The final patrimony counts as larger than the target only when it exceeds it by more than 0.1% of the target, so the cents of rounding in the required deposit do not raise the axis by a step.
2. WHEN the target is R$ 500 mil THEN the system SHALL render the Y ticks 0, 100 mil, 200 mil, 300 mil, 400 mil, 500 mil.
3. WHEN the target is R$ 4,8 mi and the final patrimony is up to R$ 4,8 mi THEN the system SHALL render the Y ticks 0, 1 mi, 2 mi, 3 mi, 4 mi, 5 mi.
4. WHEN the target is R$ 20 mi THEN the system SHALL render the Y ticks 0, 5 mi, 10 mi, 15 mi, 20 mi.
5. The system SHALL render the label "Meta: {meta compacta}" without overlapping the curve, with a card-colored background.
6. The system SHALL render the X axis title "Idade" and label the current age at the first tick.
7. WHEN the user hovers, touches or focuses a point of the chart THEN the system SHALL show the tooltip with, for that age, total patrimony, total invested and earnings, and a vertical guide line that follows the cursor.
8. The system SHALL render the earnings insight "{rendimentos} vêm dos rendimentos · {percentual}% do patrimônio final" as an icon with text without a filled pill background.
9. The system SHALL define the tokens `--color-invested`, `--color-returns` and `--color-progress`, each used for a single meaning: money contributed by the user, earnings, and progress toward the target.
10. The system SHALL NOT use `--color-returns` on the deposit card or on the progress bar.

**Independent Test**: Simular metas de 500 mil, 4,8 mi e 20 mi e conferir os ticks; passar o dedo sobre o gráfico no celular e ler idade, total, investido e rendimentos; conferir que o card de aporte não é verde.

---

## Edge Cases

- IF the user types an income of 0 or a negative value in the empty state THEN the system SHALL render the `goalSchema` error for the income after interaction and keep the placeholder.
- IF the retirement age is not above the current age THEN the system SHALL render the `goalSchema` error for the age and keep the last valid summary in the drawer.
- WHEN the saved goal has a deposit of R$ 0,00 THEN the system SHALL NOT render a variation arrow for a preview that also yields R$ 0,00.
- WHEN the viewport is 320 px wide THEN the system SHALL render the main card, chips and indicators without horizontal scroll.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| APICE-01 | P1: Renda desejada como protagonista (AP-01, subtítulo) | Design | Pending |
| APICE-02 | P1: Renda desejada como protagonista (AP-02, hierarquia e frase) | Design | Pending |
| APICE-03 | P1: Renda desejada como protagonista (AP-03, nomenclatura) | Design | Pending |
| APICE-04 | P1: Premissas visíveis em chips (AP-04) | Design | Pending |
| APICE-05 | P1: Premissas visíveis em chips (AP-05, tooltip de retirada) | Design | Pending |
| APICE-06 | P2: Progresso na barra de marcos (AP-06) | Design | Pending |
| APICE-07 | P2: Progresso na barra de marcos (AP-07) | Design | Pending |
| APICE-08 | P2: Gráfico legível (AP-08, eixo Y) | Design | Pending |
| APICE-09 | P2: Gráfico legível (AP-09, rótulo da meta) | Design | Pending |
| APICE-10 | P2: Gráfico legível (AP-10, eixo X) | Design | Pending |
| APICE-11 | P2: Gráfico legível (AP-11, tooltip por idade) | Design | Pending |
| APICE-12 | P2: Gráfico legível (AP-12, insight) | Design | Pending |
| APICE-13 | P2: Gráfico legível (AP-13, cores) | Design | Pending |
| APICE-14 | P1: Gaveta com recálculo evidente (AP-14) | Design | Pending |
| APICE-15 | P2: Campos da gaveta mais claros (AP-15, nascimento) | Design | Pending |
| APICE-16 | P2: Campos da gaveta mais claros (AP-16, slider) | Design | Pending |
| APICE-17 | P2: Campos da gaveta mais claros (AP-17, cenários) | Design | Pending |
| APICE-18 | P1: Gaveta com recálculo evidente (AP-18, rodapé e descarte) | Design | Pending |
| APICE-19 | P1: Estado vazio com simulação inline (AP-19) | Design | Pending |

AP-20 não tem requisito: fora de escopo desta feature (ver Out of Scope).

**ID format:** `APICE-NN`. **Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped ⚠️

---

## Success Criteria

- [ ] No cenário de aceite, a renda desejada é o maior valor numérico da tela e a frase-resumo traz os valores reais da simulação.
- [ ] Alterar qualquer campo da gaveta atualiza o aporte mensal necessário em menos de 100 ms, sem blur.
- [ ] Um usuário sem objetivo vê o aporte necessário e salva o objetivo sem abrir a gaveta.
- [ ] Os valores de `summarize` para a mesma entrada ficam idênticos aos de antes da feature.
