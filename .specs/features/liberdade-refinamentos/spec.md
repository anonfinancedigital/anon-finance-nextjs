# Liberdade: Refinamentos Specification

## Problem Statement

Uma revisão de UX da tela `/liberdade` (Ápice) apontou acabamentos que faltam depois de `liberdade-layout`: na barra de marcos, os traços não batem com as bolinhas e labels, os marcos atingidos parecem radio buttons vazios e não há indicação de "você está aqui"; o gráfico não mostra a meta e deixa um vazio no topo do eixo Y; a gaveta não avisa que a taxa é real (acima da inflação) e tem um texto de introdução longo. Cada ajuste é pequeno, mas juntos mudam a leitura de progresso e de realismo da simulação.

## Goals

- [ ] Cada marco da barra (25%, 50%, 75%, 100%) é um único elemento sobre o trilho, com o label centrado na mesma posição, e o progresso atual tem um pino.
- [ ] O gráfico mostra uma linha pontilhada na altura da meta e o eixo Y termina a no máximo 107% do maior valor entre meta e patrimônio final.
- [ ] O tooltip do gráfico mostra a participação percentual de investido e rendimentos no patrimônio da idade.
- [ ] A gaveta indica que a taxa é real e tem uma introdução de uma linha.

## Out of Scope

Explicitamente excluído para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Campo para digitar taxa personalizada | Exige mudar `AnnualRateBp`, `goalSchema`, banco e migração; o rótulo de taxa real resolve o risco de ilusão financeira. Pode virar feature própria. |
| Modelar inflação ou converter taxa nominal em real | A taxa já é tratada como real nos cálculos; só o texto muda. |
| Trocar os presets 6%, 8% e 10% ou citar referências de mercado (ex.: Tesouro IPCA+) | Dado de mercado envelhece e não foi pedido como texto fixo. |
| Mudar cálculos, validações, banco ou `saveGoal` | Só apresentação; as regras de `liberdade-experiencia` seguem. |
| Percentual de progresso em texto no pino | LAY-05 exige o percentual visível uma única vez, na linha de contexto do Hero. |
| Itens 3 e 4 do texto de revisão sobre outras telas (resumo mensal, transações) | Outras telas; já estão em `docs/backlog.md`. |
| Texto "a 8% a.a." do selo do Hero | Fora do pedido; a gaveta é o lugar da explicação. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Marco atingido | Check verde (`--income`) em círculo preenchido; marco pendente: círculo vazio com borda no trilho | Pedido: "ícone de check verde ou preenchimento total" | n |
| Alinhamento marco x label | Os 4 marcos ficam sobre o trilho nas posições 25/50/75/100%; cada label (valor e estado) fica centrado na mesma posição, o do 100% alinhado à borda direita para não estourar o Hero. Vale com o Hero em 576 px ou mais; abaixo disso a grade 2×2 atual permanece e os marcos continuam sobre o trilho | Quatro colunas de 25% não centram nos pontos 25/50/75/100%; abaixo de 576 px não há largura para labels lado a lado | n |
| Pino "você está aqui" | Pino sem texto na posição do progresso (limitada a 100%), com nome acessível "Você está aqui: 19,0% do alvo"; fica acima dos marcos quando coincide com um | O percentual visível já existe no Hero (LAY-05); o pino é visual | n |
| Pino com progresso 0 | Pino desenhado na borda esquerda do trilho | Posição 0% é válida | n |
| Linha da meta | Linha horizontal pontilhada em `var(--viz-target)`-neutro sutil na altura de `targetCents`, com etiqueta "Meta: " + valor compacto (ex.: "Meta: R$ 3 mi") alinhada à direita sobre a linha | Pedido; reaproveita `formatCompactBRL` | n |
| Teto do eixo Y | 107% de `max(targetCents, patrimônio final)` (R$ 3 mi → R$ 3,21 mi), piso em 0 | Pedido: "mais próximo de R$ 3,2 mi"; 107% dá R$ 3,21 mi e protege o caso do patrimônio passar do alvo | n |
| Percentuais do tooltip | Inteiros: investido = `round(investido / total × 100)`, rendimentos = `100 − investido`, para sempre somarem 100; sem percentuais quando o total é R$ 0,00 | Evita 99% ou 101% por arredondamento | n |
| Rótulos do tooltip | "Total investido: R$ X (52%)", "Rendimentos gerados: R$ Y (48%)", "Patrimônio total: R$ Z"; cabeçalho "Aos N anos" mantido | Textos do pedido; "Aos N anos" já existe | n |
| Legenda do gráfico | "Rendimentos" na legenda e na tabela para leitores de tela seguem como estão; só o tooltip ganha "Rendimentos gerados" | Mudança mínima | n |
| Rótulo da taxa | Legenda "Taxa real estimada (descontada a inflação)" logo abaixo do título "Taxa esperada ao ano", em texto de apoio, acima dos 3 presets | Texto do pedido | n |
| Texto de introdução da gaveta | "Simule o ápice: renda, patrimônio e idade." como descrição da gaveta; o parágrafo longo de `INTRO` continua no cartão de estado vazio | Pedido: uma linha só; no estado vazio há espaço e a explicação ainda orienta o primeiro uso | n |
| Prévia em tempo real | Já implementada em LAY-09 e LAY-13 (`handleDraft` recalcula a cada alteração válida, inclusive troca de taxa); esta feature só exige que continue valendo | Não reimplementar | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: state-transition integrity (marco pendente → atingido muda de ícone, RFN-02; pino acompanha a prévia, RFN-03), failure states (meta ou patrimônio final nulos/zero, RFN-05 e RFN-06), accessibility (nome do pino, texto dos marcos mantido, RFN-03 e RFN-04); input validation, auth, data lifecycle, idempotency, concurrency, observability e external-dependency failure N/A because a feature não muda campos, regras, gravação nem dados.

---

## User Stories

### P1: Barra de marcos alinhada, com estados e posição atual ⭐ MVP

**User Story**: As a usuário, I want ver cada marco no trilho com seu label e o ponto em que estou so that eu leia o progresso de relance.

**Why P1**: É o elemento de progresso do Hero e hoje desalinha e não distingue atingido de pendente.

**Acceptance Criteria**:

1. WHILE a largura do Hero for 576 px ou mais the system SHALL exibir cada marco como um único elemento centrado sobre o trilho na posição do checkpoint (25%, 50%, 75% e 100%), sem traço separado, e o label do marco (valor compacto e estado) centrado na mesma posição horizontal, com o label do 100% alinhado à borda direita do trilho.  <!-- state-driven -->
2. WHILE a largura do Hero for menor que 576 px the system SHALL manter os labels na grade 2×2 atual e os marcos sobre o trilho nas posições 25/50/75/100%.  <!-- state-driven -->
3. WHEN o valor guardado atinge um checkpoint THEN the system SHALL exibir o marco como círculo preenchido em `--income` com um check (✓) e manter o estado "Atingido" em texto.  <!-- event-driven -->
4. WHILE um checkpoint não foi atingido the system SHALL exibir o marco como círculo vazio com borda sobre o trilho e o estado "Previsão: aos N anos" ou "Sem previsão" em texto.  <!-- state-driven -->
5. The system SHALL exibir sobre o trilho um pino na posição `progressBp / 100`% da largura, limitada a 100%, com nome acessível "Você está aqui: 19,0% do alvo" (ex.: guardado R$ 570.000,00 e alvo R$ 3.000.000,00).  <!-- ubiquitous -->
6. The system SHALL NOT exibir texto de percentual dentro do pino nem em outro ponto visível da barra, mantendo o percentual de progresso em texto visível uma única vez na tela.  <!-- ubiquitous -->
7. WHEN o progresso é 0% THEN the system SHALL desenhar o pino na borda esquerda do trilho.  <!-- event-driven -->
8. WHEN o progresso coincide com a posição de um marco THEN the system SHALL desenhar o pino acima do marco, sem esconder o estado "Atingido" do label.  <!-- event-driven -->

**Independent Test**: Com guardado R$ 570.000,00 e alvo R$ 3.000.000,00 (19%), ver o pino em 19% sem texto, quatro marcos vazios centrados sobre os labels; subir o guardado para R$ 800.000,00 (26,7%) e ver o marco de 25% com check verde.

---

### P1: Gráfico com linha da meta, escala justa e tooltip com percentuais ⭐ MVP

**User Story**: As a usuário, I want ver a meta no gráfico e a composição do patrimônio de cada idade so that eu entenda o quanto vem de aporte e o quanto de juros.

**Why P1**: Sem a meta no gráfico a curva não "chega" a lugar nenhum, e o teto do eixo Y desperdiça cerca de um terço da altura.

**Acceptance Criteria**:

1. The system SHALL desenhar no gráfico uma linha horizontal pontilhada na altura de `targetCents`, com a etiqueta "Meta: R$ 3 mi" alinhada à direita (ex.: alvo R$ 3.000.000,00; o valor vem de `formatCompactBRL`).  <!-- ubiquitous -->
2. The system SHALL definir o eixo Y de 0 a 107% do maior valor entre `targetCents` e o patrimônio da última idade (ex.: alvo R$ 3.000.000,00 e final R$ 3.000.000,00 → teto R$ 3.210.000,00).  <!-- ubiquitous -->
3. WHEN o usuário passa o mouse ou foca o gráfico THEN the system SHALL exibir no tooltip "Aos N anos", "Total investido: R$ X (P%)", "Rendimentos gerados: R$ Y (Q%)" e "Patrimônio total: R$ Z" (ex.: investido R$ 1.130.000,00 e rendimentos R$ 1.040.000,00 → "Total investido: R$ 1.130.000,00 (52%)", "Rendimentos gerados: R$ 1.040.000,00 (48%)", "Patrimônio total: R$ 2.170.000,00").  <!-- event-driven -->
4. The system SHALL calcular P como `round(investido / total × 100)` e Q como `100 − P`, de modo que P + Q seja sempre 100.  <!-- ubiquitous -->
5. IF o patrimônio total da idade for R$ 0,00 THEN the system SHALL exibir o tooltip sem os percentuais "(P%)" e "(Q%)".  <!-- unwanted-behavior -->
6. WHERE o prazo restante for 0 the system SHALL continuar omitindo o gráfico, como em LAY-12 e LEX-11 AC7.  <!-- optional-feature -->
7. The system SHALL manter o selo "Rendimentos: X% do patrimônio aos N anos", a legenda, a linha-guia, o ponto ativo e a tabela para leitores de tela de `liberdade-layout`.  <!-- ubiquitous -->

**Independent Test**: Com alvo R$ 3.000.000,00 aos 45 anos, ver a linha pontilhada "Meta: R$ 3 mi" tocando o fim da curva e o eixo terminando em torno de R$ 3,2 mi; passar o mouse aos 40 anos e ver os três valores com percentuais somando 100%.

---

### P2: Gaveta com taxa real e introdução enxuta

**User Story**: As a usuário, I want saber que a taxa é real e ler uma introdução curta so that eu não me iluda com a simulação e os campos ganhem respiro.

**Why P2**: Melhora clareza e densidade da gaveta; a simulação já funciona sem isso.

**Acceptance Criteria**:

1. The system SHALL exibir na gaveta, entre o título "Taxa esperada ao ano" e os presets, a legenda "Taxa real estimada (descontada a inflação)".  <!-- ubiquitous -->
2. The system SHALL exibir como descrição da gaveta o texto "Simule o ápice: renda, patrimônio e idade." em uma linha, sem o parágrafo longo.  <!-- ubiquitous -->
3. WHILE o usuário não tem objetivo salvo the system SHALL manter no cartão de estado vazio o texto de introdução completo atual.  <!-- state-driven -->
4. WHEN o usuário arrasta o slider de idade ou troca a taxa na gaveta THEN the system SHALL atualizar "Meta Patrimonial" e "Aporte Estratégico Mensal" do topo da gaveta sem exigir "Salvar", mantendo o comportamento de LAY-09 e LAY-13.  <!-- event-driven -->
5. IF a prévia ficar inválida durante a edição THEN the system SHALL manter na gaveta os últimos valores válidos de Meta Patrimonial e Aporte Estratégico Mensal.  <!-- unwanted-behavior -->

**Independent Test**: Abrir "Calibrar Parâmetros", ver a legenda de taxa real e a descrição de uma linha; trocar de Moderado para Conservador e ver Meta e Aporte do topo mudarem antes de salvar.

---

## Edge Cases

- WHEN o valor guardado é maior ou igual ao alvo THEN the system SHALL exibir os 4 marcos como atingidos (check) e o pino na borda direita do trilho (100%).
- WHEN o patrimônio final do gráfico passa do alvo THEN the system SHALL calcular o teto do eixo Y a partir do patrimônio final e manter a linha da meta visível abaixo dele.
- IF o alvo for menor que o primeiro ponto do gráfico THEN the system SHALL manter a linha da meta dentro do domínio do eixo Y.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RFN-01 | P1: Marcos (AC 1, 2: alinhamento marco x label, grade estreita) | Execute | Implementing |
| RFN-02 | P1: Marcos (AC 3, 4: marco atingido e pendente) | Execute | Implementing |
| RFN-03 | P1: Marcos (AC 5, 6, 7, 8: pino "você está aqui", sem texto, 0%, coincidência) | Execute | Implementing |
| RFN-04 | P1: Gráfico (AC 1, 6, 7: linha da meta e itens mantidos) | Execute | Implementing |
| RFN-05 | P1: Gráfico (AC 2: teto do eixo Y) | Execute | Implementing |
| RFN-06 | P1: Gráfico (AC 3, 4, 5: tooltip com percentuais) | Execute | Implementing |
| RFN-07 | P2: Gaveta (AC 1: legenda de taxa real) | Execute | Implementing |
| RFN-08 | P2: Gaveta (AC 2, 3: introdução enxuta e estado vazio) | Execute | Implementing |
| RFN-09 | P2: Gaveta (AC 4, 5: prévia em tempo real) | Execute | Implementing |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️

---

## Success Criteria

- [ ] Com o Hero a partir de 576 px, o centro de cada marco e o centro do seu label diferem em no máximo 1 px na horizontal (exceto o label do 100%, alinhado à borda).
- [ ] O pino fica na posição do progresso com 0%, 19% e 100% de progresso.
- [ ] O fim da curva toca a linha da meta e o teto do eixo Y fica em até 107% do maior valor entre meta e patrimônio final.
- [ ] O tooltip de qualquer idade com patrimônio maior que zero mostra percentuais inteiros que somam 100.
- [ ] A descrição da gaveta cabe em uma linha a 384 px de largura.
