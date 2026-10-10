# Validation: Ápice folga sobre a meta - PASS

**Date**: 2026-10-07
**Spec**: `.specs/features/apice-folga-meta/spec.md`
**Diff range**: `a37218b^..cfa98ea`. São 16 commits `feat(apice)` (T1-T14, T16, T17; a T15 fechou sem commit de código) e 3 commits de correção: `fb89bf3` (F1/T18), `2099e7d` (F2/T19) e `cfa98ea` (F3/T20). Ignorados: commits de outras sessões e `.specs/features/data-nascimento/` (não rastreado).
**Verifier**: sub-agente independente (author ≠ verifier)
**Verdict**: PASS (re-verificação, iteração 1 de 3)

Notação: as linhas citadas referem-se ao HEAD `cfa98ea`. `normalize` troca NBSP por espaço.

---

## Histórico

- **Iteração 0** (`a37218b^..ed88907`): FAIL. Os mutantes M3, M8 e M9 sobreviveram. Havia ainda props opcionais obsoletas, rótulos da barra que podiam se sobrepor com folga grande, o desvio `@3xl` sem registro, a troca do import `cn` e a borda "nenhuma opção" sem teste.
- **Iteração 1** (`..cfa98ea`): todos os gaps foram fechados (ver "Re-verificação dos gaps").

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T8 (domínio e copy) | ✅ Done | - |
| T9-T14 (Hero, folga, robustez, ações) | ✅ Done | - |
| T15 | ✅ Done | sem mudança de código; `drawer-summary.tsx:26` e `goal-empty-state.tsx:135,139` usam o `depositText` e o `summarySentence` novos |
| T16, T17 | ✅ Done | a T16 foi ajustada pela T20 (grade 2×2 com `reach`, registrado em `tasks.md`) |
| T18 / T19 / T20 (fixes) | ✅ Done | `fb89bf3`, `2099e7d`, `cfa98ea` |

---

## Spec-Anchored Acceptance Criteria

| Req | Critério | Resultado definido pela spec | `file:line` + asserção / código | Status |
| --- | -------- | ---------------------------- | ------------------------------- | ------ |
| APF-01 (AC1) | aporte 0 com guardado < alvo: indicador | "R$ 0" em `income`, com check | `src/lib/domain/freedom-copy.test.ts:245` `expect(normalize(depositText(compounding))).toBe("R$ 0")`; `:253` (1 centavo abaixo). UI: `src/components/goal-hero.tsx:86` (`text-income`), `:90` (`<Check aria-hidden>`) | ✅ PASS |
| APF-01 (AC4) | sem "em {prazo}" e sem "Sem aporte necessário" | ausentes | `src/components/goal-hero.tsx:92-93`; grep por `Sem aporte necessário\|Você já tem o necessário\|NO_DEPOSIT_NEEDED` em `src/` e `e2e/`: 0 ocorrências; mutante M17 morto | ✅ PASS |
| APF-02 (AC2) | linha de chegada | "Seu patrimônio atual já te leva lá: você atinge a meta aos 43 anos, 5 anos antes do previsto." e "1 ano" | `src/lib/domain/freedom-copy.test.ts:267`, `:274`; N: `src/lib/domain/freedom.test.ts:484`, `:351`, `:359-360` (borda 119 → 43, 120 → 44); `:315` (mês 118). UI: `goal-hero.tsx:93` | ✅ PASS |
| APF-02 (AC3) | N = idade-alvo | "…aos 48 anos, no prazo previsto." | `src/lib/domain/freedom-copy.test.ts:281` | ✅ PASS |
| APF-03 (AC5) | frase-resumo | "Para ter R$ 5 mil/mês aos 48 anos, você precisa de R$ 1,2 mi. Seu patrimônio atual, rendendo, chega lá aos 43, sem novos aportes." | `src/lib/domain/freedom-copy.test.ts:200` (texto literal). UI: `goal-hero.tsx:70` | ✅ PASS |
| APF-04 (AC6) | marco de 100% | "Aos 43 anos (Meta)" | `src/lib/domain/freedom.test.ts:945` (`months: 118, ageYears: 43`) + `src/lib/domain/freedom-copy.test.ts:498` (formato "Aos N anos (Meta)"); 25, 50 e 75% mantêm a regra atual: `freedom.test.ts:950` | ✅ PASS (por composição) |
| APF-05 (AC7) | aporte > 0 inalterado (AP-04..06, LEX-13) | valor/mês, "em {prazo}", "Isso exige guardar…", marco no prazo | `src/lib/domain/freedom-copy.test.ts:154`, `:220`; `src/lib/domain/freedom.test.ts:862` (pré-existente), `:968-970`, `:499`. UI: `goal-hero.tsx:97-101`; `goal-checkpoints.tsx:73,80-86` (o ramo `!reach` mantém as classes `@xl` de antes) | ✅ PASS |
| APF-06 (AC1) | já atingiu: frase | "…Você já atingiu seu Ápice." | `src/lib/domain/freedom-copy.test.ts:188`, `:212` | ✅ PASS |
| APF-06 (AC2) | já atingiu: indicador | "Meta alcançada", sem "em {prazo}" | `src/lib/domain/freedom-copy.test.ts:236`, `:261`; UI `goal-hero.tsx:94-95` | ✅ PASS |
| APF-07 (AC3) | renda atual | "Seu patrimônio já gera R$ 5,4 mil/mês" | `src/lib/domain/freedom-copy.test.ts:294`; `src/lib/domain/freedom.test.ts:514` (541.667) | ✅ PASS |
| APF-08 (AC4) | já atingiu: 4 marcos e barra cheia | 4 × "Atingido" com check, barra completa | `src/lib/domain/freedom.test.ts:976-977`; `freedom-copy.test.ts:490`; UI `goal-checkpoints.tsx:21`, `:61` | ✅ PASS |
| APF-08 (AC5) | já atingiu: sem bloco e sem robustez | ausentes | `src/lib/domain/freedom.test.ts:503-504`; `src/lib/domain/slack.test.ts:60`, `:97`; UI `goal-hero.tsx:106` | ✅ PASS |
| APF-09 (AC1) | bloco "Você tem folga" | título e "Sem novos aportes, aos 48 anos seu patrimônio chega a R$ 1,8 mi." | `src/lib/domain/freedom-copy.test.ts:300`, `:306`; UI `goal-slack.tsx:31-35`, `goal-hero.tsx:106-110` | ✅ PASS |
| APF-09 (AC7) | sem opção, sem bloco | não renderiza | `src/lib/domain/slack.test.ts:60`, `:68` (renda extra aplicada → `{ null, null }`); UI `goal-slack.tsx:28` | ✅ PASS |
| APF-10 (AC2) | "Ter mais renda" a partir de 5% | "R$ 7,4 mil/mês aos 48 anos" + "Usar R$ 7,4 mil"; 742.000 centavos, arredondado para baixo | `src/lib/domain/slack.test.ts:20`, `:25` (4,9% → null), `:29`, `:37` (bruto 742.050 → 742.000), `:44` (exatamente 5% → 735.000); `freedom-copy.test.ts:301`, `:316-317` | ✅ PASS |
| APF-10 (AC3) | "Parar antes" só se N < idade-alvo | "R$ 5 mil/mês aos 43 anos" + "Antecipar para 43" | `src/lib/domain/slack.test.ts:50`; `freedom-copy.test.ts:302`, `:323-324` | ✅ PASS |
| APF-11 (AC4) | "Usar" preenche a renda e abre a gaveta | campo "7.420,00", gaveta aberta, prévia | `src/components/goal-experience.tsx:57-60`; `src/lib/domain/money.test.ts:105`; prévia em `goal-experience.tsx:102` | ✅ PASS (inspeção) |
| APF-11 (AC5) | "Antecipar" preenche a idade | idade = N, gaveta aberta | `src/components/goal-experience.tsx:62-65` | ✅ PASS (inspeção) |
| APF-11 (AC6) | nada é salvo | nenhuma chamada a `saveGoal` | grep por `saveGoal` nos 7 componentes do diff: 0 ocorrências | ✅ PASS (inspeção) |
| APF-12 (AC8) | botões focáveis com nome acessível | `button` nativo cujo texto é o rótulo | `src/components/goal-slack.tsx:73-75`; `src/components/ui/button.tsx:54` | ✅ PASS (inspeção) |
| APF-13 (AC1) | robustez a 6% com prazo, alvo e retirada do objetivo | `requiredMonthlyCents` a 600 bp | `src/lib/domain/slack.test.ts:74`, `:80-82` | ✅ PASS |
| APF-13 (AC4) | rentabilidade ≤ 6%: teste omitido | `null` | `src/lib/domain/slack.test.ts:87-88` | ✅ PASS |
| APF-14 (AC2) | texto de sucesso | "Mesmo com 6% real a.a., você chega à meta. Isso considera que você não retira nada do patrimônio até lá." | `src/lib/domain/freedom-copy.test.ts:330`; UI `goal-robustness.tsx:14` | ✅ PASS |
| APF-14 (AC3) | texto de atenção | "Com 6% real a.a., seria preciso aportar R$ 865/mês." em `warning` | `src/lib/domain/freedom-copy.test.ts:336-337`; UI `goal-robustness.tsx:14` (`text-warning`) | ✅ PASS (⚠️ a spec não diz se A é arredondado para cima ou para o mais próximo) |
| APF-15 (AC1) | escala da barra | fim no patrimônio do prazo; marcos em valor ÷ fim; R$ 1,2 mi ≈ 67% | `src/lib/domain/freedom.test.ts:937`, `:943-944`, `:956-958`, `:962`; UI `goal-checkpoints.tsx:21`, `:59` | ✅ PASS |
| APF-15 (AC2) | trecho de folga | cor de rendimentos; rótulos "{patrimônio compacto}" e "Aos {idade} anos (Folga)" | UI `goal-checkpoints.tsx:42-49` (`bg-returns`), `:96-103` | ✅ PASS (inspeção) |
| APF-15 (AC5) | aporte > 0: barra como hoje | sem trecho, marcos em 25/50/75/100% | `src/lib/domain/freedom.test.ts:968-969`; UI `goal-checkpoints.tsx:42`, `:73`, `:80-86` | ✅ PASS |
| APF-16 (AC3) | ponto "Meta aos {N}" só com N < idade-alvo | ponto na linha da meta em `reach.age` | `src/components/goal-chart.tsx:112`, `:179-189`; `src/lib/domain/freedom.test.ts:487-488` | ✅ PASS |
| APF-16 (AC4) | aporte 0: "Total investido" constante | investido = guardado | `src/lib/domain/freedom.test.ts:808` (pré-existente) | ✅ PASS |

**Status**: 16/16 requisitos com evidência; os textos literais conferem com a spec. Restam dois spec-precision gaps menores, que não bloqueiam: a direção do arredondamento de A (APF-14 AC3) e o APF-04 coberto só por composição.

---

## Re-verificação dos gaps (iteração 1)

| Gap | Correção | Evidência | Status |
| --- | -------- | --------- | ------ |
| FIX-1 (M3, igualdade do prazo em `retirementAgeReaching`) | teste com 119 → 43 e 120 → 44 | `src/lib/domain/freedom.test.ts:359-360`; M3 morto | ✅ Fechado |
| FIX-2 (M9, renda extra arredondada para baixo) | `finalCents` 178.092.000 → 742.000 | `src/lib/domain/slack.test.ts:37`; M9 morto | ✅ Fechado |
| FIX-3 (M8, exatamente 5%) | `finalCents` 176.400.000, renda 700.000 → 735.000 | `src/lib/domain/slack.test.ts:44`; M8 morto | ✅ Fechado |
| FIX-4 (props opcionais) | `onApplyIncome` e `onApplyAge` agora obrigatórios; a guarda saiu | `src/components/goal-hero.tsx:50-51`, `:108`; `src/components/goal-summary.tsx:19-20`; typecheck verde com o único consumidor `goal-experience.tsx:97-103` | ✅ Fechado |
| 5 (rótulos sobrepostos com folga grande) | com `reach`, os rótulos ficam sempre na grade 2×2, sem posição absoluta | `src/components/goal-checkpoints.tsx:73` (`!reach && "@xl:…"`), `:80-84`, `:86` (`index === lastIndex \|\| reach ? undefined`), `:96` (`li` do "Folga" sem `@3xl`) | ✅ Fechado (inspeção) |
| 6 (desvio `@3xl` sem registro) | `@3xl` removido; a decisão está registrada na T16 ("com `reach`, sempre a grade 2×2, ver T20") e na T20 de `tasks.md` | grep `@3xl` em `goal-checkpoints.tsx`: 0 | ✅ Fechado |
| 7 (import `cn`) | revertido para `import { cn } from "cn"` | `src/components/goal-checkpoints.tsx:1` | ✅ Fechado |
| 8 (borda "renda extra aplicada → nenhuma opção") | asserção adicionada | `src/lib/domain/slack.test.ts:68` `toEqual({ extraIncomeCents: null, earlierAge: null })` | ✅ Fechado |

---

## Edge Cases

- [x] Guardado R$ 0: sem bloco e sem robustez. `src/lib/domain/slack.test.ts:58`, `:94`.
- [x] `months` 0 com guardado < alvo: "Prazo encerrado", sem bloco. `freedom-copy.test.ts:228`, `slack.test.ts:57`, `freedom.test.ts:510`.
- [x] 1 centavo abaixo do alvo: N = 34 e "R$ 0". `freedom.test.ts:493`, `freedom-copy.test.ts:253`.
- [x] A gaveta recalcula tudo a partir de `draft.summary`. `goal-experience.tsx:48`.
- [x] Renda extra aplicada não deixa opção restante. `slack.test.ts:68`.
- [x] Rascunho inválido mantém o último resumo válido (inalterado). `use-goal-draft.ts:35-44`.

---

## Discrimination Sensor

Cada rodada usou uma worktree descartável no scratchpad e rodou `vitest run --project unit src/lib/domain/` por mutação. Nas duas rodadas, `git status --porcelain` da árvore real ficou idêntico à baseline depois da remoção da worktree.

| # | File:line | Mutação | Iter. 0 (`ed88907`) | Iter. 1 (`cfa98ea`) |
| - | --------- | ------- | ------------------- | ------------------- |
| M1 | `src/lib/domain/freedom.ts:132` | `m <= months` → `m < months` | ✅ morto | ✅ morto |
| M2 | `src/lib/domain/freedom.ts:133` | `return m + 1` | ✅ morto | ✅ morto |
| M3 | `src/lib/domain/freedom.ts:152` | N: `>=` → `>` | ❌ sobreviveu | ✅ morto |
| M4 | `src/lib/domain/freedom.ts:152` | N: `return age - 1` | ✅ morto | ✅ morto |
| M5 | `src/lib/domain/freedom.ts:151` | laço começa em `currentAge` | ✅ morto | - |
| M6 | `src/lib/domain/slack.ts:20` | limiar de 5% invertido | ✅ morto | ✅ morto |
| M7 | `src/lib/domain/slack.ts:20` | 5% → 4% | ✅ morto | - |
| M8 | `src/lib/domain/slack.ts:20` | `>=` → `>` | ❌ sobreviveu | ✅ morto |
| M9 | `src/lib/domain/slack.ts:18` | `floor` → `round` | ❌ sobreviveu | ✅ morto |
| M10 | `src/lib/domain/slack.ts:18` | `floor` → `ceil` | ✅ morto | - |
| M11 | `src/lib/domain/slack.ts:21` | `earlierAge`: `<` → `<=` | ✅ morto | - |
| M12 | `src/lib/domain/slack.ts:26` | taxa da robustez de 6% → 8% | ✅ morto | ✅ morto |
| M13 | `src/lib/domain/slack.ts:35` | `<=` → `<` | ✅ morto | - |
| M14 | `src/lib/domain/slack.ts:40` | robustez usa a taxa do objetivo | ✅ morto | - |
| M15 | `src/lib/domain/freedom-copy.ts:53` | `remainingCents === 0` invertido (frase) | ✅ morto | ✅ morto |
| M16 | `src/lib/domain/freedom-copy.ts:67` | `remainingCents === 0` invertido (indicador) | ✅ morto | - |
| M17 | `src/lib/domain/freedom-copy.ts:68` | "R$ 0" → texto antigo | ✅ morto | - |
| M18 | `src/lib/domain/freedom.ts:278` | `positionBp` volta à fração | ✅ morto | ✅ morto |
| M19 | `src/lib/domain/freedom.ts:411` | `todayPositionBp` sem teto | ✅ morto | - |
| M20 | `src/lib/domain/freedom.ts:373` | `barEndCents` ignora `reach` | ✅ morto | ✅ morto |
| M21 | `src/lib/domain/freedom.ts:279` | marco de 100% ignora `reach` | ✅ morto | ✅ morto |
| M22 | `src/lib/domain/freedom-copy.ts:165` | `early === 0` invertido | ✅ morto | ✅ morto |
| M23 | `src/lib/domain/freedom-copy.ts:186` | intro usa N em vez da idade-alvo | ✅ morto | ✅ morto |
| M24 | `src/lib/domain/freedom.ts:409` | renda atual ÷ 10 | ✅ morto | ✅ morto |
| M25 | `src/lib/domain/freedom.ts:367` | sinal de `reach.age` invertido | ✅ morto | ✅ morto |
| M26 | `src/lib/domain/freedom.ts:368` | `finalCents` no mês do alcance | ✅ morto | ✅ morto |
| M27 | `src/lib/domain/slack.ts:42` | `reaches` mesmo com aporte > 0 | ✅ morto | ✅ morto |
| M28 | `src/lib/domain/freedom-copy.ts:199` | botão usa a idade-alvo | ✅ morto | ✅ morto |
| M29 | `src/lib/domain/freedom-copy.ts:56` | frase usa a idade-alvo | ✅ morto | ✅ morto |

**Profundidade**: expandida, com 29 mutações em domínio e copy. Na iteração 1 conferi 20 delas, entre as quais as 3 que haviam sobrevivido; as 9 restantes morreram na iteração 0, e os commits de correção só adicionaram asserções, sem remover nenhuma. Mutações na UI não entram (não há teste de componente, AD-005).
**Desfecho do sensor**: 29/29 mortos (os 3 sobreviventes da iteração 0 agora morrem).

---

## Interactive UAT

| # | Teste | Status | Detalhes |
| - | ----- | ------ | -------- |
| 1 | Conferência no app (`/liberdade`, cenário de referência, folga grande, tema claro e escuro, 320 px) | ⏭️ Skip | Não foi feita: precisa de banco e de sessão com usuário aprovado (AD-009), indisponíveis neste ambiente não interativo. Recomendada ao usuário. |

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo | ✅ (as props opcionais saíram) |
| Mudanças cirúrgicas | ✅ (import `cn` revertido) |
| Sem scope creep | ✅ |
| Segue os padrões do repo | ✅ |
| Asserções ancoradas na spec | ✅ |
| Cobertura por camada (domínio 1:1) | ✅ |
| Todo teste mapeia um requisito | ✅ |
| Diretrizes: `AGENTS.md`, `.specs/STATE.md` (AD-005), matriz de cobertura de `tasks.md` | ✅ |

**Integridade dos testes**: só mudaram testes existentes autorizados. São as trocas da T7 em `freedom-copy.test.ts` e o `freedom.test.ts:882` (antes 765: `months: 217, ageYears: 59`, aprovado pelo usuário). Os commits de correção só acrescentam testes e asserções; em `slack.test.ts`, o teste "aplicar a renda extra…" ganhou uma asserção e manteve a original. Nenhum teste foi removido ou pulado.

---

## Gate Check

- **Comando**: `npm run typecheck && npm run lint && npm run build && npm run test:unit` (Node 20.20.2), no HEAD `cfa98ea`
- typecheck: exit 0; lint: exit 0; build: exit 0
- test:unit: 29 arquivos, **890 aprovados**, 0 falhas, 0 pulados
- **Testes antes da feature** (`a37218b^`): 833
- **Testes depois**: 890 (+57; +1 arquivo, `slack.test.ts`)
- e2e: não executado (AD-005)

---

## Requirement Traceability Update

| Requirement | Antes | Agora |
| ----------- | ----- | ----- |
| APF-01..APF-16 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Pronta.
**Conferência da spec**: 16/16; 2 spec-precision gaps menores, sem bloqueio.
**Sensor**: 29/29 mortos.
**Gates**: verdes; 890 testes.

**Próximo passo**: conferência manual opcional no app: cenário de referência, folga grande com a grade 2×2, 320 px, tema claro e escuro.
