# Simulação de Valor e Cor por Categoria Specification

## Problem Statement

Na tela de Categorias o usuário define percentuais, mas não vê quanto cada percentual representa em reais. Sem isso, é difícil decidir se 7,5% para "Metas" ou 2,5% para "Conhecimento" é adequado. A feature adiciona um campo de receita de referência (valor de exemplo) e mostra, ao lado de cada categoria, o valor em R$ que esse percentual representa, atualizado enquanto o usuário edita. Além disso, o usuário escolhe uma cor para cada categoria, usada em todas as telas onde a categoria aparece, para reconhecê-la de relance.

## Goals

- [ ] Informar uma receita de referência na tela de Categorias e ver o valor em R$ de cada categoria sem salvar nada.
- [ ] O valor em R$ acompanha cada alteração de percentual ou de receita de referência, sem recarregar a página.
- [ ] Cada categoria tem uma cor salva, escolhida de uma paleta de 8 cores, exibida na edição de categorias, no gráfico de pizza, na tabela de resumo e na lista de transações.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Salvar a receita de referência no banco | É um valor de simulação; não altera dados do orçamento |
| Usar a receita de referência no resumo mensal / metas reais | Metas reais continuam baseadas nos ganhos do mês (spec orcamento-domestico) |
| Editar o valor em R$ e recalcular o percentual (caminho inverso) | Não pedido; pode virar feature futura |
| Comparar com gastos reais de meses anteriores | Não pedido |
| Gráfico da simulação | A tabela já cumpre o objetivo |
| Cor livre (hex / seletor de cor) | Decidido: paleta fixa de 8 cores do tema, legível no modo claro e escuro |
| Cor da categoria no gráfico de barras | As barras usam cores com significado (meta, gasto, estouro); trocar quebraria a legenda |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Persistência da receita de referência | Não persiste: vive só no estado da tela; some ao recarregar | É exemplo, não dado do orçamento; evita migração | n |
| Valor inicial do campo | Vazio | Não assume uma receita; o usuário digita o exemplo | n |
| Formato da entrada | Mesmo parser de valores em BRL usado nas transações (`parseBRL`): aceita "5000", "5.000,00", "5000,50"; > 0 e ≤ R$ 999.999.999,99 | Consistência com o resto do app | n |
| Cálculo do valor por categoria | round(receita_centavos × percentual_bp / 10000), igual a `buildMonthlySummary` | Mesmo arredondamento das metas reais | n |
| Linha com percentual vazio ou inválido | Coluna R$ mostra "—" | Não há percentual para calcular | n |
| Rodapé "Soma" | Mostra a soma em R$ dos valores das linhas válidas | Evidencia o efeito de uma soma ≠ 100% | n |
| Salvar | A receita de referência não é enviada no salvamento; salvar continua exigindo soma 100% | Feature é só visualização | n |
| Seletor de cor | Paleta fixa com as 8 cores categóricas do tema (`--viz-1` … `--viz-8`) | Decidido pelo usuário | y |
| Onde a cor aparece | Edição de categorias, gráfico de pizza, tabela de resumo, lista de transações | Decidido pelo usuário | y |
| Armazenamento da cor | Coluna `color` inteira 1–8 (índice da paleta) na tabela `category`, NOT NULL, com CHECK 1–8 | Guardar o índice mantém a cor certa no modo claro e escuro | n |
| Cor de categorias existentes | A migração atribui a cor pela ordem de criação: 1ª categoria → 1, …, 8ª → 8, 9ª → 1 de novo (ciclo) | Reproduz as cores que a pizza já mostra hoje | n |
| Cor de uma categoria nova | Pré-selecionada com a primeira cor da paleta ainda não usada nas linhas da tela; se todas estão em uso, a cor 1 | Evita repetir cor sem o usuário pedir | n |
| Cores repetidas | Permitidas; o sistema não bloqueia duas categorias com a mesma cor | Pode haver mais de 8 categorias | n |
| Pizza com mais de 8 categorias | Deixa de agrupar em "Outras": cada categoria com gasto vira uma fatia com a sua cor | Com cor escolhida por categoria, o agrupamento por posição perde o sentido | n |
| Cor inválida enviada ao salvar | Rejeitada com a mensagem "Cor inválida" no campo da linha | Mesma convenção de erros por campo do salvamento | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Ver valor em R$ por categoria a partir de uma receita de referência ⭐ MVP

**User Story**: As o usuário do orçamento, I want informar uma receita de exemplo na edição de categorias e ver quanto cada categoria recebe em R$ so that eu escolha percentuais adequados.

**Why P1**: É o pedido inteiro.

**Acceptance Criteria**:

1. The system SHALL exibir na tela de Categorias um campo "Receita de referência (R$)", vazio ao abrir a página.  <!-- ubiquitous -->
2. The system SHALL exibir na tabela de categorias uma coluna "Valor (R$)" entre "Percentual (%)" e a coluna de ações.  <!-- ubiquitous -->
3. WHEN a receita de referência é válida e o percentual da linha é válido THEN the system SHALL exibir na coluna "Valor (R$)" o valor round(receita_centavos × percentual_bp / 10000) formatado em BRL (ex.: receita 5.000,00 e 7,5% → "R$ 375,00").  <!-- event-driven -->
4. WHEN o usuário altera o percentual de uma linha ou a receita de referência THEN the system SHALL atualizar a coluna "Valor (R$)" sem salvar e sem recarregar a página.  <!-- event-driven -->
5. WHILE a receita de referência é válida the system SHALL exibir no rodapé "Soma", na coluna "Valor (R$)", a soma em BRL dos valores das linhas com percentual válido.  <!-- state-driven -->
6. IF o campo de receita de referência está vazio THEN the system SHALL exibir "—" em todas as células da coluna "Valor (R$)", inclusive no rodapé.  <!-- unwanted-behavior -->
7. IF a receita de referência é inválida (não numérica, ≤ 0 ou > R$ 999.999.999,99) THEN the system SHALL exibir abaixo do campo a mensagem de erro retornada por `parseBRL` e "—" em todas as células da coluna "Valor (R$)".  <!-- unwanted-behavior -->
8. IF o percentual de uma linha está vazio ou inválido THEN the system SHALL exibir "—" na célula "Valor (R$)" dessa linha.  <!-- unwanted-behavior -->
9. WHEN o usuário salva as categorias THEN the system SHALL enviar ao servidor os dados das categorias sem a receita de referência.  <!-- event-driven -->
10. WHEN as categorias são salvas com sucesso THEN the system SHALL manter a receita de referência digitada no campo.  <!-- event-driven -->

**Independent Test**: Abrir /categorias com as categorias da imagem (30, 30, 25, 7,5, 2,5, 5), digitar 5000 na receita de referência e ver R$ 1.500,00, R$ 1.500,00, R$ 1.250,00, R$ 375,00, R$ 125,00, R$ 250,00 e soma R$ 5.000,00; mudar 7,5 para 10 e ver R$ 500,00 e soma R$ 5.125,00.

---

### P2: Escolher uma cor para cada categoria

**User Story**: As o usuário do orçamento, I want escolher uma cor para cada categoria so that eu reconheça a categoria de relance nos gráficos e listas.

**Why P2**: Independente da simulação; melhora a leitura do resumo, mas o orçamento funciona sem ela.

**Acceptance Criteria**:

1. The system SHALL exibir em cada linha da edição de categorias um seletor de cor com as 8 cores da paleta, cada opção com nome acessível (Azul, Laranja, Verde, Amarelo, Rosa, Verde-escuro, Roxo, Vermelho).  <!-- ubiquitous -->
2. WHEN o usuário escolhe uma cor e salva com sucesso THEN the system SHALL persistir o índice da cor (1–8) da categoria e exibi-la selecionada ao recarregar a página.  <!-- event-driven -->
3. WHEN o usuário adiciona uma categoria THEN the system SHALL pré-selecionar a primeira cor da paleta não usada pelas linhas exibidas, ou a cor 1 se todas estiverem em uso.  <!-- event-driven -->
4. IF o salvamento recebe uma cor fora de 1–8 ou não inteira THEN the system SHALL rejeitar o conjunto inteiro sem gravar nada e exibir "Cor inválida" na linha correspondente.  <!-- unwanted-behavior -->
5. WHEN a migração é aplicada THEN the system SHALL atribuir às categorias existentes de cada usuário a cor ((posição na ordem de criação − 1) mod 8) + 1.  <!-- event-driven -->
6. WHEN o gráfico de pizza é exibido THEN the system SHALL preencher a fatia de cada categoria com a cor da categoria e exibir a mesma cor na legenda, sem agrupar categorias em "Outras".  <!-- event-driven -->
7. WHEN a tabela de resumo do mês é exibida THEN the system SHALL mostrar um marcador com a cor da categoria ao lado do nome de cada categoria.  <!-- event-driven -->
8. WHEN a lista de transações exibe um gasto THEN the system SHALL mostrar um marcador com a cor da categoria ao lado do nome da categoria do gasto.  <!-- event-driven -->
9. The system SHALL renderizar cada cor pelo token do tema (`var(--viz-N)`), de modo que a mesma categoria use a variante clara ou escura conforme o tema ativo.  <!-- ubiquitous -->

**Independent Test**: Na tela Categorias, trocar a cor de "Metas" para Roxo e salvar; recarregar e ver Roxo selecionado; no resumo do mês, ver o marcador roxo ao lado de "Metas", a fatia roxa na pizza e o marcador roxo nos gastos de "Metas" na lista de transações.

---

## Edge Cases

- WHEN uma categoria nova é adicionada com percentual vazio THEN the system SHALL exibir "—" no valor dessa linha.
- WHEN a soma dos percentuais é diferente de 100% THEN the system SHALL exibir a soma em R$ calculada mesmo assim (diferente da receita de referência).
- IF uma categoria é removida THEN the system SHALL recalcular a soma em R$ sem a linha removida.
- WHEN duas categorias têm a mesma cor THEN the system SHALL salvar normalmente e exibir ambas com essa cor.
- WHEN existem mais de 8 categorias com gasto no mês THEN the system SHALL exibir todas como fatias próprias na pizza.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SIM-01 | P1: campo de receita de referência (AC 1, 7) | Execute | Verified |
| SIM-02 | P1: coluna e cálculo do valor por categoria (AC 2, 3, 4, 6, 8) | Execute | Verified |
| SIM-03 | P1: soma em R$ no rodapé (AC 5, 6) | Execute | Verified |
| SIM-04 | P1: salvamento ignora e preserva a receita de referência (AC 9, 10) | Execute | Verified |
| COR-01 | P2: coluna `color`, migração e validação (AC 2, 4, 5) | Execute | Verified |
| COR-02 | P2: seletor de cor na edição de categorias (AC 1, 2, 3) | Execute | Verified |
| COR-03 | P2: cor no gráfico de pizza (AC 6, 9) | Execute | Verified |
| COR-04 | P2: marcador de cor no resumo e na lista de transações (AC 7, 8, 9) | Execute | Verified |

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped (tasks.md é criado na fase Tasks)

---

## Success Criteria

- [ ] Com o exemplo da imagem e receita 5.000, todos os valores em R$ batem com o Independent Test.
- [ ] A simulação (P1) não altera o schema do banco nem o payload de nome/percentual do salvamento.
- [ ] Depois da migração, todas as categorias existentes têm cor, e a pizza mostra as mesmas cores de antes para as 8 primeiras categorias.
