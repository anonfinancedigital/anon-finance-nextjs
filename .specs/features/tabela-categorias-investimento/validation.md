# Tabela de Categorias: Percentual Limpo e Investimento Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/tabela-categorias-investimento/spec.md`
**Diff range**: `ab902fe^..691afec` filtrado aos arquivos da feature (`percent.ts`, `budget.ts`, `schema.ts`, `repos/categories.ts`, `validation/category.ts`, testes correspondentes, `src/actions/categories.int.test.ts`, `category-editor.tsx`, `summary-table.tsx`, `drizzle/0010_*`, `drizzle/meta/*`). Commits da feature: ab902fe, 26e8b85, 541abb3, 6da506c, 2d6f709, 674ca10, 691afec. Commits intercalados de outras features (goal-experience, dropdown, transaction-row-menu) ignorados.
**Verifier**: independent sub-agent (author ≠ verifier)

**Result**: PASS (16/16 ACs, 4/4 edge cases; gate verde; sensor 14/14 mutantes não equivalentes mortos, 1 mutante equivalente)

> Sem navegador neste ambiente e e2e suspenso (AD-005): ACs de UI não têm teste automático por decisão de design. Para eles a evidência é `file:line` da implementação + a expressão que produz o resultado definido na spec (marcado "inspeção de código"). A regra visual depende de flags do domínio (`overspent`/`exceeded`), que são cobertas por testes unitários e pelo sensor.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | ab902fe |
| T2 | ✅ Done | 26e8b85 |
| T3 | ✅ Done | 541abb3 (migração `0010_category_is_investment`) |
| T4 | ✅ Done | 6da506c |
| T5 | ✅ Done | 2d6f709 |
| T6 | ✅ Done | 674ca10 |
| T7 | ✅ Done | 691afec |

---

## Spec-Anchored Acceptance Criteria

### P1: Percentual legível

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 31.931.878 → coluna Percentual | "31,9%" | `src/lib/domain/percent.test.ts:57` + `:65` `expect(formatPercentCompact(micro)).toBe(text)` com `[31_931_878, "31,9%"]`; tabela usa o formatador em `src/components/summary-table.tsx:89` (inspeção de código) | ✅ PASS |
| AC2 30.000.000 | "30%" | `src/lib/domain/percent.test.ts:58` `[30_000_000, "30%"]` | ✅ PASS |
| AC3 12.500.000 | "12,5%" | `src/lib/domain/percent.test.ts:59` `[12_500_000, "12,5%"]` | ✅ PASS |
| AC4 100.000.000 | "100%" | `src/lib/domain/percent.test.ts:60` `[100_000_000, "100%"]` | ✅ PASS |
| AC5 editor mantém 6 casas | 12.500.000 → "12,5%"; 31.931.878 → "31,931878%" | `src/lib/domain/percent.test.ts:40` `[12_500_000, "12,5%"]` e `:51` `expect(formatPercent(31_931_878)).toBe("31,931878%")`; editor usa `formatPercent` em `src/components/category-editor.tsx:59` (`percentText`, sem o "%", pois é valor de input) | ✅ PASS |

Extras (assunção de arredondamento meio para cima, sem piso): `percent.test.ts:61` `[12_250_000, "12,3%"]`, `:62` `[49_999, "0%"]`, `:63` `[50_000, "0,1%"]`.

### P1: Investimento acima da meta é positivo

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 criar/editar oferece "Investimento / aporte" e salva (padrão desmarcado) | flag persistida; padrão `false` | Persistência: `src/actions/categories.int.test.ts:57-66` `toEqual([... ["Liberdade financeira", true]])`; `src/lib/db/repos/categories.int.test.ts:46` `toEqual([["Moradia", false], ["Liberdade", true]])`; padrão: `src/lib/validation/category.test.ts:21` `.isInvestment).toBe(false)`, `categories.int.test.ts:52`. UI (inspeção de código): checkbox `src/components/category-editor.tsx:348-351` (`aria-label` "Investimento / aporte da categoria N", `checked={row.isInvestment}`), linha nova `:222` `isInvestment: false`, envio `:233-238` | ✅ PASS (ver Observação 1) |
| AC2 reabrir categoria salva como investimento mostra marcada | checkbox marcado | `src/lib/db/repos/categories.int.test.ts:74` relê `true` via `list`; editor: `src/components/category-editor.tsx:68` `isInvestment: c.isInvestment ?? false` → `:350` `checked={row.isInvestment}` (inspeção de código) | ✅ PASS |
| AC3 investimento acima: sem fundo vermelho, `data-overspent="false"` | `overspent` false | `src/lib/domain/budget.test.ts:446-452` `toMatchObject({ overspent: false, overspentCents: 0, exceeded: true, exceededCents: 10000 })`; UI `src/components/summary-table.tsx:62-63` `data-overspent={row.overspent}`, `bg-destructive/5` só com `overspent` (inspeção de código) | ✅ PASS |
| AC4 texto "Excedeu a meta em R$ X", X = gasto − meta | `exceededCents` = 10000 (160000 − 150000) | `src/lib/domain/budget.test.ts:450` `exceededCents: 10000`; UI `src/components/summary-table.tsx:112-115` `Excedeu a meta em {formatBRL(row.exceededCents)}` (inspeção de código) | ✅ PASS |
| AC5 Restante e barra em `text-income`/`bg-income` | nunca `destructive` | Domínio `budget.test.ts:448` `overspent: false`; UI `summary-table.tsx:93` `row.overspent ? "text-destructive" : "text-income"`, `:103` `row.overspent ? "bg-destructive" : "bg-income"`, texto `:113` `text-income` (inspeção de código) | ✅ PASS |
| AC6 despesa acima mantém comportamento atual | `overspent` true, "Estourou R$ X", `bg-destructive/5`, `destructive` | `src/lib/domain/budget.test.ts:437-443` `toMatchObject({ overspent: true, overspentCents: 10000, exceeded: false, exceededCents: 0 })`; omitido = despesa `:476-477`; UI `summary-table.tsx:62-63,93,103,107-110` inalterados (inspeção de código); testes de domínio pré-existentes de `overspent` não foram alterados | ✅ PASS |
| AC7 investimento ≤ meta = igual despesa dentro da meta | sem texto adicional | `src/lib/domain/budget.test.ts:455-465` (igual e abaixo) `toMatchObject({ overspent: false, overspentCents: 0, exceeded: false, exceededCents: 0 })`; UI só renderiza textos com `overspent`/`exceeded` (`summary-table.tsx:107,112`) | ✅ PASS |
| AC8 gráfico sem "Estourou" e cor normal para investimento | sem label, `--viz-spent` | Domínio `budget.test.ts:448` `overspent: false`; gráfico (inspeção de código) `src/components/budget-charts.tsx:51` `label: r.overspent ? \`Estourou ...\` : ""` e `:88` `fill={d.overspent ? "var(--viz-over)" : "var(--viz-spent)"}`; `budget-charts.tsx` não mudou (design) | ✅ PASS (sem verificação visual) |
| AC9 "Excedeu" e "Estourou" mutuamente exclusivos | nunca ambos | `src/lib/domain/budget.ts:173-176` (`over && !investment` vs `over && investment`); cada teste de `budget.test.ts:437-474` asserta os dois campos ao mesmo tempo | ✅ PASS |

**Status**: ✅ Todos os ACs cobertos; nenhuma spec-precision gap.

---

## Edge Cases

- [x] Investimento com gasto = meta não exibe excesso: `src/lib/domain/budget.test.ts:455-465` (`["equal to", 150000]` → `exceeded: false, exceededCents: 0`).
- [x] Investimento com meta 0 e gasto > 0: `src/lib/domain/budget.test.ts:467-474` `toMatchObject({ targetCents: 0, overspent: false, exceeded: true, exceededCents: 5000 })`.
- [x] Desmarcar investimento volta ao vermelho em todos os meses: flag é coluna da categoria sem vigência (`src/lib/db/schema.ts:37`), lida por `listForMonth` para qualquer mês via `columns` (`src/lib/db/repos/categories.ts:28,53`); limpeza testada em `src/lib/db/repos/categories.int.test.ts:55-63` `toEqual([["Moradia", false], ["Liberdade", false]])`; despesa → `overspent: true` em `budget.test.ts:437`.
- [x] Migração com categorias existentes → `false`: `drizzle/0010_category_is_investment.sql:1` `ADD COLUMN "is_investment" boolean DEFAULT false NOT NULL` (Postgres preenche as linhas existentes com o default); teste do default em `src/lib/db/schema.int.test.ts:86-91` `expect(row.isInvestment).toBe(false)` (insere após a migração; o backfill de linhas pré-existentes é garantido pela semântica do DDL, não por teste).

---

## Asserção existente editada

`src/lib/validation/category.test.ts:38-42`: o `toEqual` exato de `categorySetSchema.parse` ganhou `isInvestment: false` em cada item. **Legítimo**: o schema agora produz o campo com default `false` (T5, AC1 "padrão desmarcado"); com `toEqual` estrito a saída mudou por exigência da spec. A edição não enfraquece nada, ao contrário, passa a assertar o default. Nenhum outro teste foi removido ou editado no diff (`git diff ab902fe^ 691afec` nos arquivos de teste só tem inserções além dessas 5 linhas).

---

## Discrimination Sensor

Executado em `git worktree` temporário (scratchpad), banco privado `orcamento_catinv_test`. Cada mutante aplicado, testes do arquivo correspondente rodados, arquivo restaurado (`git checkout` no worktree), worktree removido ao final.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/domain/percent.ts:60` | Arredondamento → truncamento (`Math.floor(micro / 100_000)`) | ✅ Killed (2 testes) |
| M2 | `src/lib/domain/percent.ts:60` | `compact` → `percent` (6 casas) após arredondar | ➖ Equivalente (valor já arredondado a 1 casa; saída idêntica) |
| M2b | `src/lib/domain/percent.ts:60` | `compact` → `share` (sempre 1 casa, "30,0%") | ✅ Killed (3) |
| M3 | `src/lib/domain/budget.ts:173` | `overspent: over && investment` (troca) | ✅ Killed (7) |
| M4 | `src/lib/domain/budget.ts:175` | `exceeded: over && !investment` (troca) | ✅ Killed (4) |
| M5 | `src/lib/domain/budget.ts:166` | `>` → `>=` | ✅ Killed (3) |
| M6 | `src/lib/domain/budget.ts:167` | omitido tratado como investimento (`!== false`) | ✅ Killed (5) |
| M7 | `src/lib/domain/budget.ts:176` | `exceededCents` = gasto (sem subtrair meta) | ✅ Killed (1) |
| M8 | `src/lib/db/repos/categories.ts:219` | `update` não grava `isInvestment` | ✅ Killed (2) |
| M9 | `src/lib/db/repos/categories.ts:224` | `insert` não grava `isInvestment` | ✅ Killed (1) |
| M10 | `src/lib/db/repos/categories.ts:118` | default `?? true` | ✅ Killed (2) |
| M11 | `src/lib/db/repos/categories.ts:28` | `columns` sem `isInvestment` (list não devolve) | ✅ Killed (4) |
| M12 | `src/lib/validation/category.ts:38` | `.default(false)` → `.optional()` | ✅ Killed (2) |
| M13 | `src/lib/validation/category.ts:38` | `z.boolean()` → `z.coerce.boolean()` (aceita "sim") | ✅ Killed (1) |
| M14 | `src/lib/validation/category.ts:38` | campo removido do schema (action não repassa) | ✅ Killed (1, `src/actions/categories.int.test.ts`) |

**Sensor depth**: expandido (15 mutações; feature não é P0, mas cobre todos os ramos novos)
**Sensor outcome**: 14/14 não equivalentes mortos, 0 sobreviventes.

**Isolamento**: baseline `git status --porcelain` capturado antes. Após remover o worktree, o porcelain diferia, mas por ações concorrentes de outras sessões (commits 2e1f645 e 1e2845e mudaram HEAD e absorveram `liberdade/page.tsx`, `content-card.tsx`, `e2e-tmp/`; `new-transaction-button.tsx` passou a modificado). Nenhum desses arquivos é alvo de mutação nem da feature, e os arquivos da feature não têm diff não commitado (`git diff --stat` vazio para `src/lib`, `summary-table.tsx`, `category-editor.tsx`, `drizzle`, `src/actions`). As mutações escreveram apenas no worktree temporário.

---

## Gate Check

- **Comandos** (worktree em HEAD 0a50620, contém 691afec): `npm run test:unit` → 458 passed, 15 arquivos; `npm run test:int` (DATABASE_URL privado) → 285 passed, 13 arquivos; `next typegen && tsc --noEmit` → 0 erros; `eslint src` → 0 problemas.
- **`npm run build`**: não executado no worktree (Turbopack rejeita `node_modules` por symlink fora da raiz); não rodado na árvore real para não colidir com `.next` e alterações de outras sessões. Typecheck e lint verdes cobrem a parte estática; o autor registrou o build verde em T6/T7.
- **Skipped**: nenhum. **Failures**: nenhuma.
- **Contagem**: apenas inserções de testes no diff (+7 casos em percent, +6 em budget, +5 em validation, +4 repo, +1 schema, +1 action); nenhuma remoção.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`budget-charts.tsx` intocado, como no design) |
| No scope creep | ✅ |
| Matches patterns | ✅ (mesmo caminho de `color`) |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ domínio 1:1, validação padrão/válido/inválido, repo grava/relê/atualiza, schema default |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md`, `.specs/STATE.md` AD-005/AD-006 | ✅ |

---

## Observações (não bloqueantes)

1. **Rótulo visível do checkbox** (AC1 "oferecer a opção 'Investimento / aporte'"): o texto exato só aparece no `aria-label` (`category-editor.tsx:349`) e no `title` (`:346`, "Passar da meta de um investimento não é estouro"). Visualmente: cabeçalho "INVESTIMENTO" no desktop (`:266`) e "Investimento" no mobile (`:353`). Cosmético; ajustar se o texto "/ aporte" visível for desejado.
2. **UI sem teste automático** (AD-005): ACs 3-8 na camada de render dependem de inspeção de código. Um mutante na UI (ex.: usar `overspent` no lugar de `exceeded` no texto) não seria detectado. Recomenda-se verificação manual na tela: categoria investimento acima da meta em verde com "Excedeu a meta em R$ X" e gráfico sem "Estourou".
3. **Backfill da migração**: garantido pela semântica do `ADD COLUMN ... DEFAULT false NOT NULL`, não por teste que crie linhas antes da migração.

---

## Requirement Traceability Update

| Requirement | New Status |
| ----------- | ---------- |
| CATINV-01 | ✅ Verified |
| CATINV-02 | ✅ Verified |
| CATINV-03 | ✅ Verified |
| CATINV-04 | ✅ Verified (render por inspeção de código) |
| CATINV-05 | ✅ Verified |
| CATINV-06 | ✅ Verified (inspeção de código, sem verificação visual) |

(O Verifier não edita `spec.md`; atualização da tabela fica para o orquestrador.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 16/16 ACs e 4/4 edge cases com evidência; 0 spec-precision gaps
**Sensor**: 14/14 mutantes não equivalentes mortos (+1 equivalente)
**Gate**: 458 unit + 285 integration passed, typecheck e lint verdes

**Next steps**: verificação visual manual opcional (Observações 1-2).
