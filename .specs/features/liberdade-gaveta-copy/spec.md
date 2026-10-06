# Liberdade: Popover do Como Calculamos e Copy da Gaveta Specification

## Problem Statement

Em `/liberdade`, abrir o "Como calculamos?" expande um `<details>` dentro da coluna esquerda do hero, que cresce e deixa um vazio sob o Aporte Estratégico Mensal. O texto repete conceitos em três parágrafos formais. Na gaveta, a opção "Personalizada" aparece como palavra solta sublinhada, que parece um elemento quebrado, e o campo "Idade de aposentadoria" destoa da identidade Vértice / Ápice.

## Goals

- [ ] Abrir ou fechar o "Como calculamos?" não altera a altura do hero.
- [ ] A explicação é uma frase com os números do usuário, mais um aviso curto, sem os três parágrafos atuais.
- [ ] A opção de taxas livres é um botão discreto com ícone e o rótulo "Definir taxas personalizadas".
- [ ] O campo de idade se chama "Idade da independência" na gaveta e nas mensagens de validação.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar fórmula, presets (6→4, 8→6, 10→7), faixa 1% a 15% ou persistência das taxas | O pedido trata só de apresentação e copy. |
| Mudar o card de Aporte Estratégico Mensal, os marcos ou o gráfico | Fora do pedido. |
| Renomear "aposentadoria" fora da gaveta e das mensagens de validação do objetivo | Só a gaveta pediu a troca. |
| Mudar nomes de campos, colunas ou chaves de dados (`retirementAge`) | Renome é só de texto exibido. |
| Mudar cores, fontes ou o restante do layout | Preservar o visual. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Popover ou modal | Popover ancorado ao botão (Radix Popover, já disponível em `radix-ui`) | Recomendação do pedido; leve e não bloqueia a tela | n |
| Gatilho do popover | Botão de texto "Como calculamos?" com ícone de informação (ⓘ) à esquerda | O pedido aceita link ou ícone; os dois juntos mantêm o rótulo atual e o sinal de ajuda | n |
| Fechamento | Esc, clique fora ou novo clique no gatilho; o foco volta ao gatilho | Padrão do Radix e acessível | n |
| Formato dos valores na frase | Os três valores usam `formatBRL` (ex.: "R$ 20.000,00"), a taxa usa `formatRate` ("6%", "6,5%") | Mantém um só formatador; o exemplo do pedido ("R$ 20.000/mês") era ilustrativo | n |
| Renda anual | Renda mensal desejada × 12, em centavos | Exemplo do pedido (20.000 → 240.000) | n |
| Linhas de dados do card (`heroFacts`) | Removidas do "Como calculamos?"; a frase passa a carregar renda, retirada e patrimônio | O pedido substitui o conteúdo atual pela frase; a rentabilidade segue visível no botão de perfil e na gaveta | n |
| Texto da frase | "Com uma renda de {mensal}/mês ({anual}/ano) e uma taxa de retirada segura de {taxa} a.a., seu patrimônio precisa ser de {meta} para perpetuar a renda sem consumir o principal investido." | Texto do pedido com valores do resumo | n |
| Título do popover | "Como chegamos a esse número:" | Texto do pedido | n |
| Aviso | "Simulação com base em rentabilidade real (líquida de inflação). Não representa garantia de rendimentos." | Texto do pedido | n |
| Onde fica "Definir taxas personalizadas" | Substitui o botão "Personalizada", abaixo do grid de 3 perfis, com ícone de engrenagem (⚙) | O pedido fixa o rótulo e o ícone; a posição atual já é a esperada | n |
| Comportamento dos dois inputs | Já existem lado a lado quando Personalizada está ativa; só os rótulos mudam | Evita reescrever o que já cumpre o pedido | n |
| Rótulos dos inputs | "Rentabilidade real ao ano (%)" e "Taxa de retirada anual (%)" | Texto do pedido | n |
| Mensagens de validação com "aposentadoria" | Trocadas por "independência" (ex.: "A idade da independência deve ser maior que a idade atual (N)") | A mensagem aparece na gaveta e precisa casar com o rótulo; L-002 pede texto exato | n |
| Idade da independência no rótulo do slider | Nome acessível "Idade da independência (controle deslizante)"; subtítulo "De N a 90 anos" inalterado | Pedido mantém o subtítulo | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: state-transition integrity (abrir/fechar popover, alternar Personalizada, LGC-01, LGC-05, LGC-09, LGC-11); input validation (mensagens de idade, LGC-14 a LGC-16); failure states (resumo sem prazo, Edge Cases). Idempotency, auth, concurrency, data lifecycle, observability e external-dependency failure N/A because a feature só muda apresentação e texto, sem dados, rede ou permissões.

---

## User Stories

### P1: Explicação em popover ⭐ MVP

**User Story**: Como usuário na tela de Liberdade, quero ler "Como calculamos?" sem que o card se estique, para que o hero não pule de altura.

**Why P1**: É o defeito visual principal do pedido.

**Acceptance Criteria**:

1. WHEN o usuário aciona o botão "Como calculamos?" THEN the system SHALL abrir um popover ancorado ao botão com o título "Como chegamos a esse número:".
2. WHILE o popover está aberto, the system SHALL manter a altura do hero igual à do estado fechado.
3. WHEN o resumo tem renda mensal R$ 20.000,00, retirada 6% e meta R$ 4.000.000,00 THEN the system SHALL exibir "Com uma renda de R$ 20.000,00/mês (R$ 240.000,00/ano) e uma taxa de retirada segura de 6% a.a., seu patrimônio precisa ser de R$ 4.000.000,00 para perpetuar a renda sem consumir o principal investido."
4. The system SHALL exibir no popover o aviso "Simulação com base em rentabilidade real (líquida de inflação). Não representa garantia de rendimentos."
5. WHEN o usuário pressiona Esc ou clica fora do popover THEN the system SHALL fechá-lo e devolver o foco ao botão.
6. WHERE a retirada do resumo tem casa decimal (6,5%) the system SHALL escrever a taxa com vírgula ("6,5% a.a.").
7. The system SHALL não exibir mais os três parágrafos de `HOW_WE_CALCULATE` nem as quatro linhas de `heroFacts`.

**Independent Test**: Abrir `/liberdade` com um objetivo salvo, clicar em "Como calculamos?" e conferir texto e altura do hero com e sem o popover.

---

### P2: Taxas personalizadas na gaveta

**User Story**: Como usuário na gaveta, quero um botão claro para definir minhas próprias taxas, para que a opção não pareça um elemento quebrado.

**Why P2**: Corrige o defeito visual da gaveta sem mudar o modelo.

**Acceptance Criteria**:

1. The system SHALL exibir abaixo dos três perfis um botão com ícone de engrenagem e o texto "Definir taxas personalizadas", sem a palavra solta "Personalizada".
2. WHEN o usuário aciona "Definir taxas personalizadas" THEN the system SHALL exibir dois inputs lado a lado, rotulados "Rentabilidade real ao ano (%)" e "Taxa de retirada anual (%)".
3. WHILE as taxas personalizadas estão ativas, the system SHALL manter nenhum dos três perfis marcado e o botão com `aria-pressed="true"`.
4. WHEN o usuário escolhe um perfil (Conservador, Moderado ou Agressivo) THEN the system SHALL ocultar os dois inputs e gravar as taxas da tabela do perfil.

**Independent Test**: Abrir a gaveta, clicar em "Definir taxas personalizadas" e ver os dois inputs; clicar em "Moderado" e vê-los sumir.

---

### P3: Rótulo "Idade da independência"

**User Story**: Como usuário, quero que o campo use o vocabulário do produto, para que a gaveta soe como Vértice / Ápice.

**Why P3**: É copy, sem risco de comportamento.

**Acceptance Criteria**:

1. The system SHALL rotular o campo de idade na gaveta como "Idade da independência" e o slider com o nome acessível "Idade da independência (controle deslizante)".
2. The system SHALL manter o subtítulo do slider no formato "De N a 90 anos".
3. IF a idade da independência está vazia THEN the system SHALL retornar "Informe a idade da independência".
4. IF a idade não é um inteiro de 1 a 90 THEN the system SHALL retornar "A idade da independência deve estar entre 1 e 90".
5. IF a idade é menor ou igual à atual (N) THEN the system SHALL retornar "A idade da independência deve ser maior que a idade atual (N)".

**Independent Test**: Salvar com o campo vazio e ler a mensagem; conferir o rótulo e o nome acessível do slider.

---

## Edge Cases

- IF o resumo não tem prazo (`monthlyCents` nulo) THEN the system SHALL exibir a mesma frase, pois ela usa só renda, retirada e meta.
- WHEN a viewport tem 360 px THEN the system SHALL manter o popover dentro da tela, sem rolagem horizontal.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LGC-01 | P1: Explicação em popover | Specify | Pending |
| LGC-02 | P1: Explicação em popover | Specify | Pending |
| LGC-03 | P1: Explicação em popover | Specify | Pending |
| LGC-04 | P1: Explicação em popover | Specify | Pending |
| LGC-05 | P1: Explicação em popover | Specify | Pending |
| LGC-06 | P1: Explicação em popover | Specify | Pending |
| LGC-07 | P1: Explicação em popover | Specify | Pending |
| LGC-08 | P2: Taxas personalizadas | Specify | Pending |
| LGC-09 | P2: Taxas personalizadas | Specify | Pending |
| LGC-10 | P2: Taxas personalizadas | Specify | Pending |
| LGC-11 | P2: Taxas personalizadas | Specify | Pending |
| LGC-12 | P3: Idade da independência | Specify | Pending |
| LGC-13 | P3: Idade da independência | Specify | Pending |
| LGC-14 | P3: Idade da independência | Specify | Pending |
| LGC-15 | P3: Idade da independência | Specify | Pending |
| LGC-16 | P3: Idade da independência | Specify | Pending |

**Coverage:** 16 total, 0 mapped to tasks, 16 unmapped ⚠️

---

## Success Criteria

- [ ] A altura do hero é idêntica com o popover aberto e fechado.
- [ ] Nenhuma ocorrência de "aposentadoria" na gaveta de `/liberdade` nem nas mensagens de validação do objetivo.
- [ ] Nenhuma palavra solta "Personalizada" na gaveta.
