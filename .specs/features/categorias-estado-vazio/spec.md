# Categorias: Estado Vazio e Hierarquia Specification

## Problem Statement

Na primeira visita à tela Alocação (sem categorias), o usuário vê uma tabela de 6 colunas vazia, uma linha "Soma 0,00%", um erro vermelho "A soma deve ser 100%. Atual: 0,00%", os controles "Acrescentar a diferença em" e "Rebalancear" sem função e um botão Salvar roxo desabilitado que domina o botão realmente disponível ("Adicionar categoria", outline, no fim da página). A tela acusa um erro que o usuário não cometeu e não diz o que fazer. Esta feature dá à tela um estado vazio orientado, move a validação para depois da primeira ação e corrige alinhamento, cabeçalhos, campo de receita, contraste e larguras.

## Goals

- [ ] Com 0 categorias a tela mostra um bloco de estado vazio com uma frase de instrução e o botão primário "Adicionar primeira categoria", e nenhum erro, tabela, rebalanceamento ou Salvar.
- [ ] Nenhuma mensagem de erro de soma aparece antes de existir ao menos 1 categoria.
- [ ] A regra dos 100% aparece em uma única frase de instrução fora do aviso de soma.
- [ ] A linha Soma fica alinhada às colunas Alocação (%) e Valor Previsto (R$).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar a regra de salvar (soma exatamente 100%), armazenamento, vigência ou validação de percentual | Pedido é só de apresentação (AD-006, AD-007 continuam) |
| Mudar o texto do aviso de soma, o cálculo do ajuste ou o select de ajuste quando há 2+ categorias | Já definido em categorias-ux; só muda quando o controle aparece |
| Ícone de erro em mensagens por campo (nome, percentual, valor) | O pedido cita o erro de soma; campos já ficam com `aria-invalid` |
| Salvar a receita de referência | Continua simulação local |
| Teste e2e novo | Suspenso pela AD-005 |
| Estado vazio das telas Resumo, Liberdade e transações | Pedido é só da tela Alocação |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Definição de "estado vazio" | 0 linhas no editor, inclusive quando o usuário remove a última categoria antes de salvar | O editor é local até Salvar; o mesmo estado vale nos dois casos | n |
| Texto do estado vazio | `Você ainda não tem categorias. Crie a primeira para começar a distribuir sua receita.` e botão `Adicionar primeira categoria` | Texto do pedido; L-002 exige texto exato | y |
| Indicador de progresso | Barra com `role="progressbar"` e texto `{soma} de 100% alocado` (ex.: `0% de 100% alocado`, `40,00% de 100% alocado`), visível com 0 ou mais linhas, em cor neutra; barra limitada a 100% de largura quando a soma passa de 100% | Pedido do usuário; "0%" sem casas decimais quando a soma é 0 | n |
| Aviso de soma com 1+ categoria | Continua o aviso atual (`A soma deve ser 100%. Atual: ...`) em vermelho, agora com ícone, só com 1+ linhas e soma ≠ 100% | Pedido: erro só depois da primeira categoria; ícone para não depender só da cor | n |
| Controle de ajuste (select + Rebalancear) | Aparece só com 2+ linhas e soma ≠ 100%; com 1 linha só o aviso de soma | Pedido: esconder até existirem 2 categorias | y |
| Botão Salvar com 0 linhas | Não é renderizado | Pedido aceita ocultar; evita botão desabilitado sem explicação | n |
| Botão Salvar com 1+ linhas e desabilitado | Permanece visível, com `title` e descrição acessível `Some 100% para salvar` quando a soma ≠ 100% | Pedido: explicar o motivo | n |
| Hierarquia dos botões com 1+ linhas | "Adicionar categoria" continua outline e vai para logo abaixo da tabela, dentro do card; Salvar fica no rodapé da tela | Pedido de proximidade (item 5); a inversão de cor só foi pedida para o estado vazio | n |
| Instrução única | Remove o subtítulo `Alocação total obrigatória: 100% da receita`; fica `Defina quanto da receita do mês vai para cada categoria. A soma deve ser 100%.` | Pedido: uma frase basta; o aviso de soma é feedback, não instrução | n |
| Linha Soma | Fica dentro do card da tabela, com "Soma" na coluna Categoria, o percentual na coluna Alocação (%) e o total em R$ na coluna Valor Previsto (R$) (`—` sem receita de referência, como hoje); some junto com a tabela no estado vazio | Alinha com os mesmos `COL_*` das linhas | n |
| Cabeçalhos | Primeira coluna: `COR`; `AÇÕES` com o mesmo tamanho de fonte dos outros; `INVESTIMENTO` vira `É INVESTIMENTO?` | Pedido: sem título, fonte menor e ambiguidade; o rótulo em pergunta indica que é um marcador sim/não | n |
| Campo da receita | Prefixo `R$` no campo, e texto de ajuda: `Preenchido com a receita do mês; edite para simular.` enquanto o valor é o inicial vindo do mês (some ao editar), ou `Informe para ver os valores em R$.` quando vazio | Pedido: formato monetário e clareza de preenchimento | n |
| Contraste | O texto `text-muted-foreground` fica com razão de contraste ≥ 4,5:1 sobre o fundo no tema escuro; o Salvar desabilitado fica fora desse critério (WCAG exclui controles desabilitados) mas ganha a explicação acima | Pedido de contraste; o critério precisa ser mensurável | n |
| Larguras | Card da receita, indicador, card da tabela e barra de ajuste ocupam a mesma largura de coluna (borda esquerda e direita iguais); o campo de receita fica em `max-w-xs` dentro do card | Pedido: grade clara | n |
| Tela estreita | Cabeçalhos continuam ocultos abaixo de `sm`, como hoje | Sem mudança pedida | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Estado vazio orientado ⭐ MVP

**User Story**: Como usuário novo, quero ver o que fazer quando não tenho categorias, para começar sem achar que a tela está quebrada.

**Why P1**: É a primeira impressão e hoje mostra um erro que o usuário não causou.

**Acceptance Criteria**:

1. WHILE a tela Alocação tem 0 categorias, the system SHALL mostrar o texto `Você ainda não tem categorias. Crie a primeira para começar a distribuir sua receita.` no lugar da tabela.  <!-- state-driven -->
2. WHILE a tela Alocação tem 0 categorias, the system SHALL mostrar o botão `Adicionar primeira categoria` com a variante primária, dentro do bloco do estado vazio.  <!-- state-driven -->
3. WHILE a tela Alocação tem 0 categorias, the system SHALL NOT renderizar cabeçalhos de coluna, a linha Soma, a mensagem `A soma deve ser 100%`, o select de ajuste, o botão Rebalancear nem o botão Salvar.  <!-- state-driven -->
4. WHEN o usuário aciona `Adicionar primeira categoria` THEN the system SHALL criar uma linha de categoria vazia e substituir o estado vazio pela tabela.  <!-- event-driven -->
5. WHEN o usuário remove a última categoria no editor THEN the system SHALL voltar a mostrar o estado vazio.  <!-- event-driven -->
6. WHILE a tela Alocação tem 0 categorias, the system SHALL mostrar um indicador com `role="progressbar"`, `aria-valuenow` 0 e o texto `0% de 100% alocado`.  <!-- state-driven -->

**Independent Test**: Abrir Alocação com um usuário sem categorias e ver só título, instrução, receita, indicador e o bloco vazio; clicar no botão e ver a tabela com uma linha.

---

### P1: Validação e controles só quando fazem sentido ⭐ MVP

**User Story**: Como usuário, quero ser avisado da soma só depois de começar a distribuir, e ver o rebalanceamento só quando há o que rebalancear.

**Why P1**: Remove o erro falso e o ruído do estado inicial.

**Acceptance Criteria**:

1. WHILE existe 1 ou mais categorias e a soma é diferente de 100%, the system SHALL mostrar o aviso `A soma deve ser 100%. Atual: X` em vermelho precedido de um ícone de alerta.  <!-- state-driven -->
2. WHILE existe exatamente 1 categoria, the system SHALL NOT mostrar o select de ajuste nem o botão Rebalancear.  <!-- state-driven -->
3. WHILE existem 2 ou mais categorias e a soma é diferente de 100%, the system SHALL mostrar o select de ajuste e o botão Rebalancear.  <!-- state-driven -->
4. WHILE existe 1 ou mais categorias, the system SHALL mostrar o indicador `{soma} de 100% alocado` com `aria-valuenow` igual à soma em % (limitado a 0 e 100 para a barra).  <!-- state-driven -->
5. WHILE a soma é 100% e existe 1 ou mais categorias, the system SHALL NOT mostrar o aviso de soma.  <!-- state-driven -->
6. IF o Salvar retorna erro THEN the system SHALL mostrar a mensagem de erro em vermelho precedida de um ícone de alerta.  <!-- unwanted-behavior -->

**Independent Test**: Adicionar uma categoria com 40%: aviso com ícone, sem select; adicionar a segunda: select e Rebalancear aparecem; fechar em 100%: aviso some.

---

### P2: Hierarquia e posição das ações

**User Story**: Como usuário, quero a ação disponível em destaque e perto da tabela.

**Why P2**: Corrige a hierarquia invertida; não bloqueia o fluxo.

**Acceptance Criteria**:

1. WHILE existe 1 ou mais categorias, the system SHALL renderizar o botão `Adicionar categoria` dentro do card da tabela, abaixo da última linha de categoria e antes da linha Soma.  <!-- state-driven -->
2. WHILE existe 1 ou mais categorias e a soma é diferente de 100%, the system SHALL mostrar o botão Salvar desabilitado com `title` `Some 100% para salvar`.  <!-- state-driven -->
3. WHILE existe 1 ou mais categorias e a soma é 100%, the system SHALL mostrar o botão Salvar habilitado, sem `title` de bloqueio.  <!-- state-driven -->

**Independent Test**: Com 1 categoria em 40%, passar o mouse no Salvar e ver o motivo; o botão Adicionar fica acima da linha Soma.

---

### P2: Linha Soma e cabeçalhos consistentes

**User Story**: Como usuário, quero ler o total de cada coluna sob a própria coluna e entender cada cabeçalho.

**Why P2**: Liga o total em R$ à receita base.

**Acceptance Criteria**:

1. WHILE existe 1 ou mais categorias, the system SHALL renderizar o texto `Soma` sob a coluna Categoria, a soma de % sob a coluna Alocação (%) e o total em R$ sob a coluna Valor Previsto (R$), usando as mesmas larguras de coluna das linhas.  <!-- state-driven -->
2. IF não há receita de referência válida THEN the system SHALL mostrar `—` como total da coluna Valor Previsto (R$).  <!-- unwanted-behavior -->
3. The system SHALL rotular a primeira coluna do cabeçalho como `COR` e a última como `AÇÕES`, com o mesmo tamanho de fonte dos demais cabeçalhos.  <!-- ubiquitous -->
4. The system SHALL rotular a coluna do marcador de investimento como `É INVESTIMENTO?`.  <!-- ubiquitous -->

**Independent Test**: Com receita 5.000,00 e 2 categorias, o total em R$ aparece sob Valor Previsto e o % sob Alocação; os cabeçalhos têm a mesma fonte.

---

### P3: Receita base, instrução única, contraste e grade

**User Story**: Como usuário, quero um campo de receita em formato de dinheiro, uma instrução só e uma tela alinhada e legível.

**Why P3**: Acabamento; a tela funciona sem isso.

**Acceptance Criteria**:

1. WHILE o campo da receita base está em edição, the system SHALL mostrar o prefixo `R$` junto ao campo.  <!-- state-driven -->
2. WHERE a receita base vem preenchida do mês e o campo está em edição com o valor inicial, the system SHALL mostrar abaixo do campo o texto `Preenchido com a receita do mês; edite para simular.`  <!-- optional-feature -->
3. WHILE o campo da receita base está vazio, the system SHALL mostrar abaixo do campo o texto `Informe para ver os valores em R$.`  <!-- state-driven -->
4. The system SHALL mostrar na tela Alocação uma única frase de instrução sobre a regra dos 100%: `Defina quanto da receita do mês vai para cada categoria. A soma deve ser 100%.`, sem o subtítulo `Alocação total obrigatória: 100% da receita`.  <!-- ubiquitous -->
5. The system SHALL usar para `text-muted-foreground` uma razão de contraste de pelo menos 4,5:1 sobre o fundo da página no tema escuro.  <!-- ubiquitous -->
6. The system SHALL renderizar o card da receita, o indicador, o card da tabela e a barra de ajuste com a mesma borda esquerda e a mesma borda direita.  <!-- ubiquitous -->

**Independent Test**: Medir o contraste do token no tema escuro; comparar `getBoundingClientRect` dos quatro blocos.

---

## Edge Cases

- IF a soma é maior que 100% THEN the system SHALL limitar a barra do indicador a 100% de largura e manter o texto com a soma real.
- WHEN o usuário apaga o texto do percentual de uma única categoria THEN the system SHALL mostrar `0% de 100% alocado` e o aviso de soma (há 1 linha).
- WHEN o servidor devolve a lista de categorias após salvar e ela está vazia THEN the system SHALL mostrar o estado vazio.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ESV-01 | P1: Estado vazio orientado (AC 1-3, 6) | Specify | Pending |
| ESV-02 | P1: Estado vazio orientado (AC 4-5) | Specify | Pending |
| ESV-03 | P1: Validação e controles só quando fazem sentido (AC 1, 5, 6) | Specify | Pending |
| ESV-04 | P1: Validação e controles só quando fazem sentido (AC 2-4) | Specify | Pending |
| ESV-05 | P2: Hierarquia e posição das ações | Specify | Pending |
| ESV-06 | P2: Linha Soma e cabeçalhos consistentes | Specify | Pending |
| ESV-07 | P3: Receita base, instrução única, contraste e grade (AC 1-3) | Specify | Pending |
| ESV-08 | P3: Receita base, instrução única, contraste e grade (AC 4-6) | Specify | Pending |

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️

---

## Success Criteria

- [ ] Um usuário sem categorias vê, sem rolar, instrução, receita, indicador e um único botão primário, e nenhum texto em vermelho.
- [ ] Nenhum dos itens 1-11 do pedido fica sem critério correspondente.
- [ ] `npm test` (unit e integration) segue verde.
