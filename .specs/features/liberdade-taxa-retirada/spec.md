# Liberdade: Taxa de Retirada Specification

## Problem Statement

Hoje a meta patrimonial da tela `/liberdade` (Ápice) é `renda × 12 ÷ rentabilidade` (`targetCents` em `src/lib/domain/freedom.ts`): a mesma taxa que faz o patrimônio crescer também define quanto dele se retira por ano. Isso mistura duas fases. Na acumulação vale a rentabilidade real esperada; na independência financeira vale uma taxa de retirada, e ela é menor que a rentabilidade. Com 6% real a meta de R$ 20.000/mês sai R$ 4.000.000 (retirada implícita de 6%) quando o modelo pedido usa 4% e dá R$ 6.000.000. A meta, o aporte, o gráfico e os marcos precisam partir da meta nova.

## Goals

- [ ] A meta patrimonial vem de `renda × 12 ÷ taxa de retirada`, com a taxa de retirada definida por uma única tabela explícita: 6% → 4%, 8% → 6%, 10% → 7%.
- [ ] Para R$ 20.000/mês a meta é R$ 6.000.000,00 (6%), R$ 4.000.000,00 (8%) e R$ 3.428.571,43 (10%).
- [ ] Aporte, prazo, projeção, marcos, gráfico e cartões leem a mesma meta, calculada em um só lugar.
- [ ] A tela mostra rentabilidade real, taxa de retirada, renda desejada e patrimônio necessário, com a explicação "Como calculamos?", sem prometer renda nem retorno.

## Out of Scope

Explicitamente excluído para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Campo para digitar rentabilidade ou taxa de retirada livre | O banco (`financial_goal_annual_rate`), o `goalSchema` e o seletor só aceitam 6%, 8% e 10%; não há valor livre a tratar. |
| Alterar a conversão mensal `(1 + a)^(1/12) − 1` e a convenção de aporte ao fim do mês | Já implementadas em `monthlyRate` e `requiredMonthlyCents`; só ganham teste que as trava. |
| Migração de banco ou novas colunas | A taxa de retirada é derivada da rentabilidade salva; nada novo é persistido. |
| Modelar inflação, imposto, sequência de retornos ou fase de retirada simulada ano a ano | O pedido é um modelo de premissas, não uma simulação de decumulação. |
| Mudar estilos, layout ou componentes sem relação com a meta | Pedido explícito de preservar o visual. |
| Reescrever specs e validações de features anteriores (`liberdade-*`) | Ficam como histórico; a regra nova vive nesta spec. |
| Campo "tempo até atingir" calculado a partir de um aporte informado | A idade do ápice é entrada do usuário e o aporte é a saída; não há aporte informado. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Local da tabela rentabilidade → retirada | Constante única em `freedom.ts`, em pontos-base (`{ 600: 400, 800: 600, 1000: 700 }`), junto de `ANNUAL_RATES`; `getWithdrawalRate` é a única leitura | `freedom.ts` já guarda as taxas e é isomórfico (AD-008); nenhum componente repete os valores | n |
| Rentabilidade fora da tabela | `getWithdrawalRate` lança `RangeError` com a taxa recebida; não existe valor padrão | Não inventar taxa; na prática inalcançável, pois banco, `goalSchema` e `AnnualRateBp` restringem a 6/8/10 | n |
| Arredondamento da meta | `round(renda_centavos × 12 × 10.000 ÷ retirada_bp)` ao centavo mais próximo (10% dá 342.857.143 centavos = R$ 3.428.571,43) | 12 ÷ 0,07 não é inteiro; a meta alimenta aporte, marcos e gráfico, e todos usam o valor já arredondado | n |
| Objetivos já salvos | Nenhuma migração; ao abrir a tela a meta é recalculada com a regra nova, então sobe em todos os cenários (6%: ×200 → ×300; 8%: ×150 → ×200; 10%: ×120 → ×171,43) e o aporte sobe junto | Meta e aporte são calculados na leitura (`summarize`), não gravados; é a intenção do pedido | n |
| Nome na API pública do domínio | `annualRateBp` permanece o campo da rentabilidade real (colunas, `Goal`, formulário); o resumo ganha `withdrawalRateBp` e `annualIncomeCents`; `targetCents`, `requiredMonthlyCents` e `summarize` mantêm os nomes | Evita renomear coluna e contratos; o pedido manda adaptar ao padrão do projeto | n |
| `calculateFinancialIndependence` do pedido | `summarize` já é esse ponto único; ele passa a expor `withdrawalRateBp` e `annualIncomeCents`; `monthsToTarget` corresponde a `months` e `ageAtTarget` a `retirementAge`, sem campos duplicados | Criar uma segunda função duplicaria a lógica que o pedido manda centralizar | n |
| Fonte única da meta na tela | Hero, gaveta, marcos e gráfico usam `summary.targetCents`; o teste compara o que cada um recebe de `summarize` | Evita meta de cartão ≠ gráfico ≠ aporte | n |
| Rótulo do seletor | Título "Rentabilidade real esperada" (substitui "Taxa esperada ao ano") e legenda "Taxa real estimada (descontada a inflação)" mantida; nome acessível do radiogroup passa a "Rentabilidade real esperada" | Texto do pedido | n |
| Onde mostrar rentabilidade e retirada | No Hero, substituindo o selo "Gera R$ X/mês perpétuos a N% a.a." por linhas de apoio: "Rentabilidade real N% a.a.", "Taxa de retirada M% a.a.", "Renda desejada R$ X/mês", "Patrimônio necessário R$ Y" (o valor grande "Meta Patrimonial" já é o patrimônio necessário e não se repete); na gaveta basta a retirada junto ao seletor | Mantém a estrutura do Hero; "perpétuos" promete renda vitalícia | n |
| "Como calculamos?" | Disclosure com o texto do pedido no Hero, mais uma frase de que a taxa de retirada muda com o cenário e de que os valores são premissas de simulação, sem garantia; reutiliza `ui/tooltip.tsx` ou um `<details>` conforme o design | Pedido; o componente exato é decisão de design | n |
| Texto de introdução da gaveta (`INTRO`) | Troca "sem consumir o principal, na taxa esperada escolhida" por texto que cita a taxa de retirada do cenário e não promete preservação do principal | A frase atual afirma uma garantia que o pedido proíbe | n |
| Texto do `aria-label` do gráfico e rótulos de checkpoints | Seguem usando o valor de `summary.targetCents`; nenhuma frase nova precisa de mudança | A meta já flui do resumo | n |
| Prazo encerrado e meta já atingida | Regras atuais de `summarize` valem com a meta nova: aporte 0 quando o guardado capitalizado já alcança a meta; `null` ("Prazo encerrado") quando `months = 0` e o guardado não alcança | Só a meta muda; os estados continuam | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation & bounds (rentabilidade fora de 6/8/10, RET-05), failure states (prazo encerrado, meta atingida, RET-09), state-transition integrity (troca de cenário, renda, guardado, idade recalcula todos os derivados, RET-08), data lifecycle (objetivos salvos recalculam na leitura, RET-10); idempotency, auth, concurrency, observability e external-dependency failure N/A because a feature não muda gravação, permissões nem integrações.

---

## User Stories

### P1: Meta pela taxa de retirada ⭐ MVP

**User Story**: Como usuário do simulador, quero que o patrimônio necessário seja calculado pela taxa de retirada do cenário escolhido para que a meta reflita quanto posso retirar por ano, e não quanto o patrimônio rende.

**Why P1**: Corrige a regra financeira; tudo o mais (aporte, gráfico, textos) depende dessa meta.

**Acceptance Criteria**:

1. The system SHALL definir a taxa de retirada por uma única tabela em `freedom.ts`: 6% → 4%, 8% → 6%, 10% → 7%.  <!-- ubiquitous -->
2. WHEN `getWithdrawalRate` recebe 600, 800 ou 1000 pontos-base THEN the system SHALL devolver 400, 600 e 700 respectivamente.  <!-- event-driven -->
3. IF `getWithdrawalRate` recebe uma rentabilidade fora de 600, 800 e 1000 THEN the system SHALL lançar `RangeError` sem devolver taxa alguma.  <!-- unwanted-behavior -->
4. WHEN a renda desejada é R$ 20.000,00/mês THEN the system SHALL calcular a meta patrimonial em R$ 6.000.000,00 para 6%, R$ 4.000.000,00 para 8% e R$ 3.428.571,43 para 10%.  <!-- event-driven -->
5. The system SHALL calcular a meta como `renda mensal × 12 ÷ taxa de retirada`, arredondada ao centavo mais próximo, e nunca como `renda × 12 ÷ rentabilidade`.  <!-- ubiquitous -->

**Independent Test**: Testes unitários de `getWithdrawalRate` e `targetCents` com os três cenários e R$ 20.000/mês.

---

### P1: Aporte, projeção e gráfico partem da meta nova ⭐ MVP

**User Story**: Como usuário, quero que o aporte mensal, o tempo, os marcos e o gráfico usem a mesma meta para que nenhum número da tela contradiga outro.

**Why P1**: Sem isso a meta nova ficaria só no cartão.

**Acceptance Criteria**:

1. The system SHALL converter a rentabilidade anual em taxa mensal por `(1 + anual)^(1/12) − 1` (6% → 0,4868% a.m.) e usar essa taxa em aporte, projeção e marcos.  <!-- ubiquitous -->
2. WHEN o resumo é calculado THEN the system SHALL obter o aporte mensal resolvendo `FV = PV × (1+r)^n + PMT × ((1+r)^n − 1) ÷ r` para PMT, com FV igual à meta derivada da taxa de retirada e aporte no fim do mês, arredondado para cima ao centavo.  <!-- event-driven -->
3. WHEN o resumo é calculado THEN the system SHALL devolver no mesmo objeto a rentabilidade real, a taxa de retirada, a renda anual, a meta, o aporte e os meses até o ápice, e SHALL usar essa meta para o progresso, a distância do alvo, os marcos de 25/50/75/100% e o teto do eixo Y.  <!-- event-driven -->
4. WHEN a projeção cresce pagando o aporte necessário THEN the system SHALL terminar o último ponto da linha do tempo em valor maior ou igual à meta, com a sobra limitada ao efeito de arredondar o aporte para cima ao centavo (com 1 centavo a menos de aporte por mês a meta não é alcançada).  <!-- event-driven -->
5. WHEN o gráfico é desenhado THEN the system SHALL posicionar a linha "Meta" na altura de `summary.targetCents`, o mesmo valor exibido no Hero e na gaveta.  <!-- event-driven -->
6. WHEN renda desejada, guardado, data de nascimento ou idade do ápice, ou rentabilidade mudam THEN the system SHALL recalcular retirada, meta, aporte, prazo, linha do tempo e marcos a partir das novas entradas.  <!-- event-driven -->
7. WHILE o guardado capitalizado até o ápice já alcança a meta, the system SHALL mostrar aporte mensal R$ 0,00.  <!-- state-driven -->
8. WHILE o prazo até o ápice é 0 meses e o guardado não alcança a meta, the system SHALL mostrar "Prazo encerrado" no lugar do aporte.  <!-- state-driven -->

**Independent Test**: Testes unitários de `summarize` com R$ 20.000/mês nos três cenários (aporte conferido por `projectedCents` ≈ meta) e testes de alteração de cada entrada.

---

### P1: Tela explica rentabilidade e retirada ⭐ MVP

**User Story**: Como usuário, quero ver a rentabilidade real, a taxa de retirada, a renda e o patrimônio necessário, com uma explicação, para entender por que a taxa de retirada é menor que a rentabilidade.

**Why P1**: A taxa de retirada passa a ser premissa visível; escondê-la deixaria a meta sem explicação.

**Acceptance Criteria**:

1. The system SHALL exibir o título "Rentabilidade real esperada" no seletor de cenários, com a legenda "Taxa real estimada (descontada a inflação)" e as opções Conservador · 6%, Moderado · 8% e Agressivo · 10%.  <!-- ubiquitous -->
2. WHEN o Hero é exibido THEN the system SHALL mostrar "Rentabilidade real N% a.a.", "Taxa de retirada M% a.a.", "Renda desejada R$ X/mês" e "Patrimônio necessário" com a meta de `summary.targetCents`, nos pares 6%/4%, 8%/6% e 10%/7%.  <!-- event-driven -->
3. WHEN o usuário abre "Como calculamos?" THEN the system SHALL mostrar: "A rentabilidade real representa o crescimento estimado do patrimônio acima da inflação. A taxa de retirada representa a parcela anual do patrimônio utilizada para gerar a renda desejada.", a informação de que a taxa de retirada varia conforme o cenário e a de que os valores são premissas de simulação.  <!-- event-driven -->
4. The system SHALL omitir de todos os textos da tela de Liberdade as palavras "perpétuo", "perpétuos", "garantido" e "vitalício" e qualquer frase que afirme renda ou retorno garantido.  <!-- ubiquitous -->
5. WHEN o usuário troca o cenário no formulário THEN the system SHALL atualizar a taxa de retirada exibida junto com a meta e o aporte da prévia sem recarregar a página.  <!-- event-driven -->

**Independent Test**: Teste de unidade dos textos e rótulos extraídos para constantes puras, mais verificação manual da tela nos três cenários.

---

### P2: Regressão e objetivos salvos

**User Story**: Como usuário com objetivo já salvo, quero abrir a tela e ver os números pelo modelo novo sem perder meus dados.

**Why P2**: Protege contratos; não muda o valor entregue em si.

**Acceptance Criteria**:

1. WHEN um objetivo salvo com rentabilidade 600, 800 ou 1000 é aberto THEN the system SHALL calcular meta e aporte pelo modelo novo sem alterar `financial_goal` e sem migração.  <!-- event-driven -->
2. The system SHALL manter inalterados o schema do banco, `goalSchema`, `saveGoal` e os nomes `annualRateBp`, `targetCents`, `requiredMonthlyCents` e `summarize`.  <!-- ubiquitous -->
3. The system SHALL manter os módulos `freedom.ts` e `validation/goal.ts` sem importação de servidor (AD-008).  <!-- ubiquitous -->

**Independent Test**: Suíte atual de `goal.test.ts`, `goals.int.test.ts` e `freedom.test.ts` passa com as expectativas de meta atualizadas.

---

## Edge Cases

- IF a renda desejada é a máxima (R$ 1.000.000,00/mês) com 10% THEN the system SHALL calcular a meta sem perda de precisão acima de 1 centavo (R$ 171.428.571,43, ou seja, R$ 12.000.000,00 ÷ 7%).
- WHEN a meta com 10% não é inteira em centavos THEN the system SHALL usar o valor arredondado em Hero, gaveta, marcos, gráfico e aporte, sem recalcular a partir do valor não arredondado.
- WHEN o guardado é maior que a meta nova THEN the system SHALL mostrar progresso acima de 100% como hoje e aporte R$ 0,00.
- WHEN `months` é 0 e o guardado alcança a meta THEN the system SHALL mostrar aporte R$ 0,00.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RET-01 | P1: Meta pela taxa de retirada (tabela única) | Execute | Implementing |
| RET-02 | P1: Meta pela taxa de retirada (`getWithdrawalRate` 6/8/10) | Execute | Implementing |
| RET-03 | P1: Meta pela taxa de retirada (rentabilidade fora da tabela) | Execute | Implementing |
| RET-04 | P1: Meta pela taxa de retirada (valores para R$ 20.000/mês) | Execute | Implementing |
| RET-05 | P1: Meta pela taxa de retirada (fórmula e arredondamento) | Execute | Implementing |
| RET-06 | P1: Aporte, projeção e gráfico (taxa mensal) | Execute | Implementing |
| RET-07 | P1: Aporte, projeção e gráfico (aporte resolve PMT com a meta nova) | Execute | Implementing |
| RET-08 | P1: Aporte, projeção e gráfico (resumo único e recálculo por entrada) | Execute | Implementing |
| RET-09 | P1: Aporte, projeção e gráfico (linha do tempo termina na meta, aporte 0, prazo encerrado) | Execute | Implementing |
| RET-10 | P1: Aporte, projeção e gráfico (linha "Meta" do gráfico) | Execute | Implementing |
| RET-11 | P1: Tela explica (seletor "Rentabilidade real esperada") | Execute | Verified |
| RET-12 | P1: Tela explica (Hero com rentabilidade, retirada, renda, patrimônio) | Execute | Verified |
| RET-13 | P1: Tela explica ("Como calculamos?") | Execute | Verified |
| RET-14 | P1: Tela explica (sem promessa de renda ou retorno; prévia atualiza retirada) | Execute | Verified |
| RET-15 | P2: Regressão (objetivos salvos, contratos, isomorfismo) | Tasks | In Tasks |

**Mapa de critérios:** RET-01 a RET-05 = ACs 1 a 5 da primeira história; RET-06 a RET-10 = ACs 1 a 5 da segunda (os ACs 6 a 8 da segunda e os casos de borda entram em RET-08 e RET-09); RET-11 a RET-14 = ACs 1 a 4 da terceira (o AC 5 entra em RET-14); RET-15 = ACs da P2.

**Coverage:** 15 total, 15 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Com R$ 20.000/mês, os três cenários mostram meta de R$ 6.000.000,00, R$ 4.000.000,00 e R$ 3.428.571,43 no Hero, na gaveta e na linha "Meta" do gráfico.
- [ ] Para cada cenário, projetar o patrimônio pagando o aporte exibido por `n` meses chega à meta ou a um valor acima dela por no máximo o efeito do arredondamento do aporte ao centavo.
- [ ] Nenhum arquivo de UI contém os valores 4, 6 e 7 como taxa de retirada; todos leem `getWithdrawalRate`.
- [ ] Testes, lint e typecheck passam e a tela mantém o layout atual.
