# Liberdade: Popover do Como Calculamos e Copy da Gaveta Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: skipped (mudança de apresentação e copy, sem decisão de arquitetura; decisões na spec)
**Spec**: `.specs/features/liberdade-gaveta-copy/spec.md`
**Status**: Draft

**Ordem:** a copy testável vira função pura em `freedom-copy.ts` (T1) e o hero só a consome (T3). O código antigo sai por último dentro da fase (T4), para que cada commit compile.

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de código de framework; nenhuma tarefa usa API do Next (só componentes React e Radix).

**Concorrência:** outra sessão pode mexer no repositório. Cada commit inclui só os arquivos da tarefa. Node 20 no `PATH` (memória do projeto). Os testes são unitários, sem banco.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` e `integration`), AD-005 (e2e suspenso), AD-008 (sem teste de componente). Lição L-002: mensagens de validação com texto exato na spec e nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio e validação (`src/lib/domain/*`, `src/lib/validation/*`) | unit | Todos os ramos; 1:1 com os AC da spec; cada caso de borda listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`, `src/components/ui/*`) | none | - (e2e suspenso, AD-005; sem teste de componente, AD-008; build gate only) | - | build gate only |

## Gate Check Commands

> Do `package.json`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de domínio e validação | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração (nenhuma nesta feature) | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

### Phase 1: Popover do Como Calculamos

```
T1 → T2 → T3 → T4
```

### Phase 2: Copy da gaveta

```
T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Criar a copy do popover como função pura

**What**: Adicionar `howWeCalculate(summary)` em `freedom-copy.ts`, com título, frase com os valores do resumo e aviso, mais os testes.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: None
**Reuses**: `formatBRL`, `formatRate` e `GoalSummary`
**Requirement**: LGC-03, LGC-04, LGC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Para renda R$ 20.000,00, retirada 6% e meta R$ 4.000.000,00 a frase é exatamente a do AC 3 da spec
- [x] Retirada de 650 pb sai "6,5% a.a."
- [x] O aviso é exatamente o do AC 4 e o título "Como chegamos a esse número:"
- [x] Os testes em `freedom-copy.test.ts` cobrem os três pontos; gate quick passa
- [x] Test count: os testes existentes seguem passando, sem remoções

**Tests**: unit
**Gate**: quick
**Commit**: `feat(liberdade): add the how-we-calculate sentence copy`
**Status**: ✅ Done

---

### T2: Criar o componente Popover

**What**: Criar o wrapper do Radix Popover no padrão dos componentes de `ui/`, com o mesmo token de superfície do `dialog`/`tooltip`.
**Where**: `src/components/ui/popover.tsx`
**Depends on**: T1
**Reuses**: `src/components/ui/tooltip.tsx` (estilo e `cn`)
**Requirement**: LGC-01, LGC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Exporta `Popover`, `PopoverTrigger` e `PopoverContent` (portal, `sideOffset`, colisão com a borda)
- [x] Esc e clique fora fecham, comportamento nativo do Radix
- [x] Gate build passa
- [x] Test count: testes existentes inalterados

**Tests**: none
**Gate**: build
**Commit**: `feat(ui): add the popover component`
**Status**: ✅ Done

---

### T3: Trocar o details do hero pelo popover

**What**: No card de Meta, substituir o `<details>` por um botão "Como calculamos?" com ícone ⓘ que abre o popover com título, frase e aviso de `howWeCalculate`.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: T2
**Reuses**: `Popover` (T2), `howWeCalculate` (T1), ícone `Info` de `lucide-react`
**Requirement**: LGC-01, LGC-02, LGC-05, LGC-06

**Tools**:

- MCP: NONE
- Skill: `run` (conferir no navegador a altura do hero e o popover em 360 px)

**Done when**:

- [x] O botão abre o popover com o conteúdo de `howWeCalculate`; Esc e clique fora fecham e devolvem o foco ao botão
- [x] A altura do hero é igual com o popover aberto e fechado
- [x] Em 360 px o popover fica dentro da tela, sem rolagem horizontal
- [x] Gate build passa
- [x] Test count: testes existentes inalterados

**Tests**: none
**Gate**: build
**Commit**: `feat(liberdade): show how-we-calculate in a popover`
**Status**: ✅ Done

---

### T4: Remover a copy antiga do Como calculamos

**What**: Apagar `HOW_WE_CALCULATE` e `heroFacts` de `freedom-copy.ts` e os testes deles, já sem uso no hero.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: T3
**Reuses**: nenhum
**Requirement**: LGC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `grep` por `HOW_WE_CALCULATE` e `heroFacts` em `src` não encontra nada
- [ ] Os testes que apontavam só para o código removido saem junto; os de `howWeCalculate` seguem
- [ ] Gate quick passa
- [ ] Test count: queda igual ao número de testes removidos de `HOW_WE_CALCULATE`/`heroFacts`, informada no commit

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(liberdade): drop the old how-we-calculate copy`

---

### T5: Botão "Definir taxas personalizadas"

**What**: Trocar o botão de texto "Personalizada" por um botão discreto com ícone de engrenagem e o texto "Definir taxas personalizadas".
**Where**: `src/components/rate-toggle.tsx`
**Depends on**: None
**Reuses**: ícone `Settings` de `lucide-react`; `aria-pressed` e estilos atuais
**Requirement**: LGC-08, LGC-10

**Tools**:

- MCP: NONE
- Skill: `run`

**Done when**:

- [ ] A gaveta mostra o ícone e "Definir taxas personalizadas", sem a palavra solta "Personalizada"
- [ ] Com Personalizada ativa, nenhum perfil fica marcado e o botão tem `aria-pressed="true"`
- [ ] Gate build passa
- [ ] Test count: testes existentes inalterados

**Tests**: none
**Gate**: build
**Commit**: `feat(liberdade): turn Personalizada into a clear settings button`

---

### T6: Rótulos dos inputs de taxa

**What**: Renomear os rótulos dos dois inputs para "Rentabilidade real ao ano (%)" e "Taxa de retirada anual (%)".
**Where**: `src/components/goal-form.tsx`
**Depends on**: T5
**Reuses**: `RateInput`
**Requirement**: LGC-09, LGC-11

**Tools**:

- MCP: NONE
- Skill: `run`

**Done when**:

- [ ] Ao acionar o botão aparecem dois inputs lado a lado com os rótulos novos
- [ ] Escolher um perfil oculta os inputs e grava as taxas da tabela
- [ ] Gate build passa
- [ ] Test count: testes existentes inalterados

**Tests**: none
**Gate**: build
**Commit**: `feat(liberdade): relabel the custom rate inputs`

---

### T7: Mensagens de validação da idade

**What**: Trocar "aposentadoria" por "independência" nas três mensagens de idade e atualizar os testes com o texto exato.
**Where**: `src/lib/validation/goal.ts`
**Depends on**: T6
**Reuses**: testes de `goal.test.ts`
**Requirement**: LGC-14, LGC-15, LGC-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Vazio retorna "Informe a idade da independência"
- [ ] Fora de 1 a 90 retorna "A idade da independência deve estar entre 1 e 90"
- [ ] Idade menor ou igual à atual retorna "A idade da independência deve ser maior que a idade atual (N)"
- [ ] `grep -i aposentadoria` em `src/lib/validation` não encontra nada; gate quick passa
- [ ] Test count: mesmo número de testes, com as asserções atualizadas

**Tests**: unit
**Gate**: quick
**Commit**: `feat(liberdade): rename retirement age to independence age in validation`

---

### T8: Rótulo e slider da idade da independência

**What**: Trocar o rótulo do campo e o nome acessível do slider para "Idade da independência".
**Where**: `src/components/goal-form.tsx`
**Depends on**: T7
**Reuses**: nenhum
**Requirement**: LGC-12, LGC-13

**Tools**:

- MCP: NONE
- Skill: `run`

**Done when**:

- [ ] O rótulo é "Idade da independência" e o slider tem o nome "Idade da independência (controle deslizante)"
- [ ] O subtítulo segue "De N a 90 anos"
- [ ] `grep -ri aposentadoria src/components` não encontra nada na gaveta
- [ ] Gate build passa
- [ ] Test count: testes existentes inalterados

**Tests**: none
**Gate**: build
**Commit**: `feat(liberdade): label the age field as independence age`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7 ------→ T8
```

8 tarefas cabem em um único lote: execução inline, sem sub-agentes.

## Cross-Check de Diagrama

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1 | None | início | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | None | início da fase 2 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |

## Validação de Co-localização de Testes

| Task | Camada | Matriz exige | Task diz | Status |
| ---- | ------ | ------------ | -------- | ------ |
| T1 | Domínio | unit | unit | ✅ |
| T2 | UI | none | none | ✅ |
| T3 | UI | none | none | ✅ |
| T4 | Domínio | unit | unit | ✅ |
| T5 | UI | none | none | ✅ |
| T6 | UI | none | none | ✅ |
| T7 | Validação | unit | unit | ✅ |
| T8 | UI | none | none | ✅ |
