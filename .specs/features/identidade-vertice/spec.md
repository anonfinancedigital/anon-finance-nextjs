# Identidade Vértice Specification

## Problem Statement

O app se apresenta como "Orçamento", com um ícone genérico de carteira e rótulos de planilha ("Resumo", "Categorias", "Liberdade", "Guardado", "Falta"). A nova marca "Vértice – Gestão Patrimonial Familiar" posiciona o produto como gestão de patrimônio e independência financeira. Marca, favicon, títulos de página, navegação e rótulos das telas Alocação, Ápice e do modal de lançamento precisam refletir essa identidade de forma consistente com o tema dark existente.

## Goals

- [ ] Toda superfície de marca (sidebar, barra superior mobile, login, favicon, título da aba, metadata) mostra "Vértice" e nenhuma exibe "Orçamento" nem o ícone de carteira.
- [ ] A navegação usa "Visão Geral", "Alocação" e "Ápice", e o título da aba de cada tela segue "Vértice • [Tela]".
- [ ] Alocação, Ápice e o modal de lançamento usam exatamente os rótulos definidos abaixo.
- [ ] O visual segue os tokens OKLCH, as fontes Manrope (corpo) e Sora (`font-display`) e os temas dark e claro já existentes.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Renomear as rotas `/categorias` e `/liberdade` | Só rótulos e títulos mudam; URLs e links existentes continuam válidos. |
| Renomear tabelas, colunas, actions, tipos e arquivos de domínio | Mudança só de apresentação. |
| Mudar cálculos, validações ou mensagens de erro | Fora do pedido; mensagens de validação existentes permanecem. |
| Reescrever a paleta de cores do app com os hex do logo (#8b5cf6, #10b981, #231e3d) | Os hex ficam só dentro dos SVGs da marca; o app mantém os tokens OKLCH. |
| Renomear "Gasto" e "Ganho" fora do seletor de tipo do modal (cards da Visão Geral, tabela, gráficos, lista de transações) | O pedido restringe a mudança ao seletor do modal. |
| Renomear o pacote npm, o repositório, o título do README e a pasta do projeto | Não é interface do app. |
| Gerar favicons PNG, `apple-touch-icon` e manifest | Não pedido; só o favicon vetorial. |
| Mudar a tela Visão Geral além do rótulo de navegação, do título da aba e do título da página | Pedido sem outros ajustes nessa tela. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Nome da tela inicial | "Visão Geral" em vez de "Cockpit" (decisão do usuário em 2026-10-05, depois da implementação; o pedido original dizia "Cockpit") | O usuário prefere manter "Visão Geral" | y |
| Stack do pedido ("React", `index.html`) | O projeto é Next.js App Router, sem `index.html`: o favicon é o arquivo `src/app/icon.svg` (convenção de metadata do Next) e os títulos vêm de `metadata` com `title.template` `"Vértice • %s"` | `index.html` não existe; a convenção do Next gera as tags `<head>` | y |
| Favicon antigo `src/app/favicon.ico` | Removido, para o `icon.svg` ser o único favicon | Dois arquivos de ícone geram conflito de qual o navegador usa | n |
| Fonte dos SVGs | `docs/vertice_favicon.svg` vira `public/favicon.svg` e `src/app/icon.svg` (cópia idêntica); `docs/vertice_logo.svg` fornece a geometria do componente `Logo` | O usuário anexou os dois arquivos como referência | y |
| Pedido de `public/favicon.svg` | Mantido além do `icon.svg`, igual ao arquivo do pedido | O pedido cita o caminho explicitamente | n |
| Subtítulo "Gestão Patrimonial Familiar" | Aparece na metadata `description` e na tela de login; o `Logo` mostra "Gestão Patrimonial" | O pedido define os dois textos | y |
| Cores do texto do `Logo` | "VÉRTICE" usa `currentColor` do token `foreground` e o subtítulo usa `muted-foreground`; o quadrado escuro e o gradiente do "V" ficam fixos | O logo anexado tem texto claro fixo, que some no tema claro | n |
| Fonte no SVG do `Logo` | O texto é HTML ao lado do SVG do símbolo (classe `font-display`, Sora) em vez de `<text>` do SVG | `<text>` não herda `next/font`; HTML garante Sora e acessibilidade | n |
| Botão "Ajustar" da Alocação | Não existe com esse texto; o rótulo equivalente é "Aplicar" em `AdjustSumBar`, que passa a "Rebalancear" | O pedido não bate com o código; a barra de ajuste é a única ação equivalente | n |
| Título da barra de ajuste e rótulos vizinhos | "Descontar a diferença em" e "Acrescentar a diferença em" permanecem | Fora do pedido | n |
| Lixeira da Alocação | Já existe (`Trash2Icon`, destrutivo no hover); só se confirma que permanece e que o texto "Remover" não aparece na linha da categoria | Pedido já atendido | n |
| Remoção de subcategoria | O botão de texto "Remover" das subcategorias passa a ser ícone `Trash2Icon` com o mesmo hover destrutivo | O pedido fala dos botões de texto "Remover" da tela | n |
| Cabeçalho da lista, sufixo "%", prefixo "R$" e máximo de 2 casas | Já existem; só os textos do cabeçalho mudam | Evita reescrever o que funciona | n |
| "Receita de referência" no texto "Base de cálculo mensal: R$ X" e no botão "Editar base" | Permanecem; só o rótulo do campo vira "Receita Base Mensal" | O pedido cita só o rótulo do campo | n |
| Texto da regra de 100% | Aparece sempre, como texto de apoio fixo na Alocação, abaixo do título. O aviso dinâmico `sumWarning` permanece quando a soma não é 100% | Pedido pede o texto de apoio, não a troca do aviso | n |
| Salvar desabilitado | Classes `opacity-50 cursor-not-allowed` (hoje `opacity-40`) | Valor pedido | y |
| Data de nascimento do Ápice | Já é DD/MM/AAAA com máscara; só se garante o rótulo e o placeholder "DD/MM/AAAA" | Pedido já atendido | n |
| Título e descrição do Ápice | Título "Ápice"; descrição: "Defina a renda mensal que quer ter, o patrimônio acumulado e a idade do seu ápice patrimonial. A meta é o patrimônio que gera essa renda, sem consumir o principal, na taxa esperada escolhida: a base da sua independência financeira." | Pedido pede linguagem de ápice e independência financeira, sem texto exato | n |
| Cabeçalho (eyebrow) das páginas | Visão Geral: "Visão geral" (igual); Alocação: "Orçamento" vira "Planejamento"; Ápice: "Objetivo" vira "Independência financeira" | "Orçamento" sai da marca; o resto acompanha o tom | n |
| Rótulos de formulário do Ápice não citados ("Renda mensal desejada (R$)", "Valor já guardado (R$)", "Idade de aposentadoria", "Taxa esperada ao ano") | Permanecem | Fora do pedido | n |
| Rótulo "Progresso" do hero | Permanece | Fora do pedido | n |
| Rótulo do botão "Salvar" do modal de lançamento | "Salvar" e "Salvar alterações" permanecem | Fora do pedido | n |
| Título e `aria-label` do modal ao criar | "Registrar Lançamento" no título do diálogo e no `aria-label` do formulário; o botão flutuante "Nova transação" mantém seu `aria-label` | O título muda; o gatilho não foi citado | n |
| Textos dos e2e existentes | Os specs em `e2e/` que usam rótulos alterados são atualizados para os novos rótulos, sem rodar a suíte (AD-005) | Evita specs quebrados no repositório | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Marca Vértice em todo o app ⭐ MVP

**User Story**: As a usuário da família, I want ver a marca Vértice na sidebar, no login e na aba do navegador so that o app tenha a identidade do produto.

**Why P1**: É o núcleo do pedido e a base visual para os demais rótulos.

**Acceptance Criteria**:

1. The system SHALL provide the component `Logo` in `src/components/brand/Logo.tsx` that renders a squircle escuro com o monograma "V" em gradiente roxo (#8b5cf6) para verde esmeralda (#10b981), um ponto esmeralda acima do "V", o texto "VÉRTICE" em `font-display` e o subtítulo "Gestão Patrimonial".  <!-- ubiquitous -->
2. The system SHALL render `Logo` in the sidebar of the signed-in area on `md` and wider and in the top bar below `md`, replacing the `WalletIcon` tile and the text "Orçamento".  <!-- ubiquitous -->
3. The system SHALL render `Logo` and the subtitle "Gestão Patrimonial Familiar" on the login screen, replacing the `WalletIcon` tile and the heading "Orçamento doméstico".  <!-- ubiquitous -->
4. WHILE the light theme is active the `Logo` text SHALL stay readable with the `foreground` and `muted-foreground` tokens, and the squircle and the "V" gradient SHALL stay unchanged.  <!-- state-driven -->
5. The system SHALL serve `public/favicon.svg` and `src/app/icon.svg` with the content of `docs/vertice_favicon.svg`, and the `<head>` of every page SHALL link that icon.  <!-- ubiquitous -->
6. The system SHALL set the root metadata `title.default` to "Vértice", `title.template` to "Vértice • %s" and `description` to "Vértice – Gestão Patrimonial Familiar".  <!-- ubiquitous -->
7. WHEN the Visão Geral page loads THEN the system SHALL set the document title to "Vértice • Visão Geral".  <!-- event-driven -->
8. WHEN the Alocação page loads THEN the system SHALL set the document title to "Vértice • Alocação".  <!-- event-driven -->
9. WHEN the Ápice page loads THEN the system SHALL set the document title to "Vértice • Ápice".  <!-- event-driven -->
10. WHEN the login page loads THEN the system SHALL set the document title to "Vértice • Entrar".  <!-- event-driven -->
11. The system SHALL give the `Logo` the accessible name "Vértice" and mark the symbol decorative so a screen reader reads the name once.  <!-- ubiquitous -->
12. The system SHALL show no occurrence of the word "Orçamento" in user-visible text, in `<title>` or in metadata, including the login screen, the Alocação eyebrow and the design-system page.  <!-- ubiquitous -->

**Independent Test**: Abrir `/login` e uma tela logada, conferir o logo, o título da aba e o ícone da aba; alternar tema claro e escuro e ver o texto do logo legível.

---

### P1: Navegação Visão Geral, Alocação, Ápice ⭐ MVP

**User Story**: As a usuário, I want os itens do menu com os novos nomes so that a navegação reflita a linguagem patrimonial.

**Why P1**: A navegação aparece em todas as telas.

**Acceptance Criteria**:

1. The system SHALL label the navigation items "Visão Geral" (href `/`), "Alocação" (href `/categorias`) and "Ápice" (href `/liberdade`), keeping the current icons.  <!-- ubiquitous -->
2. WHEN the user opens `/`, `/categorias` or `/liberdade` THEN the system SHALL title the page header "Visão Geral", "Alocação" or "Ápice" respectively.  <!-- event-driven -->
3. WHEN the user opens `/categorias` THEN the system SHALL show the eyebrow "Planejamento", and WHEN the user opens `/liberdade` THEN the system SHALL show the eyebrow "Independência financeira".  <!-- event-driven -->
4. WHILE the current path starts with an item's href the system SHALL mark that item with `aria-current="page"`, as today.  <!-- state-driven -->

**Independent Test**: Clicar nos três itens e ver rótulo, título da página e item ativo.

---

### P1: Tela Alocação ⭐ MVP

**User Story**: As a usuário, I want a tela de categorias com a linguagem de alocação so that eu veja a distribuição da receita como estratégia patrimonial.

**Why P1**: Pedido central da seção 3.

**Acceptance Criteria**:

1. The system SHALL label the reference income field "Receita Base Mensal".  <!-- ubiquitous -->
2. The system SHALL show, under the page header, the support text "Alocação total obrigatória: 100% da receita".  <!-- ubiquitous -->
3. The system SHALL show the list header with the columns "CATEGORIA", "ALOCAÇÃO (%)", "VALOR PREVISTO (R$)", "SUBCATEGORIAS" and "AÇÕES", in that order, aligned with the row columns.  <!-- ubiquitous -->
4. The system SHALL show the fixed suffix "%" in the percent field and the fixed prefix "R$" in the amount field of every category row.  <!-- ubiquitous -->
5. WHILE a percent field is not focused the system SHALL show its value with at most 2 decimals, e.g. 6.303.138 micro-percent as "6,30".  <!-- state-driven -->
6. The system SHALL label the button of `AdjustSumBar` "Rebalancear" in place of "Aplicar".  <!-- ubiquitous -->
7. The system SHALL show each category removal control as the `Trash2Icon` icon button, with the `aria-label` "Remover categoria N" and the destructive color on hover and on focus, and no visible text "Remover" in the row.  <!-- ubiquitous -->
8. The system SHALL show each subcategory removal control as the `Trash2Icon` icon button, with the existing `aria-label` and the destructive color on hover and on focus, and no visible text "Remover" in the subcategory row.  <!-- ubiquitous -->
9. WHILE the sum of the percentages is not exactly 100% the "Salvar" button SHALL be disabled and carry the classes `opacity-50` and `cursor-not-allowed`.  <!-- state-driven -->
10. WHILE the sum of the percentages is exactly 100% and no save is pending the "Salvar" button SHALL be enabled without `opacity-50`.  <!-- state-driven -->

**Independent Test**: Abrir `/categorias`, ver rótulo, texto de apoio, cabeçalho e afixos; deixar a soma em 99% e ver "Salvar" apagado com cursor proibido e "Rebalancear" disponível; fechar em 100% e salvar.

---

### P1: Tela Ápice ⭐ MVP

**User Story**: As a usuário, I want os indicadores do objetivo com a linguagem de ápice patrimonial so that eu entenda onde estou em relação à independência financeira.

**Why P1**: Pedido central da seção 4.

**Acceptance Criteria**:

1. The system SHALL title the Ápice page "Ápice" and show the description text defined in Assumptions & Open Questions.  <!-- ubiquitous -->
2. The system SHALL label the hero indicators "Meta Patrimonial" (was "Patrimônio-alvo"), "Patrimônio Acumulado" (was "Guardado"), "Aporte Estratégico Mensal" (was "Aporte mensal necessário"), "Distância do Alvo" (was "Falta") and "Tempo até o Ápice" (was "Prazo restante").  <!-- ubiquitous -->
3. The system SHALL title the compound-interest chart "Trajetória dos Juros Compostos" (was "Evolução do patrimônio"), in the visible heading and in the chart `aria-label`.  <!-- ubiquitous -->
4. The system SHALL label the button that opens the goal form "Calibrar Parâmetros" (was "Editar objetivo").  <!-- ubiquitous -->
5. The system SHALL show the birth date field with the label "Data de nascimento", the placeholder "DD/MM/AAAA" and the text typed as DD/MM/AAAA with the slashes inserted by the mask.  <!-- ubiquitous -->
6. IF the birth date text is not a valid DD/MM/AAAA calendar date THEN the system SHALL show the existing message "Data de nascimento inválida".  <!-- unwanted-behavior -->
7. The system SHALL keep every value, calculation, saved field and live preview of the page unchanged.  <!-- ubiquitous -->

**Independent Test**: Abrir `/liberdade` com objetivo salvo, conferir os cinco indicadores, o título do gráfico e o botão; abrir o formulário e digitar a data.

---

### P2: Modal de lançamentos

**User Story**: As a usuário, I want o modal de transação com a linguagem de lançamento so that registrar entradas e saídas siga a mesma identidade.

**Why P2**: Completa a consistência da marca; depende de rótulos, não de estrutura.

**Acceptance Criteria**:

1. WHEN the user opens the modal from the new-transaction button THEN the system SHALL title the dialog and the form `aria-label` "Registrar Lançamento".  <!-- event-driven -->
2. WHEN the user opens the modal to edit a transaction THEN the system SHALL title the dialog and the form `aria-label` "Editar Lançamento".  <!-- event-driven -->
3. The system SHALL label the kind options of the modal "Saída de Caixa" (value `expense`, coral/destructive when selected) and "Entrada de Capital" (value `income`, green/success when selected).  <!-- ubiquitous -->
4. The system SHALL show, in the footer of the modal in both create and edit modes, the "Cancelar" button, which closes the modal without saving.  <!-- ubiquitous -->
5. WHERE the modal edits an existing transaction the system SHALL show in the footer the destructive button "Excluir lançamento" in place of "Excluir".  <!-- optional-feature -->
6. WHEN the user activates "Excluir lançamento" THEN the system SHALL start the existing deletion flow, with the existing confirmation dialog and result handling.  <!-- event-driven -->
7. WHILE the modal creates a new transaction the system SHALL show no "Excluir lançamento" button.  <!-- state-driven -->

**Independent Test**: Criar uma transação pelo botão flutuante e editar outra pela lista, conferindo títulos, seletor de tipo e rodapé.

---

## Edge Cases

- WHEN the viewport is narrower than `md` THEN the system SHALL show the `Logo` compact in the top bar without hiding the theme toggle and the "Sair" button.
- IF `Sora` has not loaded yet THEN the `Logo` text SHALL fall back to the sans-serif already set in the `font-display` token, with no layout overflow of the top bar.
- WHEN a category name is empty in `AdjustSumBar` THEN the system SHALL keep the fallback label "Categoria N", unchanged.
- IF the user has no saved goal THEN the Ápice page SHALL show the goal form open and no hero indicators, as today.
- WHEN the "Rebalancear" button is activated THEN the system SHALL apply the same adjustment as "Aplicar" did, with the same error handling.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| BRAND-01 | P1: Marca Vértice (AC1, AC4) | Design | Pending |
| BRAND-02 | P1: Marca Vértice (AC2, AC3) | Design | Pending |
| BRAND-03 | P1: Marca Vértice (AC5) | Design | Pending |
| BRAND-04 | P1: Marca Vértice (AC6, AC12) | Design | Pending |
| BRAND-05 | P1: Marca Vértice (AC7-AC10) | Design | Pending |
| BRAND-06 | P1: Marca Vértice (AC11) | Design | Pending |
| NAV-01 | P1: Navegação (AC1-AC4) | Design | Pending |
| ALOC-01 | P1: Alocação (AC1, AC2) | Design | Pending |
| ALOC-02 | P1: Alocação (AC3) | Design | Pending |
| ALOC-03 | P1: Alocação (AC4, AC5) | Design | Pending |
| ALOC-04 | P1: Alocação (AC6) | Design | Pending |
| ALOC-05 | P1: Alocação (AC7, AC8) | Design | Pending |
| ALOC-06 | P1: Alocação (AC9, AC10) | Design | Pending |
| APICE-01 | P1: Ápice (AC1) | Design | Pending |
| APICE-02 | P1: Ápice (AC2) | Design | Pending |
| APICE-03 | P1: Ápice (AC3) | Design | Pending |
| APICE-04 | P1: Ápice (AC4) | Design | Pending |
| APICE-05 | P1: Ápice (AC5, AC6) | Design | Pending |
| APICE-06 | P1: Ápice (AC7) | Design | Pending |
| LANC-01 | P2: Modal (AC1, AC2) | - | Pending |
| LANC-02 | P2: Modal (AC3) | - | Pending |
| LANC-03 | P2: Modal (AC4, AC7) | - | Pending |
| LANC-04 | P2: Modal (AC5, AC6) | - | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 23 total, 0 mapped to tasks, 23 unmapped ⚠️

---

## Success Criteria

- [ ] `grep -ri "orçamento"` em `src/` (fora de nomes de arquivo, comentários e identificadores) não encontra texto visível ao usuário.
- [ ] As quatro telas (login, Visão Geral, Alocação, Ápice) exibem o título de aba "Vértice • [Tela]" e o favicon do "V".
- [ ] Os rótulos citados no pedido aparecem exatamente como escritos, e `npm run lint`, `npm run build` e os testes unit e de integração passam.
- [ ] Nenhum valor monetário, percentual ou data exibido muda em relação à versão anterior.
