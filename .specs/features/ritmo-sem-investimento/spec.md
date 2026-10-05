# Ritmo de Gastos sem Investimentos Specification

## Problem Statement

O card "Ritmo de gastos" soma todas as despesas, inclusive aportes em categorias de investimento. Um aporte de R$ 3.000 em Fundos Imobiliários no dia 5 faz a curva disparar e o card exibir "Acima do ritmo ideal", embora aportar no início do mês seja prática recomendada. O ritmo serve para controlar o consumo do dia a dia; misturar aporte gera falso alerta de descontrole.

## Goals

- [ ] Por padrão, o ritmo de gastos considera só despesas de categorias que não são de investimento, e a linha ideal usa só as metas dessas categorias.
- [ ] Um controle no card permite incluir os investimentos no ritmo.
- [ ] Um aporte de investimento no início do mês não gera o rótulo "Acima do ritmo ideal" na visão padrão.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Persistir a escolha do controle (URL, cookie, localStorage) | Mesmo critério da spec resumo-visoes: estado local da sessão da página |
| Alterar o tratamento de investimento na tabela, nas barras, no donut ou nos totais do resumo | Já tratado em tabela-categorias-investimento; escopo só no card de ritmo |
| Marcar categorias como investimento | A flag `isInvestment` já existe no editor de categorias |
| Ritmo por categoria, projeção de fechamento | Fora do pedido |
| Novas consultas ao banco | O ritmo usa as ocorrências e categorias que a página já carrega |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Visão padrão | Só consumo (investimentos fora) | Escolha do usuário | y |
| Controle de inclusão | Controle discreto no cabeçalho do card, rótulo "Incluir investimentos", desligado ao carregar | Escolha do usuário: opção para incluir; "discreto" no pedido | n |
| Meta ideal na visão de consumo | Soma das metas só das categorias que não são de investimento | Comparar consumo contra meta que inclui o aporte esconderia estouro real | n |
| Meta ideal com investimentos incluídos | Soma das metas de todas as categorias (comportamento atual) | Preserva a visão anterior | n |
| Identificação do investimento | Flag `isInvestment` da categoria do lançamento, vigente para todos os meses | Reutiliza a decisão da spec tabela-categorias-investimento | n |
| Despesa sem categoria | Conta como consumo | Não é investimento; não há flag para ler | n |
| Escolha ao trocar de mês | Volta ao padrão (desligado) ao recarregar ou trocar de mês | Persistência fora do escopo | n |
| Mês sem consumo, mas com investimento | Visão padrão mostra "Sem gastos no mês"; com o controle ligado mostra a curva | Mensagem reflete a série exibida | n |
| Meta de consumo igual a zero | Sem linha de referência, como hoje com meta total zero | Regra existente de resumo-visoes | n |
| Rótulo "Acima do ritmo ideal" | Calculado sobre a série exibida | Evita contradizer o gráfico | n |

**Open questions:** none - all resolved or logged above.

Implicit-requirement dimensions: input validation & bounds (categoria sem flag, despesa sem categoria, meta zero, mês só com investimento), state-transition integrity (alternar o controle); remaining dimensions N/A for this scope (apresentação de dados já carregados: sem persistência nova, auth, chamadas externas, concorrência ou expiração).

---

## User Stories

### P1: Ritmo só de consumo por padrão ⭐ MVP

**User Story**: Como usuário, quero que o ritmo de gastos ignore aportes de investimento, para que pagar-me primeiro não pareça descontrole.

**Why P1**: É o falso alerta relatado.

**Acceptance Criteria**:

1. The system SHALL exclude, from the spending pace accumulated curve and its ideal line, expenses of categories marked as investment and the targets of those categories while "Incluir investimentos" is off.
2. WHEN a month has a R$ 3.000 expense on day 5 in an investment category and consumption expenses below the consumption ideal THEN the system SHALL NOT show "Acima do ritmo ideal".
3. The system SHALL count expenses without a category as consumption.
4. WHILE "Incluir investimentos" is off, the ideal line SHALL equal the straight-line share of the sum of targets of the non-investment categories.
5. IF a month has only investment expenses and "Incluir investimentos" is off THEN the system SHALL show "Sem gastos no mês" in place of the chart.
6. IF the sum of targets of the non-investment categories is zero THEN the system SHALL show only the spent curve, without the ideal line.

**Independent Test**: Marcar Fundos Imobiliários como investimento, lançar R$ 3.000 no dia 5 e ver o card sem o rótulo "Acima do ritmo ideal" e sem salto na curva.

---

### P1: Controle para incluir investimentos ⭐ MVP

**User Story**: Como usuário, quero incluir os investimentos no ritmo quando eu quiser ver o total que saiu da conta.

**Why P1**: Foi a opção escolhida; sem ela a visão total some.

**Acceptance Criteria**:

1. The system SHALL show, in the "Ritmo de gastos" card header, a control labeled "Incluir investimentos" that is off on page load.
2. WHEN the user turns on "Incluir investimentos" THEN the system SHALL include investment expenses in the accumulated curve and the targets of investment categories in the ideal line.
3. WHEN the user turns "Incluir investimentos" off THEN the system SHALL return to the consumption-only curve and ideal line.
4. WHEN the month changes THEN the system SHALL reset "Incluir investimentos" to off.
5. The system SHALL compute "Acima do ritmo ideal" from the series currently displayed.

**Independent Test**: Com o aporte de R$ 3.000 no dia 5, ligar o controle e ver a curva saltar no dia 5 e o rótulo "Acima do ritmo ideal" aparecer quando o total passa da meta somada.

---

## Edge Cases

- IF a category has no `isInvestment` value THEN the system SHALL treat it as non-investment.
- IF a month has no expenses at all THEN the system SHALL show "Sem gastos no mês" regardless of the control.
- WHEN "Incluir investimentos" is on and the month has only consumption expenses THEN the system SHALL show the same curve as with it off, with the ideal line using all targets.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PACE-01 | P1: Ritmo só de consumo por padrão (AC 1, 3) | - | Verified |
| PACE-02 | P1: Ritmo só de consumo por padrão (AC 2, 4) | - | Verified |
| PACE-03 | P1: Ritmo só de consumo por padrão (AC 5, 6) | - | Verified |
| PACE-04 | P1: Controle para incluir investimentos (AC 1, 4) | - | Verified |
| PACE-05 | P1: Controle para incluir investimentos (AC 2, 3, 5) | - | Verified |

**Coverage:** 5 total, 5 implemented (no tasks.md; medium scope)

---

## Success Criteria

- [ ] Com um aporte de R$ 3.000 no dia 5 e consumo dentro da meta, o card não mostra "Acima do ritmo ideal" na visão padrão.
- [ ] Ligar "Incluir investimentos" reproduz a curva e o rótulo do comportamento anterior.
