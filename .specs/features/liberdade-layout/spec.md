# Liberdade: Layout Enxuto Specification

## Problem Statement

Depois de `liberdade-experiencia`, a aba Liberdade ficou rica, mas alta e repetitiva: o Hero empilha título, selo, métricas, um card roxo interno e um rodapé (cerca de 430 px); o progresso aparece duas vezes (número no Hero e barra com checkpoints em outra seção); e os campos de edição ocupam um terço da tela o tempo todo, embora o usuário os altere raramente. O gráfico ainda pede uma frase solta no rodapé e marcas estáticas sobre a curva.

## Goals

- [ ] O Hero fica em duas colunas (destino e plano de ação), sem caixa dentro de caixa, com o card inteiro (incluindo barra e checkpoints) com no máximo 340 px de altura quando o Hero tem 576 px ou mais de largura.
- [ ] O percentual de progresso aparece uma única vez na tela, e a barra com checkpoints vive no rodapé do Hero.
- [ ] A tela padrão mostra só o acompanhamento; os campos de edição abrem numa gaveta lateral sem escurecer a página, com a prévia ao vivo visível.
- [ ] O gráfico mostra a participação dos rendimentos como selo no cabeçalho e o patrimônio ano a ano por tooltip, sem marcas estáticas.

## Out of Scope

Explicitamente excluído para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Mudar cálculos, validações, banco ou `saveGoal` | Só layout e interação; as regras de `liberdade-experiencia` seguem. |
| Modal centralizado ou acordeão no fluxo da página | Decidido: gaveta lateral sem escurecer a tela. |
| Marcas de 25%, 50% e 75% sobre a curva do gráfico | Decidido: o tooltip ano a ano substitui; os checkpoints ficam na barra. |
| Gaveta redimensionável pelo usuário ou lembrar aberta/fechada entre visitas | Não pedido. |
| Novo gráfico, novas métricas ou outras abas | Não pedido. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Tipo de gaveta | Sheet lateral à direita, não modal (sem overlay escuro, página navegável), tela cheia abaixo de 1024 px | Escolha do usuário | y |
| Onde fica a barra de progresso | Rodapé do Hero, separada por uma linha fina | O usuário ofereceu rodapé do Hero ou topo do gráfico; o rodapé junta número e barra no mesmo bloco de leitura | n |
| Breakpoint das duas colunas | Largura do próprio Hero: 576 px (container query); abaixo disso as colunas empilham (destino, depois plano de ação) | O menu lateral de 218 px e a gaveta aberta tiram largura do conteúdo; a largura da tela não diz quanto espaço o Hero tem (768 px de tela dão só cerca de 486 px de conteúdo) | n |
| "Sem caixa dentro de caixa" | O plano de ação ocupa a metade direita do próprio Hero, com fundo roxo sutil e sem borda nem cantos arredondados próprios | Remove o card interno sem perder o destaque | n |
| Vocabulário da marca | Os rótulos da `identidade-vertice` já em produção valem: página "Ápice", "Meta Patrimonial", "Aporte Estratégico Mensal", "Distância do Alvo", "Tempo até o Ápice", gráfico "Trajetória dos Juros Compostos", botão "Calibrar Parâmetros" | Evita dois vocabulários no app; o pedido citou "Calibrar Parâmetros" como o botão | y |
| Textos novos do Hero | Selo "Gera R$ 20.000,00/mês perpétuos a 8% a.a.", contexto "R$ 565.000,00 acumulados (18,8% do alvo)", aporte "R$ 6.794,95 / mês"; prazo e falta como "Tempo até o Ápice: 11 anos e 11 meses" e "Distância do Alvo: R$ 2.435.000,00" | Textos do pedido nos valores novos; os rótulos "restantes" e "Faltam" do pedido cedem aos da marca (pode ser revertido) | n |
| Cópia anterior | "Patrimônio Acumulado" e "Progresso" como indicadores soltos, e "sem consumir o principal" no selo, saem da tela | O valor acumulado e o percentual passam a uma linha de contexto; o selo ganha o texto do pedido | y |
| Botão de edição | "Calibrar Parâmetros" no topo direito, só com objetivo salvo; é também o título da gaveta | Rótulo já adotado pela marca | y |
| Sem objetivo salvo | Cartão de estado vazio com o texto de introdução e o botão "Definir objetivo", que abre a gaveta; sem botão no cabeçalho | Evita abrir a gaveta sozinha, difícil de dispensar | n |
| Texto de introdução | O parágrafo atual da página ("Defina a renda mensal que quer ter, o patrimônio acumulado e a idade do seu ápice patrimonial. …") sai do topo e vira a descrição da gaveta e do estado vazio, sem mudar o texto | Libera a tela padrão | n |
| Sem objetivo salvo vs. `identidade-vertice` | Esta feature substitui a regra "sem objetivo, formulário aberto na página" de `identidade-vertice`: o estado vazio com "Definir objetivo" ocupa o lugar | O formulário só existe na gaveta | n |
| Descartar ao fechar | Fechar pelo X ou por Esc equivale a Cancelar: descarta o rascunho | Mesma regra de LEX-10 AC7 | n |
| Clique fora da gaveta | Não fecha a gaveta | Senão clicar no Hero para ler a prévia descartaria o rascunho | n |
| Espaço no desktop | A gaveta tem 24rem (384 px) a partir de 1024 px; aberta, a área de conteúdo reserva à direita esses 384 px, sem cobrir o Hero (com tela de 1280 px o Hero fica com cerca de 582 px e mantém as duas colunas) | O plano de ação, a coluna da direita, ficaria escondido | n |
| Tooltip do gráfico | Mantém idade, investido, rendimentos e total por ponto anual (hover e foco); ganha linha-guia e ponto ativo; sem marcas fixas | O tooltip de LEX-12 AC4 já existe; o pedido é torná-lo o meio de leitura | n |
| Altura do gráfico | Mantém `h-64 sm:h-80` | Fora do pedido | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: failure states (salvar com falha mantém a gaveta aberta com o alerta, LAY-09), state-transition integrity (abrir, prévia, salvar, cancelar, fechar por X e Esc, LAY-07 a LAY-10), accessibility (foco e nome da gaveta, LAY-11); input validation, auth, data lifecycle, idempotency, concurrency, observability e external-dependency failure N/A because a feature não muda campos, regras, gravação nem dados; validação e sessão seguem `liberdade-experiencia` e `liberdade-financeira`.

---

## User Stories

### P1: Hero em duas colunas ⭐ MVP

**User Story**: As a usuário, I want ver a meta e o plano de ação lado a lado so that eu leia o essencial sem rolar.

**Why P1**: É a causa principal da altura excessiva.

**Acceptance Criteria**:

1. WHILE a largura do Hero for 576 px ou mais the system SHALL exibir o Hero em duas colunas: destino à esquerda e plano de ação à direita.  <!-- state-driven -->
2. WHILE a largura do Hero for menor que 576 px the system SHALL empilhar as colunas, destino primeiro e plano de ação depois.  <!-- state-driven -->
3. The system SHALL exibir na coluna do destino o rótulo "Meta Patrimonial", o patrimônio-alvo em `font-display`, o selo "Gera R$ 20.000,00/mês perpétuos a 8% a.a." e a linha de contexto "R$ 565.000,00 acumulados (18,8% do alvo)" (ex.: renda R$ 20.000,00, taxa 8%, guardado R$ 565.000,00, alvo R$ 3.000.000,00).  <!-- ubiquitous -->
4. The system SHALL exibir na coluna do plano de ação o rótulo "Aporte Estratégico Mensal", o aporte no formato "R$ 6.794,95 / mês", "Tempo até o Ápice: 11 anos e 11 meses" e "Distância do Alvo: R$ 2.435.000,00" (ex.: alvo R$ 3.000.000,00 e guardado R$ 565.000,00 → distância R$ 2.435.000,00).  <!-- ubiquitous -->
5. IF o aporte necessário for nulo (prazo encerrado) THEN the system SHALL exibir "Prazo encerrado" no lugar de "R$ … / mês" e "Tempo até o Ápice: 0 meses".  <!-- unwanted-behavior -->
6. IF o valor guardado for maior ou igual ao alvo THEN the system SHALL exibir "Distância do Alvo: R$ 0,00" e a linha de contexto com o percentual real (ex.: "R$ 3.600.000,00 acumulados (120,0% do alvo)").  <!-- unwanted-behavior -->
7. The system SHALL renderizar o plano de ação como a metade direita do próprio Hero, com fundo roxo sutil, sem borda e sem cantos arredondados próprios, de modo que o Hero não contenha um card interno.  <!-- ubiquitous -->
8. The system SHALL manter o aporte como o texto de maior peso visual do Hero e o brilho sutil do Hero legível nos temas claro e escuro.  <!-- ubiquitous -->

**Independent Test**: Salvar renda R$ 20.000,00, guardado R$ 565.000,00 a 8% e ver as duas colunas com os textos do critério 3 e 4; reduzir a janela abaixo de cerca de 860 px (Hero com menos de 576 px, com o menu lateral aberto) e ver as colunas empilhadas.

---

### P1: Barra de progresso unificada no Hero ⭐ MVP

**User Story**: As a usuário, I want o progresso e os checkpoints no mesmo bloco da meta so that não haja informação repetida.

**Why P1**: Elimina uma seção inteira e o percentual duplicado.

**Acceptance Criteria**:

1. The system SHALL exibir a barra de progresso com os 4 checkpoints no rodapé do Hero, separada do conteúdo por uma linha fina.  <!-- ubiquitous -->
2. The system SHALL exibir o percentual de progresso em texto visível uma única vez na tela, na linha de contexto do Hero.  <!-- ubiquitous -->
3. The system SHALL manter o nome acessível da barra com o percentual (ex.: "Progresso do objetivo: 18,8%").  <!-- ubiquitous -->
4. The system SHALL manter os checkpoints de LEX-13 e LEX-14: valor compacto, "Atingido", "Previsão: aos N anos" ou "Sem previsão", sempre em texto.  <!-- ubiquitous -->
5. The system SHALL NOT renderizar uma seção de progresso separada entre o gráfico e a edição.  <!-- ubiquitous -->
6. The system SHALL manter a barra com o preenchimento `--income` com brilho e limitada a 100% de largura.  <!-- ubiquitous -->

**Independent Test**: Com objetivo salvo, contar o texto "18,8%" na tela: aparece uma vez; a barra e os 4 checkpoints estão dentro do Hero.

---

### P1: Edição em gaveta lateral ⭐ MVP

**User Story**: As a usuário, I want os campos de edição escondidos até eu precisar so that a tela padrão seja só de acompanhamento.

**Why P1**: Libera cerca de um terço da tela.

**Acceptance Criteria**:

1. WHILE o usuário tem objetivo salvo e a gaveta está fechada the system SHALL exibir o botão "Calibrar Parâmetros" no topo direito e nenhum campo de edição.  <!-- state-driven -->
2. WHEN o usuário aciona "Calibrar Parâmetros" THEN the system SHALL abrir à direita uma gaveta com o formulário preenchido com os valores salvos, o texto de introdução da página como descrição e os botões Salvar e Cancelar.  <!-- event-driven -->
3. WHILE a gaveta está aberta the system SHALL manter a página sem overlay escuro e navegável.  <!-- state-driven -->
4. WHILE a gaveta está aberta e a largura da tela é 1024 px ou mais the system SHALL reservar na área de conteúdo, à direita, 384 px (a largura da gaveta), sem cobrir nenhum elemento do Hero ou do gráfico.  <!-- state-driven -->
5. WHILE a largura é menor que 1024 px the system SHALL abrir a gaveta em largura total da tela.  <!-- state-driven -->
6. WHEN o usuário aciona Cancelar, o X ou a tecla Esc THEN the system SHALL fechar a gaveta, descartar o rascunho e restaurar o resumo do objetivo salvo.  <!-- event-driven -->
7. WHEN o usuário clica fora da gaveta THEN the system SHALL manter a gaveta aberta.  <!-- event-driven -->
8. WHEN o usuário salva com sucesso THEN the system SHALL fechar a gaveta e manter exibido o resultado da prévia.  <!-- event-driven -->
9. IF o salvamento falhar ou houver campo inválido THEN the system SHALL manter a gaveta aberta com as mensagens de erro de `liberdade-experiencia` e o objetivo salvo inalterado.  <!-- unwanted-behavior -->
10. WHILE o usuário não tem objetivo salvo the system SHALL exibir um cartão de estado vazio com o texto de introdução e o botão "Definir objetivo", que abre a gaveta com o formulário vazio, e nenhum botão no cabeçalho.  <!-- state-driven -->
11. WHILE a gaveta está aberta the system SHALL manter a prévia ao vivo, recalculando o Hero e o gráfico a cada alteração válida, como em LEX-09.  <!-- state-driven -->
12. WHEN a gaveta abre THEN the system SHALL mover o foco para dentro dela, e WHEN fecha THEN the system SHALL devolver o foco ao botão que a abriu.  <!-- event-driven -->
13. The system SHALL nomear a gaveta "Calibrar Parâmetros" para tecnologias assistivas.  <!-- ubiquitous -->

**Independent Test**: Com objetivo salvo, ver a tela sem campos; clicar em "Calibrar Parâmetros", arrastar o slider de idade e ver o aporte do Hero mudar ao lado da gaveta, sem tela escura; Esc fecha e restaura.

---

### P2: Gráfico com selo no cabeçalho e tooltip ano a ano

**User Story**: As a usuário, I want a participação dos rendimentos no cabeçalho e o patrimônio de cada ano ao passar o mouse so that eu leia o gráfico sem marcas soltas.

**Why P2**: Refina o gráfico; o resumo funciona sem isso.

**Acceptance Criteria**:

1. The system SHALL exibir no cabeçalho do card do gráfico, ao lado da legenda ("Total investido" e "Rendimentos"), o selo "Rendimentos: 49% do patrimônio aos 45 anos", com X igual a `interestSharePct` e a idade de aposentadoria (ex.: X = 49, idade 45).  <!-- ubiquitous -->
2. The system SHALL NOT exibir a frase de rendimentos nem o texto "marcas nos 25%, 50% e 75% do alvo" no rodapé do gráfico.  <!-- ubiquitous -->
3. The system SHALL NOT desenhar marcas estáticas de 25%, 50% e 75% sobre a curva.  <!-- ubiquitous -->
4. WHEN o usuário passa o mouse ou foca o gráfico THEN the system SHALL exibir a linha-guia vertical, o ponto ativo e o tooltip com "Aos N anos", total investido, rendimentos e total do ano mais próximo (ex.: ponto de 12 meses → total, investido e rendimentos desse ponto).  <!-- event-driven -->
5. The system SHALL manter a tabela só para leitores de tela e o rótulo acessível do gráfico, atualizados com o selo.  <!-- ubiquitous -->

**Independent Test**: Passar o mouse sobre o gráfico e ver o tooltip de cada ano com linha-guia; o selo aparece ao lado da legenda; não há marcas sobre a curva.

---

### P2: Resumo dentro da gaveta

**User Story**: As a usuário no celular, I want ver o aporte enquanto edito so that a prévia não suma atrás da gaveta de tela cheia.

**Why P2**: Em largura total a gaveta cobre o Hero.

**Acceptance Criteria**:

1. WHILE a gaveta está aberta the system SHALL exibir no topo dela "Meta Patrimonial" e "Aporte Estratégico Mensal" com os valores da prévia atual (ex.: "R$ 3.000.000,00" e "R$ 6.794,95 / mês").  <!-- state-driven -->
2. IF não houver prévia válida THEN the system SHALL exibir "—" no lugar de cada valor.  <!-- unwanted-behavior -->
3. IF o aporte da prévia for nulo (prazo encerrado) THEN the system SHALL exibir "Prazo encerrado" no lugar do aporte.  <!-- unwanted-behavior -->

**Independent Test**: Em 390 px, abrir a gaveta, mudar a taxa e ver o aporte do topo da gaveta mudar.

---

## Edge Cases

- WHEN o valor guardado é R$ 0,00 THEN the system SHALL exibir a linha de contexto "R$ 0,00 acumulados (0,0% do alvo)".
- WHEN o usuário descarta o rascunho de um primeiro objetivo (sem objetivo salvo) THEN the system SHALL voltar ao cartão de estado vazio.
- WHEN a gaveta abre com a tela em 1024 px ou mais e fecha THEN the system SHALL devolver a largura total à área de conteúdo.
- IF o prazo restante for 0 THEN the system SHALL omitir o gráfico, como em LEX-11 AC7, e manter o Hero com a barra.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LAY-01 | P1: Hero (AC 1, 2, 7: duas colunas, empilhar, metade direita sem card interno) | Verified | Verified |
| LAY-02 | P1: Hero (AC 3, 4, 8: textos do destino e do plano de ação, peso do aporte, brilho) | Verified | Verified |
| LAY-03 | P1: Hero (AC 5, 6: prazo encerrado e guardado ≥ alvo) | Verified | Verified |
| LAY-04 | P1: Barra (AC 1, 5, 6: barra no rodapé do Hero, sem seção própria, `--income`) | Verified | Verified |
| LAY-05 | P1: Barra (AC 2, 3, 4: percentual único, nome acessível, checkpoints) | Verified | Verified |
| LAY-06 | P1: Gaveta (AC 1, 10: botão e estado vazio) | Verified | Verified |
| LAY-07 | P1: Gaveta (AC 2, 3, 4, 5: abrir, sem overlay, reserva de espaço, tela cheia no celular) | Verified | Verified |
| LAY-08 | P1: Gaveta (AC 6, 7, 8: cancelar, X, Esc, clique fora, salvar) | Verified | Verified |
| LAY-09 | P1: Gaveta (AC 9, 11: erro mantém aberta; prévia ao vivo) | Verified | Verified |
| LAY-10 | P1: Gaveta (AC 12, 13: foco e nome acessível) | Verified | Verified |
| LAY-11 | P2: Gráfico (AC 1, 2, 3, 5: selo, sem frase nem marcas, acessibilidade) | Verified | Verified |
| LAY-12 | P2: Gráfico (AC 4: linha-guia, ponto ativo e tooltip) | Verified | Verified |
| LAY-13 | P2: Resumo na gaveta (AC 1, 2, 3) | Verified | Verified |

**Coverage:** 13 total, 13 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Com o Hero a partir de 576 px de largura, o Hero completo (duas colunas, barra e checkpoints) tem no máximo 340 px de altura, contra cerca de 575 px hoje (Hero mais seção de progresso).
- [ ] Na tela padrão com objetivo salvo, nenhum campo de formulário está visível.
- [ ] Com a gaveta aberta em 1280×800, o Hero e o gráfico ficam inteiros visíveis ao lado dela e recalculam ao mover o slider.
- [ ] O percentual de progresso aparece uma vez no texto visível da tela.
