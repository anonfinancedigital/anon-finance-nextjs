# Tabela de Categorias: Percentual Limpo e Investimento Specification

## Problem Statement

Na tabela de gastos por categoria, o percentual aparece com até 6 casas (31,931878%), o que polui a leitura. Além disso, uma categoria de investimento (Liberdade Financeira) que passa da meta é marcada em vermelho com "Estourou R$ 12,90", tratando um aporte maior como erro. O app não distingue investimento de despesa.

## Goals

- [ ] A coluna Percentual da tabela mostra no máximo 1 casa decimal.
- [ ] Categorias marcadas como investimento nunca aparecem em vermelho nem com texto de estouro ao passar da meta.
- [ ] O usuário marca/desmarca uma categoria como investimento no editor de categorias.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar o formato do percentual no editor de categorias | O editor precisa das 6 casas (AD-006) |
| Sub-linhas de subcategoria (já usam `formatShare`, 1 casa) | Já atendem |
| Seletor de mês duplicado, redundância tabela×gráfico, filtros e ações de transações (itens 1, 3 e 4 do backlog) | Fora do pedido; features separadas |
| Tratar investimento diferente em simulação, liberdade financeira ou totais | Escopo só na tabela e no gráfico de categorias |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Como identificar investimento | Flag booleana `isInvestment` por categoria, editável no editor de categorias | Escolha do usuário; nome é frágil | y |
| Visual do estouro de investimento | Verde, sem fundo vermelho, texto "Excedeu a meta em R$ X" | Escolha do usuário | y |
| Formato do percentual | Até 1 casa decimal, sem ",0" quando inteiro (30% → "30%", 31,931878% → "31,9%") | Escolha do usuário; "até 1" evita ruído | y |
| Arredondamento | Meio para cima na 1ª casa (Intl pt-BR, `maximumFractionDigits: 1`) | Padrão do `Intl.NumberFormat` | n |
| Valor por mês ou global | A flag é da categoria e vale para todos os meses (sem vigência) | Tipo da categoria não muda a meta histórica; evita complexidade da AD-007 | n |
| Categorias existentes após a migração | Todas começam como `false` (despesa); o usuário marca Liberdade Financeira | Não há como inferir com segurança | n |
| Percentual da meta abaixo de 0,05% | Mostra "0,1%" ou "0%" conforme o arredondamento; sem piso mínimo | Metas mínimas são 0,000001%, caso raro | n |
| Gráfico "Gasto × meta" | Aplica a mesma regra: sem rótulo "Estourou" e sem cor de estouro para investimento | Evita contradizer a tabela na mesma tela | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Percentual legível ⭐ MVP

**User Story**: Como usuário, quero ver o percentual da categoria com no máximo uma casa decimal para ler a tabela sem ruído.

**Why P1**: Pedido direto, mudança isolada e sem dados novos.

**Acceptance Criteria**:

1. WHEN a tabela exibe uma categoria com percentual de 31.931.878 micro-percent THEN the system SHALL mostrar "31,9%" na coluna Percentual.
2. WHEN a categoria tem percentual de 30.000.000 micro-percent THEN the system SHALL mostrar "30%" (sem casa decimal).
3. WHEN a categoria tem percentual de 12.500.000 micro-percent THEN the system SHALL mostrar "12,5%".
4. WHEN a categoria tem percentual de 100.000.000 micro-percent THEN the system SHALL mostrar "100%".
5. The editor de categorias SHALL continuar exibindo o percentual com até 6 casas decimais (12.500.000 → "12,5%"; 31.931.878 → "31,931878%").

**Independent Test**: Abrir o resumo com uma categoria a 31,931878% e ler "31,9%" na tabela; abrir o editor e ler "31,931878".

---

### P1: Investimento acima da meta é positivo ⭐ MVP

**User Story**: Como usuário, quero marcar uma categoria como investimento e vê-la em verde ao passar da meta, para não confundir aporte maior com gasto estourado.

**Why P1**: É o ponto principal do pedido e exige o campo novo.

**Acceptance Criteria**:

1. WHEN o usuário cria ou edita uma categoria THEN the system SHALL oferecer a opção "Investimento / aporte" e salvar o valor escolhido (padrão desmarcado).
2. WHEN o usuário reabre uma categoria salva como investimento THEN the system SHALL mostrá-la marcada.
3. WHILE uma categoria de investimento tem gasto maior que a meta, the system SHALL exibir a linha sem fundo vermelho e `data-overspent="false"`.
4. WHILE uma categoria de investimento tem gasto maior que a meta, the system SHALL exibir o texto "Excedeu a meta em R$ X" (X = gasto − meta, formato `formatBRL`) no lugar de "Estourou R$ X".
5. WHILE uma categoria de investimento tem gasto maior que a meta, the system SHALL exibir a coluna Restante e a barra de Consumo na cor de receita (`text-income` / `bg-income`), nunca em `destructive`.
6. WHILE uma categoria de despesa (não investimento) tem gasto maior que a meta, the system SHALL manter o comportamento atual: fundo `bg-destructive/5`, `data-overspent="true"`, "Estourou R$ X" e cor `destructive`.
7. WHILE uma categoria de investimento tem gasto menor ou igual à meta, the system SHALL exibir o mesmo que uma despesa dentro da meta (sem texto adicional).
8. WHEN o gráfico "Gasto × meta por categoria" exibe uma categoria de investimento acima da meta THEN the system SHALL omitir o rótulo "Estourou" e usar a cor de gasto normal na barra.
9. The system SHALL manter o texto "Excedeu a meta em R$ X" e "Estourou R$ X" mutuamente exclusivos por categoria.

**Independent Test**: Marcar Liberdade Financeira como investimento, lançar gasto acima da meta e ver verde + "Excedeu a meta em R$ 12,90"; uma categoria de despesa estourada continua vermelha.

---

## Edge Cases

- WHEN o gasto de uma categoria de investimento é exatamente igual à meta THEN the system SHALL não exibir texto de excesso.
- WHEN uma categoria de investimento tem meta 0 e gasto maior que 0 THEN the system SHALL exibir "Excedeu a meta em R$ X" com X = gasto.
- WHEN o usuário desmarca o investimento de uma categoria estourada THEN the system SHALL voltar a exibi-la em vermelho com "Estourou R$ X" nos meses já registrados (a flag vale para todos os meses).
- IF a migração roda com categorias existentes THEN the system SHALL definir `isInvestment = false` em todas.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CATINV-01 | P1: Percentual legível (AC 1-4) | Verified | Done |
| CATINV-02 | P1: Percentual legível (AC 5) | Verified | Done |
| CATINV-03 | P1: Investimento (AC 1-2, edge migração) | Verified | Done |
| CATINV-04 | P1: Investimento (AC 3-5, 7, 9, edges) | Verified | Done |
| CATINV-05 | P1: Investimento (AC 6) | Verified | Done |
| CATINV-06 | P1: Investimento (AC 8) | Verified | Done |

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Nenhum percentual da coluna Percentual tem mais de 1 casa decimal.
- [ ] Nenhuma categoria marcada como investimento aparece em vermelho ou com "Estourou".
- [ ] Categorias de despesa estouradas continuam idênticas ao comportamento atual.
