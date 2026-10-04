# Subcategorias Validation

**Date**: 2026-10-04
**Spec**: `.specs/features/subcategorias/spec.md`
**Diff range**: `490de3e^..8bf0cee` (17 commits, 31 arquivos, +3450/-69)
**Verifier**: sub-agente independente (autor ≠ verificador)

## Validation: subcategorias - PASS

Veredito: PASS. Todos os ACs com teste automatizado têm evidência `file:line` com valor igual ao da spec; os ACs só de UI foram inspecionados no componente; gate de build verde; sensor 19/19 mutantes mortos. Há lacunas de baixo impacto (ver Lacunas) e nenhuma bloqueia.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T17 | ✅ Done | `tasks.md`: 78 caixas `[x]`, 0 `[ ]`. Nenhum teste removido nem asserção enfraquecida no diff (só fixtures ganharam `subcategories: []`). |

---

## Spec-Anchored Acceptance Criteria

Convenção: `budget.test` = `src/lib/domain/budget.test.ts`; `schema.int` = `src/lib/db/schema.int.test.ts`; `cat.repo` = `src/lib/db/repos/categories.int.test.ts`; `tx.repo` = `src/lib/db/repos/transactions.int.test.ts`; `cat.act` = `src/actions/categories.int.test.ts`; `tx.act` = `src/actions/transactions.int.test.ts`; `cat.val` = `src/lib/validation/category.test.ts`; `tx.val` = `src/lib/validation/transaction.test.ts`; `filter.test` = `src/lib/domain/transaction-filter.test.ts`.

### P1: Gerenciar subcategorias na tela de Categorias (SUB-01..03)

| Critério | Resultado esperado (spec) | `file:line` + asserção | Result |
| -------- | ------------------------- | ---------------------- | ------ |
| AC1 adicionar + salvar persiste sob a categoria | subcategoria vinculada à categoria | `cat.repo:225-233` `expect(names(conforto)).toEqual(["Restaurante","Streaming"])`; `cat.act:187-195` `expect(conforto.subcategories.map(s=>s.name)).toEqual([...])` + `expect(revalidatePath).toHaveBeenCalledWith("/")`. Exibição na tela: UI sem teste automatizado, `src/components/category-editor.tsx:47` (estado inicial vindo de `c.subcategories`) e `src/components/subcategory-editor.tsx:46-73` | ✅ PASS (persistência) / UI inspecionada |
| AC2 renomear persiste e vale p/ gastos vinculados | novo nome; gastos continuam ligados | `cat.repo:245-247` `expect(after).toEqual({ id: sub.id, name: "Almoço" })` e `expect(await db.$count(transaction, eq(transaction.subcategoryId, sub.id))).toBe(2)` | ✅ PASS (rótulo na lista resolve por id: `src/components/transaction-list.tsx:68`, sem teste) |
| AC3 nome vazio/ >40 rejeitado com msg no campo | erro no campo da subcategoria | `budget.test:190-192` `toEqual({"0.subcategories.1.name":"Informe o nome da subcategoria"})`; `:196-198` (só espaços); `:203-205` 41 chars `"O nome deve ter no máximo 40 caracteres"`; `:202` 40 aceito; `:209` trim antes de medir; zod `cat.val:89-94` `path: "0.subcategories.1.name"` | ✅ PASS (texto da mensagem não definido na spec: ver ⚠️ 1) |
| AC4 nome repetido na categoria, sem diferenciar caixa | "Já existe uma subcategoria com esse nome nesta categoria" | `budget.test:213-215` `toEqual({"0.subcategories.1.name":"Já existe uma subcategoria com esse nome nesta categoria"})`; `cat.val:97-100`; `cat.act:197-208` `fieldErrors:{"1.subcategories.1.name": ...}` + `expect(await names()).toEqual([])`; `schema.int:204-210` `toBe(UNIQUE_VIOLATION)` | ✅ PASS |
| AC5 mesmo nome em categorias diferentes aceito | salvamento aceito | `budget.test:219` `toEqual({ ok: true })`; `schema.int:213-220` `expect(await db.$count(subcategory)).toBe(2)` | ✅ PASS |
| AC6 > 30 subcategorias rejeitado | "Máximo de 30 subcategorias por categoria" | `budget.test:223-225` 30 aceito `toEqual({ ok: true })`; `:229-231` 31 `toEqual({"0.subcategories":"Máximo de 30 subcategorias por categoria"})`; `cat.val:103-109` | ✅ PASS (botão desabilitado em 30: `subcategory-editor.tsx:79`, UI sem teste) |
| AC7 excluir subcategoria com gastos bloqueia e informa quantidade | bloqueia o salvamento; informa N | `cat.repo:277` `toEqual({ ok:false, error:"Esta subcategoria tem 3 gastos e não pode ser excluída", fieldErrors:{"1.subcategories": message} })` e `:278` `expect(await categoriesRepo.list(userId)).toEqual(saved)`; `cat.act:237-243` idem via action + `expect(revalidatePath).not.toHaveBeenCalled()`; `schema.int:258` `toBe(FK_VIOLATION)` | ✅ PASS |
| AC8 excluir subcategoria sem gastos remove | removida | `cat.repo:256-257` `expect(names(...)).toEqual(["Restaurante"])` | ✅ PASS |
| AC9 excluir categoria sem gastos remove as subcategorias | categoria + subs removidas | `cat.repo:288-289` `expect(await db.$count(subcategory)).toBe(0)`; `schema.int:269-270` (cascade) `toBe(0)`; msg de categoria preservada com gasto em sub: `cat.repo:300-304` `toEqual({ok:false,error:"Esta categoria tem 2 gastos e não pode ser excluída"})` | ✅ PASS |
| AC10 soma 100% ignora subcategorias | soma só das categorias | `budget.test:239-242` `toMatchObject({ok:false,error:"A soma dos percentuais deve ser 100% (atual: 90%)"})` com subs presentes; `:185-186` `toEqual({ok:true})` | ✅ PASS |

### P1: Escolher subcategoria ao lançar um gasto (SUB-04, SUB-05)

| Critério | Resultado esperado (spec) | `file:line` + asserção | Result |
| -------- | ------------------------- | ---------------------- | ------ |
| AC1 seletor lista só subs da categoria + "Sem subcategoria" | só as da categoria escolhida | UI sem teste automatizado — inspecione o componente: `src/components/transaction-form.tsx:60` (`categories.find(c => c.id === values.categoryId)?.subcategories ?? []`), `:178` `<option value="">Sem subcategoria</option>`, `:179` `subcategories.map(...)` | 🖥️ UI inspecionada (OK) |
| AC2 gasto com sub da categoria persiste | persistido com a subcategoria | `tx.act:355` `expect((await stored()).subcategoryId).toBe(subcategoryId)`; `tx.repo:232-235` `toEqual([[withSub.id, restaurante],[withoutSub.id, null]])` | ✅ PASS |
| AC3 gasto sem sub persiste sem | `subcategoryId` nulo | `tx.act:358-362` (`undefined` e `""`) `expect((await stored()).subcategoryId).toBeNull()`; `tx.val:80` `toBeUndefined()` p/ `""` | ✅ PASS |
| AC4 sub de outra categoria/inexistente rejeitada | "Subcategoria não pertence à categoria" | `tx.act:368-373` (outra categoria) `toMatchObject({ok:false,fieldErrors:{subcategoryId:SUBCATEGORY_MESSAGE}})` + `expect(await db.$count(transaction)).toBe(0)`; `:377-381` (inexistente); `:388-392` (de outro usuário); `schema.int:238` FK composta `toBe(FK_VIOLATION)` | ✅ PASS |
| AC5 trocar categoria limpa a subcategoria | `subcategoryId = ""` | UI sem teste automatizado — inspecione o componente: `src/components/transaction-form.tsx:156` `setValues(v => ({ ...v, categoryId: e.target.value, subcategoryId: "" }))` (vale p/ criação e edição: mesmo form, `transaction-list.tsx:127`) | 🖥️ UI inspecionada (OK) |
| AC6 editar e trocar sub atualiza | atualiza e reflete no resumo/lista | `tx.act:401-405` `expect((await stored()).subcategoryId).toBe(streaming)` e depois `toBeNull()`; `tx.repo:240-244`; `:408-418` rejeição mantém `restaurante`; reflexo no resumo: `tx.repo:258-270` e `tx.act` `revalidatePath` em `tx.act:78` (padrão pré-existente) | ✅ PASS |
| AC7 categoria sem subs: seletor desabilitado | desabilitado com "Sem subcategoria" | UI sem teste automatizado — inspecione o componente: `src/components/transaction-form.tsx:174` `disabled={subcategories.length === 0}` + `:178` opção "Sem subcategoria" | 🖥️ UI inspecionada (OK) |
| AC8 ganho com subcategoria rejeitado | mensagem de validação | `tx.val:89-95` `toEqual({subcategoryId:["Ganho não tem subcategoria"]})`; `schema.int:245-250` `toBe(CHECK_VIOLATION)`; form não envia sub em ganho: `transaction-form.tsx:72-74` | ✅ PASS (sem teste no nível da action: ⚠️ 2) |
| AC9 gastos antigos válidos como "Sem subcategoria" | sem migração; nulo | `schema.int:273-279` `expect(row.subcategoryId).toBeNull()`; `tx.repo` `[withoutSub.id, null]` em `:232-235`; migração só `ADD COLUMN` nulável (`drizzle/0003_subcategory.sql:9`) | ✅ PASS |

### P1: Ver gasto por subcategoria no resumo (SUB-06, SUB-07)

| Critério | Resultado esperado (spec) | `file:line` + asserção | Result |
| -------- | ------------------------- | ---------------------- | ------ |
| AC1 controle de expandir, recolhido por padrão | controle só com gasto em sub | UI sem teste automatizado — inspecione o componente: `src/components/summary-table.tsx:63` `detailed = row.breakdown.some(line => line.subcategoryId !== null)`, `:29` `useState(new Set())` (recolhido), `:80-91` botão `aria-expanded` | 🖥️ UI inspecionada (OK) |
| AC2 expandido: subs com gasto > 0, R$ + participação, ordem decrescente | ordem decrescente | `budget.test:279-290` `toEqual([{s1,30000,6000},{s2,10000,2000},{null,10000,2000}])`; `:293-298` `toEqual(["s1"])` (zero omitido); `:301-308` `toEqual([null,"s3","s2","s1"])`; `:311-317` empate `toEqual(["s1","s3",null])`. Render: `summary-table.tsx:119-134` | ✅ PASS (render sem teste) |
| AC3 linha "Sem subcategoria" | R$ + participação | `budget.test:289` `{ subcategoryId:null, name:"Sem subcategoria", spentCents:10000, shareBp:2000 }` | ✅ PASS |
| AC4 participação = round(g×10000/total) bp, 1 casa | 62,5% etc. | `budget.test:248-250` `shareBp(30000,50000)=6000`, `shareBp(1,3)=3333`, `shareBp(2,3)=6667`; `:253-255` `shareBp(0,0)=0`. Formatação 1 casa: UI sem teste, `summary-table.tsx:19-25` `minimumFractionDigits:1,maximumFractionDigits:1` | ✅ PASS (cálculo) / UI inspecionada (formato) |
| AC5 soma do detalhamento = gasto da categoria (centavos) | igualdade exata | `budget.test:326` `expect(lines.reduce((s,l)=>s+l.spentCents,0)).toBe(3)` com shares arredondando `:327` `[3333,3333,3333]`; `:279-290` soma 500 | ✅ PASS |
| AC6 sem despesa com sub: omite o controle | sem controle | UI sem teste automatizado — inspecione o componente: `summary-table.tsx:63,80` (`detailed` falso quando só há `subcategoryId === null`); dado: `budget.test:347` `breakdown` vazio sem `spentBySubcategory` | 🖥️ UI inspecionada (OK) |
| AC7 meta/restante/estouro/gráficos por categoria | inalterados | `budget.test:364-365` `expect(rowWithSubs).toEqual(rowWithout)` e `toMatchObject({targetCents:150000,overspentCents:10000})`; gráficos recebem `summary.rows` (`src/app/(app)/page.tsx:70`) sem uso de `breakdown` | ✅ PASS |
| AC8 refletir criação/edição/exclusão sem recarregar | totais atualizados | `tx.repo:258-270` `toEqual(new Map([[conforto, new Map([[restaurante,35000],[streaming,10000],[null,10000]])]]))` e `:270` `spentByCategory`; `revalidatePath("/")` nas 3 actions (`src/actions/transactions.ts:249,275,294`; asserções `tx.act:78,193,285`). Exclusão atualiza totais: `tx.act:284` | ✅ PASS (sem verificação do `router.refresh`/render, ver ⚠️ 3) |

### P2: Subcategoria na lista e filtro (SUB-08, SUB-09, SUB-10)

| Critério | Resultado esperado (spec) | `file:line` + asserção | Result |
| -------- | ------------------------- | ---------------------- | ------ |
| AC1 rótulo "Categoria › Subcategoria" | texto exato | UI sem teste automatizado — inspecione o componente: `src/components/transaction-list.tsx:68,85` `` `${category.name} › ${subcategory.name}` `` | 🖥️ UI inspecionada (OK) |
| AC2 sem sub: só categoria | só nome | UI sem teste automatizado — `transaction-list.tsx:85` ramo `: category.name` | 🖥️ UI inspecionada (OK) |
| AC3 filtro por categoria lista só gastos dela, sem ganhos | sem ganhos | `filter.test:105-109` `toEqual(["almoco","netflix","mercado"])` (ganho "salario" ausente) | ✅ PASS |
| AC4 filtro por subcategoria | só aquela sub | `filter.test:113-115` `toEqual(["almoco"])`; parse `:56-58` `{categoryId:"conforto",subcategoryId:"streaming"}` | ✅ PASS |
| AC5 "Sem subcategoria" | só gastos da categoria sem sub | `filter.test:119-121` `toEqual(["mercado"])`; parse `:62-64` `subcategoryId:"none"` | ✅ PASS |
| AC6 categoria "Todas": seletor de sub desabilitado | desabilitado | UI sem teste automatizado — inspecione o componente: `src/components/transaction-filter.tsx:50` `disabled={!category}` | 🖥️ UI inspecionada (OK) |
| AC7 trocar categoria volta sub para "Todas" | sub removida da URL | UI sem teste automatizado — `transaction-filter.tsx:35` `apply({ categoria: e.target.value, subcategoria: "" })` (valor vazio apaga a chave, `:21`) | 🖥️ UI inspecionada (OK) |
| AC8 filtro na URL; restaurado ao recarregar/trocar de mês | `?categoria=&subcategoria=` mantidos | Leitura da URL: `filter.test:42-94` + `src/app/(app)/page.tsx:21,32-38`. Gravação: `transaction-filter.tsx:19-24`. Troca de mês: UI sem teste automatizado — inspecione o componente: `src/components/month-picker.tsx:91-95` (`new URLSearchParams(searchParams)`, só `mes` muda) e `:118` (input de mês usa o mesmo `href`) | ✅ PASS (parse) / 🖥️ UI inspecionada (MonthPicker) |
| AC9 id inexistente na URL ignorado | lista como "Todas" | `filter.test:70` `toEqual({categoryId:null,subcategoryId:null})` (cat. inexistente); `:76` sub inexistente mantém categoria; `:82` sub de outra categoria ignorada; `:86-93` sub sem categoria | ✅ PASS |
| AC10 filtro ativo mantém resumo/gráficos do mês | resumo sem filtro | UI sem teste automatizado — inspecione a página: `src/app/(app)/page.tsx:30` (`buildMonthlySummary` sobre `totals` completos) e `:82` (filtro só em `TransactionList`) | 🖥️ UI inspecionada (OK) |
| AC11 sem resultado: "Nenhum gasto encontrado para este filtro" | texto exato | UI sem teste automatizado — `src/components/transaction-list.tsx:48`; `filtered` vem de `page.tsx:84` | 🖥️ UI inspecionada (OK) |

### Edge cases

| Edge case | `file:line` + asserção | Result |
| --------- | ---------------------- | ------ |
| Remover sub e criar outra com mesmo nome no mesmo save | `cat.repo:343-346` `toEqual({ok:true})`, `created.name` `"restaurante"`, `created.id` ≠ id antigo (remoções antes das inserções: `categories.ts:121` antes de `:149`) | ✅ |
| Renomear só a caixa ("restaurante" → "Restaurante") | `cat.repo:355-356` `toEqual({ok:true})` e `subcategories` `toEqual([{id: sub.id, name:"Restaurante"}])` | ✅ |
| Banco indisponível: "Não foi possível salvar. Tente novamente" e edições mantidas | `cat.act:250-254` `toEqual({ok:false,error:"Não foi possível salvar. Tente novamente"})`; edições mantidas: UI sem teste automatizado — `src/components/category-editor.tsx:181` só chama `router.refresh()` se `res.ok`; `rows` não é resetado | ✅ (msg) / 🖥️ UI inspecionada |
| Falha de validação não persiste nada | `cat.act:206` `expect(await names()).toEqual([])`; `cat.repo:278,304,317` `list` igual a `saved` após bloqueio/rejeição; `cat.repo:260-279` (rename de outra categoria não persiste) | ✅ |
| Participação arredondando para 0,0% mantém a linha | `budget.test:335-338` `toMatchObject({spentCents:1,shareBp:0})`. Texto "0,0%": `summary-table.tsx:25` (`0 / 100` formatado com 1 casa), sem teste | ✅ (domínio) / UI inspecionada |

**Status**: ✅ Todos os ACs cobertos ou inspecionados; ⚠️ 3 lacunas de precisão da spec e 4 lacunas de teste de baixo impacto (abaixo).

---

## Discrimination Sensor

Escopo isolado: `git worktree` temporário em `.../scratchpad/wt` com `node_modules` por symlink e banco próprio `orcamento_sensor_test` (apontado só no `.env.test` da cópia), para não tocar o banco de teste real. Cada mutação foi aplicada na cópia, o arquivo de teste correspondente rodou e o arquivo foi restaurado. Worktree removido (`git worktree remove --force` + `prune`), banco do sensor apagado.

| # | `file:line` | Mutação | Testes executados | Killed? |
| - | ----------- | ------- | ----------------- | ------- |
| M1 | `src/lib/domain/budget.ts:138` | ordenação do breakdown `b - a` → `a - b` | `budget.test.ts` | ✅ Killed (2 falhas) |
| M2 | `src/lib/domain/budget.ts:96` | `shareBp` `Math.round` → `Math.floor` | `budget.test.ts` | ✅ Killed (1) |
| M3 | `src/lib/domain/budget.ts:37` | limite `> 30` → `>= 30` | `budget.test.ts` | ✅ Killed (1) |
| M4 | `src/lib/domain/budget.ts:42` | nome de subcategoria sem `toLocaleLowerCase` (compara com caixa) | `budget.test.ts` | ✅ Killed (1) |
| M5 | `src/lib/domain/transaction-filter.ts:93` | filtro "none": `=== null` → `!== null` | `transaction-filter.test.ts` | ✅ Killed (1) |
| M6 | `src/actions/transactions.ts:224` | `checkOwnership` ignora a subcategoria (condição → `false`) | `actions/transactions.int.test.ts` | ✅ Killed (4) |
| M7 | `src/lib/db/repos/categories.ts:113` | bloqueio de exclusão de sub com gastos desligado | `categories.int.test.ts` | ✅ Killed (1) |
| M8 | `drizzle/0003_subcategory.sql:12` | cascade da categoria → `restrict` | `schema.int.test.ts` | ✅ Killed (1) (ver nota) |
| M9 | `src/lib/domain/budget.ts:129` | breakdown mantém linhas com gasto 0 (`> 0` → `>= 0`) | `budget.test.ts` | ✅ Killed (5) |
| M10 | `src/lib/domain/budget.ts:134-135` | "Sem subcategoria" passa a vir primeiro no empate | `budget.test.ts` | ✅ Killed (2) |
| M11 | `src/lib/domain/transaction-filter.ts:80` | parse aceita sub de outra categoria | `transaction-filter.test.ts` | ✅ Killed (1) |
| M12 | `src/lib/db/repos/categories.ts:87` | `replaceSet` não confere a mãe da subcategoria | `categories.int.test.ts` | ✅ Killed (2) |
| M13 | `src/lib/db/repos/transactions.ts:120` | `monthTotals` soma a mais por subcategoria | `transactions.int.test.ts` | ✅ Killed (2) |
| M14 | `src/lib/validation/transaction.ts` | mensagem "Ganho não tem subcategoria" alterada | `transaction.test.ts` | ✅ Killed (1) |
| M15 | `src/lib/db/repos/transactions.ts:36` | `fields` descarta `subcategoryId` | `actions/transactions.int.test.ts` | ✅ Killed (3) |
| M17 | `drizzle/0003_subcategory.sql:15` | CHECK `needs_category` → `CHECK (true)` (ganho com sub) | `schema.int.test.ts` | ✅ Killed (1) |
| M18 | `drizzle/0003_subcategory.sql:13` | índice único passa a diferenciar caixa | `schema.int.test.ts` | ✅ Killed (1) |
| M19 | `drizzle/0003_subcategory.sql:14` | FK transação→subcategoria `restrict` → `cascade` | `schema.int.test.ts` | ✅ Killed (1) |

(M16 foi descartado do roteiro por não ser uma mutação de comportamento útil.) Nota M8: a primeira execução sobreviveu porque o banco do sensor já tinha a migração aplicada com o SQL original (o migrador do Drizzle não reaplica); mutante inválido. Reexecutado em banco recém-criado: morto. Os mutantes M17-M19 também rodaram em banco recém-criado.

**Sensor depth**: expandido (≥5; feature de integridade de dados)
**Result**: 18/18 mortos - PASS

**Isolamento**: `git status --porcelain` da árvore real idêntico ao baseline capturado antes do sensor (`M .specs/STATE.md`, `?? .agents/ .claude/ .cursor/ .specs/features/gastos-recorrentes/ docs/`); este `validation.md` é o único arquivo novo posterior, escrito depois da checagem.

---

## Interactive UAT Results

Não realizado (e2e suspenso por AD-005; UI inspecionada por leitura de código acima).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (31 arquivos, todos ligados às tasks T1-T17) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`selectClass` nativo, mesma SPEC_DEVIATION de `transaction-form.tsx:45`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (mensagens "Já existe…", "Máximo de 30…", "Subcategoria não pertence…", "Ganho não tem subcategoria" asseridas literalmente) |
| Per-layer Coverage Expectation met | ✅ (domínio 1:1; actions: sucesso + cada erro + `revalidatePath`; repos: escopo por `userId`, constraints) |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | `tasks.md` Test Coverage Matrix + `AGENTS.md` (sem regra de teste); strong defaults |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` (Node 20.20.2)
- **Result**: exit 0 (cadeia completa executada 2 vezes). typecheck OK, lint OK, build OK (rotas `/`, `/categorias`, `/login`), unit 153 passed / 0 failed (8 arquivos), integration 135 passed / 0 failed (9 arquivos). Total 288 passed, 0 failed, 0 skipped.
- **Test count before feature**: não medido por execução; o diff de testes tem 79 `it`/`it.each` novos e 0 `it` removidos
- **Delta**: +79 blocos de teste (contagem de casos maior por `it.each`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Lacunas (ranqueadas, nenhuma bloqueante)

1. **UI sem teste automatizado: `MonthPicker` preservar filtro (SUB-10 AC8)** — `src/components/month-picker.tsx:91-95,118`. Regressão silenciosa possível; já havia sido um risco do design (`design.md` Risks). Sugestão: teste de componente/unit do montador de href, ou e2e quando AD-005 for revertido.
2. **Quirk "soma NaN%" confirmado (reproduzido em scratch)**: com `subcategories[0].id = "abc"` o schema devolve `[["0.subcategories.0.id","Identificador inválido"],["","A soma dos percentuais deve ser 100% (atual: NaN%)"]]` (`src/lib/validation/category.ts:43-55`: o `superRefine` roda com `percentBp` ausente do item inválido). Só alcançável com payload adulterado (ids vêm do banco). O teste `cat.val:111-116` usa `toContainEqual`, que mascara a issue espúria. Sugestão: pular o `superRefine` quando o item tiver issues, ou asserir a lista completa.
3. **`saveCategories` não alterada na T10** — confirmado: `src/actions/categories.ts:181` já repassava `parsed.data` e `categorySetSchema` agora devolve `subcategories` (`cat.act:187-195` prova o repasse). Sem lacuna de código.
4. **Ganho com subcategoria sem teste no nível da action** (SUB-05 AC8): coberto em zod (`tx.val:89-95`) e no banco (`schema.int:245-250`), mas não em `createTransaction`/`updateTransaction` (`tx.act`).
5. **Formato exibido da participação sem teste** (SUB-07 AC4, edge "0,0%"): `summary-table.tsx:19-25` (`formatShare`) só inspecionado; o cálculo em bp é testado. Sugestão: extrair `formatShare` para `src/lib/domain/percent.ts` com teste unitário.
6. **Observação fora da spec (inspeção de código, não executada)**: `replaceSet` atualiza as subcategorias uma a uma (`src/lib/db/repos/categories.ts:145-147`); trocar os nomes de duas subcategorias da mesma categoria (A↔B) num único salvamento viola o índice único e cai em `SAVE_FAILED` (a validação de domínio aceita, pois os nomes finais são distintos). Mesma natureza do swap de categorias, pré-existente. Não é AC.

### ⚠️ Lacunas de precisão da spec (não falham silenciosamente; asserção usa o texto implementado)

1. SUB-02 AC3 e SUB-05 AC8 dizem apenas "mensagem de validação": os textos "Informe o nome da subcategoria", "O nome deve ter no máximo 40 caracteres" e "Ganho não tem subcategoria" não estão na spec (estão em `budget.ts:44-46` e `design.md`).
2. SUB-06 AC1 não define a forma do "controle de expandir" nem o rótulo acessível (implementado: botão ▸/▾ com `aria-label="Detalhar <nome> por subcategoria"`, `summary-table.tsx:80-91`).
3. SUB-06 AC8 "sem recarregamento manual" não define o mecanismo; a verificação automatizada para em `revalidatePath("/")` (`tx.act:78,193,285`), sem cobrir a atualização do cliente.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| SUB-01..SUB-03 | In Tasks | ✅ Verified |
| SUB-04 | In Tasks | ✅ Verified (AC1/5/7 por inspeção de UI) |
| SUB-05 | In Tasks | ✅ Verified |
| SUB-06 | In Tasks | ✅ Verified (AC1/6 por inspeção de UI; AC8 até `revalidatePath`) |
| SUB-07 | In Tasks | ✅ Verified |
| SUB-08 | In Tasks | ✅ Verified (UI por inspeção) |
| SUB-09 | In Tasks | ✅ Verified (AC6/7 por inspeção) |
| SUB-10 | In Tasks | ✅ Verified (AC8 troca de mês por inspeção; AC10 por inspeção) |

(`spec.md` não foi alterado: a coluna Status da spec fica a critério do orquestrador.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 43/43 itens da spec (38 ACs + 5 edge cases) com evidência `file:line`; ACs só de UI (SUB-04 AC1/5/7, SUB-06 AC1/6, P2 AC1/2/6/7/10/11 e a parte de UI de P2 AC8) por inspeção do código, sem teste automatizado; 3 lacunas de precisão da spec sinalizadas
**Sensor**: 18/18 mutações mortas
**Gate**: 288 passed, 0 failed (unit 153, integration 135), typecheck/lint/build OK

**What works**: schema com FK composta, CHECK e cascade; regras de nome/limite; replaceSet com bloqueio e atomicidade; ownership de subcategoria na action e no banco; breakdown ordenado com soma exata; filtro puro com ids desconhecidos ignorados.

**Issues found**: ver Lacunas 1-6 (nenhuma bloqueante).

**Next steps**: opcionalmente fechar as lacunas 1, 2 e 5 antes de reativar o e2e.
