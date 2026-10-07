# Visão Geral: Primeiros Passos e Estados Vazios Specification

## Problem Statement

Um usuário novo cai na Visão Geral (`/`) com três cards "R$ 0,00" em cores fortes, dois blocos vazios sem explicação, filtros sem nada para filtrar, três botões roxos competindo (CTA da categoria, "Nova transação" e o FAB "+") e dois seletores de mês (um em pt-BR e o input nativo em inglês). Nada diz que existe uma ordem de configuração (categorias → transação → Ápice). Primeiro acesso e mês sem lançamentos de quem já tem histórico recebem a mesma tela. Esta feature (VG-01 a VG-18) orienta o primeiro acesso com um checklist, diferencia os estados vazios, neutraliza os zeros e unifica o seletor de mês, sem mudar nenhum cálculo.

## Goals

- [ ] Com o setup incompleto, o topo da tela mostra o card "Comece por aqui" com 3 passos, barra de progresso e exatamente um botão primário (o passo atual).
- [ ] Em qualquer tela da Visão Geral existe no máximo um botão primário preenchido visível por vez no desktop.
- [ ] Sem transações no mês, os cards Receita, Gasto e Saldo usam cor neutra e uma legenda curta, e nenhum filtro, contador ou "0 categorias" aparece.
- [ ] Existe um único seletor de mês, em pt-BR, com setas e seleção direta.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Salvar a "Receita Base Mensal" e mostrar "R$ 0,00 de R$ 5.000 previstos" (item 6 do pedido) | A receita de referência da Alocação é simulação local e não é persistida (receita-referencia-automatica, simulacao-categorias); exibi-la aqui exige novo schema. Fica para feature própria. |
| Botão "Copiar recorrentes do mês anterior" (item 3) | Recorrentes são séries projetadas na leitura (AD-004): já aparecem em todos os meses aplicáveis, não há o que copiar. |
| Avatar "N" sobreposto a "Sair" (item 9) | O layout não tem avatar; o "N" é o indicador de desenvolvimento do `next dev`, ausente em produção. Nada a corrigir no app. |
| Dispensar o card de primeiros passos manualmente | Pedido marca como opcional ("ou pode ser dispensado"); o card some ao completar os 3 passos. |
| Mudar cálculos de resumo, metas, Ápice ou regras de categorias | Pedido é de apresentação. |
| Estado vazio das telas Alocação e Ápice | Já tratados em categorias-estado-vazio e apice-clareza. |
| Testes e2e novos | Suspensos pela AD-005; unit e integration continuam obrigatórios. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Passo 1 "Definir sua receita e categorias" concluído | O usuário tem 1 ou mais categorias ativas | Receita de referência não é persistida; categoria é o que habilita lançamentos | n |
| Passo 2 "Registrar sua primeira transação" concluído | O usuário tem 1 ou mais transações em qualquer mês | "Primeira" é global, não do mês exibido | n |
| Passo 3 "Definir seu Ápice" concluído | Existe objetivo salvo (`goalsRepo.get` ≠ null) | Estado já persistido | n |
| Ordem dos passos | Passos concluídos em qualquer ordem são marcados; o "passo atual" é o primeiro não concluído na ordem 1, 2, 3 | Ordem lógica do pedido | n |
| Visibilidade do card | Aparece em qualquer mês exibido enquanto ao menos 1 dos 3 passos estiver pendente; some quando os 3 estiverem concluídos | Pedido | y |
| Primeiro acesso | Usuário sem nenhuma transação em qualquer mês (global) | Distingue de "histórico, mas mês vazio" | n |
| Mês vazio com histórico | 1 ou mais transações em outro mês, 0 no mês exibido | Pedido, item 3 | y |
| Ação do passo atual | Passo 1 → link `/categorias`; passo 2 → abre o formulário de nova transação; passo 3 → link `/liberdade` | Pedido; passos concluídos e futuros não têm botão primário | n |
| Botão "Ver {mês anterior}" | Link para o mês imediatamente anterior ao exibido, rótulo com o nome do mês em pt-BR minúsculo (ex.: `Ver setembro`) | Pedido, item 3 | n |
| Texto do mês vazio | Título `Nenhuma transação em {mês}` (ex.: `Nenhuma transação em outubro`); mês sem o ano | Texto do pedido; L-002 exige texto exato | y |
| Legendas dos cards no estado vazio | Receita: `Registre receitas para ver aqui`; Gasto: `Registre gastos para ver aqui`; Saldo: `Receitas menos gastos do mês` | Pedido pede legenda curta; textos fixados para teste | n |
| Valor no estado vazio | Cards mostram `R$ 0,00` em cor neutra (`text-foreground`/`text-muted-foreground`), ícones neutros; "—" não é usado | Mantém `data-testid` e formato numérico estáveis | n |
| "Estado vazio dos cards" | Mês exibido com 0 transações aplicáveis (inclui recorrentes projetadas) | Alinha com AD-004 | n |
| FAB "+" | Visível só abaixo de `md`; o botão "Nova transação" do cabeçalho do card continua só de `md` para cima | Pedido, item 2; já é a regra atual do botão de cabeçalho | y |
| Hierarquia primária | No estado vazio, só o botão do passo atual é preenchido; "Nova transação" do cabeçalho e o FAB ficam `outline` enquanto houver passo pendente; sem passos pendentes voltam ao estilo preenchido atual | Pedido, item 2 | n |
| Seletor de mês | O `Input type="month"` nativo é removido; o nome do mês vira botão que abre um seletor próprio em pt-BR (grade de 12 meses com setas de ano), mantendo `?mes=AAAA-MM` e o `data-testid="month-label"` | Pedido, item 8; nativo segue o locale do navegador e não é controlável | n |
| Explicação das seções | Gastos por categoria: `Veja para onde vai seu dinheiro, comparado com o que você planejou.`; Transações do mês: `Todas as receitas e gastos do mês aparecem aqui.` | Pedido, item 5 | n |
| Contadores | `{n} categorias` e `{n} lançamentos` só aparecem quando n > 0 | Pedido, item 10 | y |
| Filtros | Busca, filtro de categoria e de subcategoria só aparecem quando o mês exibido tem 1 ou mais transações; com filtro ou busca ativos e 0 resultados continuam visíveis | Pedido, item 4; sem isso o usuário não consegue limpar o filtro | n |
| Botão "Crie sua primeira categoria" em Gastos por categoria | Removido quando o card de primeiros passos está visível (o passo 1 já leva a `/categorias`); sem categorias e sem card, vira `outline` | Evita duplicar o CTA | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Checklist de primeiros passos ⭐ MVP

**User Story**: Como usuário novo, quero ver a ordem de configuração e qual é o próximo passo para saber por onde começar.

**Why P1**: É o centro do pedido; sem ele os demais estados continuam sem direção.

**Acceptance Criteria**:

1. WHILE ao menos 1 dos 3 passos estiver pendente, the Visão Geral SHALL exibir, acima dos cards de totais, o card "Comece por aqui" com os passos `Definir sua receita e categorias`, `Registrar sua primeira transação` e `Definir seu Ápice`. <!-- VG-01 -->
2. The card "Comece por aqui" SHALL exibir uma barra `role="progressbar"` com `aria-valuenow` igual ao número de passos concluídos (0 a 3), `aria-valuemax` 3 e o texto `{n} de 3 passos`. <!-- VG-02 -->
3. WHEN um passo estiver concluído THEN the card SHALL marcá-lo com ícone de check e texto acessível `concluído`, sem botão. <!-- VG-03 -->
4. WHILE existir passo pendente, the card SHALL exibir exatamente um botão primário preenchido, no primeiro passo pendente, com a ação definida em Assumptions. <!-- VG-04 -->
5. WHEN os 3 passos estiverem concluídos THEN the Visão Geral SHALL não renderizar o card "Comece por aqui". <!-- VG-05 -->
6. The função de derivação do checklist SHALL ser pura (entrada: nº de categorias ativas, nº de transações no total, existência de objetivo; saída: passos, concluídos e passo atual) e coberta por teste unitário. <!-- VG-06 -->

**Independent Test**: Conta nova → card com `0 de 3 passos` e "Definir sua receita e categorias" com botão primário; criar categoria → `1 de 3`, botão no passo 2.

---

### P1: Estados vazios distintos e hierarquia de botões

**User Story**: Como usuário, quero mensagens diferentes para primeiro acesso e para mês sem lançamentos, e um único botão primário.

**Why P1**: Itens 2, 3 e 5 do pedido; evita ação ambígua.

**Acceptance Criteria**:

1. WHILE o usuário não tem nenhuma transação em qualquer mês, the bloco "Transações do mês" SHALL exibir a linha `Todas as receitas e gastos do mês aparecem aqui.` e não exibir o texto `Nenhuma transação neste mês`. <!-- VG-07 -->
2. WHILE o usuário tem transações em outro mês e 0 no mês exibido, the bloco "Transações do mês" SHALL exibir `Nenhuma transação em {mês}` com os botões `Nova transação` e `Ver {mês anterior}`. <!-- VG-08 -->
3. WHEN o usuário aciona `Ver {mês anterior}` THEN the Visão Geral SHALL navegar para `?mes=` do mês imediatamente anterior ao exibido. <!-- VG-09 -->
4. WHILE existir passo pendente no checklist, the botões "Nova transação" (cabeçalho) e o FAB SHALL usar a variante `outline`. <!-- VG-10 -->
5. The FAB "+" SHALL ser visível apenas abaixo do breakpoint `md`. <!-- VG-11 -->
6. WHILE o mês exibido não tem categorias, the bloco "Gastos por categoria" SHALL exibir a linha `Veja para onde vai seu dinheiro, comparado com o que você planejou.` e não exibir botão preenchido. <!-- VG-12 -->

**Independent Test**: Conta sem transações → texto de primeiro acesso; conta com transação em setembro vendo outubro → "Nenhuma transação em outubro" e "Ver setembro".

---

### P2: Cards neutros, sem filtros ou contadores no vazio

**User Story**: Como usuário, quero que um mês vazio não pareça um dado real nem um alerta.

**Why P2**: Itens 4, 7 e 10; polimento visual sobre a base do P1.

**Acceptance Criteria**:

1. WHILE o mês exibido tem 0 transações, the cards Receita, Gasto e Saldo SHALL renderizar `R$ 0,00` em cor neutra (nenhuma das classes `text-income`, `text-destructive` ou `text-link`) com a legenda definida em Assumptions. <!-- VG-13 -->
2. WHEN o mês exibido tem 1 ou mais transações THEN the cards SHALL manter as cores atuais (Receita verde, Gasto vermelho, Saldo roxo ou vermelho se negativo). <!-- VG-14 -->
3. WHILE o mês exibido tem 0 transações e não há filtro nem busca ativos, the Visão Geral SHALL não renderizar busca, filtro de categoria nem de subcategoria. <!-- VG-15 -->
4. WHERE `n` (categorias ou lançamentos) for 0, the notas `{n} categorias` e `{n} lançamentos` SHALL não ser renderizadas. <!-- VG-16 -->

**Independent Test**: Mês vazio → sem campo de busca, cards cinza; lançar uma receita → card Receita verde e filtros aparecem.

---

### P2: Seletor de mês único em pt-BR

**User Story**: Como usuário, quero um único controle de mês em português.

**Why P2**: Item 8; independente do restante.

**Acceptance Criteria**:

1. The MonthPicker SHALL renderizar um único controle de mês, sem `input[type=month]` nativo. <!-- VG-17 -->
2. WHEN o usuário clica no nome do mês THEN the MonthPicker SHALL abrir um seletor com os 12 meses do ano exibido em pt-BR (`Janeiro` a `Dezembro`) e setas de ano anterior e próximo; WHEN escolhe um mês THEN SHALL navegar para `?mes=AAAA-MM` preservando os demais parâmetros e fechar o seletor. <!-- VG-18 -->
3. IF a escolha for o mês já exibido THEN the MonthPicker SHALL fechar o seletor sem navegar. <!-- VG-19 -->

**Independent Test**: Clicar em "Outubro de 2026", escolher "Março" → URL `?mes=2026-03`; setas Mês anterior/Próximo continuam funcionando.

---

## Edge Cases

- IF o usuário tem transações apenas em meses futuros e vê um mês passado vazio THEN the Visão Geral SHALL tratar como "mês vazio com histórico" (não primeiro acesso).
- IF `?mes=` for inválido THEN the Visão Geral SHALL manter o fallback atual para o mês corrente (`parseMonth`).
- WHEN há filtro ou busca ativos e 0 resultados THEN the Visão Geral SHALL manter a mensagem atual de filtro/busca e os controles visíveis.
- IF o mês anterior ao exibido cruza o ano (janeiro) THEN `Ver {mês anterior}` SHALL apontar para dezembro do ano anterior.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| VG-01 | P1: Checklist | Specify | Implementing |
| VG-02 | P1: Checklist | Specify | Implementing |
| VG-03 | P1: Checklist | Specify | Implementing |
| VG-04 | P1: Checklist | Specify | Implementing |
| VG-05 | P1: Checklist | Specify | Implementing |
| VG-06 | P1: Checklist | Specify | Implementing |
| VG-07 | P1: Estados vazios e hierarquia | Specify | Implementing |
| VG-08 | P1: Estados vazios e hierarquia | Specify | Implementing |
| VG-09 | P1: Estados vazios e hierarquia | Specify | Implementing |
| VG-10 | P1: Estados vazios e hierarquia | Specify | Implementing |
| VG-11 | P1: Estados vazios e hierarquia | Specify | Implementing |
| VG-12 | P1: Estados vazios e hierarquia | Specify | Pending |
| VG-13 | P2: Cards neutros e sem ruído | Specify | Implementing |
| VG-14 | P2: Cards neutros e sem ruído | Specify | Implementing |
| VG-15 | P2: Cards neutros e sem ruído | Specify | Pending |
| VG-16 | P2: Cards neutros e sem ruído | Specify | Pending |
| VG-17 | P2: Seletor de mês | Specify | Implementing |
| VG-18 | P2: Seletor de mês | Specify | Implementing |
| VG-19 | P2: Seletor de mês | Specify | Implementing |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped ⚠️

---

## Success Criteria

- [ ] Conta nova vê um único botão primário e a ordem dos 3 passos.
- [ ] Mês vazio de quem tem histórico mostra `Nenhuma transação em {mês}` com saída para o mês anterior.
- [ ] A tela não mostra `input[type=month]`, nem filtros, nem contadores zerados no estado vazio.
