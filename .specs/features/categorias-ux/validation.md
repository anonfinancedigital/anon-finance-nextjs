# Categorias: Melhorias de UX/UI Validation

**Date**: 2026-10-05 (re-verificação, iteração 1 de 3)
**Spec**: `.specs/features/categorias-ux/spec.md`
**Diff range**: `a70052b..HEAD` filtrado aos arquivos da feature, incluindo os fixes b5f467a, 9e7d0bc, 47768f3 e 14656a8. Ignorados: liberdade-experiencia, identidade-vertice, freedom.ts, goals.ts, goal-*.tsx, rate-toggle, slider, e2e-tmp/.
**Verifier**: independent sub-agent (author ≠ verifier)
**Veredito**: ✅ PASS (36/36 ACs, 5/5 edge cases, gate verde, sensor 7/7). Pendência manual de verificação visual registrada abaixo, não é gap de AC.

> Sem navegador neste ambiente. ACs de UI não têm teste automático (AD-005/AD-008): isso é nota, não falha. Evidência de UI = `file:line` da implementação + expressão que produz o resultado spec-definido.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T9, T11 | ✅ Done | Commits presentes; T1/T2 com testes unitários |
| T10 | ⚠️ Partial | Item "Conferência manual em 640, 1024 e 1440px" segue pendente (sem browser) |
| F1, F2, F3 | ✅ Done | b5f467a, 9e7d0bc, 47768f3 (hashes registrados em 14656a8) |

---

## Re-verificação dos gaps anteriores

**(a) Select apontando para categoria removida / bug de índice: CORRIGIDO.** A escolha é por `row.key` estável em todo o caminho:
- `category-editor.tsx:370-374` monta `options` com `key: r.key` (não o índice); `:375` `onApply={adjust}`.
- `adjust-sum-bar.tsx:46` `useState<string | null>(null)` (choice = key); `:49` `selected = resolveAdjustKey(choice, options)`; `:63` `value: o.key`; `:62` `setChoice(v === "" ? null : v)`; `:70` `onApply(selected)` (string).
- `category-editor.tsx:182-186` `adjust(key)` faz `rows.findIndex((r) => r.key === key)` e sai se `< 0`; só então usa `parsed[index]`.
- `remove` (`:204-205`) filtra por índice, mas o alvo é recalculado por key a cada render; remover linha anterior à escolhida mantém a mesma key, logo o mesmo alvo. Keys são `c.id` (`toRow`, `:60`) ou `crypto.randomUUID()` (`:214`), únicas.
- Domínio testado (`percent.ts:93-100` `resolveAdjustKey`), com testes derivados da spec: `percent.test.ts:172` `resolveAdjustKey("a", opts)` → `"a"`; `:176` `resolveAdjustKey("gone", opts)` → `"b"` (volta ao maior percentual válido); `:180` `resolveAdjustKey(null, opts)` → `"b"`; `:185` remoção de linha anterior (`opts.slice(1)`, escolha `"c"`) → `"c"` (cobre o bug de índice); `:189` sem percentual válido → `"x"` (primeira linha); `:193` sem linhas → `null`.
- Nota: a fiação AdjustSumBar/editor (key em vez de índice) não tem teste automático (AD-008); a evidência é a leitura do código acima. Uma mutação que volte `adjust` a índice não seria detectada por teste; aceito por AD-008.

**(b) Cor da lixeira no hover próprio: CORRIGIDO.** `category-editor.tsx:347` inclui `hover:text-destructive`. O `Button` passa por `cn` (`button.tsx:61`, pacote `cn` 0.4, compatível com tailwind-merge); executei `cn("... hover:text-foreground ... hover:text-destructive group-hover/row:text-destructive")` e o resultado remove `hover:text-foreground` e mantém `hover:text-destructive`. Opacidade 40% e 100% (group-hover/foco) intactas.

**(c) "AÇÕES" na coluna: melhorado, conferência visual pendente.** `category-editor.tsx:261` `w-8 shrink-0 whitespace-nowrap text-center text-[10px] tracking-normal` (antes `text-xs tracking-wide`, ~38-42px). Estimativa: 5 maiúsculas a 10px sem tracking ≈ 32-34px em `w-8` (32px), no limite; como é `text-center` e `nowrap`, qualquer excesso transborda simétrico (1-2px por lado, dentro do `px-4` do cartão, sem clipping) e fica alinhado ao centro do ícone `size-8`. Larguras das linhas inalteradas (`COL_*` no mesmo arquivo). Confirmar em navegador.

---

## Spec-Anchored Acceptance Criteria

### P1: Soma acionável e percentuais legíveis

| # | Spec-defined outcome | `file:line` + assertion/expressão | Result |
| - | -------------------- | --------------------------------- | ------ |
| 1 | Sem foco, 2 casas ("6,30", "30,00") | `percent.test.ts:125` `formatPercentFixed(micro)` → `"6,30"`/`"30,00"`/`"0,00"` (4_999)/`"0,01"` (5_000); `:131` `percentFieldText("6,303138", false)` → `"6,30"`; UI `category-editor.tsx:312` `value={percentFieldText(row.percent, focusedRow === i)}`; impl `percent.ts:63-72` | ✅ PASS |
| 2 | Em foco, texto completo (até 6 casas) | `percent.test.ts:135` `percentFieldText("6,303138", true)` → `"6,303138"`; `percent.ts:69`; `category-editor.tsx:314` `onFocus={() => setFocusedRow(i)}` | ✅ PASS |
| 3 | 6 casas preservadas no estado e no save | `category-editor.tsx:316` `update(i, { percent: e.target.value ... })` (único escritor do texto); `:228-234` `saveCategories(rows.map(({ id, name, percent, ... }) => ...))` envia `row.percent`; `:56` `percentText` usa `formatPercent` (6 casas). Sem teste automático (AD-008) | ✅ PASS |
| 4 | Blur não altera o percentual guardado | `category-editor.tsx:315` `onBlur={() => setFocusedRow(...)}` só estado de foco, sem `update`. Sem teste automático | ✅ PASS |
| 5 | Rodapé com 2 casas (soma ≠100,00 ou exatamente 100%) | `percent.test.ts:150` `sumLabel(100_005_248)` → `"100,01%"`, `100_000_000` → `"100,00%"`, `99_000_000` → `"99,00%"`; UI `category-editor.tsx:359` `{sumLabel(sumMicro)}`; impl `percent.ts:75-78` | ✅ PASS |
| 6 | Soma ≠100% que arredonda p/ 100,00: até 6 casas (rodapé e aviso) | `percent.test.ts:150` `sumLabel(99_999_999)` → `"99,999999%"`; `sum-warning.test.ts:24` `sumWarning(99_999_999, null)` → `"A soma deve ser 100%. Atual: 99,999999%"`; `:20` `100_000_001` → `"...Atual: 100,000001%"` | ✅ PASS |
| 7 | `A soma deve ser 100%. Atual: <soma> (<+\|->R$ <dif>)` | `sum-warning.test.ts:7` `toBe("A soma deve ser 100%. Atual: 100,01% (+R$ 1,00)")`; `:12` `toBe("A soma deve ser 100%. Atual: 99,99% (-R$ 1,00)")`; `:8` `not.toContain(U+00A0)`; impl `sum-warning.ts:11-12`; UI `adjust-sum-bar.tsx:53` | ✅ PASS |
| 8 | Sem receita ou dif. R$ 0,00: sem parênteses | `sum-warning.test.ts:16` `sumWarning(100_005_248, null)` → `"A soma deve ser 100%. Atual: 100,01%"`; `:20` `sumWarning(100_000_001, 10_000)` → sem parênteses; impl `sum-warning.ts:8,10` | ✅ PASS |
| 9 | Select com todas as categorias + "Aplicar"; "Descontar a diferença em" (acima) / "Acrescentar a diferença em" (abaixo) | `adjust-sum-bar.tsx:56` `sumMicro > TOTAL_MICRO ? "Descontar a diferença em" : "Acrescentar a diferença em"`; `:63` uma opção por linha; `:72` "Aplicar"; `category-editor.tsx:370-374` label `r.name.trim() \|\| \`Categoria ${i + 1}\``. Sem teste de UI (AD-008) | ✅ PASS |
| 10 | Pré-seleção: maior percentual válido, primeiro em empate | `percent.test.ts:156` `defaultAdjustIndex([null, 10_000_000, 30_000_000, 30_000_000])` → `2`; `:160` `[null]` → `null`; `:180` `resolveAdjustKey(null, opts)` → `"b"` (primeiro dos empatados); `adjust-sum-bar.tsx:49` `selected` | ✅ PASS |
| 11 | "Aplicar" ajusta a categoria escolhida; soma = 100% | `adjust-sum-bar.tsx:70` `onApply(selected)`; `category-editor.tsx:182-191` `adjustToTotal(current.value, sumMicro)` → `update(index, { percent: percentText(next.value) })`; `percent.test.ts:88` `adjustToTotal(6_297_973, 99_047_973)` fecha a soma (`row + TOTAL − sum`) | ✅ PASS |
| 12 | Fora do intervalo: mantém tudo e mensagem exata | `percent.ts:13-14` texto idêntico à spec; `percent.test.ts:101-105` `toEqual({ ok:false, error:"Não é possível ajustar esta categoria: o percentual ficaria fora do intervalo de 0,000001% a 100%" })`; `category-editor.tsx:187-190` `setAdjustError`, sem `update`; `adjust-sum-bar.tsx:75-79` `role="alert"` | ✅ PASS |
| 13 | Soma = 100%: oculta aviso, select e Aplicar | `category-editor.tsx:366` `{!sumOk && <AdjustSumBar .../>}` | ✅ PASS |
| 14 | Nenhum botão "Ajustar" | `grep "Ajustar"` em `category-editor.tsx`, `adjust-sum-bar.tsx` e `e2e/categories.spec.ts`: 0 ocorrências | ✅ PASS |

### P2: Remoção segura e Salvar com estado claro

| # | Spec-defined outcome | `file:line` + expressão | Result |
| - | -------------------- | ----------------------- | ------ |
| 1 | Lixeira 16px, `aria-label` "Remover categoria N" | `category-editor.tsx:345` `aria-label={\`Remover categoria ${i + 1}\`}`; `:349` `<Trash2Icon aria-hidden className="size-4" />` | ✅ PASS |
| 2 | Hover na linha/foco dentro: opacidade total + cor destrutiva; senão 40% | `category-editor.tsx:347` `opacity-40 hover:text-destructive group-hover/row:text-destructive group-hover/row:opacity-100 group-focus-within/row:text-destructive group-focus-within/row:opacity-100`; `:272` `group/row`; `cn` remove `hover:text-foreground` do ghost (executado). Efeito visual real: conferir no navegador | ✅ PASS |
| 3 | Diálogo "Remover categoria?", texto `"<nome>" e suas <n> subcategorias serão removidas ao salvar.`, "Cancelar", "Remover" | `category-editor.tsx:346` `row.subcategories.length > 0 ? setRemoving(i) : remove(i)`; `:405` `<DialogTitle>Remover categoria?</DialogTitle>`; `:408-412` template idêntico à spec; `:416-418` "Cancelar"; `:427` "Remover" | ✅ PASS |
| 4 | "Remover" remove a linha e fecha o diálogo | `category-editor.tsx:423-424` `if (removing !== null) remove(removing); setRemoving(null)` | ✅ PASS |
| 5 | "Cancelar"/fechar mantém tudo | `category-editor.tsx:416` `onClick={() => setRemoving(null)}`; `:402` `onOpenChange={(open) => !open && setRemoving(null)}` | ✅ PASS |
| 6 | Sem subcategorias: remove sem diálogo | `category-editor.tsx:346` ramo `remove(i)` | ✅ PASS |
| 7 | 1 subcategoria: "sua 1 subcategoria" | `category-editor.tsx:409-410` `length === 1 ? "sua 1 subcategoria" : \`suas ${n} subcategorias\``; e2e `categories.spec.ts` assevera o texto (não roda, AD-005) | ✅ PASS |
| 8 | Salvar desabilitado: opacidade 40% e `cursor-not-allowed` | `category-editor.tsx:396-397` `disabled={!sumOk \|\| pending}` + `disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40` | ✅ PASS |

### P3: Cabeçalhos, unidades e card da base

| # | Spec-defined outcome | `file:line` + expressão | Result |
| - | -------------------- | ----------------------- | ------ |
| 1 | A partir de `sm`: "CATEGORIA", "% DO TOTAL", "VALOR ESTIMADO", "SUBCATEGORIAS", "AÇÕES" | `category-editor.tsx:252-261` `hidden ... sm:flex` com os cinco textos literais idênticos à spec (`:257-261`) | ✅ PASS (alinhamento ⚠️ manual) |
| 2 | Abaixo de `sm`: cabeçalho oculto | `category-editor.tsx:254` `hidden` sem prefixo + `sm:flex` | ✅ PASS |
| 3 | "%" à direita e "R$" à esquerda dentro do campo, fora do texto, sem alterar `aria-label` | `input-affix.tsx:14,18,26` `pointer-events-none`/`aria-hidden="true"`; `:18` `left-3.5` / `:26` `right-3.5`; `:23` `pl-9`/`pr-8`; `category-editor.tsx:308,322` `suffix="%"` / `prefix="R$"`; `aria-label` `:310,324` inalterados; sem `placeholder` | ✅ PASS |
| 4 | Receita válida: card `Base de cálculo mensal: <valor>` + "Editar base", oculta o campo | `reference-income-card.tsx:59-76` `parsed?.ok && !editing` → `Base de cálculo mensal: <span>{formatBRL(parsed.value)}</span>` + "Editar base" | ✅ PASS |
| 5 | "Editar base": campo "Receita de referência (R$)" com texto atual e foco | `reference-income-card.tsx:69-72` `setFocusOnOpen(true); setEditing(true)`; `:89` label; `:94-95` `value={value} autoFocus={focusOnOpen}` | ✅ PASS |
| 6 | Enter/blur com texto vazio/válido volta ao card (vazio: campo vazio sem card) | `reference-income-card.tsx:80-85` `finish()` → `setEditing(false)` se `!invalid`; `:102-108` `onBlur={finish}` e Enter | ✅ PASS |
| 7 | Texto inválido: campo aberto + erro de `parseBRL` | `reference-income-card.tsx:81` `if (!invalid)`; `:110` `{parsed && !parsed.ok && <p ...>{parsed.error}</p>}` | ✅ PASS |
| 8 | Receita vazia: campo com placeholder "5.000,00" | `reference-income-card.tsx:93` `placeholder="5.000,00"` | ✅ PASS |

**Status**: ✅ 36/36 ACs conferem com o outcome da spec. Nenhum spec-precision gap.

---

## Edge Cases

- [x] Percentual inválido mostra o texto digitado, sem formatar, e mantém o erro da linha: `percent.ts:71` `parsed.ok ? ... : text`; `percent.test.ts:139` `percentFieldText(text, false)` → `text` (`""`, `"abc"`); erro em `category-editor.tsx:270,319`
- [x] Adicionar/remover categoria atualiza aviso e opções imediatamente: `parsed`/`sumMicro`/`options` derivados a cada render (`category-editor.tsx:163-165,370-374`); `add`/`remove` limpam `adjustError`
- [x] Select apontando para categoria removida volta ao padrão (maior percentual válido): `percent.ts:97-99` `resolveAdjustKey`; `percent.test.ts:176` `resolveAdjustKey("gone", opts)` → `"b"`; `adjust-sum-bar.tsx:49`; sem erro de alvo trocado (`:185` `resolveAdjustKey("c", opts.slice(1))` → `"c"`)
- [x] Mensagem de ajuste fora do intervalo some ao alterar qualquer campo: `update` faz `setAdjustError(null)` (`category-editor.tsx:178`); `add`/`remove` também (`:207,222`)
- [x] Após salvar, card da base mantém o valor digitado: `income` é estado separado (`category-editor.tsx:148`), `:158-161` só reseta `rows`; `ReferenceIncomeCard` não remonta

---

## Regressões dos fixes

Nenhuma encontrada. F1 trocou índice por key sem alterar `adjustToTotal` nem `update`; `AdjustSumBar` remonta ao voltar a soma a 100% (escolha anterior descartada, aceitável). F2 acrescentou só uma classe. F3 alterou só o span do cabeçalho; `COL_ACTION = w-8` e demais larguras iguais às da linha. Gate completo verde após os fixes.

---

## Discrimination Sensor

Baseline `git status --porcelain` da árvore real (salvo antes): `.specs/LESSONS.md`, `.specs/features/categorias-ux/spec.md`, `.specs/lessons.json` modificados; `validation.md`, `.specs/features/identidade-vertice/`, `docs/vertice_*.svg` não rastreados (outra sessão / artefatos do fluxo). Scratch: `git worktree add --detach <scratchpad>/wt HEAD` + symlink de `node_modules`. Sem `git stash`. Comando: `npx vitest run --project unit src/lib/domain/percent.test.ts src/lib/domain/sum-warning.test.ts` (base: 60 passed).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| R1 | `percent.ts:97` | `options.some((o) => o.key === choice)` → `!==` (inverte o teste de existência) | ✅ Killed (2 testes) |
| R2 | `percent.ts:98` | Fallback `?? 0` → `?? 1` (sem percentual válido, escolhe a 2ª linha) | ✅ Killed (`falls back to the first row when no percentage is valid`) |
| R3 | `percent.ts:99` | `options[fallback]?.key ?? null` → `?? ""` | ✅ Killed (`returns null without rows`) |
| R4 | `percent.ts:99` | Fallback sempre `options[0]` (ignora o maior percentual) | ✅ Killed (2 testes) |
| D1 | `percent.ts:84` | Desempate `>` → `>=` (último em empate) em `defaultAdjustIndex` | ✅ Killed (3 testes) |
| S1 | `sum-warning.ts:11` | Sinal `+`/`-` invertido | ✅ Killed (2 testes) |
| L1 | `percent.ts:77` | Removido `sumMicro !== TOTAL_MICRO &&` em `sumLabel` | ✅ Killed (`labels ... 100000000 ... 100,00%`) |

**Sensor depth**: lightweight ampliado (7 mutações; 5 em resolveAdjustKey/defaultAdjustIndex, 1 em sumWarning, 1 em sumLabel)
**Result**: 7/7 killed - PASS ✅
**Isolamento**: worktree removido e `git worktree prune`; `git worktree list` só lista a árvore real; `git status --porcelain` final idêntico ao baseline (comparado com `diff`).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`resolveAdjustKey` reaproveita `defaultAdjustIndex`; um helper de domínio, usado e testado) |
| Surgical changes | ✅ só arquivos da feature |
| No scope creep | ✅ |
| Matches patterns | ✅ (`Dialog*`, `SelectField`, `cn`, domínio em `src/lib/domain`) |
| Spec-anchored outcome check | ✅ strings/valores iguais aos da spec (tabelas acima) |
| Per-layer Coverage Expectation (domínio 1:1 com ACs; UI sem teste: AD-008) | ✅ |
| Every test maps to a spec requirement | ✅ (`percent.test.ts` novos: ACs 1,2,5,6,10, edge 1 e 3; `sum-warning.test.ts`: ACs 6-8) |
| Documented guidelines followed | `AGENTS.md`, AD-005, AD-008, `vitest.config.ts` |

**Test Integrity**: o diff de `percent.test.ts` só adiciona imports e `describe`s (nenhum teste removido ou enfraquecido; testes de `parsePercent`, `microFromCents`, `adjustToTotal`, `formatPercent`, `formatShare` intactos). Contagem do bloco novo em `percent.test.ts` + `sum-warning.test.ts`: de 54 (verificação 1) para 60 testes no escopo, +6 de `resolveAdjustKey`. Nenhum skip.

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` (Node 20)
- **Result**: exit 0. unit: 15 arquivos, 440 passed, 0 failed; integration: 13 arquivos, 279 passed, 0 failed; 0 skipped (build e lint sem erro)
- **Failures**: nenhuma (sem falha de FK nesta rodada)

---

## Pendências manuais (não são gaps de AC)

Verificação visual em navegador, não executada (sem browser):
1. Alinhamento do cabeçalho em 640, 1024 e 1440px. Em 1024 e 1440px deve alinhar. Entre ~640-753px e ~768-987px as linhas (`flex-wrap`) quebram enquanto o cabeçalho (sem wrap, visível desde `sm`) não, então os títulos ficam desalinhados das colunas nessa faixa. Limiar `sm` é o decidido na spec (Assumptions, "Cabeçalhos"); registrado como risco visual Minor/Cosmetic.
2. "AÇÕES" cabendo em `w-8` (estimativa no limite, com `text-center`).
3. Cor destrutiva ao passar o ponteiro direto na lixeira.
4. Independent Tests dos três stories (UAT interativo não realizado, sessão não interativa).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CATUX-01 | Verified | ✅ Verified |
| CATUX-02 | Verified | ✅ Verified |
| CATUX-03 | Implemented | ✅ Verified |
| CATUX-04 | Implemented | ✅ Verified |
| CATUX-05 | Verified | ✅ Verified |
| CATUX-06 | Verified | ✅ Verified |
| CATUX-07 | Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (com pendência de verificação visual manual)

**Spec-anchored check**: 36/36 ACs matched spec outcome; 5/5 edge cases; 0 spec-precision gaps
**Sensor**: 7/7 mutations killed
**Gate**: 440 unit + 279 integration passed, 0 failed
