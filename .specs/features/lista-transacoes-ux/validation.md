# Lista de Transações: Filtros e Ações Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/lista-transacoes-ux/spec.md`
**Diff range**: `50fcad8..3124f7b`, filtrado aos arquivos da feature (`ui/dropdown-menu.tsx`, `transaction-row-menu.tsx`, `transaction-list.tsx`, `transaction-filter.tsx`, `content-card.tsx`, `new-transaction-button.tsx`, `(app)/page.tsx`). Ignorados: commits de outras sessões intercalados no histórico (`691afec`, `2e1f645`, `4e81433`).
**Verifier**: o próprio autor, inline (nenhum sub-agente foi criado nesta sessão). Author ≠ verifier NÃO foi cumprido; a independência é parcial e fica registrada aqui.
**Veredito**: ✅ PASS (7/7 requisitos, gate verde, verificação em navegador real). Sensor de discriminação: N/A, sem testes automáticos na feature (AD-005).

> Evidência de UI = `file:line` da implementação + execução em Chromium real (Playwright com spec temporário, já removido) a 1280px e 390px: 3 testes passaram. Os critérios de layout e menu não têm teste permanente por AD-005; o e2e atual (`e2e/transaction-list.spec.ts:37,45`) quebra e segue como dívida registrada em `tasks.md`.

---

## Task Completion

T1 a T7 concluídas, uma por commit: `50fcad8`, `6be9981`, `b68f318`, `0a50620`, `1e2845e`, `10decac`, `3124f7b`.

## Build Gate

`npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` verde no commit final: unit 458/458, integração 285/285, contra o banco privado `orcamento_lista_test`. Nenhum teste removido (a contagem só subiu, por commits de outra sessão). Duas execuções de integração tiveram timeout de 5 s em `src/lib/db/migration-0007.int.test.ts` sob carga da máquina; a repetição passou e o arquivo não é tocado por esta feature.

## Spec-Anchored Acceptance Criteria

| Requirement | Critério | `file:line` + expressão | Resultado |
| ----------- | -------- | ----------------------- | --------- |
| LISTA-01 | Três controles na mesma linha a partir de 768px | `transaction-filter.tsx:48` `grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]`; navegador a 1280px: diferença de `y` entre busca e selects ≤ 2px | ✅ PASS |
| LISTA-01 | Empilhados abaixo de 768px | mesma linha 48 (`grid-cols-1`); navegador a 390px: `y` busca < `y` categoria < `y` subcategoria | ✅ PASS |
| LISTA-01 | Rótulos mantidos | `transaction-filter.tsx` inalterado fora da linha 48 e da linha do campo de busca (rótulos "Buscar por descrição", "Filtrar por categoria", "Filtrar por subcategoria") | ✅ PASS |
| LISTA-02 | Parâmetros de URL inalterados | `apply` e `onSearch` sem diff (`git diff 0a50620^ 0a50620` toca só duas linhas de classe) | ✅ PASS |
| LISTA-03 | Sem "Editar"/"Excluir" visíveis na linha; botão "Ações do lançamento" | `transaction-list.tsx:135` `<TransactionRowMenu …/>` no lugar dos botões; `transaction-row-menu.tsx:19` `aria-label="Ações do lançamento"`; navegador: `row.getByText("Editar")` e `("Excluir")` com contagem 0 | ✅ PASS |
| LISTA-04 | Menu com exatamente Editar e Excluir | `transaction-row-menu.tsx:22-24`; navegador: `getByRole("menuitem")` tem texto `["Editar","Excluir"]` | ✅ PASS |
| LISTA-04 | Editar abre "Editar Lançamento" | `transaction-row-menu.tsx:22` `onSelect={onEdit}` → `transaction-list.tsx:136` `setEditing(t)`; navegador: formulário visível | ✅ PASS |
| LISTA-04 | Esc fecha o menu sem abrir diálogo | navegador: após `Escape`, `getByRole("menu")` com contagem 0 | ✅ PASS |
| LISTA-04 | Teclado: Enter abre, setas navegam | navegador: `Enter` abre, `ArrowDown` foca o item "Editar" | ✅ PASS |
| LISTA-05 | Excluir abre a confirmação sem apagar | `transaction-row-menu.tsx:23` `onSelect={onDelete}` → `transaction-list.tsx:137-140`; navegador: diálogo "Excluir transação?" visível, linha `Mercado` segue na lista (contagem 1), Cancelar mantém a linha | ✅ PASS |
| LISTA-06 | Botão "Nova transação" no cabeçalho a partir de 768px, abre o modal em branco | `new-transaction-button.tsx:36` `className="hidden md:inline-flex"`, `:38` texto "Nova transação"; `page.tsx:120` `action={<NewTransactionButton variant="header" …/>}`; navegador a 1280px: botão visível dentro do bloco, clique abre "Registrar Lançamento" | ✅ PASS |
| LISTA-06 | Salvar fecha o modal e mostra a transação | `new-transaction-button.tsx` `onSaved={() => setOpen(false)}` inalterado | ✅ PASS (código inalterado; fluxo já coberto por `lancamento-flutuante`) |
| LISTA-07 | "+" flutuante em todas as larguras | `new-transaction-button.tsx:44` `className="fixed … md:right-6 md:bottom-6 …"` sem `hidden`; `page.tsx:134`; navegador a 1280px: botão `.fixed` visível | ✅ PASS |
| LISTA-07 | Botão do cabeçalho oculto abaixo de 768px | `new-transaction-button.tsx:36` `hidden md:inline-flex`; navegador a 390px: só um botão "Nova transação" na árvore de acessibilidade e visível (o do cabeçalho fica `display:none`) | ✅ PASS |

## Edge Cases

- Transação sem descrição: o gatilho usa nome fixo (`transaction-row-menu.tsx:19`), independente da descrição ✅
- Menu na última linha dentro da viewport: navegador a 1280×900, `box.y + box.height ≤ 900` ✅
- Lista vazia a 1280px: botão do cabeçalho visível ✅
- Excluir pelo formulário de edição: caminho `onDelete` do formulário (`transaction-list.tsx`) sem diff ✅
- A página segue clicável depois de fechar o diálogo aberto pelo menu: navegador, Editar → Esc → menu reabre e Excluir abre ✅

## Pendências

- `e2e/transaction-list.spec.ts:37,45` precisa abrir o menu antes de Editar/Excluir; também há ambiguidade de "Nova transação" no desktop. Dívida registrada, e2e suspenso (AD-005).
- Não validado em aparelho de toque real; só emulação de viewport de 390px.
