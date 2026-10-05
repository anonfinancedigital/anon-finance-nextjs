# Modal de Transação Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/modal-transacao/spec.md`
**Diff range**: `cfa056b..6f8ff64` (commits de T1-T11; o commit `6d9ac97`, de outra feature, foi ignorado)
**Verifier**: sub-agente independente (autor != verificador)

## Validation: modal-transacao - FAIL

Motivo: 1 edge case do spec diverge do código (categoria removida da lista, ver Gap 1). Todo o resto tem evidência `file:line`, mas a UI não tem teste automatizado (Tests=none, AD-005): a evidência de UI é leitura de código mais a verificação manual registrada no rodapé da T11 (`.specs/features/modal-transacao/tasks.md:602-610`).

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | Done    | `maskBRLInput` + 13 testes novos em `money.test.ts` |
| T2   | Done    | `ui/switch.tsx` |
| T3   | Done    | `kind-toggle.tsx` |
| T4-T7 | Done   | `transaction-form.tsx` |
| T8   | Done    | `transaction-list.tsx` |
| T9   | Done    | `new-transaction-button.tsx` |
| T10  | Done    | `category-picker.tsx` removido |
| T11  | Done    | verificação manual anotada em `tasks.md:602-610` |

---

## Spec-Anchored Acceptance Criteria

Legenda: "sem teste" = sem teste automatizado (UI, AD-005); "manual" = coberto pela verificação manual da T11 (`tasks.md:602-610`). Todos os arquivos abaixo em `src/components/` salvo indicação.

### MODT-01 / MODT-02: categoria e subcategoria

| Critério | Spec-defined outcome | Evidência `file:line` | Resultado |
| -------- | -------------------- | --------------------- | --------- |
| Cat AC1: select "Categoria" lista todas por `categoryDisplayName`, mesma ordem | select com nome "Categoria" | `transaction-form.tsx:200-218` (Label htmlFor + NativeSelect, `map` em `categories` sem reordenar). Sem teste | OK (leitura) |
| Cat AC2: sem categoria escolhida, sem "Subcategoria" | não renderiza | `transaction-form.tsx:224-225` (`selectedCategory &&`). Sem teste | OK (leitura) |
| Cat AC3: categoria com subs mostra "Subcategoria" com "Sem subcategoria" primeiro | 1a opção "Sem subcategoria" | `transaction-form.tsx:227,240-245`. Sem teste | OK (leitura) |
| Cat AC4: categoria sem subs, sem "Subcategoria" | não renderiza | `transaction-form.tsx:225` (`length > 0`). Sem teste | OK (leitura) |
| Cat AC5: trocar categoria zera subcategoria | "Sem subcategoria" | `transaction-form.tsx:205-210` + `src/lib/domain/category-label.ts:21-25` (`subcategoryId = ""`). Sem teste | OK (leitura) |
| Cat AC6: salvar sem categoria mostra "Selecione uma categoria" sob o select | texto literal | `transaction-form.tsx:212,219-223`; mensagem vem de `src/lib/validation/transaction.ts:49`. Sem teste de UI; zod coberto por `transaction.int.test.ts:99` | OK (leitura) |
| Cat AC7: edição abre com os dois selects preenchidos | valores iniciais | `transaction-form.tsx:203,230-236`; `transaction-list.tsx:169-170`. Manual parcial (editar funciona). Sem teste | OK (leitura) |
| Cat AC8: Ganho não renderiza Categoria/Subcategoria | ausentes | `transaction-form.tsx:187`. Sem teste | OK (leitura) |
| Edge: categoria editada ausente da lista cai no placeholder e o save falha com "Selecione uma categoria" | placeholder + mensagem "Selecione uma categoria" | placeholder OK em `transaction-form.tsx:203`; **save envia o id obsoleto** (`transaction-form.tsx:108,114-123`, usa `values.categoryId`) e a action responde "Categoria não encontrada" (`src/actions/transactions.ts:12,32-34`) | **GAP (divergência)** |

### MODT-03 / MODT-04 / MODT-05: tipo e valor

| Critério | Spec-defined outcome | Evidência `file:line` | Resultado |
| -------- | -------------------- | --------------------- | --------- |
| T/V AC1: ordem Tipo, Valor, Descrição, Categoria, Subcategoria, Data, Recorrente | ordem exata | `transaction-form.tsx:146,151,171,187,224-246,259,273`. Sem teste | OK (leitura) |
| T/V AC2: segmentado, `radiogroup` "Tipo", `radio` Gasto/Ganho | roles e nome | `kind-toggle.tsx:17-18,24-33` (Radix RadioGroup.Item = `role="radio"`; `grid-cols-2` largura total). Sem teste | OK (leitura) |
| T/V AC3: trocar opção muda seleção e mostra/oculta categoria | alterna | `kind-toggle.tsx:20`, `transaction-form.tsx:146-149,187`. Manual (Ganho oculta categoria, T4/T5). Sem teste | OK (leitura + manual) |
| T/V AC4: Valor com `text-3xl` e fonte display | >= 30px, display | `transaction-form.tsx:161-164` (`font-display text-3xl md:text-3xl`; `md:` anula o `md:text-sm` de `ui/input.tsx:10`). Sem teste | OK (leitura) |
| T/V AC5: dígitos viram `0,01 ... 1.234,56` | sequência exata | `money.ts:47-53`; teste `money.test.ts:64-71` - `expect(text).toBe(want)` por passo; ligado ao input em `transaction-form.tsx:160` | OK (teste) |
| T/V AC6: não dígito é ignorado, mantém texto | texto atual | `money.test.ts:77-79` - `expect(maskBRLInput("1.234,56x")).toBe("1.234,56")`; `money.test.ts:73-75` | OK (teste) |
| T/V AC7: limpar mostra vazio com placeholder `0,00` | `""` + placeholder | `money.test.ts:81-83` (`""` -> `""`); placeholder `transaction-form.tsx:157`. Placeholder sem teste | OK (teste + leitura) |
| T/V AC8: Ganho pinta o valor com `success` | token `text-success` | `transaction-form.tsx:163`; token existe em `src/app/globals.css:33,82`. Manual (T4). Sem teste | OK (leitura + manual) |
| T/V AC9: envia à action o mesmo texto pt-BR, sem mudar a forma do input | `amount` = texto mascarado | `transaction-form.tsx:108-126` (`amount` direto do estado, mesma forma de input); `money.test.ts:94-96` - `parseBRL(maskBRLInput(input)).ok` é `true` | OK (teste + leitura) |
| T/V AC10: valor vazio mostra "Informe o valor" sob o campo | texto literal | `transaction-form.tsx:166-168`; mensagem `money.ts:16`, `validation/transaction.ts:6`. Sem teste de UI | OK (leitura) |
| T/V AC11: só zeros mostra campo vazio | `""` | `money.ts:48-49`; `money.test.ts:81-83` (`"0"`, `"0,00"`) e `money.test.ts:89-92` | OK (teste) |
| Edge: 11 dígitos máximo (R$ 999.999.999,99), ignora excedentes | corte em 11 | `money.ts:41,48`; `money.test.ts:85-87` - `toBe("999.999.999,99")` | OK (teste) |

### MODT-06 / MODT-07 / MODT-08: rodapé

| Critério | Spec-defined outcome | Evidência `file:line` | Resultado |
| -------- | -------------------- | --------------------- | --------- |
| Rod AC1: criação mostra "Cancelar" e "Salvar", sem "Excluir" | botões | `transaction-form.tsx:343,354,359-365`; `new-transaction-button.tsx:110-115` (sem `onDelete`). Manual. Sem teste | OK (leitura + manual) |
| Rod AC2: edição mostra "Excluir", "Cancelar", "Salvar alterações" | botões | `transaction-form.tsx:343-365`; `transaction-list.tsx:179-185`. Manual. Sem teste | OK (leitura + manual) |
| Rod AC3: "Cancelar" fecha sem chamar action | sem action | `transaction-form.tsx:355`; `new-transaction-button.tsx:114`; `transaction-list.tsx:180`. Manual (cancelar criação e edição). Sem teste | OK (leitura + manual) |
| Rod AC4: "Excluir" abre a confirmação existente, mesmo título/descrição, mesma transação e mês | mesmo diálogo | `transaction-list.tsx:181-184` (`setDeleting(editing)`, Occurrence com `month`), `190-201`. Manual (título "Excluir transação?"). Sem teste | OK (leitura + manual) |
| Rod AC5: confirmar chama `deleteTransaction(id, month)`, fecha os dois, remove da lista | chamada + fechamento | `transaction-list.tsx:61-72` (`deleteTransaction(id, month)`, `setDeleting(null); setEditing(null)`). Remoção sem reload depende de `revalidatePath` da action (fora do diff); manual (linha some). Sem teste | OK (leitura + manual) |
| Rod AC6: erro mantém confirmação aberta com `role="alert"` | alerta | `transaction-list.tsx:70,203-207`; `setDeleteError(null)` ao abrir `:182`. Caminho de erro **não** exercitado manualmente nem por teste | OK (leitura), sem teste, sem manual |
| Rod AC7: durante save/delete, desabilita Salvar e Excluir | desabilitados | `transaction-form.tsx:347,361` (pending do save); pending da exclusão vive na lista e desabilita apenas o "Excluir" da confirmação (`transaction-list.tsx:47,212`). Ver Gap 3 | OK parcial (spec-precision gap) |
| Rod AC8: "Excluir" `destructive`, afastado dos demais | variant + oposto | `transaction-form.tsx:346,349` (`sm:mr-auto`). No mobile empilhado (`flex-col-reverse`, `:342`) não há afastamento além da ordem. Ver Gap 4 | OK em >= 640px; spec-precision gap no mobile |

### MODT-09: recorrência por switch

| Critério | Spec-defined outcome | Evidência `file:line` | Resultado |
| -------- | -------------------- | --------------------- | --------- |
| Sw AC1: `role="switch"` com nome "Transação recorrente" | role + nome | `ui/switch.tsx:44-61` (Radix Switch.Root = `role="switch"`), `transaction-form.tsx:274-285` (Label htmlFor). Sem teste | OK (leitura) |
| Sw AC2: novo começa desligado, sem Frequência/Mês final | off | `transaction-form.tsx:69,277,288`. Sem teste | OK (leitura) |
| Sw AC3: ligar -> `forever` + radiogroup "Frequência" com as 2 opções | opções e padrão | `transaction-form.tsx:279-282,289-313` (labels literais `:296-297`). Sem teste | OK (leitura) |
| Sw AC4: "até um mês/ano" mostra "Mês final" | input | `transaction-form.tsx:316-325`. Sem teste | OK (leitura) |
| Sw AC5: "sem data final" oculta "Mês final" | oculto | `transaction-form.tsx:292,316`. Sem teste | OK (leitura) |
| Sw AC6: desligar -> `none`, oculta e limpa mês final | `none` + `""` | `transaction-form.tsx:281-282`. Sem teste | OK (leitura) |
| Sw AC7: edição de série abre ligada com opção e mês | mapeamento | `transaction-list.tsx:172-177`, `transaction-form.tsx:277,316-322`. Sem teste | OK (leitura) |
| Sw AC8: "até" sem mês final mostra "Informe o mês final" | texto literal | `transaction-form.tsx:326-330`; `validation/transaction.ts:67`; zod coberto por `transaction.test.ts:174-179`. Sem teste de UI | OK (leitura) |

### MODT-10: edge cases de tipo

| Critério | Spec-defined outcome | Evidência `file:line` | Resultado |
| -------- | -------------------- | --------------------- | --------- |
| Gasto -> Ganho com categoria: nenhum `categoryId`/`subcategoryId` enviado | omitidos | `transaction-form.tsx:114-126` (ramo `income` sem as chaves). Sem teste | OK (leitura) |
| Ganho -> Gasto restaura categoria e subcategoria | restauradas | `transaction-form.tsx:148` (troca só `kind`; `categoryId`/`subcategoryId` ficam no estado), `:203,230-236`. Sem teste | OK (leitura) |
| Sem categorias (gasto): link "Crie suas categorias primeiro" e primário desabilitado | link + disabled | `transaction-form.tsx:96,189-197,361`. Sem teste | OK (leitura) |
| Duplo clique em "Salvar" cria 1 transação | id na montagem | `transaction-form.tsx:62,87-89,107` | OK (leitura) |

### MODT-11: rodapé fixo no mobile / modal contido

| Critério | Spec-defined outcome | Evidência `file:line` | Resultado |
| -------- | -------------------- | --------------------- | --------- |
| Mob AC1: < 640px rodapé fixo na base, primário largura total | sticky + `w-full` | `transaction-form.tsx:142,335` (rodapé `shrink-0` fora da área rolável), `:362` (`w-full sm:w-auto`). Sem teste | OK (leitura) |
| Mob AC2: conteúdo maior que o modal rola acima do rodapé | rolagem interna | `transaction-form.tsx:145` (`min-h-0 flex-1 overflow-y-auto`). **Não verificado manualmente** (`tasks.md:610`) | OK (leitura), sem teste, sem manual |
| Mob AC3: >= 640px botões em largura natural numa linha | `sm:flex-row` | `transaction-form.tsx:342,362`. Manual 1280x800. Sem teste | OK (leitura + manual) |
| Mob AC4: modal <= `100dvh - 2rem` | `max-h` | `new-transaction-button.tsx:106`; `transaction-list.tsx:155`. Manual (557px/509px, `tasks.md:606`) | OK (leitura + manual) |
| Mob AC5: ao abrir, foco no Valor | foco | `transaction-form.tsx:156` (`autoFocus`). Manual (`tasks.md:607`) | OK (leitura + manual) |

### MODT-12: altura

| Critério | Spec-defined outcome | Evidência `file:line` | Resultado |
| -------- | -------------------- | --------------------- | --------- |
| P3 AC1: 390x844, gasto, sem categoria, sem recorrência: sem rolagem | `scrollHeight <= clientHeight` | Só manual: `tasks.md:606` (medido com categoria selecionada, caso mais exigente que o do spec). Sem teste | OK (manual) |
| Goal: altura < metade da atual (6 categorias, 1 com 5 subs) | < 50% do baseline | Nenhum baseline registrado; só vale a medição absoluta de `tasks.md:606` | Spec-precision gap (Gap 5) |

**Status**: 40 de 41 ACs e 5 de 6 edge cases com evidência e resultado conforme (conta o edge de categoria removida como o único divergente). Gaps presentes: 1 divergência real e 4 spec-precision gaps. Teste automatizado só em `maskBRLInput` (MODT-04/05, 13 testes novos em `money.test.ts:63-97`).

---

## Discrimination Sensor

Escopo: `maskBRLInput` (único código com teste automatizado). Scratch: `git worktree` temporário com `node_modules` linkado, descartado ao final. Baseline `test:unit`: 343 passaram.

| Mutação | File:line | Descrição | Morto? |
| ------- | --------- | --------- | ------ |
| 1 | `src/lib/domain/money.ts:48` | corte em 10 dígitos (`MAX_DIGITS - 1`) | Morto (1 falha) |
| 2 | `src/lib/domain/money.ts:48` | não zerar só-zeros (remove `.replace(/^0+/, "")`) | Morto (4 falhas) |
| 3 | `src/lib/domain/money.ts:51-52` | ordem dos centavos (`slice(0,-1)` / `slice(-1)`) | Morto (6 falhas) |
| 4 | `src/lib/domain/money.ts:51` | separador de milhar `.` -> `,` | Morto (6 falhas) |
| 5 | `src/lib/domain/money.ts:50` | `padStart(3)` -> `padStart(2)` | Morto (4 falhas) |

**Sensor depth**: lightweight
**Resultado do sensor**: 5/5 mortos, 0 sobreviventes. Isolamento confirmado: `git status --porcelain` da árvore real idêntico ao baseline (42 linhas, `diff` vazio); worktree removido, `git worktree list` mostra só a árvore real. Não houve `git stash`.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Mudança só de UI; `actions/transactions.ts`, `validation/transaction.ts` e schema intocados (Success Criteria) | OK (arquivos do diff limitados aos 7 listados) |
| Segue padrões de `ui/` (Radix wrapper, tokens) | OK |
| Cada teste mapeia a AC (`maskBRLInput` -> MODT-04/05) | OK |
| Diretrizes documentadas: `AGENTS.md`, `vitest.config.ts`; UI Tests=none por AD-005 | OK |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit` e `npm run test:int` (Postgres `orcamento-pg` de pé), na árvore real, Node 20.20.2.
- **Resultado**: typecheck e lint sem erros; `test:unit` 343 passaram, 0 falhas, 0 pulados (12 arquivos); `test:int` 235 passaram, 0 falhas (11 arquivos).
- **Delta de testes**: +13 testes em `money.test.ts` (bloco `maskBRLInput`, linhas 63-97); nenhum teste removido ou enfraquecido no diff da feature.

---

## Fix Plans

### Fix 1: categoria removida envia id obsoleto (Major)

- **Root cause**: `submit` envia `values.categoryId` (`transaction-form.tsx:108,114-123`) mesmo quando o select está no placeholder porque a categoria não existe mais (`:203`); a action rejeita com "Categoria não encontrada" (`src/actions/transactions.ts:12,32-34`) em vez de "Selecione uma categoria". O mesmo vale para `subcategoryId` obsoleto (`:230-236` exibe `""` mas `:108` envia o id antigo).
- **Fix task**: em `submit`, enviar `categoryId: selectedCategory ? values.categoryId : ""` e `subcategoryId` só se pertencer a `selectedCategory.subcategories`; ou normalizar o estado ao montar.
- **Priority**: Major.

---

## Gaps de precisão do spec (⚠️)

- Gap 3: Rod AC7 não diz quem desabilita "Excluir" durante a exclusão em andamento (o pending da exclusão está na lista, não no form).
- Gap 4: Rod AC8 "afastado ... na borda oposta" não define o layout empilhado no mobile (`flex-col-reverse`, sem margem).
- Gap 5: Goal "menos da metade da altura atual" não tem baseline registrado, só a medição absoluta; e P3 AC1 mede sem categoria, enquanto a T11 mediu com categoria.
- Gap 6: Edge "11 dígitos... ignore further digits" não define inserção no meio do texto (código mantém os 11 primeiros dígitos).
- Dívida sem teste/manual: Rod AC6 (erro de `deleteTransaction`) e Mob AC2 (rolagem do corpo com rodapé visível) só têm leitura de código.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| MODT-01 | Pending | Verified (leitura de código) |
| MODT-02 | Pending | Needs Fix (edge de categoria removida) |
| MODT-03 | Pending | Verified (leitura + manual) |
| MODT-04 | Pending | Verified (teste + leitura) |
| MODT-05 | Pending | Verified (teste + leitura) |
| MODT-06 | Pending | Verified (leitura + manual) |
| MODT-07 | Pending | Verified (erro sem verificação manual) |
| MODT-08 | Pending | Verified com spec-precision gaps |
| MODT-09 | Pending | Verified (leitura) |
| MODT-10 | Pending | Verified (leitura) |
| MODT-11 | Pending | Verified (rolagem do corpo sem medição) |
| MODT-12 | Pending | Verified (manual) |

---

## Summary

**Overall**: Not Ready (1 divergência real)

**Spec-anchored check**: 40/41 ACs e 5/6 edge cases conformes; 1 divergência (edge de categoria removida); 4 spec-precision gaps
**Sensor**: 5/5 mutações mortas
**Gate**: typecheck e lint limpos; 343 unit e 235 integração passaram

**What works**: máscara de moeda totalmente testada e discriminante; o formulário, o switch, o toggle e a integração nos dois diálogos seguem o spec por leitura de código e pela verificação manual da T11.

**Issues found**: Fix 1 (categoria removida).

**Next steps**: aplicar o Fix 1 e re-verificar (iteração 1 de 3).
