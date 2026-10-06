# Liberdade: Copy Financeira e Hierarquia do Hero Specification

## Problem Statement

A tela `/liberdade` (Ápice) ainda usa linguagem que soa como promessa ("taxa de retirada segura", "sem consumir o principal", "Gera R$ X/mês"), repete informação que o Hero já mostra ("Distância do Alvo") e esconde a ligação entre aporte, meta e idade. Na gaveta, o formulário vazio abre com a taxa de retirada 6% associada a 8% de rentabilidade, par que não é um preset (o preset moderado é 8% → 5%), e o seletor não deixa explícito que 6%, 8% e 10% são taxas reais. Esta feature é polimento de copy e hierarquia; não muda cálculo nem layout.

## Goals

- [ ] Nenhum texto de `/liberdade` afirma taxa segura, renda garantida ou preservação do principal; a taxa de retirada é sempre "inicial".
- [ ] No cenário de aceite (R$ 20.000/mês, R$ 565.000 guardados, 8% real, retirada 5%, ápice aos 48), o Hero mostra "R$ 4.800.000,00", "R$ 9.027,19 / mês", "para alcançar R$ 4,8 mi aos 48 anos" e "14 anos e 11 meses".
- [ ] O gráfico informa o valor absoluto e a proporção dos rendimentos, calculados do resumo.
- [ ] A gaveta mostra cada cenário como "N% real a.a." com "Retirada: M% a.a." e só marca "personalizado" quando o par digitado não é um preset.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar presets (6→4, 8→5, 10→6), faixa 1% a 15%, fórmulas de aporte, juros ou prazo | Regras financeiras intencionais; o pedido é só de copy e hierarquia. |
| Explicar a diferença entre rentabilidade e retirada (ex.: "8% − 5% = 3%") | Pedido explícito de não criar. |
| Reorganizar o Hero, a barra de marcos, o gráfico ou a gaveta | A arquitetura visual atual permanece. |
| Marcos 25/50/75/100% da meta, "(Meta)" no último marco e "Como calculamos?" recolhido | Já atendidos (ver tabela abaixo); não mexer. |
| Linha "Patrimônio necessário" no detalhamento | Já não existe no Hero nem na gaveta. |
| Novas premissas personalizáveis (inflação, aportes) | O rótulo "Personalizar premissas" só antecipa; o comportamento atual não muda. |
| Mudar nomes de campos, colunas, chaves de dados ou persistência | Só texto exibido e o valor inicial do formulário. |

### Pontos do pedido já atendidos (verificados no código)

| Ponto | Onde está atendido |
| ----- | ------------------ |
| 1, 16, 17, 20 (regras, sem "8% − 5%", arquitetura, matemática) | `PRESET_RATES` em `src/lib/domain/freedom.ts`; nenhuma explicação de diferença de taxas; mesma estrutura de componentes |
| 5 (sem "Patrimônio necessário") | `goal-hero.tsx` mostra só "acumulados (x% do alvo)" |
| 9 (marcos dinâmicos) | `buildCheckpoints` com 25/50/75/100% da meta e "(Meta)" no último (`checkpointLabel`) |
| 12 (legenda "real") | `RATE_HINT` = "Taxa real estimada (descontada da inflação)" |
| 15 (popover recolhido) | `Popover` do Radix, fechado por padrão |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Ponto 6 x ponto 10 (como mostrar o prazo) | O card de aporte segue a ordem do ponto 10: título, valor, "para alcançar R$ 4,8 mi aos 48 anos", e por último "Você chega ao Ápice em: 14 anos e 11 meses" | O ponto 10 é o mais específico; o ponto 6 fornece o rótulo do prazo | y |
| "Distância do Alvo" | Removida, sem substituto "Faltam R$ …" | Preferência declarada no ponto 7; o Hero já mostra acumulado e percentual | n |
| Meta no "para alcançar" | Valor compacto de `formatCompactBRL` ("R$ 4,8 mi"), idade em anos completos do ápice | Exemplo do ponto 10 | n |
| `months` = 0 | As linhas "para alcançar…" e "Você chega ao Ápice em…" não aparecem. Se o guardado já alcança a meta (aporte R$ 0,00), o card mostra "R$ 0,00 / mês" e a linha "Meta alcançada"; se não alcança, mostra "Prazo encerrado" e nenhuma linha extra | Decisão do usuário: ocultar as linhas de prazo e mostrar "Meta alcançada"; esse texto com a meta não atingida seria falso, então só aparece quando `monthlyCents` é 0 | y |
| Indicador do gráfico | Dois textos na mesma pílula do cabeçalho: "R$ 2,6 mi vêm dos rendimentos" e "55% do patrimônio final", separados por " · ". Valor = `interestCents` do último ponto da linha do tempo; percentual = `interestSharePct` já existente | Pontos 8 e 20; mesmo cálculo de hoje, só novo texto | n |
| Idade no resumo | `GoalSummary` ganha o campo `retirementAge` copiado do objetivo, só para exibição | O Hero hoje não tem a idade; não altera nenhum cálculo | n |
| Retirada no seletor da gaveta | Mantém o texto atual "Retirada: X% a.a." (sem "inicial") para não quebrar linha na coluna de um terço; só a linha da rentabilidade ganha "real" | Decisão do usuário; "inicial" fica nos textos do Hero e do popover, onde há espaço | y |
| Estado "personalizado" | Não existe um selo "Personalizada" no código; o estado é o botão "Personalizar premissas" realçado e nenhum cenário marcado. Passa a valer só quando o par digitado não é um preset | Pedido do ponto 14 | n |
| Abrir os campos de taxa | Clicar em "Personalizar premissas" mostra os dois campos; escolher um cenário os esconde, como hoje. Com os campos abertos e o par igual a um preset, o cenário fica marcado e o botão não fica realçado | Ponto 14 pede só não mostrar "personalizada" quando o par é de um preset | n |
| Valor inicial do formulário vazio | Retirada inicial "5" (par 8% → 5%, preset Moderado), em vez de "6" | "6" com 8% não é preset e abria o formulário vazio em modo personalizado; "5" respeita a regra do ponto 1 | n |
| Goals já salvos com 8% e retirada 6% | Continuam válidos e abrem em modo personalizado | São valores personalizados de fato; sem migração | n |
| Termos proibidos nos textos | Raízes "segur", "perpétu", "garantid", "vitalíc", "consumir", "principal" e a expressão "vai gerar" não aparecem; "garantia" aparece só na negação do aviso do popover | Ponto 19 | n |
| Pílula do Hero com retirada decimal | Taxa formatada por `formatRate` (6,5% → "6,5%") | Comportamento atual preservado | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: failure states (months = 0, LCH-05; total zero sem percentual, LCH-06), input validation (par digitado igual a preset, LCH-09), state-transition (cenário ↔ personalizado, LCH-09 e LCH-10); auth, concurrency, idempotency, data lifecycle, observability and external-dependency failure N/A because a feature não muda gravação, dados nem chamadas externas.

---

## User Stories

### P1: Copy sem promessa e hierarquia do Hero ⭐ MVP

**User Story**: As a usuário, I want ler a meta, o aporte e a idade em poucos segundos, com textos que tratam tudo como projeção, so that eu não confunda a simulação com garantia.

**Why P1**: É o que o usuário vê primeiro e onde está o risco de promessa indevida.

**Acceptance Criteria**:

1. The system SHALL render the Hero pill as "Renda de {renda}/mês · retirada inicial de {taxa} a.a." (ex.: "Renda de R$ 20.000,00/mês · retirada inicial de 5% a.a.").
2. The system SHALL render the "Como calculamos?" sentence as "Com uma renda de {renda}/mês ({renda × 12}/ano) e uma taxa de retirada inicial de {taxa} a.a., o patrimônio-alvo é de {meta}." (ex.: "…R$ 20.000,00/mês (R$ 240.000,00/ano) e uma taxa de retirada inicial de 5% a.a., o patrimônio-alvo é de R$ 4.800.000,00.").
3. The system SHALL render the "Como calculamos?" notice as "A simulação utiliza rentabilidade real, já descontada da inflação. Os valores são projeções e não representam garantia de rentabilidade ou de renda futura."
4. WHILE the Hero shows a summary with `months` greater than 0, the Aporte Estratégico Mensal card SHALL show, in this order, the title "Aporte Estratégico Mensal", the deposit "{valor} / mês", the line "para alcançar {meta compacta} aos {idade} anos" and the line "Você chega ao Ápice em: {prazo}".
5. IF `months` is 0 THEN the Aporte Estratégico Mensal card SHALL omit the "para alcançar" and "Você chega ao Ápice em" lines.
6. IF `months` is 0 and `monthlyCents` is 0 THEN the Aporte Estratégico Mensal card SHALL show the line "Meta alcançada" below the deposit.
7. IF `months` is 0 and `monthlyCents` is null THEN the Aporte Estratégico Mensal card SHALL show "Prazo encerrado" and SHALL NOT show "Meta alcançada".
8. The system SHALL NOT render "Distância do Alvo", "Tempo até o Ápice" or "Patrimônio necessário" anywhere on `/liberdade`.

**Independent Test**: Com o cenário de aceite, abrir `/liberdade`: pílula "Renda de R$ 20.000,00/mês · retirada inicial de 5% a.a."; card com "R$ 9.027,19 / mês", "para alcançar R$ 4,8 mi aos 48 anos" e "Você chega ao Ápice em: 14 anos e 11 meses"; abrir "Como calculamos?" e ler as duas frases novas.

---

### P1: Indicador de rendimentos no gráfico ⭐ MVP

**User Story**: As a usuário, I want ver quanto do patrimônio final vem dos rendimentos, em reais e em percentual, so that eu entenda o peso dos juros compostos.

**Why P1**: Pedido central do ponto 8; reaproveita dados já calculados.

**Acceptance Criteria**:

1. WHEN the chart has a timeline THEN the system SHALL render "{interestCents do último ponto, compacto} vêm dos rendimentos · {interestSharePct}% do patrimônio final" in the chart header pill (ex.: "R$ 2,6 mi vêm dos rendimentos · 55% do patrimônio final").
2. The system SHALL derive the amount and the percentage from the summary at render time and SHALL NOT hardcode either value.
3. The system SHALL use the same text in the chart's accessible label (`aria-label` do `figure`).
4. IF `interestSharePct` is null THEN the system SHALL render the amount without the percentage and without the " · " separator.

**Independent Test**: Com o cenário de aceite, o cabeçalho do gráfico mostra o valor compacto e o percentual; mudar a idade na gaveta muda ambos.

---

### P2: Gaveta: cenários explícitos e "Personalizar premissas"

**User Story**: As a usuário, I want ver que 6%, 8% e 10% são taxas reais e que a retirada é inicial, e personalizar sem ver "personalizada" num cenário padrão, so that eu escolha o cenário sem ambiguidade.

**Why P2**: Esclarece a premissa, mas a tela principal já funciona sem isso.

**Acceptance Criteria**:

1. The system SHALL render the three scenario options in the drawer as "Conservador / 6% real a.a. / Retirada: 4% a.a.", "Moderado / 8% real a.a. / Retirada: 5% a.a." and "Agressivo / 10% real a.a. / Retirada: 6% a.a.".
2. The system SHALL render the text button below the scenarios as "Personalizar premissas".
3. WHEN the typed rentabilidade and retirada pair equals a preset pair THEN the system SHALL mark that scenario as selected and SHALL NOT highlight the "Personalizar premissas" button.
4. WHEN the typed pair matches no preset THEN the system SHALL mark no scenario and SHALL highlight the "Personalizar premissas" button.
5. WHEN the user opens the form with no saved goal THEN the system SHALL start with rentabilidade 8 and retirada 5 and mark the Moderado scenario.
6. The system SHALL keep the legend "Taxa real estimada (descontada da inflação)" above the scenarios.
7. The system SHALL render each scenario option in three lines (título, rentabilidade, retirada) without clipping text or causing horizontal scroll at a 320 px viewport.

**Independent Test**: Abrir "Definir objetivo" sem objetivo salvo: Moderado marcado, "Personalizar premissas" sem destaque; digitar retirada 6 com 8%: nenhum cenário marcado e botão realçado; digitar 5: Moderado volta a ser marcado.

---

### P2: Linguagem de projeção protegida por teste

**User Story**: As a mantenedor, I want que os textos de `/liberdade` não voltem a prometer renda ou taxa segura, so that a regra de copy não dependa de revisão manual.

**Why P2**: Evita regressão do ponto 19.

**Acceptance Criteria**:

1. The system SHALL NOT include the roots "segur", "perpétu", "garantid", "vitalíc", "consumir" or "principal", nor the phrase "vai gerar", in the pill, the "Como calculamos?" sentence and notice, the Hero lines and the rate legend and titles.
2. The system SHALL keep every figure returned by `summarize` (meta, aporte, prazo, progresso, marcos, linha do tempo) identical to the values before this feature for the same input.

**Independent Test**: A suíte de `freedom-copy.test.ts` falha se um texto reintroduz uma raiz proibida; a suíte de `freedom.test.ts` segue verde sem alteração de expectativas numéricas.

---

## Edge Cases

- IF the goal is already reached (`savedCents` ≥ meta, aporte R$ 0,00 e `months` > 0) THEN the system SHALL show "R$ 0,00 / mês", "para alcançar {meta} aos {idade} anos" and the term line as for any other goal.
- IF `retirementAge` has a single year left (`months` = 12) THEN the system SHALL render "Você chega ao Ápice em: 1 ano" using `formatTerm`.
- IF the saved goal has a non-preset pair (ex.: 8% e 6%) THEN the system SHALL open the drawer with no scenario marked and "Personalizar premissas" highlighted.
- IF the rate is fractional (ex.: 6,5%) THEN the system SHALL render it without trailing zeros ("6,5%") in the pill and in the "Como calculamos?" sentence.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LCH-01 | P1: Copy e hierarquia (pílula do Hero, AC 1) | Specify | Implemented |
| LCH-02 | P1: Copy e hierarquia ("Como calculamos?", AC 2 e 3) | Specify | Implemented |
| LCH-03 | P1: Copy e hierarquia (card de aporte, AC 4) | Specify | Pending |
| LCH-04 | P1: Copy e hierarquia (itens removidos, AC 8) | Specify | Pending |
| LCH-05 | P1: Copy e hierarquia (months = 0, AC 5 a 7) | Specify | Pending |
| LCH-06 | P1: Indicador de rendimentos (AC 1 a 4) | Specify | Pending |
| LCH-07 | P2: Gaveta (cenários e quebra de linha, AC 1 e 7) | Specify | Pending |
| LCH-08 | P2: Gaveta (rótulo do botão e legenda, AC 2 e 6) | Specify | Pending |
| LCH-09 | P2: Gaveta (estado personalizado, AC 3 e 4) | Specify | Pending |
| LCH-10 | P2: Gaveta (valor inicial 8% → 5%, AC 5) | Specify | In Progress |
| LCH-11 | P2: Linguagem protegida por teste (AC 1) | Specify | Implemented |
| LCH-12 | P2: Linguagem protegida por teste (matemática preservada, AC 2) | Specify | Implemented |

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️ (tasks vêm depois do Specify)

---

## Success Criteria

- [ ] No cenário de aceite o Hero mostra R$ 4.800.000,00, R$ 9.027,19 / mês, "para alcançar R$ 4,8 mi aos 48 anos", "14 anos e 11 meses", R$ 565.000,00 acumulados (11,8% do alvo) e a barra termina em "R$ 4,8 mi (Meta)".
- [ ] A explicação mostra "R$ 240.000/ano" e a meta de R$ 4.800.000,00 sem as palavras "segura" ou "principal".
- [ ] `npm test` (unit) passa com `freedom.test.ts` sem mudança de expectativa numérica.
- [ ] Formulário vazio abre com Moderado marcado.
