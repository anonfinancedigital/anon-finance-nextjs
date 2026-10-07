# Validation: Visão Geral - Primeiros Passos e Estados Vazios - PASS

**Verdict**: PASS (re-verificação 1 de 3: M4 e M6 agora mortos; 0 ACs sem implementação; gates verdes)
**Date**: 2026-10-07
**Spec**: `.specs/features/visao-geral-primeiros-passos/spec.md`
**Diff range**: `dcef38d^..ff1ba5f` (apenas os 12 commits da feature: dcef38d, 7fd338d, 9cbc94d, cbdfa7f, aeef6db, 7befa7d, 2634d06, ab109de, 2b4e122, aba33ab, 2a4ce9f, ff1ba5f; commits intercalados de outras features ignorados)
**Verifier**: sub-agente independente (autor != verificador)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T12 | Done | Todas marcadas Done em tasks.md. Desvios registrados: T9 (commit 2b4e122 incluiu hunk de outra feature em summary-table.tsx) e T11 (props extras `label`, `previousMonthName`, `defaultDate`, `emphasis`). Ambos aceitos: sem efeito no comportamento especificado. |

Integridade dos testes: o diff dos 3 arquivos de teste em escopo é só adição (`month.test.ts` +32/-1, `onboarding.test.ts` +78/-0, `transactions.int.test.ts` +28/-0). Contagem não diminuiu.

---

## Spec-Anchored Acceptance Criteria

Legenda: **[T]** = coberto por teste automatizado (unit/int). **[CI]** = code-inspection only, no automated test (UI com Tests: none na matriz e AD-005). O teste de ponta a ponta das partes de UI não existe por decisão do projeto.

| AC | Spec-defined outcome | `file:line` + evidência | Tipo | Result |
| -- | -------------------- | ----------------------- | ---- | ------ |
| VG-01 | Card "Comece por aqui" acima dos totais com os 3 passos exatos | `src/components/getting-started-card.tsx:27` título `Comece por aqui`; `:44` `setup.steps.map`; rótulos `src/lib/domain/onboarding.ts:21-23`; teste `src/lib/domain/onboarding.test.ts:39-46` `expect(s.steps.map(x=>[x.id,x.label])).toEqual([...])`; posição `src/app/(app)/page.tsx:89` (antes de `SummaryCards` em `:91`); visível enquanto pendente: `getting-started-card.tsx:20` | T (rótulos) + CI (render/posição) | PASS |
| VG-02 | `role="progressbar"`, `aria-valuenow`=concluídos, `aria-valuemax` 3, texto `{n} de 3 passos` | `getting-started-card.tsx:22` `${setup.doneCount} de ${total} passos`; `:30-34` `role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={setup.doneCount}`; doneCount testado em `onboarding.test.ts:7,36,30` | T (doneCount) + CI | PASS |
| VG-03 | Passo concluído: ícone de check, texto acessível `concluído`, sem botão | `getting-started-card.tsx:55` `{step.done && <CheckIcon/>}`; `:58` `<span className="sr-only">concluído</span>`; botão só em `step.id === setup.currentId` (`:60`), e currentId é o primeiro pendente (`onboarding.ts:29`, testado `onboarding.test.ts:19-24`) | CI | PASS |
| VG-04 | Exatamente 1 botão primário no primeiro pendente; passo1 `/categorias`, passo2 abre form, passo3 `/liberdade` | `getting-started-card.tsx:13-16` hrefs `/categorias` e `/liberdade`; `:60-67` renderiza só no `currentId`; passo 2 usa `NewTransactionButton variant="inline"` sem `emphasis` (default `default` preenchido, `new-transaction-button.tsx:41`); currentId testado `onboarding.test.ts:8,14,21,35` (`toBe("categories"/"transaction"/"goal")`) | T (currentId) + CI | PASS |
| VG-05 | 3 concluídos: card não renderiza | `getting-started-card.tsx:20` `if (setup.complete) return null`; `complete` testado `onboarding.test.ts:28` `expect(s.complete).toBe(true)` | T (parcial) + CI | PASS (ver gap G1: `complete=false` só testado com 0 concluídos) |
| VG-06 | Derivação pura, entrada (categorias, transações, hasGoal), saída (steps, doneCount, currentId, complete), com unit | `src/lib/domain/onboarding.ts:14-34` função pura; `onboarding.test.ts:5-37` | T | PASS (com ressalva G1) |
| VG-07 | Primeiro acesso: linha `Todas as receitas e gastos do mês aparecem aqui.`, sem `Nenhuma transação neste mês` | `src/components/transaction-list.tsx:76-79` (condição `emptyState === "first-access"`, texto exato em `:78`); o texto `neutro` fica atrás do `return` (`:106-113` só alcançado no ramo filtrado/busca); derivação `deriveMonthState` testada `onboarding.test.ts:50-55` (`{0,0}` -> `first-access`); `countAll` `transactions.int.test.ts:1121-1129,1143` | T (estado) + CI (texto) | PASS |
| VG-08 | Mês vazio com histórico: `Nenhuma transação em {mês}` + botões `Nova transação` e `Ver {mês anterior}` | `transaction-list.tsx:82-104`: título `:85`, `NewTransactionButton ... label="Nova transação"` `:88-95`, `Ver {previousMonthName}` `:96-100`; nome do mês `onboarding.ts:49-52` testado `onboarding.test.ts:70-77` (`setembro`, `dezembro`, `janeiro`); `empty-month` testado em `:51`; page passa `monthName` `page.tsx:132`, `previousMonthName` `:134` | T (estado/nome) + CI | PASS (ver gap G2: `empty-month` só testado com mês=0 e total=5, sem fronteira total=1) |
| VG-09 | `Ver {mês anterior}` navega para `?mes=` do mês anterior; janeiro vira dezembro do ano anterior | `page.tsx:75` `previousMonth(month)`; `:133` `monthHref(currentParams, \`${previous.year}-${pad(previous.month)}\`)`; `previousMonth` testado `onboarding.test.ts:60-62` `toEqual({year:2025,month:12})` e `:64-66` (`{2026,9}`); `shiftMonth` `month.test.ts:84` ; preserva demais parâmetros (`monthHref` `month.ts:49-53`, `month.test.ts:63`) | T + CI | PASS |
| VG-10 | Com passo pendente, "Nova transação" (cabeçalho) e FAB `outline` | `page.tsx:76` `emphasis = setup.complete ? "primary" : "secondary"`; `:114` header `emphasis={emphasis}`; `:140` FAB `emphasis={emphasis}`; `new-transaction-button.tsx:41` `emphasis === "secondary" ? "outline" : "default"`, aplicado em header `:47`, inline `:52`, FAB `:58` | CI | PASS |
| VG-11 | FAB `+` visível só abaixo de `md` | `new-transaction-button.tsx:61` `className="fixed ... rounded-full shadow-lg md:hidden"`; cabeçalho `:47` `hidden md:inline-flex` | CI | PASS |
| VG-12 | Sem categorias no mês: linha explicativa exata e nenhum botão preenchido | `category-overview.tsx:21-27` (`rows.length === 0`) `description="Veja para onde vai seu dinheiro, comparado com o que você planejou."` sem `note`; `content-card.tsx:28-33` renderiza `<p>` sob o `<h2>`; `summary-table.tsx:33` `if (hideCta) return null`, senão `:36` `Button variant="outline"`; page passa `hideCta={!setup.complete}` `page.tsx:98` | CI | PASS |
| VG-13 | 0 transações: `R$ 0,00` sem `text-income`/`text-destructive`/`text-link` e legendas | `src/components/summary-cards.tsx:12` `NEUTRAL = {tone:"text-foreground", iconTone:"bg-muted text-muted-foreground"}`; `:49` `colors = empty ? NEUTRAL : {tone, iconTone}`; legendas exatas `:22` `Registre receitas para ver aqui`, `:31` `Registre gastos para ver aqui`, `:40` `Receitas menos gastos do mês`; render `:67` só com `empty`; `page.tsx:95` `empty={monthIsEmpty}` (`:68` `transactions.length === 0`, inclui recorrentes projetadas) | CI | PASS |
| VG-14 | 1+ transações: cores atuais (verde, vermelho, roxo ou vermelho se negativo) | `summary-cards.tsx:23,32,41` `tone` `text-income`/`text-destructive`/`balanceCents < 0 ? "text-destructive" : "text-link"`; `data-testid` preservados `:62` | CI | PASS |
| VG-15 | Mês vazio sem filtro/busca: sem busca, filtro de categoria nem subcategoria | `page.tsx:77` `showFilters = !monthIsEmpty \|\| filter.categoryId !== null \|\| search !== ""`; `:121-125` renderiza `TransactionFilter` só se `showFilters`; mantém visível com filtro/busca ativos (edge case) | CI | PASS |
| VG-16 | `{n} categorias` e `{n} lançamentos` não renderizados quando n = 0 | `category-overview.tsx:21-27` ramo vazio sem `note`; `:36` nota só no ramo com linhas; `page.tsx:110` `note={shown.length > 0 ? \`${shown.length} lançamentos\` : undefined}` | CI | PASS |
| VG-17 | Único controle de mês, sem `input[type=month]` | `src/components/month-picker.tsx` não contém `Input`/`type="month"` (grep em `src` e `e2e`: `type="month"` só em `src/components/transaction-form.tsx:336,355`, campos de recorrência de outro fluxo); botão `data-testid="month-label"` `month-picker.tsx:47-51` | CI | PASS |
| VG-18 | Clique no nome abre 12 meses pt-BR com setas de ano; escolher navega para `?mes=AAAA-MM` preservando parâmetros e fecha | `month-picker.tsx:40-47` `Popover` + `PopoverTrigger`; `:59-75` botões `Ano anterior`/`Próximo ano`; `:78` `monthNamesPtBR().map`; `:27-31` `choose`: `setOpen(false)` e `router.push(href(...))` com `monthHref(searchParams, ...)`; nomes testados `month.test.ts:93-98` `names[0]` `Janeiro`, `names[11]` `Dezembro`, `toHaveLength(12)`; `shiftMonth` `month.test.ts:80,84,88` | T (nomes/shift) + CI | PASS |
| VG-19 | Escolher o mês já exibido fecha sem navegar | `month-picker.tsx:28-29` `setOpen(false); if (viewYear === month.year && chosen === month.month) return;` | CI | PASS |

**Status**: 19/19 ACs implementados e conformes ao texto exato da spec; apenas VG-06 (+ partes puras de VG-01..05, VG-07..09, VG-18) têm teste automatizado, conforme a matriz de testes. As 2 falhas de discriminação do sensor (abaixo) enfraquecem as asserções de VG-05/VG-06 e VG-08.

Strings da spec conferidas literalmente no código: `Todas as receitas e gastos do mês aparecem aqui.` (`transaction-list.tsx:78`), `Nenhuma transação em {mês}` (`:85`), `Veja para onde vai seu dinheiro, comparado com o que você planejou.` (`category-overview.tsx:23-27`), legendas dos cards (`summary-cards.tsx:22,31,40`), `{n} de 3 passos` (`getting-started-card.tsx:22`), `Ver {mês}` (`transaction-list.tsx:98`), `concluído` (`getting-started-card.tsx:58`).

### Spec-precision gaps (⚠️)

- VG-04 / VG-08: a spec não fixa o rótulo do botão de link dos passos 1 e 3 (`Definir categorias`, `Definir Ápice`, `getting-started-card.tsx:14-15`); o código escolheu os rótulos. Spec-precision gap (L-002).
- VG-10: o botão `Nova transação` do estado de mês vazio está fixo em `emphasis="secondary"` (`page.tsx:136`) mesmo sem passos pendentes; a spec só define `outline` enquanto houver passo pendente. Escolha segura (mantém um único primário), mas não especificada. Spec-precision gap.
- VG-09 / VG-18: "preservando os demais parâmetros" não diz se `categoria`/`subcategoria`/`busca` devem ser preservados ao mudar de mês; o código preserva todos (`month.ts:49-53`). Spec-precision gap menor.

---

## Edge Cases

- [x] Transações só em meses futuros, vendo mês passado vazio: `deriveMonthState` usa total global (`onboarding.ts:38-40`), logo `empty-month`; testado `onboarding.test.ts:51` (CI para o caso futuro específico).
- [x] `?mes=` inválido: `parseMonth` inalterado (`page.tsx:37`), já testado em `month.test.ts:22-32`.
- [x] Filtro/busca ativos com 0 resultados: ramos de vazio só ativos se `!filtered && !searching` (`transaction-list.tsx:76,82`); mensagens atuais mantidas `:106-113`; controles visíveis `page.tsx:77`.
- [x] Janeiro cruza o ano: `previousMonth({2026,1})` -> `{2025,12}` (`onboarding.test.ts:60-62`), `shiftMonth` `month.test.ts:84`.

---

## Discrimination Sensor

Profundidade: expandida-lite (14 mutações comportamentais, em `git worktree` temporário em HEAD `ff1ba5f` com `node_modules` por symlink; worktree removido; árvore real intocada).
Testes executados por mutação: `onboarding.test.ts` + `month.test.ts` (unit) e `transactions.int.test.ts -t countAll` (integration, `orcamento_vg_test`).

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| M1 | `src/lib/domain/onboarding.ts:29` | passo atual = último pendente (`reverse().find`) | Killed |
| M2 | `onboarding.ts:21` | passo 1 exige `categories >= 2` | Killed |
| M3 | `onboarding.ts:22` | passo 2 exige `transactions >= 2` | Killed |
| M4 | `onboarding.ts:30` | `complete` vira `doneCount >= 2` | Killed (re-verificação 1: `onboarding.test.ts:9,15,23,39` `expect(s.complete).toBe(false)`; `:56` `{monthTransactions:1,totalTransactions:1}` -> `has-data`) |
| M5 | `onboarding.ts:39` | `first-access` testa `monthTransactions` em vez de `totalTransactions` | Killed |
| M6 | `onboarding.ts:40` | `empty-month` vira `monthTransactions <= 1` | Killed (re-verificação 1: `onboarding.test.ts:9,15,23,39` `expect(s.complete).toBe(false)`; `:56` `{monthTransactions:1,totalTransactions:1}` -> `has-data`) |
| M7 | `onboarding.ts:44` | `previousMonth` usa `shiftMonth(m, +1)` | Killed |
| M8 | `src/lib/domain/month.ts:58` | `shiftMonth` ignora virada de ano (`year`) | Killed |
| M9 | `month.ts:58` | `shiftMonth` mês sem `+ 1` (off-by-one) | Killed |
| M10 | `month.ts:78` | `monthNamesPtBR` devolve só 11 meses | Killed |
| M11 | `onboarding.ts:51` | `monthLongName` com `Date.UTC(year, month, 1)` (mês seguinte) | Killed |
| M12 | `onboarding.ts:23` | `done: !input.hasGoal` | Killed |
| M13 | `src/lib/db/repos/transactions.ts:402-404` | `countAll` sem filtro `userId` (confirmado: `AssertionError: expected 3 to be 1`) | Killed |
| M14 | `transactions.ts:405` | `countAll` retorna `row.total + 1` | Killed |

Sensor: 14 mutações injetadas, 14 mortas (M4 e M6 mortos na re-verificação 1, em worktree temporário com o teste corrigido). Resultado do sensor: aprovado.

- M4: nenhum teste exercita `complete === false` com 1 ou 2 passos concluídos (apenas `onboarding.test.ts:9` com 0 concluídos; `:28` `true` com 3). `complete` decide se o card "Comece por aqui" some (VG-05), a ênfase dos botões (`page.tsx:76`) e `hideCta` (`:98`).
- M6: `deriveMonthState` só tem casos `monthTransactions` 0 e 3 (`onboarding.test.ts:51-52`); falta a fronteira 1 (um único lançamento no mês deve ser `has-data`). Um mês com exatamente 1 lançamento mostraria o estado vazio em vez do dado.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Minimum code | OK |
| Surgical changes | OK com desvio T9 (hunk alheia em `summary-table.tsx` commitada junto) |
| No scope creep | OK; os commits `age-ticks`/`freedom`/`goal-*` do `git diff --stat` do intervalo pertencem a outras features intercaladas e não foram avaliados |
| Matches patterns | OK (props opcionais, `ContentCard`, `Button asChild`) |
| Spec-anchored outcome check | OK nas partes testadas; gaps G1/G2 |
| Per-layer Coverage Expectation | Domínio quase 1:1; ramos `complete` parcial e fronteira de `deriveMonthState` ausentes (G1, G2); repositório cobre caminho principal + isolamento + usuário sem transações (`transactions.int.test.ts:1121,1126,1132`) |
| Todo teste mapeia a AC | OK |
| Diretrizes documentadas | `AGENTS.md`/`CLAUDE.md`, AD-005 (sem e2e/componente), matriz de tasks.md |

---

## Gate Check

- **Ambiente**: Node 20.20.2 (nvm); `DATABASE_URL=postgres://postgres:postgres@localhost:5433/orcamento_vg_test`.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run test:unit`: 27 arquivos, **820 passed**, 0 failed.
- `npm run test:int`: 18 arquivos, **503 passed**, 0 failed.
- `npm run build`: sucesso (todas as rotas listadas, incluindo `/`).
- Skipped: nenhum.
- Delta de testes em escopo: apenas adições (+138 linhas de teste, 0 removidas, 1 linha de import alterada em `month.test.ts`).

---

## Fix Plans (aplicados e re-verificados na iteração 1)

### Fix 1 (Minor, G1): `complete` não testado em progresso parcial
- **Root cause**: `onboarding.test.ts` só afirma `complete=false` com 0 concluídos.
- **Fix task**: nos casos de `:12` (1 concluído), `:19` (2 concluídos) e `:33` (2 concluídos) acrescentar `expect(s.complete).toBe(false)`.
- **Verify**: re-rodar M4 (`doneCount >= 2`) e confirmar que é morto.

### Fix 2 (Minor, G2): fronteira 1 de `deriveMonthState`
- **Root cause**: casos `{0,0}`, `{0,5}`, `{3,5}` não cobrem `monthTransactions: 1`.
- **Fix task**: adicionar `[{ monthTransactions: 1, totalTransactions: 1 }, "has-data"]` e, opcionalmente, `{0,1}` -> `empty-month` em `onboarding.test.ts:50-54`.
- **Verify**: re-rodar M6 e confirmar que é morto.

---

## Requirement Traceability Update

VG-01..VG-19: implementados e verificados por inspeção/testes; permanecem pendentes de re-verificação final após Fix 1 e Fix 2 (nenhum AC regrediu). Status em spec.md não foi alterado pelo Verifier.

---

## Summary

**Overall**: Ready

**Spec-anchored check**: 19/19 ACs conformes ao texto exato; 3 spec-precision gaps (rótulos dos links dos passos, ênfase fixa do botão do mês vazio, parâmetros preservados na troca de mês); VG-01..05 e VG-07..19 de UI verificados apenas por inspeção de código, sem teste automatizado (AD-005).
**Sensor**: 14/14 mutações mortas.
**Gate**: typecheck, lint, build ok; unit 820 passed; int 503 passed.

**What works**: strings exatas, cores neutras vs. coloridas, filtros e contadores condicionais, FAB `md:hidden`, link do mês anterior com virada de janeiro, seletor pt-BR sem `input[type=month]`.

**Next steps**: nenhum. Fix 1 e Fix 2 aplicados e re-verificados.
