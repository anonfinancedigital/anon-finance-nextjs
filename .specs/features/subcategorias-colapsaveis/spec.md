# Subcategorias Colapsáveis Specification

## Problem Statement

Na tela de Categorias, as subcategorias ficam atrás de um link de texto "Subcategorias (N)" dentro da tabela, e no formulário de lançamento há dois selects soltos. O usuário quer o visual de lista de cards: cada categoria aparece colapsada com um quadrado colorido, o nome e "N subcategorias"; ao abrir, mostra as subcategorias com marcador na cor da categoria e uma linha "Nova subcategoria em <Categoria>".

## Goals

- [ ] Em /categorias, cada categoria exibe um cabeçalho colapsável com quadrado colorido, nome, "N subcategorias" e chevron; todas começam fechadas.
- [ ] Ao abrir, a lista de subcategorias mostra marcador colorido, nome editável e uma linha final "Nova subcategoria em <Categoria>" que adiciona uma subcategoria.
- [ ] No formulário de lançamento, a escolha de subcategoria usa o mesmo agrupamento colapsável por categoria.
- [ ] Nenhuma regra de dados muda: limites, validações e salvamento ficam como na spec subcategorias.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Ícone escolhido por categoria (guarda-chuva, $, avião) | Decidido: usar quadrado com a cor da categoria; sem mudança de banco |
| Trocar a tabela de edição de nome, cor, percentual e valor | Decidido: a tabela atual continua; só o bloco de subcategorias muda |
| Mover subcategoria entre categorias, meta própria, sub-subcategoria | Fora da spec subcategorias |
| Mudanças no resumo, na lista de transações e no filtro | Não pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Telas afetadas | /categorias e formulário de lançamento | Decidido pelo usuário | y |
| Ícone | Quadrado arredondado na cor da categoria com a inicial do nome | Decidido pelo usuário; cor já existe no modelo | y |
| Tabela de categorias | Mantida; o novo bloco substitui o link "Subcategorias (N)" na linha abaixo de cada categoria | Decidido pelo usuário | y |
| Estado inicial | Todas as categorias fechadas | Igual à imagem 1 | n |
| Abertura simultânea | Cada categoria abre e fecha de forma independente | Permite comparar duas listas | n |
| Remover subcategoria | Botão "Remover" por item continua; salvar continua no botão "Salvar" do conjunto | Preserva o fluxo atual (`saveCategories`) | n |
| Erro de validação em categoria fechada | A categoria abre sozinha e mostra o erro | Comportamento atual de `SubcategoryEditor` | n |
| Formulário de lançamento | Um único seletor "Categoria e subcategoria": categorias colapsadas com contagem; ao abrir, escolhe-se uma subcategoria ou a própria categoria ("Sem subcategoria"); a escolha define categoryId e subcategoryId | Interpretação da resposta "formulário de transação"; os dois selects atuais são substituídos | n |
| Categoria sem subcategorias no formulário | Aparece como linha selecionável direta, sem chevron | Não há o que expandir | n |
| Singular | "1 subcategoria", "0 subcategorias" | Português correto | n |
| Teclado e leitor de tela | Cabeçalho é um botão com aria-expanded e aria-controls | Padrão já usado no editor atual | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Subcategorias colapsáveis em Categorias ⭐ MVP

**User Story**: Como usuário, quero ver cada categoria fechada com a contagem de subcategorias e abri-la para ver e editar a lista, para que a tela fique curta e organizada.

**Why P1**: É o pedido central.

**Acceptance Criteria**:

1. WHEN a tela /categorias carrega THEN the system SHALL mostrar cada categoria com quadrado colorido, nome, "N subcategorias" e chevron apontando para baixo, com a lista fechada.  <!-- event-driven -->
2. WHEN o usuário clica no cabeçalho de uma categoria fechada THEN the system SHALL mostrar a lista de subcategorias e virar o chevron para cima.
3. WHEN o usuário clica no cabeçalho de uma categoria aberta THEN the system SHALL ocultar a lista sem perder o texto digitado.
4. WHEN o usuário abre uma categoria THEN the system SHALL mostrar cada subcategoria com marcador na cor da categoria e o nome em campo editável.
5. WHEN o usuário abre uma categoria THEN the system SHALL mostrar como último item a linha "Nova subcategoria em <nome da categoria>" com ícone "+".
6. WHEN o usuário clica em "Nova subcategoria em <nome>" THEN the system SHALL acrescentar uma subcategoria vazia ao fim da lista e focar seu campo de nome.
7. WHEN o usuário remove uma subcategoria THEN the system SHALL tirá-la da lista e atualizar a contagem do cabeçalho.
8. WHILE a categoria já tem 30 subcategorias the system SHALL desabilitar a linha "Nova subcategoria em <nome>".  <!-- state-driven -->
9. IF um salvamento for rejeitado com erro na lista de subcategorias de uma categoria fechada THEN the system SHALL abrir essa categoria e exibir a mensagem de erro.  <!-- unwanted-behavior -->
10. The system SHALL escrever a contagem como "1 subcategoria" quando houver uma e "N subcategorias" nos demais casos, incluindo 0.  <!-- ubiquitous -->
11. The system SHALL expor o cabeçalho como botão com aria-expanded e aria-controls apontando para o painel da lista.

**Independent Test**: Abrir /categorias, ver todas fechadas, abrir "Lazer", clicar em "Nova subcategoria em Lazer", digitar um nome, clicar em "Salvar" e recarregar: a subcategoria persiste e o cabeçalho mostra a nova contagem.

---

### P2: Seletor agrupado no formulário de lançamento

**User Story**: Como usuário, quero escolher categoria e subcategoria numa lista colapsável por categoria ao lançar um gasto, para usar o mesmo padrão visual da tela de Categorias.

**Why P2**: Pedido pelo usuário, mas o fluxo de lançamento atual já funciona com dois selects.

**Acceptance Criteria**:

1. WHEN o formulário de gasto abre THEN the system SHALL mostrar as categorias com quadrado colorido, nome e "N subcategorias", fechadas, com a categoria atual da transação aberta e marcada ao editar.
2. WHEN o usuário abre uma categoria com subcategorias THEN the system SHALL listar "Sem subcategoria" e cada subcategoria como opções selecionáveis.
3. WHEN o usuário seleciona uma subcategoria THEN the system SHALL definir categoryId e subcategoryId da transação com os valores dessa subcategoria e sua categoria.
4. WHEN o usuário seleciona "Sem subcategoria" de uma categoria THEN the system SHALL definir categoryId dessa categoria e subcategoryId vazio.
5. WHEN o usuário seleciona uma categoria sem subcategorias THEN the system SHALL definir categoryId dessa categoria e subcategoryId vazio.
6. IF o usuário tentar salvar sem categoria selecionada THEN the system SHALL exibir a mensagem de erro de categoria já existente e não salvar.
7. WHERE o lançamento for um ganho the system SHALL manter o formulário sem seletor de categoria, como hoje.

**Independent Test**: Lançar um gasto escolhendo "Lazer › Cinema" e ver na lista de transações a categoria Lazer e a subcategoria Cinema.

---

## Edge Cases

- IF o nome da categoria estiver vazio THEN the system SHALL mostrar "Nova categoria" no cabeçalho colapsado e "Nova subcategoria em Nova categoria" na linha de adição.
- WHEN o usuário renomeia a categoria na tabela THEN the system SHALL atualizar o nome no cabeçalho e na linha de adição sem recarregar.
- IF o nome de uma subcategoria for vazio ou duplicado dentro da categoria THEN the system SHALL manter o erro de validação atual do salvamento.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SUBCOL-01 | P1: critérios 1-3, 10, 11 (cabeçalho colapsável) | - | Verified |
| SUBCOL-02 | P1: critérios 4-7 (lista e adição) | - | Verified |
| SUBCOL-03 | P1: critérios 8-9 (limite e erro) | - | Verified |
| SUBCOL-04 | P2: critérios 1-5 (seletor agrupado) | - | Verified |
| SUBCOL-05 | P2: critérios 6-7 (validação e ganhos) | - | Verified |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Em /categorias, com 10 categorias, a página mostra 10 cards fechados sem nenhuma lista de subcategorias visível.
- [ ] Lançar um gasto com subcategoria leva no máximo 4 cliques (abrir modal, abrir categoria, escolher subcategoria, salvar), sem contar digitação.
- [ ] Os testes existentes de subcategorias passam sem alterar a lógica de dados.
