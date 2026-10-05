# Liberdade: Experiência do Objetivo Specification

## Problem Statement

A aba Liberdade calcula alvo, progresso e aporte, mas mostra tudo em caixas idênticas, sem hierarquia, e a projeção em três marcos isolados não transmite o efeito dos juros compostos. A barra de progresso tem divisórias sem rótulo, a data de nascimento aparece no formato americano e a edição é um formulário estático: o usuário não vê o efeito de uma idade ou taxa diferente antes de salvar.

## Goals

- [ ] O topo da aba responde "quanto preciso investir por mês" e "o que esse patrimônio me rende" em um Hero Card, sem repetir o layout de caixas iguais.
- [ ] O usuário vê a evolução do patrimônio até a aposentadoria separada em valor investido e rendimentos.
- [ ] O usuário muda idade de aposentadoria e taxa esperada e vê alvo, aporte, gráfico e checkpoints recalcularem antes de salvar.
- [ ] A data de nascimento é digitada e exibida em DD/MM/AAAA.

## Out of Scope

Explicitamente excluído para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Escolher o aporte mensal e derivar a idade de aposentadoria | Decidido: o aporte é sempre o necessário, calculado; sliders só de idade e taxa. |
| Salvar automaticamente a cada ajuste | Decidido: prévia ao vivo com botão Salvar e Cancelar. |
| Taxa livre fora dos 3 presets | Decidido: só 6%, 8% e 10% ao ano. |
| Inflação, imposto e taxas de corretagem | Já fora de escopo em `liberdade-financeira`; segue assim. |
| Vários objetivos, histórico de evolução, integração com transações | Já fora de escopo em `liberdade-financeira`; segue assim. |
| Checkpoints em valores redondos fixos (R$ 100 mil, 500 mil, 1 mi) | Decidido: checkpoints são frações do alvo. |
| Comparar dois cenários lado a lado | Não pedido. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Taxa esperada | 3 presets: Conservador 6%, Moderado 8% (padrão), Agressivo 10% ao ano; persistida no objetivo | Escolha do usuário | y |
| Efeito da taxa no alvo | Alvo = renda mensal × 12 ÷ taxa anual (perpetuidade): 6% → renda × 200, 8% → renda × 150, 10% → renda × 120 | Mantém a premissa já confirmada de viver só dos juros; a taxa anual passa a ser a do objetivo | y |
| Objetivos já salvos | Recebem taxa 8% na migração, sem mudar nenhum número exibido | Preserva o comportamento atual | n |
| Sliders do simulador | Idade de aposentadoria e taxa; o aporte mensal é resultado, nunca entrada | Escolha do usuário | y |
| Salvamento | Prévia ao vivo no formulário aberto; só Salvar grava, Cancelar descarta | Escolha do usuário; igual ao fluxo atual de edição | y |
| Checkpoints da barra | 25%, 50%, 75% e 100% do patrimônio-alvo | Escolha do usuário; funciona para qualquer renda | y |
| Faixa do slider de idade | De idade atual + 1 até 90 anos, passo 1; o campo numérico continua aceitando de 1 a 120 e é a fonte de verdade | A faixa 40–55 do pedido depende do usuário; derivar da idade atual evita faixa inválida | n |
| Entrada da data | Campo de texto DD/MM/AAAA com máscara; o banco continua guardando AAAA-MM-DD | `type="date"` exibe o formato do navegador, não o brasileiro; texto com máscara é determinístico | n |
| Prévia com rascunho inválido | Enquanto algum campo estiver inválido, a prévia mantém o último resultado válido (inicialmente o objetivo salvo, ou nada se não houver); os erros aparecem só ao enviar | Evita números sem sentido enquanto o usuário digita | n |
| Gráfico com aporte R$ 0,00 | Exibido enquanto o prazo for maior que 0; o investido fica constante e o restante é rendimento | O gráfico explica por que não há aporte a fazer | n |
| Valor da linha do tempo | Valor projetado em m meses = guardado × (1+i)^m + aporte × ((1+i)^m − 1) ÷ i, sem forçar o último ponto ao alvo; investido = guardado + aporte × m; rendimentos = projetado − investido | Reutiliza a fórmula de LIB-12; a diferença para o alvo é de centavos pelo arredondamento do aporte | n |
| Pontos do gráfico | Um ponto por ano completo a partir de hoje (meses 0, 12, 24 …) mais o ponto final no prazo | Curva suave sem 12 pontos por ano; o eixo usa a idade | n |
| Posição do checkpoint no tempo | Menor mês m ≥ 1 em que o valor projetado alcança a fração do alvo; idade = idade de aposentadoria − ⌈(prazo − m) ÷ 12⌉, anos completos | Mesma regra de idade de LIB-12 | n |
| Projeção a cada 4 anos (LIB-12, LIB-13) | Substituída pelo gráfico e pelos checkpoints; as marcas e o aviso de 8% fixos saem da tela | O gráfico cobre o mesmo propósito com mais informação; o pedido substitui as caixas | y |
| Cor de progresso | Preenchimento da barra com `--income` e brilho; o restante da tela segue os tokens atuais | Pedido do usuário | y |
| Mensagem de data com formato errado | Texto fora de DD/MM/AAAA ou data inexistente usa "Data de nascimento inválida" (mensagem atual) | Uma única mensagem, já conhecida | n |
| Mensagem de taxa fora dos presets | "Escolha uma taxa de 6%, 8% ou 10% ao ano" | L-002: texto exato no spec | n |
| Alternativa em texto do gráfico | O gráfico tem rótulo acessível com alvo, idade final e participação dos rendimentos; cada ponto é lido pela dica ao passar o mouse ou focar | Sem alternativa, leitor de tela perde o conteúdo | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation (LEX-05, LEX-09), failure states (salvar com falha mantém a regra de LIB-10, LEX-10), data lifecycle (migração com taxa 8% para objetivos existentes, LEX-04), auth boundary (inalterado: LIB-11 cobre a gravação, a nova coluna vai pelo mesmo `saveGoal`), state-transition integrity (abrir, prévia, salvar e cancelar, LEX-10); idempotency, concurrency, observability e external-dependency failure N/A because a feature só estende um registro por usuário, sem chamadas externas, e salvar continua um upsert idempotente.

---

## User Stories

### P1: Hero Card com a ação imediata e a renda passiva ⭐ MVP

**User Story**: As a usuário, I want ver no topo o alvo, o que já guardei, o progresso, quanto investir por mês e quanto o patrimônio rende so that eu saiba o que fazer a partir de hoje.

**Why P1**: É o pedido de hierarquia visual e responde à pergunta central da aba.

**Acceptance Criteria**:

1. WHILE o usuário tem objetivo salvo the system SHALL exibir, no topo do resumo, um Hero Card com patrimônio-alvo, valor guardado e progresso em percentual com uma casa decimal, em tipografia de destaque (`font-display`) maior que a dos demais indicadores.  <!-- state-driven -->
2. The system SHALL exibir no Hero Card o aporte mensal necessário em destaque, com o rótulo "Aporte mensal necessário", como a métrica de maior peso visual da tela.  <!-- ubiquitous -->
3. IF o aporte mensal necessário for nulo (prazo encerrado) THEN the system SHALL exibir "Prazo encerrado" no lugar do valor do aporte no Hero Card.  <!-- unwanted-behavior -->
4. The system SHALL exibir no Hero Card o selo "Gera R$ 20.000,00/mês sem consumir o principal", com o valor igual à renda mensal desejada do objetivo em formato BRL (ex.: renda R$ 20.000,00 → "Gera R$ 20.000,00/mês sem consumir o principal").  <!-- ubiquitous -->
5. The system SHALL exibir a taxa esperada do objetivo no Hero Card, no formato "a 8% ao ano" (ex.: taxa 8% → "a 8% ao ano").  <!-- ubiquitous -->
6. The system SHALL exibir o valor que falta (max(0, alvo − guardado)) e o prazo restante como indicadores secundários, sem caixas de peso igual ao do Hero Card.  <!-- ubiquitous -->
7. The system SHALL aplicar ao Hero Card um brilho sutil com os tokens de cor existentes (`--glow-a` ou `--income`), legível nos temas claro e escuro.  <!-- ubiquitous -->

**Independent Test**: Salvar renda R$ 20.000,00, guardado R$ 216.000,00, nascimento 18/09/1993 e aposentadoria aos 45 anos; ver alvo R$ 3.000.000,00, progresso 7,2%, o aporte em destaque e o selo "Gera R$ 20.000,00/mês sem consumir o principal".

---

### P1: Taxa esperada configurável ⭐ MVP

**User Story**: As a usuário, I want escolher uma taxa esperada entre conservadora, moderada e agressiva so that o plano reflita o risco que aceito.

**Why P1**: Muda o alvo e o aporte; o simulador depende dela.

**Acceptance Criteria**:

1. The system SHALL oferecer a taxa esperada em 3 opções: "Conservador · 6%", "Moderado · 8%" e "Agressivo · 10%" ao ano, com "Moderado · 8%" selecionado quando o usuário ainda não tem objetivo.  <!-- ubiquitous -->
2. The system SHALL calcular o patrimônio-alvo como renda mensal desejada × 12 ÷ taxa anual escolhida, em centavos inteiros (ex.: renda R$ 10.000,00 → R$ 2.000.000,00 a 6%, R$ 1.500.000,00 a 8%, R$ 1.200.000,00 a 10%).  <!-- ubiquitous -->
3. The system SHALL calcular o aporte mensal com a taxa mensal efetiva i = (1 + taxa anual)^(1/12) − 1 da taxa escolhida, mantendo a fórmula e o arredondamento para cima de LIB-06 (ex.: renda R$ 10.000,00, guardado R$ 0,00, n = 240 meses → R$ 4.410,75 a 6%, R$ 2.636,21 a 8%, R$ 1.670,71 a 10%).  <!-- ubiquitous -->
4. WHEN o usuário salva o objetivo THEN the system SHALL gravar a taxa escolhida junto ao objetivo e exibi-la ao reabrir a aba.  <!-- event-driven -->
5. WHEN a migração é aplicada THEN the system SHALL atribuir taxa de 8% ao ano a todo objetivo já salvo, sem alterar alvo, aporte ou progresso exibidos.  <!-- event-driven -->
6. IF a taxa enviada não for 6%, 8% ou 10% THEN the system SHALL rejeitar o envio com a mensagem "Escolha uma taxa de 6%, 8% ou 10% ao ano".  <!-- unwanted-behavior -->

**Independent Test**: Salvar renda R$ 10.000,00 aos 20 anos de prazo com cada taxa e ver alvos R$ 2.000.000,00, R$ 1.500.000,00 e R$ 1.200.000,00 e aportes R$ 4.410,75, R$ 2.636,21 e R$ 1.670,71.

---

### P1: Data de nascimento em DD/MM/AAAA ⭐ MVP

**User Story**: As a usuário brasileiro, I want digitar e ver a data de nascimento no formato DD/MM/AAAA so that eu não confunda dia e mês.

**Why P1**: Hoje a data aparece como 09/18/1993; o formato errado induz a erro de entrada.

**Acceptance Criteria**:

1. The system SHALL exibir o campo de data de nascimento como texto no formato DD/MM/AAAA, com dica "DD/MM/AAAA" (ex.: nascimento 1993-09-18 → "18/09/1993").  <!-- ubiquitous -->
2. WHEN o usuário digita dígitos no campo THEN the system SHALL inserir as barras automaticamente (ex.: "18091993" → "18/09/1993").  <!-- event-driven -->
3. WHEN o usuário envia a data em DD/MM/AAAA válida THEN the system SHALL gravar a data no banco como AAAA-MM-DD, sem mudar as regras de LIB-09 (futura, inexistente e idade acima de 120 anos continuam rejeitadas).  <!-- event-driven -->
4. IF o texto não estiver em DD/MM/AAAA ou representar data inexistente (ex.: "31/02/1993", "1993-09-18") THEN the system SHALL rejeitar o envio com a mensagem "Data de nascimento inválida".  <!-- unwanted-behavior -->

**Independent Test**: Abrir o formulário de um objetivo com nascimento 1993-09-18 e ver "18/09/1993"; digitar "31/02/1993" e ver "Data de nascimento inválida".

---

### P1: Simulador interativo na edição ⭐ MVP

**User Story**: As a usuário, I want arrastar a idade de aposentadoria e a taxa e ver o resultado na hora so that eu compare cenários antes de salvar.

**Why P1**: Transforma a edição em simulação, o ponto central do pedido de experiência.

**Acceptance Criteria**:

1. WHILE o formulário está aberto the system SHALL exibir um slider "Idade de aposentadoria" de idade atual + 1 a 90 anos, passo 1, sincronizado com o campo numérico da idade.  <!-- state-driven -->
2. WHILE o formulário está aberto the system SHALL exibir a escolha de taxa esperada (Conservador · 6%, Moderado · 8%, Agressivo · 10%) como controle segmentado com um item selecionado.  <!-- state-driven -->
3. WHEN o usuário altera renda, guardado, data de nascimento, idade de aposentadoria ou taxa para valores válidos THEN the system SHALL recalcular na mesma tela, sem salvar, o Hero Card, o gráfico e os checkpoints com os valores digitados.  <!-- event-driven -->
4. WHILE algum campo do rascunho está inválido the system SHALL manter a prévia do último resultado válido e não exibir mensagem de erro de campo antes do envio.  <!-- state-driven -->
5. WHILE o usuário não tem objetivo salvo e o rascunho nunca esteve válido the system SHALL exibir o formulário sem resumo.  <!-- state-driven -->
6. WHEN o usuário aciona Salvar com rascunho válido THEN the system SHALL gravar o objetivo, fechar o formulário e manter exibido o resultado que estava na prévia.  <!-- event-driven -->
7. WHEN o usuário aciona Cancelar THEN the system SHALL descartar o rascunho, restaurar os valores salvos no formulário e voltar o resumo ao objetivo salvo.  <!-- event-driven -->
8. WHEN o usuário move o slider de idade com o teclado (setas) THEN the system SHALL alterar a idade em 1 ano por tecla e recalcular a prévia.  <!-- event-driven -->
9. The system SHALL manter as regras de validação e as mensagens de LIB-08, LIB-09 e LIB-10 ao salvar, inclusive a recusa sem sessão válida.  <!-- ubiquitous -->

**Independent Test**: Com objetivo salvo (renda R$ 20.000,00, 8%, aposentadoria aos 45), abrir "Editar objetivo", arrastar a idade para 50 e o aporte mensal necessário diminui na mesma tela; escolher Agressivo 10% e o alvo cai para R$ 2.400.000,00; Cancelar volta aos valores salvos.

---

### P2: Gráfico de juros compostos

**User Story**: As a usuário, I want ver a evolução do patrimônio separada em aportes e rendimentos so that eu perceba quanto vem dos juros.

**Why P2**: Dá o impacto visual pedido, mas o resumo já funciona sem ele.

**Acceptance Criteria**:

1. WHILE o prazo for maior que 0 the system SHALL exibir um gráfico de área empilhada com a linha do tempo da idade atual até a idade de aposentadoria, em duas camadas: "Total investido" e "Rendimentos".  <!-- state-driven -->
2. The system SHALL calcular o total investido em m meses como guardado + aporte mensal × m e os rendimentos como valor projetado − total investido, com o valor projetado pela fórmula guardado × (1+i)^m + aporte × ((1+i)^m − 1) ÷ i (ex.: guardado R$ 0,00, aporte R$ 2.636,21, m = 240 → valor projetado R$ 1.500.001,04, investido R$ 632.690,40 e rendimentos R$ 867.310,64).  <!-- ubiquitous -->
3. The system SHALL gerar um ponto por ano completo a partir de hoje (meses 0, 12, 24 …) e um ponto final no prazo, com a idade no eixo horizontal e valores em BRL compactos no eixo vertical.  <!-- ubiquitous -->
4. WHEN o usuário passa o mouse ou foca um ponto do gráfico THEN the system SHALL exibir a idade, o total investido, os rendimentos e o total naquele ponto.  <!-- event-driven -->
5. The system SHALL exibir uma marca no gráfico em cada checkpoint de 25%, 50% e 75% do alvo, na idade em que o valor projetado o alcança.  <!-- ubiquitous -->
6. The system SHALL exibir abaixo do gráfico a frase "Rendimentos: X% do patrimônio aos N anos", com X igual a rendimentos ÷ valor projetado final arredondado para inteiro (ex.: guardado R$ 0,00, renda R$ 10.000,00, 8%, n = 240, aposentadoria aos 60 → "Rendimentos: 58% do patrimônio aos 60 anos").  <!-- ubiquitous -->
7. IF o prazo restante for 0 THEN the system SHALL omitir o gráfico.  <!-- unwanted-behavior -->
8. The system SHALL usar cores distintas para as duas camadas, com contraste suficiente nos temas claro e escuro, e rótulo acessível no gráfico com alvo, idade final e participação dos rendimentos.  <!-- ubiquitous -->

**Independent Test**: Com renda R$ 10.000,00, guardado R$ 0,00, 8% e 20 anos, ver a área de investido crescendo linear, a de rendimentos acelerando, o final em R$ 1.500.001,04 e "Rendimentos: 58% do patrimônio aos 60 anos".

---

### P2: Barra de progresso com checkpoints

**User Story**: As a usuário, I want ver na barra marcos rotulados com atingido ou previsão so that eu saiba quando cada etapa chega.

**Why P2**: Resolve as divisórias sem identificação; o progresso já aparece no Hero Card.

**Acceptance Criteria**:

1. The system SHALL exibir a barra de progresso com preenchimento na cor `--income` e brilho, limitada a 100% de largura (o percentual real continua no texto, ex.: "120,0%").  <!-- ubiquitous -->
2. The system SHALL posicionar na barra 4 checkpoints, em 25%, 50%, 75% e 100% do patrimônio-alvo, cada um rotulado com o valor em BRL compacto (ex.: alvo R$ 1.500.000,00 → "R$ 375 mil", "R$ 750 mil", "R$ 1,1 mi", "R$ 1,5 mi").  <!-- ubiquitous -->
3. IF o valor guardado for maior ou igual ao valor do checkpoint THEN the system SHALL marcar o checkpoint como "Atingido".  <!-- unwanted-behavior -->
4. IF o valor guardado for menor que o valor do checkpoint e o prazo for maior que 0 THEN the system SHALL exibir "Previsão: aos N anos", com N pela regra de idade de checkpoint (ex.: aposentadoria aos 60, n = 240, guardado R$ 0,00, renda R$ 10.000,00, 8%, checkpoint de 25% → "Previsão: aos 48 anos").  <!-- unwanted-behavior -->
5. IF o valor guardado for menor que o valor do checkpoint e o prazo for 0 THEN the system SHALL exibir "Sem previsão" no checkpoint.  <!-- unwanted-behavior -->
6. The system SHALL identificar cada checkpoint por texto (rótulo e estado), nunca só por cor.  <!-- ubiquitous -->

**Independent Test**: Com renda R$ 10.000,00, guardado R$ 400.000,00 (acima de 25%) e 20 anos de prazo, ver o checkpoint de 25% "Atingido" e os demais com "Previsão: aos N anos".

---

## Edge Cases

- WHEN o valor guardado é maior ou igual ao alvo THEN the system SHALL marcar os 4 checkpoints como "Atingido", exibir aporte R$ 0,00 e manter a barra em 100%.
- WHEN o prazo for menor que 12 meses THEN the system SHALL exibir o gráfico com apenas o ponto inicial (mês 0) e o ponto final.
- IF o slider de idade ficar acima da idade de aposentadoria digitada fora da faixa (ex.: 95) THEN the system SHALL manter o slider no limite da faixa e o campo numérico com o valor digitado.
- WHEN o usuário troca a taxa e o alvo muda THEN the system SHALL recalcular as posições dos checkpoints sobre o novo alvo.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LEX-01 | P1: Hero Card (AC 1, 6, 7: alvo, guardado, progresso, falta, prazo, brilho) | Verified | Verified |
| LEX-02 | P1: Hero Card (AC 2, 3: aporte em destaque e prazo encerrado) | Verified | Verified |
| LEX-03 | P1: Hero Card (AC 4, 5: selo de renda passiva e taxa) | Verified | Verified |
| LEX-04 | P1: Taxa (AC 1, 4, 5: presets, persistência e migração) | Verified | Verified |
| LEX-05 | P1: Taxa (AC 6) e Data (AC 3, 4): validação | Verified | Verified |
| LEX-06 | P1: Taxa (AC 2, 3: alvo e aporte por taxa) | Verified | Verified |
| LEX-07 | P1: Data (AC 1, 2: exibição e máscara DD/MM/AAAA) | Verified | Verified |
| LEX-08 | P1: Simulador (AC 1, 2, 8: slider de idade e taxa segmentada) | Verified | Verified |
| LEX-09 | P1: Simulador (AC 3, 4, 5: prévia ao vivo e rascunho inválido) | Verified | Verified |
| LEX-10 | P1: Simulador (AC 6, 7, 9: salvar, cancelar e regras herdadas) | Verified | Verified |
| LEX-11 | P2: Gráfico (AC 1, 2, 3, 7: camadas, fórmula, pontos e omissão) | Verified | Verified |
| LEX-12 | P2: Gráfico (AC 4, 5, 6, 8: dica, marcas, frase de rendimentos, acessibilidade) | Verified | Verified |
| LEX-13 | P2: Checkpoints (AC 1, 2: barra `--income` e 4 checkpoints rotulados) | Verified | Verified |
| LEX-14 | P2: Checkpoints (AC 3, 4, 5, 6: atingido, previsão, sem previsão, texto) | Verified | Verified |

**Coverage:** 14 total, 14 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Em 1 olhada, sem rolar a tela em 1280×800, o usuário lê o aporte mensal necessário e o selo de renda passiva.
- [ ] Mover o slider de idade atualiza Hero Card, gráfico e checkpoints em menos de 100 ms, sem requisição ao servidor.
- [ ] O valor projetado no último ponto do gráfico difere do alvo em menos de R$ 0,01 por mês de aporte.
- [ ] Nenhuma data de nascimento aparece no formato AAAA-MM-DD ou MM/DD/AAAA na interface.
