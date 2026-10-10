# Validation: Remover a Última Categoria - PASS

**Date**: 2026-10-10
**Spec**: `.specs/features/remover-ultima-categoria/spec.md` (REMOVE-01..10)
**Diff range**: `24b4a2e^..5f3b7fa` (HEAD `5f3b7fa`; 2 commits da feature: `24b4a2e`, `5f3b7fa`; `28b6570` e o resto do diff são de importar-dados, fora do escopo)
**Verifier**: sub-agente independente (author ≠ verifier)
**Verdict**: PASS (iteração 2 de 3). Itera­ção 1 foi FAIL (M7, M8 sobreviveram; sem teste de servidor com lista vazia; reformatação fora de escopo). Todos corrigidos.

Linhas citadas referem-se a `5f3b7fa`. Não há `tasks.md` (Tasks pulada; fix pequeno). Sem e2e (AD-005): evidência de UI vem de leitura de código.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| (sem tasks.md) | n/a | feature em 2 commits; `spec.md` ainda marca REMOVE-* como `Implementing` |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| REMOVE-01: 0 linhas e gravado 1+ => Salvar habilitado | botão renderizado e habilitado | `src/lib/domain/allocation-view.test.ts:69-80` - `expect(allocationView(0, 0, 1)).toEqual({... showSave: true, saveDisabled: false, saveHint: null ...})`; fiação: `src/components/category-editor.tsx:202` (`allocationView(rows.length, sumMicro, categories.length)`), `:480` (`view.showSave`), `:484` (`disabled={view.saveDisabled \|\| pending}`) | ✅ PASS (regra testada; fiação por leitura) |
| REMOVE-02: 0 linhas e gravado 0 => sem Salvar | botão não renderizado | `allocation-view.test.ts:82` - `expect(allocationView(0, 0, 0).showSave).toBe(false)` e `:6-16` (`showSave: false`); `category-editor.tsx:480` | ✅ PASS |
| REMOVE-03: Salvar com 0 linhas envia lista vazia sem erro de soma | validação do navegador aceita `[]`; servidor recebe `items: []` | `src/lib/validation/category.test.ts:136-138` - `expect(categorySetSchema.safeParse([])).toMatchObject({ success: true, data: [] })`; `category.ts:44-46` (`if (items.length === 0) return;`); `category-editor.tsx:265-278` (`safeParse` e depois `saveCategoriesSealed`); `categories-sealed.int.test.ts:230` - `expect(await saveCategoriesSealed({ items: [] })).toEqual({ ok: true })` | ✅ PASS |
| REMOVE-04: servidor confirma => "Categorias salvas" e estado vazio | texto `Categorias salvas`; `view.empty` | leitura: `category-editor.tsx:471-475` (`result?.ok` fora do bloco `view.showSave`, então aparece mesmo com Salvar oculto após `categories=[]`), `:193-198` (rows reiniciam do conjunto do servidor), `:310` (`view.empty` => `EmptyAllocation`); `allocation-view.test.ts:70` (`empty: true`) | ✅ PASS (por leitura; sem e2e) |
| REMOVE-05: recarregar após salvar vazio => estado vazio | leitura devolve `[]` | `categories-sealed.int.test.ts:232-233` - `expect(await stored()).toEqual([])` e `expect((await rawCategories()).find(c => c.id === only)?.deletedFrom).not.toBeNull()`; `:234` `revalidatePath` chamado com `"/"` | ✅ PASS |
| REMOVE-06: removida com lançamentos => mensagem do servidor e editor com 0 linhas | `Esta categoria tem 1 gasto e não pode ser excluída`; categoria mantida | `categories-sealed.int.test.ts:251-256` - `toEqual({ ok: false, error: "Esta categoria tem 1 gasto e não pode ser excluída" })` e `expect(await stored()).toEqual(before)`; editor: `category-editor.tsx:464-469` exibe `result.error` e não chama `setRows` no caminho de erro (`:287-290`) | ✅ PASS (servidor testado; "mantém 0 linhas" por leitura) |
| REMOVE-07: remover a última => sem aviso `A soma deve ser 100%` | `showSumWarning: false` | `allocation-view.test.ts:69-80` (`showSumWarning: false` no `toEqual`); `allocation-view.ts:32` (`rowCount >= 1 && !complete`); uso `category-editor.tsx:453` | ✅ PASS |
| REMOVE-08: adicionar com 0 linhas e gravado 1+ => volta a exigir 100% | Salvar desabilitado com dica `Some 100% para salvar` | `allocation-view.test.ts:86-92` - `expect(allocationView(1, 0, 1)).toMatchObject({ showSave: true, saveDisabled: true, saveHint: "Some 100% para salvar" })`; `:94-97` - `saveDisabled` false em 100_000_000 e true em 99_999_999 | ✅ PASS |
| REMOVE-09: servidor recebe `[]` sem lançamentos => marca todas removidas, sucesso | `{ ok: true }`, `deleted_from` não nulo | `categories-sealed.int.test.ts:230,232-233` (acima); implementação `src/lib/db/repos/categories.ts:136,169-173` | ✅ PASS |
| REMOVE-10: aceita `[]` no navegador; mantém soma 100% para 1+ | `[]` válido; `set("40")` inválido | `category.test.ts:136-138` e `:140-142` - `expect(categorySetSchema.safeParse(set("40")).success).toBe(false)` | ✅ PASS |

**Edge cases**

- [x] Última categoria com subcategorias mantém o diálogo atual: `category-editor.tsx` (ramo `row.subcategories.length > 0 ? setRemoving(i) : remove(i)`), não tocado pelo diff.
- [x] Falha de rede: `category-editor.tsx:281-283` (`catch` => `SAVE_FAILED`), `rows` intocadas. Por leitura.

**Status**: ✅ 10/10 ACs com evidência; nenhum spec-precision gap bloqueante. Residual: a fiação do componente (`:202`, `:484`) não tem teste automatizado (componente sem teste; e2e suspenso por AD-005); coberta por leitura.

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt HEAD` (node_modules por symlink), removido e `git worktree prune` ao fim. Sem `git stash`. Banco privado `orcamento_vf_test` (apagado ao final). Cada mutante foi aplicado com `sed` e revertido; a baseline (sem mutação) passou 43/43 unit no scratch.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M7a | `src/lib/domain/allocation-view.ts:35` | `saveDisabled: !complete` (equivalente ao `!sumOk` antigo) | ✅ Killed (2 falhas) |
| M7b | `allocation-view.ts:35` | `saveDisabled: true` | ✅ Killed (3 falhas) |
| M7c | `allocation-view.ts:35` | `saveDisabled: false` | ✅ Killed (3 falhas) |
| M7d | `allocation-view.ts:35` | `saveDisabled: rowCount >= 1 && complete` | ✅ Killed (3 falhas) |
| M8 | `src/lib/validation/category.ts:45` | remove o early-return de lista vazia | ✅ Killed (1 falha) |
| M8b | `category.ts:45` | `items.length === 0` => `=== 1` | ✅ Killed (2 falhas) |
| M1 | `allocation-view.ts:29` | `rowCount >= 1 \|\| savedCount >= 1` => `rowCount >= 1` | ✅ Killed |
| M3 | `allocation-view.ts:29` | `savedCount >= 1` => `>= 0` | ✅ Killed |
| M4 | `allocation-view.ts:32` | `showSumWarning: !complete` | ✅ Killed |
| M2 | `allocation-view.ts:36` | `saveHint: showSave && ...` (dica na lista vazia) | ✅ Killed |
| R1 | `src/lib/db/repos/categories.ts:137` | `removedIds.length > 0 && keptIds.size > 0` (lista vazia ignora bloqueio por lançamentos) | ✅ Killed (2 falhas) |
| R2 | `categories.ts:172` | `.set({ deletedFrom: null })` (remoção não marca) | ✅ Killed (1 falha) |

**Sensor depth**: lightweight ampliado (12 mutações; caminho de dados do usuário)
**Result**: 12/12 killed - PASS ✅

Não coberto pelo sensor: mutações na fiação do componente (`category-editor.tsx:202` terceiro argumento, `:484` `view.saveDisabled`), sem teste de componente; fica por leitura.

**Isolamento**: `git status --porcelain` da árvore real igual ao inicial, com uma exceção externa: apareceu `?? docs/marca/` (não criado por este Verifier; outra sessão do usuário). Nenhum arquivo rastreado foi alterado.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `saveDisabled` + 1 linha no schema + 2 linhas no editor |
| Surgical changes | ✅ reformatação revertida; `category-editor.tsx` com diff de 5 linhas |
| No scope creep | ✅ para os dois commits da feature (`goal.ts` exports e `vault/types.ts` pertencem a importar-dados) |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ ver tabela |
| Every test maps to a spec requirement | ✅ todos os testes novos mapeiam para REMOVE-01..10 |
| Documented guidelines followed | AGENTS.md (AD-005, sem e2e) |

---

## Gate Check

- **Gate**: `npm run test:unit` e `npm run test:int -- src/actions/categories-sealed.int.test.ts` (DB privado), `tsc --noEmit`
- **Unit**: 1140 passed, 0 failed (50 arquivos)
- **Integration (categories-sealed)**: 27 passed, 0 failed
- **Typecheck**: 2 erros em `src/lib/vault/import-file.test.ts` (módulo `./import-file` inexistente) pertencem a importar-dados (WIP de outro commit), não à feature; nenhum erro nos arquivos da feature.
- **Skipped**: 0

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 10/10 ACs com assertion de `file:line` (REMOVE-04 e a parte "mantém 0 linhas" de REMOVE-06 por leitura)
**Sensor**: 12/12 mutations killed
**Gate**: 1140 unit + 27 int passed

**Issues found**: nenhum bloqueante. Residual de baixo risco: fiação do componente sem teste (AD-005).

**Next steps**: marcar REMOVE-01..10 como Verified em `spec.md`.
