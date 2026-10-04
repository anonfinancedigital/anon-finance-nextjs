# Lançamento Flutuante Validation

**Date**: 2026-10-04
**Spec**: `.specs/features/lancamento-flutuante/spec.md`
**Diff range**: `888bbc4..57cddd8` (somente 5 commits da feature: 888bbc4, 5cb683c, f565ede, ba3cfea, 57cddd8; os demais commits do histórico são de outra feature e foram ignorados)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: PASS

Ambiente: worktree scratch em 57cddd8, Node 20, banco de integração isolado `lancamento_scratch_test`. Verificação de UI (T3-T5) é por **inspeção de código** (matriz de testes: `none`, e2e suspenso por AD-005); o que é **testado** está marcado como tal.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Schema da descrição (888bbc4) |
| T2   | ✅ Done | Testes de integração das actions (5cb683c) |
| T3   | ✅ Done | Formulário (f565ede) |
| T4   | ✅ Done | Botão flutuante + modal (ba3cfea) |
| T5   | ✅ Done | Página Resumo (57cddd8) |

---

## Spec-Anchored Acceptance Criteria

Caminhos relativos à raiz. `V` = `src/lib/validation/transaction.ts`; `VT` = `src/lib/validation/transaction.test.ts`; `IT` = `src/actions/transactions.int.test.ts`; `F` = `src/components/transaction-form.tsx`; `B` = `src/components/new-transaction-button.tsx`; `P` = `src/app/(app)/page.tsx`.

| Requisito / AC | Spec-defined outcome | `file:line` + evidência | Método | Result |
| -------------- | -------------------- | ----------------------- | ------ | ------ |
| LANC-01 (P1 AC1): sem formulário inline no Resumo | A página não renderiza "Nova transação" inline | `P:1-13` não importa `TransactionForm`; `P:73-81` só tem a seção "Transações do mês" (largura total); `P:83` renderiza só `NewTransactionButton`. `grep TransactionForm src` só acha `transaction-list.tsx:118` (edição) e `B:40` | Inspeção + build OK | ✅ PASS |
| LANC-02 (P1 AC2): botão "+" fixo canto inferior direito, nome acessível "Nova transação" | `aria-label="Nova transação"`, fixo bottom-right | `B:28-34`: `aria-label="Nova transação"`, `className="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-lg"`, `PlusIcon`; `P:83` | Inspeção | ✅ PASS |
| LANC-03 (P1 AC3): clique abre modal com Gasto/Ganho, valor, data, categoria, subcategoria, descrição | Dialog com o formulário completo | `B:26-27` Dialog controlado + `DialogTrigger asChild`; `B:36-45` `DialogContent` com `DialogTitle` "Nova transação" e `TransactionForm`; campos em `F:90-203` (tipo `F:90-109`, valor `F:113`, data `F:125`, categoria/subcategoria `F:147,167`, descrição `F:192`) | Inspeção | ✅ PASS |
| LANC-03 (AC4): abre em branco, tipo Gasto, data de hoje (America/Sao_Paulo) | estado inicial: expense, `date=today`, demais vazios | `F:35-43` `blank(date)`: `kind:"expense"`, `amount:""`, `description:""`; `F:56-58` `useState(() => ...)` na montagem; `P:16-17` `todayInSaoPaulo()` com `timeZone: "America/Sao_Paulo"`, `P:83` passa como `defaultDate`. O `DialogContent` (Radix) desmonta ao fechar, então reabrir remonta e gera novo `id` (`F:36`) | Inspeção | ✅ PASS |
| LANC-03 (AC5): salvar válido fecha o modal e atualiza lista/totais sem reload | modal fecha; dados refletidos | `F:79-83` `if (res.ok) onSaved?.()`; `B:43` `onSaved={() => setOpen(false)}`. Atualização: `createTransaction` chama `revalidatePath("/")` (`src/actions/transactions.ts:59`), testado em `IT:73-79` (`revalidatePath` chamado com "/"). Refresh visual real não foi renderizado | Parte testada (action) + inspeção (UI) | ✅ PASS |
| LANC-03 (AC6): Esc / clique fora / fechar descartam sem salvar | fecha sem gravar | `B:26` `onOpenChange={setOpen}` (Radix trata Esc e clique fora); botão fechar `src/components/ui/dialog.tsx:53,70-79` (`showCloseButton = true`, `sr-only` "Fechar"). Nada grava fora de `submit` (`F:70-84`) | Inspeção | ✅ PASS |
| LANC-03 (AC7): botão não cobre o conteúdo do modal | botão atrás do overlay | `B:31` botão `z-40`; `dialog.tsx:42` overlay `z-50`, `dialog.tsx:64` conteúdo `z-50` | Inspeção | ✅ PASS |
| LANC-04 (P1b AC1): descrição vazia/só espaços rejeitada com "Informe a descrição", sem salvar (create e update) | `fieldErrors.description = "Informe a descrição"`, nada gravado | Schema `V:20-24` (`.trim().min(1, "Informe a descrição")`, `error: "Informe a descrição"` para ausente). Unit: `VT:64-77` `it.each` (ausente/vazio/só espaços em gasto; ausente/vazio em ganho) com `expect(z.flattenError(result.error).fieldErrors).toEqual({ description: ["Informe a descrição"] })`; trim `VT:58-62`. Int create: `IT:100-101` (`""` e `"   "` → "Informe a descrição") e `IT:106-107` (sem gravar, sem revalidar); income `IT:110-119` (`fieldErrors: { description: "Informe a descrição" }`, `$count(transaction)` = 0, `revalidatePath` não chamado). Int update: `IT:209-224` (`"  "` → mesmo erro, `listByMonth` mantém `description: "Cinema"`, sem revalidar) | Testado (unit + int) | ✅ PASS |
| LANC-04 (AC2): > 120 chars rejeitado com "A descrição deve ter no máximo 120 caracteres" | mensagem exata | `V:24`; unit `VT:79-86` (121 chars, `toEqual({ description: ["A descrição deve ter no máximo 120 caracteres"] })`); limite 120 aceito `VT:88-91` | Testado (unit) | ✅ PASS |
| LANC-05 (AC3): rótulo "Descrição" sem "(opcional)" | label exato | `F:192` `<Label ...>Descrição</Label>`; `grep opcional src` sem ocorrências | Inspeção | ✅ PASS |
| LANC-06 (AC4): erro do servidor sob o campo, modal aberto, valores mantidos | erro sob o campo; sem reset | `F:62` `fieldErrors` de `result.fieldErrors`; `F:200-202` `<p ...>{fieldErrors.description}</p>`; `F:81-82` só chama `onSaved` em `res.ok` (sem reset de `values`); `fieldErrors` por campo vem de `invalidInput` (testado em `IT:100-119`) | Parte testada (fieldErrors na action) + inspeção (renderização) | ✅ PASS |
| LANC-04 (AC5): edição aplica a mesma regra | update rejeita descrição vazia | `src/actions/transactions.ts:70` usa o mesmo `transactionSchema`; `IT:209-224`; edição usa `TransactionForm` (`transaction-list.tsx:118`) herdando `F:80` | Testado (int) | ✅ PASS |

### Edge cases

| Edge case | `file:line` | Método | Result |
| --------- | ----------- | ------ | ------ |
| Sem categorias + Gasto: link "Crie suas categorias primeiro" e Salvar desabilitado | `F:64` `needsCategories`; `F:139-144` link para `/categorias`; `F:211` `disabled={pending \|\| needsCategories}` | Inspeção | ✅ |
| Duplo clique em Salvar cria 1 transação (id gerado ao abrir) | `F:36,56-58` id gerado na montagem; `F:72` `if (pending) return`; repo ignora id repetido, testado em `IT:143` "creates a single transaction when the same id is sent twice" | Testado (action) + inspeção | ✅ |
| Falha não-campo: modal aberto e mensagem de erro | `F:205-209` `<p role="alert">{result.error}</p>` quando não há `fieldErrors`; `F:82` não fecha; action devolve `SAVE_FAILED` testado em `IT:161` | Parte testada + inspeção | ✅ |
| 360px: botão visível/tocável >= 44x44, página com espaço inferior | `B:31` `size-12` (48px, vence `icon-lg` 36px via `cn`/tailwind-merge, `button.tsx:60`); `P:47` `pb-24`; `B:36` `max-h-[calc(100dvh-2rem)] overflow-y-auto` | Inspeção (sem render em 360px) | ✅ |

**Status**: ✅ Todos os ACs com evidência; sem spec-precision gaps (as mensagens da spec são exatas e conferidas nas asserções). ACs de UI (LANC-01, 02, 03 parte visual, 05, 06 parte de renderização) verificados por inspeção, não por teste automatizado, conforme matriz (`none`).

---

## Discrimination Sensor

Escopo: camadas testadas (schema e actions). Todas as mutações em worktree scratch, restauradas com `git checkout` após cada uma.

| # | File:line | Mutação | Teste que roda | Killed? |
| - | --------- | ------- | -------------- | ------- |
| 1 | `V:23` | `.min(1, ...)` -> `.min(0, ...)` | unit | ✅ Killed (3 falhas) |
| 2 | `V:22` | remover `.trim()` | unit | ✅ Killed (2 falhas) |
| 3 | `V:23` | mensagem "Informe a descrição" -> "Informe a descricao" | unit | ✅ Killed (3 falhas) |
| 4 | `V:24` | `.max(120)` -> `.max(121)` | unit | ✅ Killed (2 falhas) |
| 5 | `V:24` | `.max(120)` -> `.max(119)` | unit | ✅ Killed (1 falha) |
| 6 | `V:24` | `description` passa a ser `.optional()` (ausente aceita) | unit | ✅ Killed (2 falhas) |
| 7 | `V:21` | mensagem do campo ausente -> "Obrigatório" | unit | ✅ Killed (2 falhas) |
| 8 | `V:56-61` | `description` do ganho vira `default("")` (vazio aceito em income) | unit | ✅ Killed (2 falhas) |
| 9 | `src/actions/transactions.ts:70` | `updateTransaction` substitui descrição vazia por "x" antes de validar | int | ✅ Killed (1 falha) |
| 10 | `src/actions/transactions.ts:47` | `createTransaction` substitui descrição vazia por "x" antes de validar | int | ✅ Killed (3 falhas) |
| 11 | `src/actions/transactions.ts:59` | `createTransaction` deixa de chamar `revalidatePath("/")` | int | ✅ Killed (2 falhas) |

Duas tentativas iniciais de mutação (#6 e #7) falharam por padrão de substituição inexistente/erro de sintaxe e foram refeitas corretamente; só as versões válidas contam acima.

**Sensor depth**: lightweight ampliado (11 mutações; dado integridade de dados, foi além do mínimo de 1-3)
**Result**: 11/11 killed - PASS ✅
**Isolamento**: worktree scratch restaurado com `git checkout -f 57cddd8 && git clean -fd -e node_modules -e .env -e .env.test`; `git status --short` limpo. Nenhuma alteração foi feita no diretório principal por este verificador (o `git status` do principal mudou entre o início e o fim por trabalho de outra sessão: `drizzle/*`, `src/lib/db/schema.ts`, e alterações da outra feature, não relacionadas a esta verificação).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`new-transaction-button.tsx` 48 linhas; página perde ~30 linhas) |
| Surgical changes | ✅ (5 commits só tocam schema, testes, form, botão novo e página) |
| No scope creep | ✅ (botão só no Resumo, sem atalhos, sem migração de coluna) |
| Matches patterns | ✅ (reusa `Dialog*`, `Button`, `lucide-react`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (mensagens exatas nas asserções) |
| Per-layer Coverage Expectation (validação: ausente, vazia, só espaços, 120, 121 com mensagem; actions: create e update rejeitam e não gravam) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md`, `vitest.config.ts`; strong defaults aplicados | ✅ |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- **Typecheck**: OK. **Lint**: OK. **Build** (`next build`): OK (rotas `/`, `/categorias`, `/login`).
- **Unit**: 9 arquivos, 223 passed, 0 failed. **Integração** (banco `lancamento_scratch_test`): 9 arquivos, 179 passed, 0 failed.
- **Test count before feature** (unit, em `888bbc4~1`): 207. **After**: 223. **Delta unit**: +16 (casos novos de descrição no schema). Integração: +4 testes novos em `transactions.int.test.ts` (2 linhas de `it.each`, income vazio, update vazio); sem remoções.
- **Skipped tests**: nenhum.
- **Failures**: nenhuma.

---

## Observações (não bloqueantes)

- **Dívida e2e registrada (AD-005)**: `e2e/transaction-form.spec.ts`, `e2e/summary.spec.ts` e `e2e/month-picker.spec.ts` usam o formulário inline e o rótulo "Descrição (opcional)"; quebram por design, já documentado em `tasks.md`. Não rodados nem exigidos.
- `defaultDate` é calculado no render do servidor (`P:16-17,83`); se a aba ficar aberta além da meia-noite sem navegação, o modal pode abrir com a data do dia anterior. Fora do escopo da spec; sem ação necessária.
- A verificação visual (360px, z-index efetivo, animação) não foi renderizada em navegador; baseada em classes Tailwind/inspeção. Cobertura por teste automatizado de UI é inexistente por decisão (matriz `none`).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LANC-01 | Implemented | ✅ Verified (inspeção) |
| LANC-02 | Implemented | ✅ Verified (inspeção) |
| LANC-03 | Implemented | ✅ Verified (inspeção + revalidate testado) |
| LANC-04 | Implemented | ✅ Verified (unit + int + sensor) |
| LANC-05 | Implemented | ✅ Verified (inspeção) |
| LANC-06 | Implemented | ✅ Verified (parte testada + inspeção) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 6/6 requisitos (todos os ACs e edge cases) com evidência `file:line`; 0 spec-precision gaps
**Sensor**: 11/11 mutações mortas
**Gate**: typecheck, lint, build, 223 unit e 179 integração passando

**What works**: descrição obrigatória validada em um único schema (criar e editar), com mensagens exatas e testes que discriminam; botão flutuante, modal e página Resumo conforme spec.

**Issues found**: nenhum bloqueante.

**Next steps**: nenhuma. Reativar e2e quando AD-005 for revertida (helper para abrir o modal e novo rótulo).
