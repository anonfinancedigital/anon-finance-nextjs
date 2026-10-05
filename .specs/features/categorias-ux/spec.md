# Categorias: Melhorias de UX/UI Specification

## Problem Statement

Na tela de Categorias, editar um valor em R$ (ex.: Mesada de R$ 1.200 para R$ 1.201) deixa a soma em 100,005248% e bloqueia o salvamento por R$ 1,00. O usuário vê percentuais com 6 casas, seis botões "Ajustar" repetidos sem explicação, colunas sem cabeçalho nem unidade, um "Remover" em texto colado ao lado de ações frequentes (apaga a categoria e todas as subcategorias com um clique) e um Salvar que parece ativo mesmo bloqueado. A feature torna a tela legível e faz o aviso de soma indicar o que fazer.

## Goals

- [ ] Nenhum percentual aparece com mais de 2 casas decimais fora do campo em foco, sem perder a precisão de 6 casas guardada e salva.
- [ ] Quando a soma difere de 100%, o usuário vê a diferença em % e em R$ e fecha a soma escolhendo a categoria num único controle, sem botão repetido por linha.
- [ ] Remover uma categoria com subcategorias exige confirmação.
- [ ] Cada coluna tem cabeçalho e unidade (% e R$) visíveis.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mudar armazenamento ou validação do percentual (micro-percentual, 6 casas, soma exatamente 100%) | Decidido: exibir 2 casas, manter 6 internas (AD-006 continua valendo) |
| Absorção automática do resíduo na maior categoria | Decidido: aviso acionável, o usuário escolhe a categoria |
| Remover subcategoria (botão "Remover" de texto da subcategoria) | O pedido trata só da categoria |
| Salvar a receita de referência | Continua simulação local (spec simulacao-categorias) |
| Mudar formato de percentual em outras telas (resumo, gráficos) | Pedido é só a aba Categorias |
| Desfazer remoção | A remoção só vale ao salvar; recarregar descarta |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Casas decimais exibidas | 2 casas fixas ("6,30", "30,00") em campo sem foco e no rodapé Soma; em foco o campo mostra o texto completo digitado | Pedido do usuário; precisão de 6 casas preservada para o R$ voltar exato | y |
| Soma que arredonda para 100,00% sem ser 100% | O aviso e o rodapé mostram a soma com até 6 casas (formato atual) | Evita "100,00%" bloqueando o Salvar sem explicação | n |
| Aviso de soma | Texto único: `A soma deve ser 100%. Atual: 100,01% (+R$ 1,00)`; abaixo de 100%: `A soma deve ser 100%. Atual: 99,99% (-R$ 1,00)`; sem receita de referência ou diferença que arredonda para R$ 0,00, omite o trecho entre parênteses | Substitui a mensagem atual; L-002 exige texto exato | n |
| Valor em R$ da diferença | allocateCents(receita, \|100% − soma\|), mesmo arredondamento do R$ por linha | Um arredondamento só no app | n |
| Controle de ajuste | Aparece junto ao aviso enquanto a soma ≠ 100%: rótulo "Descontar a diferença em" (soma acima) ou "Acrescentar a diferença em" (soma abaixo), `select` com as categorias e botão "Aplicar" | Pedido do usuário (mini-select + Aplicar) | y |
| Opções e padrão do select | Uma opção por categoria, com o nome (ou "Categoria N" se vazio); padrão = categoria de maior percentual válido, a primeira em empate | Maior categoria absorve a diferença com menor distorção relativa | n |
| Cálculo ao aplicar | Reaproveita `adjustToTotal` (percentual da linha + 100% − soma, micro-percentual inteiro) e a mensagem de fora do intervalo já existente | Regra já validada na feature ajuste-para-100 | n |
| Botões "Ajustar" por linha | Removidos | Pedido do usuário | y |
| Confirmação de remoção | Diálogo só para categoria com 1+ subcategorias; sem subcategorias remove na hora | Decidido pelo usuário | y |
| Texto da confirmação | Título "Remover categoria?"; corpo `"Custos fixos" e suas 4 subcategorias serão removidas ao salvar.` (singular: "sua 1 subcategoria"); botões "Cancelar" e "Remover" | L-002 | n |
| Ícone de remover | `Trash2` de 16px, `aria-label` "Remover categoria N" mantido, opacidade 40% e 100% com cor destrutiva no hover ou foco da linha; sempre visível (também no toque) | Pedido do usuário; nunca invisível, para teclado e toque | n |
| Estilo do Salvar bloqueado | Atributo `disabled` (já existe) com opacidade 40% e cursor `not-allowed` | Pedido do usuário | y |
| Cabeçalhos | Linha "CATEGORIA, % DO TOTAL, VALOR ESTIMADO, SUBCATEGORIAS, AÇÕES" visível a partir de `sm`; abaixo disso fica oculta e os campos mantêm `aria-label` | Linhas quebram em telas estreitas e o cabeçalho desalinharia | n |
| Prefixo e sufixo | "%" fixo à direita do percentual e "R$" fixo à esquerda do valor, dentro do campo, fora do valor digitado, sem alterar `aria-label` | Pedido do usuário | y |
| Card de receita de referência | Com receita válida: card "Base de cálculo mensal: R$ 19.054,00" (valor reformatado) e botão "Editar base"; sem receita: mostra o campo direto | Pedido do usuário | y |
| Fim da edição da base | Enter ou perda de foco com texto vazio ou válido volta ao card; texto inválido mantém o campo aberto com o erro | Não prende o usuário em campo inválido sem feedback | n |
| Texto do card sem receita | Campo "Receita de referência (R$)" com placeholder "5.000,00", como hoje | Primeiro uso sem mudança | n |
| Testes e2e existentes | `e2e/categories.spec.ts` é ajustado ao novo fluxo mas não roda (AD-005) | Evita deixar specs obsoletos no repositório | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Soma acionável e percentuais legíveis ⭐ MVP

**User Story**: Como usuário que edita as categorias, quero ver a diferença da soma em % e R$ e escolher onde descontá-la, para fechar 100% sem cálculo e sem casas decimais assustadoras.

**Why P1**: É a dor central do pedido (R$ 1,00 travando o Salvar com seis botões iguais na tela).

**Acceptance Criteria**:

1. WHILE o campo de percentual de uma categoria não está em foco, the system SHALL exibir o percentual válido com exatamente 2 casas decimais ("6,30", "30,00").  <!-- state-driven -->
2. WHILE o campo de percentual está em foco, the system SHALL exibir o texto completo da linha, com até 6 casas.  <!-- state-driven -->
3. The system SHALL preservar o percentual com 6 casas no estado da linha e no valor enviado ao salvar, independente do formato exibido.  <!-- ubiquitous -->
4. WHEN o foco sai do campo de percentual, the system SHALL manter inalterado o percentual guardado da linha.  <!-- event-driven -->
5. The system SHALL exibir a soma do rodapé com 2 casas decimais quando a soma arredondada difere de 100,00% ou é exatamente 100%.  <!-- ubiquitous -->
6. IF a soma difere de 100% mas arredonda para 100,00% com 2 casas, THEN the system SHALL exibir a soma com até 6 casas no rodapé e no aviso.  <!-- unwanted-behavior -->
7. WHILE a soma difere de 100% e a receita de referência é válida, the system SHALL exibir o aviso `A soma deve ser 100%. Atual: <soma> (<+|->R$ <diferença>)`, sendo `+` para soma acima e `-` para soma abaixo de 100%.  <!-- state-driven -->
8. WHILE a soma difere de 100% e não há receita válida ou a diferença em R$ arredonda para R$ 0,00, the system SHALL exibir o aviso `A soma deve ser 100%. Atual: <soma>` sem o trecho entre parênteses.  <!-- state-driven -->
9. WHILE a soma difere de 100%, the system SHALL exibir junto ao aviso um select com todas as categorias e o botão "Aplicar", rotulado "Descontar a diferença em" para soma acima de 100% e "Acrescentar a diferença em" para soma abaixo.  <!-- state-driven -->
10. WHILE a soma difere de 100%, the system SHALL pré-selecionar no select a categoria de maior percentual válido (a primeira em caso de empate).  <!-- state-driven -->
11. WHEN o usuário clica em "Aplicar", the system SHALL ajustar o percentual da categoria escolhida pela diferença, deixando a soma em exatamente 100%.  <!-- event-driven -->
12. IF o percentual resultante da categoria escolhida ficaria menor que 0,000001% ou maior que 100%, THEN the system SHALL manter todos os percentuais e exibir a mensagem "Não é possível ajustar esta categoria: o percentual ficaria fora do intervalo de 0,000001% a 100%".  <!-- unwanted-behavior -->
13. WHILE a soma é exatamente 100%, the system SHALL ocultar o aviso, o select e o botão "Aplicar".  <!-- state-driven -->
14. The system SHALL NOT exibir o botão "Ajustar" em nenhuma linha de categoria.  <!-- ubiquitous -->

**Independent Test**: Com receita R$ 19.054,00 e a Mesada editada de R$ 1.200 para R$ 1.201, ver `A soma deve ser 100%. Atual: 100,01% (+R$ 1,00)`, o select com a maior categoria selecionada, clicar em "Aplicar" e ver soma "100,00%" e Salvar habilitado; nenhum campo mostra mais de 2 casas fora do foco.

---

### P2: Remoção segura e Salvar com estado claro

**User Story**: Como usuário, quero que remover uma categoria com subcategorias peça confirmação e que o Salvar pareça bloqueado quando a soma não fecha, para não perder dados nem clicar à toa.

**Why P2**: Evita perda acidental; não bloqueia o fluxo principal.

**Acceptance Criteria**:

1. The system SHALL exibir a ação de remover categoria como ícone de lixeira de 16px, com `aria-label` "Remover categoria N".  <!-- ubiquitous -->
2. WHILE o ponteiro está sobre a linha ou o foco está dentro dela, the system SHALL exibir o ícone de remover com opacidade total e cor destrutiva; nos demais estados SHALL exibi-lo com opacidade 40%.  <!-- state-driven -->
3. WHEN o usuário aciona remover em categoria com 1 ou mais subcategorias, the system SHALL abrir um diálogo com o título "Remover categoria?", o texto `"<nome>" e suas <n> subcategorias serão removidas ao salvar.` e os botões "Cancelar" e "Remover".  <!-- event-driven -->
4. WHEN o usuário confirma em "Remover", the system SHALL remover a linha da lista e fechar o diálogo.  <!-- event-driven -->
5. WHEN o usuário aciona "Cancelar" ou fecha o diálogo, the system SHALL manter a categoria e todas as subcategorias.  <!-- event-driven -->
6. WHEN o usuário aciona remover em categoria sem subcategorias, the system SHALL remover a linha sem diálogo.  <!-- event-driven -->
7. IF a categoria removida tem exatamente 1 subcategoria, THEN the system SHALL escrever "sua 1 subcategoria" no texto do diálogo.  <!-- unwanted-behavior -->
8. WHILE a soma difere de 100% ou o salvamento está em andamento, the system SHALL exibir o botão Salvar desabilitado com opacidade 40% e cursor `not-allowed`.  <!-- state-driven -->

**Independent Test**: Clicar na lixeira de "Custos fixos" (4 subcategorias) e ver o diálogo com 4 subcategorias; "Cancelar" mantém tudo; com soma 100,01% o Salvar aparece apagado.

---

### P3: Cabeçalhos, unidades e card da base de cálculo

**User Story**: Como usuário que abre a tela pela primeira vez, quero cabeçalhos, unidades e uma base de cálculo explícita, para entender o que cada campo representa.

**Why P3**: Clareza; não muda comportamento de dados.

**Acceptance Criteria**:

1. WHILE a largura da tela é `sm` ou maior, the system SHALL exibir acima da lista a linha de cabeçalhos "CATEGORIA", "% DO TOTAL", "VALOR ESTIMADO", "SUBCATEGORIAS" e "AÇÕES".  <!-- state-driven -->
2. WHILE a largura da tela é menor que `sm`, the system SHALL ocultar a linha de cabeçalhos.  <!-- state-driven -->
3. The system SHALL exibir "%" fixo à direita dentro do campo de percentual e "R$" fixo à esquerda dentro do campo de valor, sem incluir os símbolos no texto do campo.  <!-- ubiquitous -->
4. WHILE a receita de referência digitada é válida, the system SHALL exibir o card `Base de cálculo mensal: <valor em R$>` com o valor reformatado (ex.: "R$ 19.054,00") e o botão "Editar base", ocultando o campo.  <!-- state-driven -->
5. WHEN o usuário clica em "Editar base", the system SHALL exibir o campo "Receita de referência (R$)" com o texto atual e foco nele.  <!-- event-driven -->
6. WHEN o usuário pressiona Enter ou tira o foco do campo da base com texto vazio ou válido, the system SHALL voltar ao card (texto vazio volta ao campo vazio sem card).  <!-- event-driven -->
7. IF o texto da base é inválido, THEN the system SHALL manter o campo aberto e exibir a mensagem de erro de `parseBRL`.  <!-- unwanted-behavior -->
8. WHILE a receita de referência está vazia, the system SHALL exibir o campo "Receita de referência (R$)" com placeholder "5.000,00" no lugar do card.  <!-- state-driven -->

**Independent Test**: Abrir a tela com ganhos no mês e ver o card "Base de cálculo mensal: R$ 19.054,00"; "Editar base" abre o campo; trocar o valor e Enter atualiza o card e os valores em R$ das linhas.

---

## Edge Cases

- IF o usuário digita em uma categoria um percentual inválido THEN the system SHALL mostrar o texto digitado como está, sem formatar a 2 casas, e manter a mensagem de erro da linha.
- WHEN o usuário adiciona ou remove categoria e a soma passa a diferir de 100% THEN the system SHALL atualizar o aviso e as opções do select imediatamente.
- IF o select aponta para uma categoria que foi removida THEN the system SHALL voltar ao padrão (maior percentual válido).
- WHEN a mensagem de ajuste fora do intervalo está visível e o usuário altera qualquer campo THEN the system SHALL removê-la.
- WHEN o salvamento é aceito e as categorias voltam do servidor THEN the system SHALL manter o card da base com o valor digitado.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CATUX-01 | P1: Soma acionável (exibição 2 casas, ACs 1-6) | - | Implemented |
| CATUX-02 | P1: Soma acionável (aviso, ACs 7-8) | - | Implemented |
| CATUX-03 | P1: Soma acionável (select e Aplicar, ACs 9-14) | - | Implemented |
| CATUX-04 | P2: Remoção segura (lixeira e confirmação, ACs 1-7) | - | Pending |
| CATUX-05 | P2: Salvar bloqueado (AC 8) | - | Pending |
| CATUX-06 | P3: Cabeçalhos e unidades (ACs 1-3) | - | Pending |
| CATUX-07 | P3: Card da base de cálculo (ACs 4-8) | - | Implemented |

**Coverage:** 7 total, 0 mapped to tasks, 7 unmapped ⚠️

---

## Success Criteria

- [ ] Editar a Mesada de R$ 1.200 para R$ 1.201 e fechar a soma em 100% leva 2 interações (escolher categoria, "Aplicar") e nenhum cálculo manual.
- [ ] Nenhum campo ou rodapé da aba mostra mais de 2 casas decimais fora do foco quando a soma é 100%.
- [ ] Remover "Custos fixos" com 4 subcategorias exige uma confirmação explícita.
- [ ] Testes unitários de domínio cobrem formatação a 2 casas, texto do aviso e diferença em R$; `npm test` e build passam.
