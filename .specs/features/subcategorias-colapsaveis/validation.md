# Subcategorias Colapsáveis - relatório de validação

## Validation: subcategorias-colapsaveis - PASS

**Date**: 2026-10-04
**Spec**: `.specs/features/subcategorias-colapsaveis/spec.md`
**Diff range**: `b395ca3..61e3043` (f74cdfa, 4cd6c1d, e8ea182, 2d54680, 9d9a122, 61e3043)
**Verifier**: sub-agente independente (autor ≠ verificador)
**Escopo avaliado**: código commitado em `61e3043`. As alterações não commitadas da feature `meta-categoria-bidirecional` (schema, budget, category-editor etc.) não foram avaliadas nem contadas.

Veredito: PASS com ressalvas. Nenhum AC é contrariado pelo código. A cobertura automatizada existe só para a camada de domínio (`category-label.ts`). Os ACs de UI estão **sem cobertura automatizada (AD-005)** e foram validados por leitura de código; a verificação manual (UAT) de T3 e T7 continua pendente.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `src/lib/domain/category-label.ts` + 9 testes unitários (f74cdfa) |
| T2 | ✅ Done | `src/components/category-card.tsx` (4cd6c1d) |
| T3 | ⚠️ Done, UAT pendente | `subcategory-editor.tsx` + 2 linhas em `category-editor.tsx:310-311` (e8ea182); verificação manual em /categorias não feita (AD-005) |
| T4 | ✅ Done | `new-transaction-button.tsx` aceita `color` (2d54680) |
| T5 | ✅ Done (sem commit) | `transaction-list.tsx` já tinha `color: number` no tipo; confirmado em `61e3043` |
| T6 | ✅ Done | `src/components/category-picker.tsx` (9d9a122) |
| T7 | ⚠️ Done, UAT pendente | `transaction-form.tsx` usa o picker (61e3043); verificação manual "Lazer › Cinema" não feita (AD-005) |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ PASS = teste automatizado afirma o valor da spec. 🟡 Código OK, sem cobertura automatizada (AD-005) = o componente implementa o critério (evidência por leitura de `file:line`), mas nenhum teste o exercita. Não é FAIL; é um gap de cobertura.

### P1: Subcategorias colapsáveis em Categorias

| # | Criterion | Spec-defined outcome | Evidência `file:line` | Result |
| - | --------- | -------------------- | --------------------- | ------ |
| P1-1 | WHEN /categorias carrega THEN quadrado colorido, nome, "N subcategorias", chevron para baixo, fechada | Todas fechadas; chevron para baixo | `subcategory-editor.tsx:34` - `useState(false)`; `category-card.tsx:44` - `open ? ChevronUpIcon : ChevronDownIcon`; `category-card.tsx:55-57` - `CategorySquare`, `categoryDisplayName(name)`, `subcategoryCountLabel(count)`; `category-editor.tsx:308-311` renderiza o card em cada linha | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-2 | WHEN clica no cabeçalho fechado THEN mostra a lista e chevron para cima | Lista visível, chevron para cima | `subcategory-editor.tsx:56` - `onToggle={() => setExpanded(!open)}`; `category-card.tsx:60` - `{open && children}`; `category-card.tsx:44` | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-3 | WHEN clica no cabeçalho aberto THEN oculta sem perder texto | Texto preservado | Estado do texto vive no pai: `subcategory-editor.tsx:77` - `value={item.name}` e `:80-81` - `onChange(items.map(...))` sobem para `rows` de `CategoryEditor` (`category-editor.tsx:314` - `update(i, { subcategories })`); desmontar o painel não descarta nada. Ressalva: com erro de salvamento presente, o clique não fecha (ver Observação O1) | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-4 | WHEN abre THEN cada subcategoria com marcador na cor da categoria e nome editável | Marcador `colorVar(color)`, `Input` editável | `subcategory-editor.tsx:64-68` - `style={{ backgroundColor: colorVar(color) }}`; `:69-83` - `Input` controlado com `aria-label` atual | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-5 | WHEN abre THEN último item "Nova subcategoria em <nome>" com "+" | Texto exato e ícone "+" | `subcategory-editor.tsx:99-107` - último filho do painel, `{addSubcategoryLabel(name)}` + `<PlusIcon>`; texto afirmado em `category-label.test.ts:43` - `expect(addSubcategoryLabel("Lazer")).toBe("Nova subcategoria em Lazer")` | ✅ PASS (texto) / 🟡 posição e ícone sem cobertura (AD-005) |
| P1-6 | WHEN clica em "Nova subcategoria…" THEN acrescenta item vazio ao fim e foca o campo | Item `name: ""` no fim; foco no novo `Input` | `subcategory-editor.tsx:43-47` - `focusKey.current = key; onChange([...items, { key, name: "" }])`; `:70-75` - ref callback foca quando `focusKey.current === item.key` e zera a chave. Análise: React 19.2 passa `ref` como prop (`ui/input.tsx` espalha `...props`); a ref inline é reexecutada a cada render, mas a chave zerada torna as chamadas seguintes no-op; no StrictMode (attach → detach → attach do mesmo nó DOM) o primeiro attach foca e o nó continua focado. Funciona | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-7 | WHEN remove THEN tira da lista e atualiza a contagem | Contagem = itens restantes | `subcategory-editor.tsx:89` - `items.filter((_, k) => k !== j)`; `:54` - `count={items.length}` | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-8 | WHILE 30 subcategorias THEN linha de adição desabilitada | `disabled` com 30 | `subcategory-editor.tsx:101` - `disabled={items.length >= MAX_SUBCATEGORIES}` (`MAX_SUBCATEGORIES = 30` em `budget.ts`) | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-9 | IF salvamento rejeitado com erro em categoria fechada THEN abre e mostra o erro | Card aberto + mensagem | `subcategory-editor.tsx:37-40` - `open = expanded \|\| !!listError \|\| hasNameError`; `:94` e `:98` exibem as mensagens. Regra de validação do servidor coberta pelos testes de integração existentes de `saveCategories` (inalterados) | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P1-10 | "1 subcategoria" para 1, "N subcategorias" nos demais, incluindo 0 | Strings exatas | `category-label.test.ts:12-15` - `toBe("0 subcategorias")`, `toBe("1 subcategoria")`, `toBe("2 subcategorias")`, `toBe("30 subcategorias")`; usado em `category-card.tsx:57` | ✅ PASS |
| P1-11 | Cabeçalho é botão com aria-expanded e aria-controls para o painel | `<button aria-expanded aria-controls={id}>`; painel com esse `id` | `category-card.tsx:48-52` - `<button type="button" aria-expanded={open} aria-controls={id}>`; `:60` - `<div id={id}>` sempre presente no DOM; id único por categoria em `subcategory-editor.tsx:51` | 🟡 Código OK, sem cobertura automatizada (AD-005) |

### P2: Seletor agrupado no formulário de lançamento

| # | Criterion | Spec-defined outcome | Evidência `file:line` | Result |
| - | --------- | -------------------- | --------------------- | ------ |
| P2-1 | WHEN o formulário de gasto abre THEN categorias fechadas, a atual aberta e marcada ao editar | Novo gasto: tudo fechado; edição: card da categoria atual aberto, radio marcado | `category-picker.tsx:35` - `useState(() => (categoryId ? [categoryId] : []))`; novo gasto tem `categoryId: ""` (`transaction-form.tsx:53`); edição passa `editing.categoryId` (`transaction-list.tsx`); radio marcado em `category-picker.tsx:81` e `:92`; categoria sem subcategorias marcada em `:58` | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P2-2 | WHEN abre categoria com subcategorias THEN "Sem subcategoria" e cada subcategoria selecionáveis | Radios | `category-picker.tsx:75-84` ("Sem subcategoria") e `:85-96` (uma por subcategoria) | 🟡 Código OK, sem cobertura automatizada (AD-005) |
| P2-3 | WHEN seleciona subcategoria THEN categoryId e subcategoryId dessa subcategoria | `{ categoryId: c.id, subcategoryId: s.id }` | `category-picker.tsx:93` - `onChange(pickSelection(c.id, s.id))`; `transaction-form.tsx:166` - `setValues((v) => ({ ...v, ...selection }))`; enviado em `transaction-form.tsx:89`; `category-label.test.ts:57` - `toEqual({ categoryId: "c1", subcategoryId: "s1" })` | ✅ PASS (mapeamento) / 🟡 ligação da UI sem cobertura (AD-005) |
| P2-4 | WHEN seleciona "Sem subcategoria" THEN categoryId e subcategoryId vazio | `{ categoryId: c.id, subcategoryId: "" }` | `category-picker.tsx:82` - `onChange(pickSelection(c.id))`; `category-label.test.ts:53` - `toEqual({ categoryId: "c1", subcategoryId: "" })` | ✅ PASS (mapeamento) / 🟡 ligação da UI sem cobertura (AD-005) |
| P2-5 | WHEN seleciona categoria sem subcategorias THEN categoryId e subcategoryId vazio | Igual a P2-4 | `category-picker.tsx:49-62`, `:59` - `onChange(pickSelection(c.id))`; mesmo teste `category-label.test.ts:53` | ✅ PASS (mapeamento) / 🟡 ligação da UI sem cobertura (AD-005) |
| P2-6 | IF salvar sem categoria THEN mensagem de erro de categoria atual e não salvar | "Selecione uma categoria" | Formulário envia `categoryId: ""` (`transaction-form.tsx:89`); servidor: `validation/transaction.ts:49` - `z.uuid({ error: "Selecione uma categoria" })`, afirmado em `src/actions/transactions.int.test.ts:99` (com `undefined`; com `""` o mesmo schema e a mesma mensagem); exibição em `transaction-form.tsx:168-170` | ✅ PASS (servidor) / 🟡 exibição sem cobertura (AD-005) |
| P2-7 | WHERE ganho THEN sem seletor de categoria | Picker ausente | `transaction-form.tsx:150` - `{values.kind === "expense" && (...)}`; payload de ganho sem categoria em `:90` | 🟡 Código OK, sem cobertura automatizada (AD-005) |

**Status**: ✅ Nenhum AC contrariado pelo código. 5 ACs com assertiva automatizada no valor da spec (P1-10 integral; P1-5, P2-3, P2-4, P2-5, P2-6 na parte de domínio/servidor). ⚠️ 13 ACs (ou partes de UI) sem cobertura automatizada por AD-005. Nenhum spec-precision gap: a spec define as saídas com precisão.

---

## Edge Cases

- [x] Nome vazio → "Nova categoria" no cabeçalho e "Nova subcategoria em Nova categoria": `category-label.test.ts:25-26` - `toBe("Nova categoria")`; `category-label.test.ts:47` - `toBe("Nova subcategoria em Nova categoria")`; usado em `category-card.tsx:56` e `subcategory-editor.tsx:105`. ✅ PASS
- [x] Renomear categoria atualiza cabeçalho e linha de adição sem recarregar: `category-editor.tsx:310` passa `name={row.name}` (estado em edição). 🟡 Código OK, sem cobertura automatizada (AD-005)
- [x] Nome vazio ou duplicado mantém o erro atual: lógica de validação e `saveCategories` não mudaram no intervalo (diff só toca UI e `category-label.ts`); exibição em `subcategory-editor.tsx:94`. ✅ inalterado

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt 61e3043` (com `node_modules` por hard link). Comando: `npx vitest run --project unit src/lib/domain/category-label.test.ts`. Arquivo restaurado da cópia após cada mutante (`diff` vazio conferido).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/lib/domain/category-label.ts:4` | `count === 1` → `count <= 1` (singular para 0) | ✅ Killed (1 falha) |
| 2 | `src/lib/domain/category-label.ts:9` | `name.trim() \|\| FALLBACK_NAME` → `name \|\| FALLBACK_NAME` (sem trim, fallback quebra para nome em branco) | ✅ Killed (3 falhas) |
| 3 | `src/lib/domain/category-label.ts:25` | `pickSelection` devolve `subcategoryId: subcategoryId \|\| categoryId` | ✅ Killed (1 falha) |
| 4 | `src/lib/domain/category-label.ts:23` | Padrão `subcategoryId = ""` → `"none"` | ✅ Killed (1 falha) |
| 5 | `src/lib/domain/category-label.ts:13` | Remove `.toUpperCase()` da inicial | ✅ Killed (1 falha) |
| 6 | `src/lib/domain/category-label.ts:17` | Rótulo de adição sem `categoryDisplayName` (sem fallback) | ✅ Killed (1 falha) |

**Sensor depth**: lightweight ampliado (6 mutações; feature não é P0).
**Sensor result**: 6/6 killed - PASS.
**Isolamento**: `git worktree remove --force` + `git worktree prune`; `git status --porcelain` da árvore real idêntico ao baseline capturado antes do sensor (`diff` vazio). Nenhum `git stash` usado.
**Limite**: o sensor só alcança `category-label.ts`; os componentes não têm teste, então mutações neles (ex.: trocar `>=` por `>` no limite de 30, `useState(true)`, remover o foco) sobreviveriam por definição - ver gap G1.

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` (Node v20.20.2)
- **Onde**: worktree isolado em `61e3043`. Observação: `61e3043` sozinho não passa no typecheck/build por causa de `src/actions/transactions.int.test.ts:27,241,622` (usa `percentMicro`, que só existe no schema não commitado da `meta-categoria-bidirecional`; arquivo vem de `b583b0c`, fora do intervalo desta feature). Por isso o gate foi rodado no worktree de `61e3043` com os arquivos não commitados da outra feature sobrepostos (o mesmo estado da árvore real). Os arquivos desta feature ficaram byte a byte iguais ao commit (`git diff HEAD` vazio para eles). O `next build` não foi rodado na árvore real para não sobrescrever o `.next` usado pelo `next start` de outra sessão.
- **Gate result**: typecheck exit 0, lint exit 0, build exit 0, test:unit exit 0, test:int exit 0
- **Unit**: 12 arquivos, 312 testes passaram (com os testes da outra feature); em `61e3043` puro, 305 passaram
- **Integration**: 11 arquivos, 234 testes passaram (primeira execução, sem instabilidade de FK)
- **Test count**: +9 testes unitários novos (`category-label.test.ts`); nenhum teste removido nem enfraquecido no intervalo
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `pickSelection` é trivial, mas está na interface do design e tem teste |
| Surgical changes | ✅ `category-editor.tsx` só ganhou 2 linhas (`:310-311`) |
| No scope creep | ✅ sem mudança de schema, action ou repositório |
| Matches patterns | ✅ inputs nativos, `colorVar`, `aria-expanded` como antes |
| Spec-anchored outcome check | ✅ testes de domínio afirmam as strings e ids exatos da spec |
| Per-layer Coverage Expectation met | ✅ domínio 1:1 com os ACs aplicáveis; UI sem teste por decisão da matriz (AD-005) |
| Every test maps to a spec requirement | ✅ os 9 testes mapeiam P1-5, P1-10, P2-3/4/5 e o edge case de nome vazio; `categoryInitial` mapeia a decisão "quadrado com a inicial" |
| Documented guidelines followed | ✅ `AGENTS.md`, `vitest.config.ts`, AD-005 |

### Observações (não bloqueiam; nenhum AC contrariado)

- **O1 (Minor, UX)**: com erro de salvamento ativo, `open` fica forçado (`subcategory-editor.tsx:40`) e o clique no cabeçalho (`:56`, `setExpanded(!open)` → `false`) não fecha o card até o próximo salvamento sem erro. Depois de um salvamento bem-sucedido o card fecha sozinho, mesmo que o usuário o estivesse usando. P1-3 não trata desse estado; a spec só exige abrir no erro.
- **O2 (Minor, UX)**: no picker, se o usuário fechar o card da categoria selecionada, o radio desmonta e nada no cabeçalho indica a seleção (`category-picker.tsx:71`, `category-card.tsx:60`). A spec não pede indicação no cabeçalho.
- **O3 (fora de escopo)**: `61e3043` não compila sozinho por causa de `src/actions/transactions.int.test.ts:27` (dependência de WIP não commitado de outra feature). Não é desta feature, mas `main` fica sem build verde até a `meta-categoria-bidirecional` ser commitada.

---

## Coverage Gaps (ranqueados)

1. **G1 - UI sem cobertura automatizada (AD-005)**: P1-1, P1-2, P1-3, P1-4, P1-6, P1-7, P1-8, P1-9, P1-11, P2-1, P2-2, P2-7 e as ligações de UI de P1-5, P2-3..P2-6. Evidência só por leitura de código (`subcategory-editor.tsx`, `category-card.tsx`, `category-picker.tsx`, `transaction-form.tsx`). Ação: quando AD-005 for revisto, cobrir em e2e principalmente P1-6 (foco), P1-8 (limite de 30), P1-9 (abertura por erro) e P2-1 (categoria atual aberta e marcada).
2. **G2 - UAT pendente**: verificação manual de T3 (/categorias: abrir "Lazer", adicionar, salvar, recarregar) e T7 (lançar "Lazer › Cinema"; editar e ver a categoria aberta e marcada) não foi executada.
3. **G3 - P2-6 com `""`**: o teste de integração usa `categoryId: undefined` (`src/actions/transactions.int.test.ts:99`); o formulário envia `""`. O schema produz a mesma mensagem, mas não há assertiva com `""`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| SUBCOL-01 | Pending | ✅ Verified (código; UI sem teste, AD-005) |
| SUBCOL-02 | Pending | ✅ Verified (código; UI sem teste, AD-005) |
| SUBCOL-03 | Pending | ✅ Verified (código; UI sem teste, AD-005) |
| SUBCOL-04 | Pending | ✅ Verified (domínio testado; UI sem teste, AD-005) |
| SUBCOL-05 | Pending | ✅ Verified (servidor testado; UI sem teste, AD-005) |

---

## Summary

**Overall**: ✅ Ready, com UAT pendente

**Spec-anchored check**: 18/18 ACs implementados conforme a spec; 5 com assertiva automatizada no valor da spec; 13 só por leitura de código (AD-005); 0 spec-precision gaps
**Sensor**: 6/6 mutações mortas
**Gate**: typecheck, lint e build ok; 312 unit + 234 int passaram, 0 falhas

**What works**: cards colapsáveis com contagem singular/plural, foco no novo campo, limite de 30, abertura por erro, seletor agrupado gravando `categoryId`/`subcategoryId`, ganho sem seletor.

**Issues found**: nenhum defeito contra os ACs. Gaps de cobertura G1-G3 e observações O1-O3 acima.

**Next steps**: fazer a UAT de T3 e T7; decidir se O1 merece ajuste (permitir fechar o card mesmo com erro).
