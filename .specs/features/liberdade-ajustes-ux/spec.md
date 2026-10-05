# Liberdade: Ajustes de UX e Taxa Personalizada Specification

## Problem Statement

Na tela `/liberdade` os marcos do objetivo repetem "Previsão:" em colunas estreitas e os textos dos dois últimos se sobrepõem. O eixo X do gráfico para em 44 e esconde a idade final (45), em que a curva encosta na meta. Os campos de dinheiro da gaveta mostram `20.000,00` sem o prefixo `R$` dentro do input. As rentabilidades ficam presas a 6%, 8% e 10%, sem espaço para quem acompanha uma taxa real específica (6,5%, 7%).

## Goals

- [ ] Nenhum rótulo de marco quebra de linha nem encosta no vizinho nas larguras de 360 px a 1280 px.
- [ ] O eixo X do gráfico sempre exibe a idade de aposentadoria como último rótulo.
- [ ] Renda mensal desejada e Valor já guardado exibem `R$` fixo à esquerda do input.
- [ ] Os três perfis da gaveta têm a mesma estrutura e altura e mostram a taxa de acúmulo e a retirada no próprio botão.
- [ ] O card de Meta Patrimonial resume a premissa em uma pílula e guarda o detalhe no "Como calculamos?".
- [ ] O usuário salva um objetivo com rentabilidade e taxa de retirada livres (1% a 15%), com a meta calculada por essas duas taxas.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar a fórmula de aporte, a conversão mensal ou a convenção de aporte ao fim do mês | Só a origem das taxas muda. |
| Mudar a tabela dos presets 6→4%, 8→6%, 10→7% | Os presets continuam exatos (spec `liberdade-taxa-retirada`). |
| Máscara que reescreve o texto digitado (formatar enquanto digita) | O pedido é o prefixo `R$` visível; o parse de `parseBRL` não muda. |
| Mais marcos que 25/50/75/100% ou mudar a posição dos marcos na barra | Pedido trata só dos rótulos. |
| Alterar cores, fontes ou o restante do layout | Preservar o visual. |
| Mudar o card de Aporte Estratégico Mensal (lado direito) | O pedido trata só da Meta Patrimonial. |
| Inflação, imposto e simulação de retirada ano a ano | Fora do modelo de premissas. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Taxa de retirada da opção Personalizada | O usuário digita rentabilidade e retirada | Decisão do usuário | y |
| Faixa aceita | Rentabilidade e retirada de 1% a 15%, até 2 casas decimais (ex.: 6,5 ou 6,75) | Decisão do usuário (1% a 15%); 2 casas bastam e cabem em pontos-base inteiros | y |
| Retirada maior que a rentabilidade | Rejeitada com a mensagem "A taxa de retirada não pode ser maior que a rentabilidade" | Retirar acima do que o patrimônio rende consome o principal e contradiz o modelo; mensagem exata por L-002 | n |
| Persistência | Nova coluna `withdrawal_rate_bp smallint NOT NULL`, preenchida nas linhas existentes pela tabela 400/600/700; a CHECK `annual_rate_bp IN (600,800,1000)` é substituída por faixa 100 a 1500; CHECK equivalente para a retirada | A retirada livre precisa ser guardada; os objetivos salvos mantêm a meta atual | n |
| Presets e a retirada | Escolher 6, 8 ou 10 grava a retirada da tabela (4, 6, 7); abrir Personalizada parte dos valores do preset ativo | Mantém os presets exatos e dá ponto de partida ao usuário | n |
| Preset ativo ao reabrir | O botão marcado é o preset cujo par (rentabilidade, retirada) coincide com o salvo; qualquer outro par marca Personalizada | O estado vem só dos dados, sem campo extra de modo | n |
| Rótulo do marco atingido | "Atingido", com o círculo preenchido e o check (comportamento atual) | Já atende o pedido; vira requisito para travar regressão | n |
| Rótulo do último marco | "Aos N anos (Meta)" | Texto do pedido | n |
| Rótulo sem previsão | "Sem previsão" (inalterado) | Cobre prazo encerrado sem aporte possível | n |
| Ticks do eixo X | Passo atual de no máximo 8 intervalos, contado a partir da idade final para trás; a idade final é sempre um tick; a primeira idade inteira pode sair se o passo não cair nela | Garante o 45 explícito sem estourar a largura | n |
| Onde fica a Personalizada | Um botão de texto abaixo do grid de 3 perfis, fora do grid; o grid segue com 3 colunas | O pedido fixa 3 colunas para os perfis e permite "link Personalizada" | n |
| Textos dos botões de perfil | Título "Conservador" / "Moderado" / "Agressivo", "6% a.a." / "8% a.a." / "10% a.a." e "Retirada: 4% a.a." / "6%" / "7%", em pt-BR | Texto do pedido; vêm da tabela de retirada, sem repetir os números | n |
| Linha "Taxa de retirada N% a.a." sob o seletor | Removida; com Personalizada ativa, a retirada aparece no campo | O botão ativo comunica a informação | n |
| Texto da pílula da Meta | "Gera R$ X/mês com retirada de M% a.a.", com X a renda desejada e M a retirada do resumo, taxas com vírgula decimal (6,5%) | Texto do pedido | n |
| Linhas removidas do card | As quatro linhas (Rentabilidade real, Taxa de retirada, Renda desejada, Patrimônio necessário) saem do card e entram no "Como calculamos?" como lista, junto dos parágrafos atuais | O detalhe não se perde | n |
| Truncar rótulos de marcos | Os `li` ganham `min-w-0` e `truncate` só como proteção; os textos de AJL-01 a AJL-04 cabem inteiros de 360 px a 1280 px | Evita colisão sem cortar o texto esperado | n |
| Exemplo de marcos do pedido (R$ 1/2/3/4 mi) | Ilustrativo; os valores seguem 25/50/75/100% da meta | Os marcos continuam em frações da meta | n |
| Rótulos dos campos | "(R$)" sai dos rótulos, porque o prefixo passa a vir no input; o nome acessível dos campos passa a ser "Renda mensal desejada" e "Valor já guardado" | Evita `R$` duplicado | n |
| Valor submetido | Continua o texto sem `R$` (ex.: `20.000,00`) | `parseBRL` e `saveGoal` não mudam | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation & bounds (taxa personalizada fora de 1% a 15%, mais de 2 casas, retirada > rentabilidade, AJL-12 a AJL-15); failure states (marco sem previsão, AJL-03); state-transition integrity (alternar presets e Personalizada, AJL-10, AJL-11); data lifecycle (objetivos salvos migram com a retirada da tabela, AJL-16); idempotency, auth, concurrency, observability e external-dependency failure N/A because a feature não muda autenticação, concorrência nem integrações.

---

## User Stories

### P1: Rótulos dos marcos sem sobreposição ⭐ MVP

**User Story**: Como usuário, quero rótulos curtos nos marcos para ler cada previsão sem textos colados.

**Why P1**: É o bug visual visível; o texto atual estoura a coluna.

**Acceptance Criteria**:

1. WHEN o marco não foi atingido e tem previsão THEN the system SHALL exibir "Aos N anos", com N a idade prevista, sem a palavra "Previsão"  <!-- AJL-01 -->
2. WHEN o marco foi atingido THEN the system SHALL exibir "Atingido" com o círculo preenchido em verde e o ícone de check  <!-- AJL-02 -->
3. IF o marco não tem previsão THEN the system SHALL exibir "Sem previsão" com o círculo vazio  <!-- AJL-03 -->
4. The system SHALL exibir o rótulo do último marco, quando não atingido e com previsão, como "Aos N anos (Meta)"  <!-- AJL-04 -->
5. The system SHALL renderizar cada rótulo de marco em uma única linha, sem quebra e sem sobrepor o rótulo vizinho, de 360 px a 1280 px de largura  <!-- AJL-05 -->

**Independent Test**: Abrir `/liberdade` com marcos em 38, 42 e 45 anos em 360 px e em 1280 px e ver "Aos 38 anos", "Aos 42 anos", "Aos 45 anos (Meta)" legíveis e separados.

---

### P1: Idade final no eixo do gráfico ⭐ MVP

**User Story**: Como usuário, quero ver a idade em que a curva atinge a meta no eixo X para saber o momento exato.

**Why P1**: A curva termina em um ponto que o eixo não nomeia.

**Acceptance Criteria**:

1. The system SHALL incluir a idade de aposentadoria entre os rótulos do eixo X do gráfico  <!-- AJL-06 -->
2. The system SHALL limitar os rótulos do eixo X a no máximo 9, todos idades inteiras crescentes e distintas  <!-- AJL-07 -->
3. WHEN a idade atual e a idade de aposentadoria distam menos de 9 anos THEN the system SHALL rotular cada idade inteira entre as duas  <!-- AJL-08 -->

**Independent Test**: Objetivo de 34 a 45 anos: o último rótulo do eixo é 45.

---

### P1: Prefixo R$ nos campos de dinheiro ⭐ MVP

**User Story**: Como usuário, quero ver `R$` no campo de valor para ter a mesma leitura do resto do sistema.

**Why P1**: Consistência com o design system; acabamento pedido.

**Acceptance Criteria**:

1. The system SHALL exibir o texto fixo `R$` à esquerda do input de Renda mensal desejada e do input de Valor já guardado  <!-- AJL-09 -->
2. The system SHALL submeter o valor digitado sem o prefixo `R$` (ex.: `20.000,00`)  <!-- AJL-17 -->

**Independent Test**: Abrir a gaveta; os dois campos mostram `R$` à esquerda; salvar `20.000,00` grava 2.000.000 centavos.

---

### P1: Seletor de perfil da gaveta ⭐ MVP

**User Story**: Como usuário, quero ver em cada perfil a taxa de acúmulo e a retirada para escolher sem texto solto abaixo.

**Why P1**: O seletor atual tem rótulos de uma linha e a retirada fica em outra linha.

**Acceptance Criteria**:

1. The system SHALL exibir os perfis Conservador, Moderado e Agressivo em grid de 3 colunas, com a mesma altura em todos os botões  <!-- AJL-24 -->
2. The system SHALL exibir em cada botão de perfil o título, a taxa de acúmulo ("6% a.a.", "8% a.a.", "10% a.a.") e o subtexto "Retirada: 4% a.a.", "Retirada: 6% a.a." e "Retirada: 7% a.a.", respectivamente  <!-- AJL-25 -->
3. The system SHALL omitir a linha "Taxa de retirada N% a.a." abaixo do grupo de botões  <!-- AJL-26 -->
4. WHILE um perfil está ativo the system SHALL destacar apenas esse botão  <!-- AJL-27 -->

**Independent Test**: Abrir a gaveta em 360 px; os três botões têm a mesma altura, três linhas de texto cada, e não há "Taxa de retirada" fora deles.

---

### P1: Card de Meta Patrimonial com pílula ⭐ MVP

**User Story**: Como usuário, quero um resumo curto da premissa sob a meta para não ler uma lista repetida.

**Why P1**: A lista cinza repete o que o "Como calculamos?" já explica.

**Acceptance Criteria**:

1. The system SHALL exibir, logo abaixo do valor da Meta Patrimonial, uma pílula com o texto "Gera R$ X/mês com retirada de M% a.a."  <!-- AJL-28 -->
2. The system SHALL omitir do card as linhas Rentabilidade real, Taxa de retirada, Renda desejada e Patrimônio necessário  <!-- AJL-29 -->
3. WHEN o usuário abre o "Como calculamos?" THEN the system SHALL exibir a rentabilidade real, a taxa de retirada, a renda desejada e o patrimônio necessário do resumo, além dos parágrafos explicativos  <!-- AJL-30 -->
4. The system SHALL formatar as taxas exibidas em pt-BR, com vírgula decimal (ex.: "6,5% a.a.")  <!-- AJL-31 -->

**Independent Test**: Com renda de R$ 20.000 e perfil Moderado, a pílula diz "Gera R$ 20.000,00/mês com retirada de 6% a.a." e a lista cinza não existe.

---

### P2: Taxa personalizada

**User Story**: Como usuário que acompanha um investimento com taxa real específica, quero digitar a rentabilidade e a taxa de retirada para que a meta use as minhas premissas.

**Why P2**: Dá flexibilidade; os presets cobrem o caso comum.

**Acceptance Criteria**:

1. The system SHALL oferecer, abaixo do grid de perfis, o botão de texto "Personalizada"  <!-- AJL-10 -->
2. WHEN o usuário escolhe Personalizada THEN the system SHALL exibir os campos "Rentabilidade real (% a.a.)" e "Taxa de retirada (% a.a.)", preenchidos com os valores do preset que estava ativo  <!-- AJL-11 -->
3. WHEN o usuário digita rentabilidade e retirada válidas THEN the system SHALL recalcular meta, aporte, marcos e gráfico com esse par, com a meta igual a `round(renda × 12 ÷ retirada)`  <!-- AJL-12 -->
4. IF a rentabilidade está fora de 1% a 15% THEN the system SHALL rejeitar com a mensagem "A rentabilidade deve estar entre 1% e 15% ao ano"  <!-- AJL-13 -->
5. IF a retirada está fora de 1% a 15% THEN the system SHALL rejeitar com a mensagem "A taxa de retirada deve estar entre 1% e 15% ao ano"  <!-- AJL-14 -->
6. IF a taxa tem mais de 2 casas decimais ou não é numérica THEN the system SHALL rejeitar com a mensagem "Informe a taxa com até 2 casas decimais, ex.: 6,5"  <!-- AJL-15 -->
7. IF a retirada é maior que a rentabilidade THEN the system SHALL rejeitar com a mensagem "A taxa de retirada não pode ser maior que a rentabilidade"  <!-- AJL-18 -->
8. WHEN o usuário salva e reabre o objetivo THEN the system SHALL marcar o preset cujo par (rentabilidade, retirada) coincide com o salvo, ou Personalizada se nenhum coincidir, com os campos preenchidos  <!-- AJL-19 -->
9. WHEN o usuário escolhe 6%, 8% ou 10% THEN the system SHALL usar a retirada 4%, 6% ou 7%, respectivamente  <!-- AJL-20 -->
10. The system SHALL migrar os objetivos existentes preenchendo a taxa de retirada pela tabela 6→4%, 8→6%, 10→7%, sem alterar nenhuma meta já calculada  <!-- AJL-16 -->

**Independent Test**: Escolher Personalizada, digitar 6,5 e 4,5 com renda de R$ 20.000/mês: meta R$ 5.333.333,33; reabrir mostra Personalizada com 6,5 e 4,5.

---

## Edge Cases

- IF o usuário digita `6,5` ou `6.5` THEN the system SHALL aceitar o valor como 6,5%  <!-- AJL-21 -->
- IF o usuário deixa um campo da taxa personalizada vazio THEN the system SHALL rejeitar com a mensagem "Informe a taxa com até 2 casas decimais, ex.: 6,5"  <!-- AJL-22 -->
- WHILE a opção Personalizada está ativa the system SHALL deixar nenhum dos três perfis destacado  <!-- AJL-32 -->
- WHEN a retirada é igual à rentabilidade THEN the system SHALL aceitar o par  <!-- AJL-23 -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AJL-01 | P1: Rótulos dos marcos | Execute | Implementing |
| AJL-02 | P1: Rótulos dos marcos | Execute | Implementing |
| AJL-03 | P1: Rótulos dos marcos | Execute | Implementing |
| AJL-04 | P1: Rótulos dos marcos | Execute | Implementing |
| AJL-05 | P1: Rótulos dos marcos | Execute | Implementing |
| AJL-06 | P1: Eixo do gráfico | Execute | Implementing |
| AJL-07 | P1: Eixo do gráfico | Execute | Implementing |
| AJL-08 | P1: Eixo do gráfico | Execute | Implementing |
| AJL-09 | P1: Prefixo R$ | Execute | Implementing |
| AJL-17 | P1: Prefixo R$ | Execute | Implementing |
| AJL-24 | P1: Seletor de perfil | - | Pending |
| AJL-25 | P1: Seletor de perfil | - | Pending |
| AJL-26 | P1: Seletor de perfil | - | Pending |
| AJL-27 | P1: Seletor de perfil | - | Pending |
| AJL-28 | P1: Card de Meta | Execute | Implementing |
| AJL-29 | P1: Card de Meta | - | Pending |
| AJL-30 | P1: Card de Meta | Execute | Implementing |
| AJL-31 | P1: Card de Meta | Execute | Implementing |
| AJL-10 | P2: Taxa personalizada | - | Pending |
| AJL-11 | P2: Taxa personalizada | - | Pending |
| AJL-12 | P2: Taxa personalizada | - | Pending |
| AJL-13 | P2: Taxa personalizada | - | Pending |
| AJL-14 | P2: Taxa personalizada | - | Pending |
| AJL-15 | P2: Taxa personalizada | - | Pending |
| AJL-18 | P2: Taxa personalizada | - | Pending |
| AJL-19 | P2: Taxa personalizada | - | Pending |
| AJL-20 | P2: Taxa personalizada | - | Pending |
| AJL-16 | P2: Taxa personalizada | - | Pending |
| AJL-21 | Edge cases | - | Pending |
| AJL-22 | Edge cases | - | Pending |
| AJL-23 | Edge cases | - | Pending |
| AJL-32 | Edge cases | - | Pending |

**Coverage:** 32 total, 0 mapped to tasks, 32 unmapped ⚠️

---

## Success Criteria

- [ ] Em 360 px os quatro marcos aparecem sem sobreposição.
- [ ] O eixo X do gráfico termina na idade de aposentadoria.
- [ ] Os dois campos de dinheiro mostram `R$` à esquerda.
- [ ] Os três botões de perfil têm a mesma altura e nenhum texto de retirada fica fora deles.
- [ ] O card de Meta mostra a pílula e nenhuma lista de quatro linhas.
- [ ] Um objetivo com 6,5% de rentabilidade e 4,5% de retirada é salvo, recalcula a tela e reabre como Personalizada.
