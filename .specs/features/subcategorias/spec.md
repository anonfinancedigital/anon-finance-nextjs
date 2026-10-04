# Subcategorias Specification

## Problem Statement

Hoje cada gasto aponta só para uma categoria ampla (ex.: "Conforto"), então o resumo mostra que a categoria estourou mas não mostra onde o dinheiro foi. A feature adiciona subcategorias dentro de cada categoria (ex.: Conforto › Restaurante, Conforto › Streaming). Elas servem só para detalhar: a meta continua na categoria, e o usuário passa a ver o gasto por subcategoria no resumo, na lista de transações e em um filtro.

## Goals

- [ ] Criar, renomear e excluir subcategorias de cada categoria na tela de Categorias.
- [ ] Lançar um gasto com subcategoria opcional, sem passar dos 30 segundos por transação definidos na spec orcamento-domestico.
- [ ] Ver, no resumo do mês, quanto cada subcategoria gastou dentro da categoria-mãe.
- [ ] Filtrar a lista de transações do mês por categoria e por subcategoria.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Meta ou percentual próprio da subcategoria | Decidido: subcategoria só detalha; a meta continua na categoria |
| Mais de um nível (sub-subcategoria) | Um nível cobre o pedido; árvore arbitrária complica UI e consultas |
| Subcategoria em ganhos | Ganhos não têm categoria (spec orcamento-domestico) |
| Subcategoria no gráfico de pizza ou de barras | Não pedido; os gráficos continuam por categoria |
| Criar subcategoria pelo formulário de gasto | Decidido: a gestão fica só na tela de Categorias |
| Mover subcategoria para outra categoria | Não pedido; o usuário cria a subcategoria na outra categoria |
| Mover gastos em lote entre subcategorias | Não pedido |
| Tags (vários rótulos por gasto) | Modelo diferente; continua fora do escopo |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Função da subcategoria | Só detalhamento: sem percentual, sem meta, sem estouro próprio | Decidido pelo usuário | y |
| Subcategoria no gasto | Opcional; gasto sem subcategoria aparece como "Sem subcategoria" | Decidido pelo usuário; gastos existentes continuam válidos sem migração de dados | y |
| Onde aparece | Resumo do mês, lista de transações e filtro da lista | Decidido pelo usuário | y |
| Onde é gerenciada | Tela de Categorias, dentro de cada categoria | Decidido pelo usuário | y |
| Profundidade | Um nível: subcategoria pertence a uma categoria e não tem filhas | Cobre o pedido com o menor modelo | n |
| Salvamento | Subcategorias são salvas junto com o conjunto de categorias, no mesmo botão "Salvar"; a regra de soma 100% continua valendo para o conjunto | A tela de Categorias já salva o conjunto inteiro (`saveCategories` → `replaceSet`) | n |
| Nome | 1 a 40 caracteres após remover espaços nas pontas; único dentro da mesma categoria, sem diferenciar maiúsculas; pode repetir em categorias diferentes | Mesma regra de nome das categorias, aplicada dentro da mãe | n |
| Limite por categoria | Até 30 subcategorias por categoria | Limite de entrada; acima disso a lista perde utilidade | n |
| Exclusão de subcategoria com gastos | Bloqueada, informando a quantidade de gastos vinculados | Mesma regra das categorias (CAT-03); evita reclassificar gastos sem o usuário ver | n |
| Exclusão de categoria sem gastos que tem subcategorias | Remove a categoria e as subcategorias dela | Subcategoria não existe sem a mãe; sem gastos não há perda de dado | n |
| Troca de categoria ao editar um gasto | Limpa a subcategoria escolhida; o usuário escolhe outra da nova categoria ou deixa vazia | Subcategoria precisa pertencer à categoria do gasto | n |
| Subcategoria de outra categoria enviada ao salvar gasto | Rejeitada com a mensagem "Subcategoria não pertence à categoria" | Integridade do vínculo; o banco também garante | n |
| Exibição no resumo | Cada categoria com gasto em subcategoria ganha uma linha expansível, recolhida por padrão, listando subcategorias com gasto > R$ 0,00 e a linha "Sem subcategoria" quando houver, em ordem decrescente de gasto | Mostra onde o dinheiro foi sem poluir a tabela | n |
| Percentual exibido na subcategoria | Participação no gasto da categoria-mãe no mês: round(gasto_sub × 10000 / gasto_categoria) em pontos-base, exibido com 1 casa decimal | Não há meta; a participação é o número útil. Pontos-base seguem AD-003 | n |
| Rótulo na lista de transações | "Categoria › Subcategoria"; só "Categoria" quando o gasto não tem subcategoria | Leitura direta da hierarquia | n |
| Filtro da lista | Dois seletores: categoria ("Todas" por padrão) e subcategoria (habilitado após escolher categoria; opções "Todas", "Sem subcategoria" e as subcategorias dela) | Cobre filtrar pela mãe ou por uma filha | n |
| Estado do filtro | Guardado na URL (`?categoria=<id>&subcategoria=<id ou "nenhuma">`) junto do mês; mantido ao trocar de mês | Sobrevive a recarregar e a voltar no navegador; mesmo padrão do mês | n |
| Ganhos com filtro ativo | Filtro de categoria esconde os ganhos da lista | Ganhos não têm categoria | n |
| Resumo com filtro ativo | O filtro afeta só a lista; resumo e gráficos continuam mostrando o mês inteiro | Filtro é ferramenta da lista, não do orçamento | n |
| Id de filtro inexistente na URL | Ignorado: a lista se comporta como "Todas" | Links velhos não quebram a página | n |
| Concorrência | N/A: um único usuário (spec orcamento-domestico) | Sem edição simultânea | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Gerenciar subcategorias na tela de Categorias ⭐ MVP

**User Story**: As o usuário do orçamento, I want criar, renomear e excluir subcategorias dentro de cada categoria so that eu possa detalhar meus gastos.

**Why P1**: Sem subcategorias cadastradas não há o que escolher no gasto nem o que mostrar no resumo.

**Acceptance Criteria**:

1. WHEN o usuário adiciona uma subcategoria com nome válido a uma categoria e salva o conjunto com soma 100% THEN the system SHALL persistir a subcategoria vinculada àquela categoria e exibi-la sob ela na tela de Categorias.
2. WHEN o usuário renomeia uma subcategoria e salva THEN the system SHALL persistir o novo nome e exibi-lo em todos os gastos vinculados a ela.
3. IF o nome da subcategoria estiver vazio ou tiver mais de 40 caracteres após remover espaços nas pontas THEN the system SHALL rejeitar o salvamento com a mensagem de validação no campo da subcategoria.
4. IF o nome da subcategoria repetir outro nome da mesma categoria, sem diferenciar maiúsculas THEN the system SHALL rejeitar o salvamento com a mensagem "Já existe uma subcategoria com esse nome nesta categoria".
5. WHEN o usuário salva duas subcategorias com o mesmo nome em categorias diferentes THEN the system SHALL aceitar o salvamento.
6. IF o usuário tentar salvar uma categoria com mais de 30 subcategorias THEN the system SHALL rejeitar o salvamento com a mensagem "Máximo de 30 subcategorias por categoria".
7. IF o usuário tentar excluir uma subcategoria que possui gastos THEN the system SHALL bloquear o salvamento e informar a quantidade de gastos vinculados.
8. WHEN o usuário exclui uma subcategoria sem gastos e salva THEN the system SHALL removê-la.
9. WHEN o usuário exclui uma categoria sem gastos que tem subcategorias e salva THEN the system SHALL remover a categoria e as subcategorias dela.
10. The system SHALL manter a regra de soma 100% dos percentuais das categorias, sem considerar as subcategorias.

**Independent Test**: Na categoria "Conforto", adicionar "Restaurante" e "Streaming", salvar e recarregar: as duas aparecem sob "Conforto". Adicionar outra "restaurante" em "Conforto" e ver o bloqueio; adicionar "Restaurante" em "Lazer" e ver o salvamento aceito.

---

### P1: Escolher subcategoria ao lançar um gasto ⭐ MVP

**User Story**: As o usuário do orçamento, I want escolher, opcionalmente, a subcategoria de um gasto so that eu saiba em que parte da categoria gastei.

**Why P1**: É a entrada de dados da feature.

**Acceptance Criteria**:

1. WHEN o usuário escolhe uma categoria no formulário de gasto THEN the system SHALL listar no seletor de subcategoria apenas as subcategorias daquela categoria, mais a opção "Sem subcategoria".
2. WHEN o usuário salva um gasto com subcategoria da categoria escolhida THEN the system SHALL persistir o gasto com a subcategoria.
3. WHEN o usuário salva um gasto sem escolher subcategoria THEN the system SHALL persistir o gasto sem subcategoria.
4. IF o gasto for enviado com uma subcategoria que não pertence à categoria escolhida ou que não existe THEN the system SHALL rejeitar o gasto com a mensagem "Subcategoria não pertence à categoria".
5. WHEN o usuário troca a categoria no formulário de criação ou edição THEN the system SHALL limpar a subcategoria selecionada.
6. WHEN o usuário edita um gasto, troca a subcategoria e salva THEN the system SHALL atualizar a subcategoria e refletir a mudança no resumo e na lista.
7. WHILE a categoria escolhida não tiver subcategorias the system SHALL exibir o seletor de subcategoria desabilitado com "Sem subcategoria".
8. IF um ganho for enviado com subcategoria THEN the system SHALL rejeitar o lançamento com mensagem de validação.
9. The system SHALL manter válidos, sem alteração, os gastos existentes antes da feature, tratando-os como "Sem subcategoria".

**Independent Test**: Lançar R$ 80,00 em Conforto › Restaurante e R$ 40,00 em Conforto sem subcategoria; os dois aparecem na lista e no resumo. Editar o primeiro trocando a categoria e ver a subcategoria limpa.

---

### P1: Ver gasto por subcategoria no resumo do mês ⭐ MVP

**User Story**: As o usuário do orçamento, I want ver quanto cada subcategoria gastou dentro da categoria so that eu saiba onde cortar quando a categoria estoura.

**Why P1**: É o motivo da feature.

**Acceptance Criteria**:

1. WHILE uma categoria tiver ao menos um gasto no mês com subcategoria the system SHALL exibir na linha da categoria um controle para expandir o detalhamento, recolhido por padrão.
2. WHEN o usuário expande uma categoria THEN the system SHALL listar cada subcategoria com gasto maior que R$ 0,00 no mês, com o gasto em R$ e a participação no gasto da categoria, em ordem decrescente de gasto.
3. WHILE a categoria tiver gastos sem subcategoria no mês the system SHALL incluir no detalhamento a linha "Sem subcategoria" com o gasto em R$ e a participação.
4. The system SHALL calcular a participação como round(gasto_subcategoria × 10000 / gasto_categoria) em pontos-base e exibi-la com 1 casa decimal (ex.: 62,5%).
5. The system SHALL fazer a soma dos gastos das linhas do detalhamento ser igual ao gasto da categoria no mês, em centavos.
6. WHILE nenhuma despesa da categoria no mês tiver subcategoria the system SHALL omitir o controle de expandir dessa categoria.
7. The system SHALL manter meta, restante, estouro e gráficos calculados por categoria, como antes da feature.
8. WHEN um gasto é criado, editado ou excluído THEN the system SHALL refletir o novo valor no detalhamento sem recarregamento manual da página.

**Independent Test**: Com Conforto › Restaurante R$ 300,00, Conforto › Streaming R$ 100,00 e Conforto sem subcategoria R$ 100,00, expandir Conforto e ver Restaurante R$ 300,00 (60,0%), Streaming R$ 100,00 (20,0%), Sem subcategoria R$ 100,00 (20,0%), somando R$ 500,00.

---

### P2: Subcategoria na lista e filtro de transações

**User Story**: As o usuário do orçamento, I want ver a subcategoria de cada gasto e filtrar a lista por categoria ou subcategoria so that eu encontre rápido os gastos de um tipo.

**Why P2**: Útil para investigar, mas o resumo já entrega o detalhamento.

**Acceptance Criteria**:

1. WHEN a lista exibe um gasto com subcategoria THEN the system SHALL mostrar o rótulo "Categoria › Subcategoria".
2. WHEN a lista exibe um gasto sem subcategoria THEN the system SHALL mostrar só o nome da categoria.
3. WHEN o usuário escolhe uma categoria no filtro THEN the system SHALL listar só os gastos do mês daquela categoria, sem os ganhos.
4. WHEN o usuário escolhe uma subcategoria no filtro THEN the system SHALL listar só os gastos do mês daquela subcategoria.
5. WHEN o usuário escolhe "Sem subcategoria" no filtro THEN the system SHALL listar só os gastos do mês da categoria escolhida que não têm subcategoria.
6. WHILE o filtro de categoria estiver em "Todas" the system SHALL exibir o seletor de subcategoria desabilitado.
7. WHEN o usuário troca a categoria do filtro THEN the system SHALL voltar o filtro de subcategoria para "Todas".
8. WHEN o usuário aplica um filtro THEN the system SHALL gravá-lo na URL e restaurá-lo ao recarregar a página ou trocar de mês.
9. IF a URL trouxer um id de categoria ou subcategoria inexistente THEN the system SHALL ignorar esse filtro e listar como "Todas".
10. WHILE um filtro estiver ativo the system SHALL manter resumo e gráficos com os valores do mês inteiro.
11. WHILE um filtro estiver ativo e nenhum gasto do mês corresponder the system SHALL exibir "Nenhum gasto encontrado para este filtro".

**Independent Test**: Com gastos em Conforto › Restaurante, Conforto sem subcategoria e Lazer, filtrar Conforto › Restaurante e ver só o primeiro; recarregar e ver o filtro mantido; trocar de mês e ver o filtro aplicado ao novo mês.

---

## Edge Cases

- IF o usuário remove uma subcategoria e adiciona outra com o mesmo nome no mesmo salvamento THEN the system SHALL aceitar o salvamento.
- WHEN o usuário renomeia uma subcategoria só trocando maiúsculas e minúsculas ("restaurante" → "Restaurante") THEN the system SHALL aceitar o salvamento.
- IF o banco de dados estiver indisponível ao salvar categorias e subcategorias THEN the system SHALL exibir "Não foi possível salvar. Tente novamente" e manter as edições na tela.
- IF o salvamento do conjunto falhar em qualquer validação THEN the system SHALL não persistir nenhuma alteração de categorias nem de subcategorias.
- WHEN a participação de uma subcategoria arredondar para 0,0% com gasto maior que R$ 0,00 THEN the system SHALL exibir a linha com "0,0%" e o valor em R$.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SUB-01 | P1: Gerenciar subcategorias (AC 1, 2, 5, 10) | Tasks | In Tasks |
| SUB-02 | P1: Gerenciar subcategorias (AC 3, 4, 6) | Tasks | In Tasks |
| SUB-03 | P1: Gerenciar subcategorias (AC 7, 8, 9) | Tasks | In Tasks |
| SUB-04 | P1: Subcategoria no gasto (AC 1, 2, 3, 5, 7) | Tasks | In Tasks |
| SUB-05 | P1: Subcategoria no gasto (AC 4, 6, 8, 9) | Tasks | In Tasks |
| SUB-06 | P1: Gasto por subcategoria no resumo (AC 1, 2, 3, 6) | Tasks | In Tasks |
| SUB-07 | P1: Gasto por subcategoria no resumo (AC 4, 5, 7, 8) | Tasks | In Tasks |
| SUB-08 | P2: Lista e filtro (AC 1, 2) | Tasks | In Tasks |
| SUB-09 | P2: Lista e filtro (AC 3, 4, 5, 6, 7, 11) | Tasks | In Tasks |
| SUB-10 | P2: Lista e filtro (AC 8, 9, 10) | Tasks | In Tasks |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] O usuário cadastra subcategorias e lança um gasto com subcategoria em menos de 30 segundos.
- [ ] O detalhamento de qualquer categoria no resumo soma, em centavos, exatamente o gasto da categoria.
- [ ] Gastos lançados antes da feature continuam aparecendo no resumo e na lista sem nenhuma migração de dados.
