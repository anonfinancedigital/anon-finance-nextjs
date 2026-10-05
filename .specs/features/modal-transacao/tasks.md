# Modal de Transação Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/modal-transacao/design.md`
**Status**: Draft

**Dívida registrada (AD-005):** a UI não tem teste automatizado (e2e suspenso, sem testes de componente no repositório). Os critérios de UI do spec são conferidos por verificação manual em 390×844 e 1280×800 na fase 3. Os specs `e2e/*.spec.ts` que usam os radios "Tipo"/"Repetir" ou o acordeão de categoria deixam de valer e não serão ajustados aqui.

**Next.js:** conforme `AGENTS.md`, consultar `node_modules/next/dist/docs/` antes de escrever código; esta feature só mexe em componentes cliente.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), e2e suspenso (AD-005). Sem guideline de cobertura: strong defaults, no mesmo padrão de `lancamento-flutuante`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos, 1:1 com os critérios MODT-04/05: sequência `1..6` → `0,01 … 1.234,56`, não dígitos ignorados, vazio, só zeros → vazio, corte em 11 dígitos, milhar | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`) | none | - (e2e suspenso, AD-005; verificação manual na fase 3) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (`PATH` com o Node 20 do nvm). Nenhuma task toca banco ou actions: o gate de integração é só regressão.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Fim de feature (regressão de integração; exige `npm run db:up`) | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tasks também. As setas que vêm de fases anteriores (T1, T3 → T4; T2 → T6; T7 → T8) marcam dependências já concluídas.

### Phase 1: Blocos independentes

Máscara de valor, switch e controle segmentado. Nenhuma depende da outra.

```
T1
T2
T3
```

### Phase 2: Formulário

Reescrita do `transaction-form.tsx` em passos, sempre compilando (props novas são opcionais).

```
T1 → T4
T3 → T4
T2 → T6
T4 → T5 → T6 → T7
```

### Phase 3: Integração

Liga o form aos diálogos, remove o picker órfão e confere a feature.

```
T7 → T8 → T9 → T10 → T11
```

---

## Task Breakdown

### T1: Criar `maskBRLInput`

**What**: Função pura que converte o texto digitado em texto pt-BR com centavos da direita para a esquerda; só zeros ou sem dígitos → `""`; corta em 11 dígitos.
**Where**: `src/lib/domain/money.ts`
**Depends on**: None
**Reuses**: `MAX_CENTS`, padrão do `formatBRL`
**Requirement**: MODT-04, MODT-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Digitar `1`,`2`,`3`,`4`,`5`,`6` em sequência (cada chamada recebe o resultado anterior + o novo dígito) retorna `0,01`, `0,12`, `1,23`, `12,34`, `123,45`, `1.234,56`
- [x] Letras e símbolos são ignorados (`"1a2"` → `0,12`)
- [x] `""`, `"abc"`, `"0"`, `"0,00"` retornam `""`
- [x] 12 dígitos retornam o texto de 11 dígitos (`999.999.999,99`)
- [x] O retorno de qualquer entrada não vazia é aceito por `parseBRL`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos em `src/lib/domain/money.test.ts` passam e a contagem total não cai

**Tests**: unit
**Gate**: quick
**Status**: ✅ Complete

**Commit**: `feat(money): add maskBRLInput for typed currency amounts`

---

### T2: Criar o primitivo `Switch`

**What**: Wrapper do `Switch` do `radix-ui` no padrão dos primitivos de `ui/`, com `role="switch"` e foco visível.
**Where**: `src/components/ui/switch.tsx`
**Depends on**: None
**Reuses**: `src/components/ui/checkbox.tsx` (padrão e tokens)
**Requirement**: MODT-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Exporta `Switch` com `checked`, `onCheckedChange`, `id`, `aria-*` repassados
- [x] Estados desligado/ligado/foco/desabilitado usam tokens do design system
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Status**: ✅ Complete

**Commit**: `feat(ui): add Switch primitive`

---

### T3: Criar `KindToggle`

**What**: Controle segmentado Gasto/Ganho de largura total, `radiogroup` "Tipo" com dois `radio`; Gasto marcado em `destructive` suave, Ganho em `success`.
**Where**: `src/components/kind-toggle.tsx`
**Depends on**: None
**Reuses**: `src/components/ui/radio-group.tsx` (Radix)
**Requirement**: MODT-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Props `{ value: "expense" | "income"; onChange(kind) }`
- [x] Renderiza `role="radiogroup"` com nome acessível "Tipo" e dois `role="radio"` "Gasto" e "Ganho"
- [x] Setas do teclado trocam a opção
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Status**: ✅ Complete

**Commit**: `feat(transactions): add KindToggle segmented control`

---

### T4: Reordenar o form com tipo, valor em destaque, descrição e data

**What**: No form, trocar os radios de Tipo por `KindToggle`, aplicar `maskBRLInput` ao Valor (`text-3xl`, fonte de display, `text-success` no Ganho, `autoFocus`, placeholder `0,00`) e mover Descrição para logo após o Valor, deixando Data depois de Categoria.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T1, T3
**Reuses**: `maskBRLInput`, `KindToggle`, `Input`, `Label`
**Requirement**: MODT-03, MODT-04, MODT-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ordem renderizada: Tipo, Valor, Descrição, Categoria, Data, Repetir
- [x] Valor mostra o texto mascarado e envia à action o mesmo texto pt-BR
- [x] Valor vazio mostra "Informe o valor" sob o campo
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
- [x] Verificação manual: `1`,`2`,`3` no valor mostra `1,23`; Ganho pinta o valor de verde

**Tests**: none
**Gate**: build
**Status**: ✅ Complete

**Commit**: `feat(transactions): highlight amount and reorder form fields`

---

### T5: Trocar o seletor de categoria por dois selects

**What**: Substituir `CategoryPicker` por `NativeSelect` "Categoria" e `NativeSelect` "Subcategoria" condicional, com "Sem subcategoria" como primeira opção e reset da subcategoria ao trocar de categoria.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T4
**Reuses**: `NativeSelect`, `categoryDisplayName`, `pickSelection`
**Requirement**: MODT-01, MODT-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] "Categoria" lista todas as categorias na ordem atual, com opção vazia "Selecione uma categoria"
- [x] "Subcategoria" só aparece para categoria com subcategorias; trocar a categoria volta a "Sem subcategoria"
- [x] Edição abre os dois selects já preenchidos; categoria ausente da lista cai no placeholder
- [x] Salvar sem categoria mostra "Selecione uma categoria" sob o select
- [x] Ganho não renderiza os selects; "Crie suas categorias primeiro" e o botão desabilitado seguem sem categorias
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Status**: ✅ Complete

**Commit**: `feat(transactions): select category and subcategory with compact selects`

---

### T6: Trocar "Repetir" pelo switch de recorrência

**What**: Substituir o fieldset "Repetir" por `Switch` "Transação recorrente", `RadioGroup` "Frequência" (`forever`/`until`) e "Mês final" condicional.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T2, T5
**Reuses**: `Switch`, `RadioGroup`/`RadioGroupItem`, `Label`
**Requirement**: MODT-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Ligar o switch seleciona "Todo mês, sem data final" (`forever`); escolher "Todo mês, até um mês/ano" mostra "Mês final"
- [ ] Desligar volta `recurrence` para `none` e limpa o mês final
- [ ] Edição de série `forever`/`until` abre com o switch ligado e a opção e o mês corretos
- [ ] "Informe o mês final" aparece sob "Mês final" quando vazio
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): replace repeat radios with recurrence switch`

---

### T7: Rodapé com Cancelar e Excluir e layout rolável

**What**: Dar ao form corpo rolável e rodapé fixo com "Excluir" (só se houver `onDelete`), "Cancelar" (se houver `onCancel`) e "Salvar"/"Salvar alterações"; botão primário em largura total no mobile; `pending` desabilita Salvar e Excluir.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T6
**Reuses**: `Button` (variants `destructive`, `outline`)
**Requirement**: MODT-06, MODT-07, MODT-08, MODT-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Props novas opcionais `onCancel` e `onDelete`; sem elas o form segue compilando nos chamadores atuais
- [ ] Criação mostra Cancelar + Salvar; edição mostra Excluir (à esquerda, destrutivo) + Cancelar + "Salvar alterações"
- [ ] Corpo rola e rodapé fica visível; abaixo de 640px o primário ocupa a largura toda
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add cancel and delete footer to transaction form`

---

### T8: Ligar edição e exclusão na lista

**What**: No diálogo de edição, passar `onCancel` e `onDelete={() => setDeleting(editing)}`, aplicar o layout `flex-col` e a largura `sm:max-w-md`, e fechar a edição junto com a confirmação ao excluir.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T7
**Reuses**: Diálogo de exclusão e `confirmDelete` existentes
**Requirement**: MODT-06, MODT-07, MODT-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] "Excluir" na edição abre a confirmação existente com o mesmo título e descrição da lista
- [ ] Confirmar chama `deleteTransaction(id, month)` e fecha os dois diálogos; erro mantém a confirmação aberta com `role="alert"`
- [ ] Cancelar na confirmação volta à edição com os dados preservados; Esc fecha só a camada de cima
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): delete from the edit dialog`

---

### T9: Ligar o botão flutuante ao novo layout

**What**: Passar `onCancel` ao form na criação e aplicar ao `DialogContent` o layout `flex-col`, `max-h-[calc(100dvh-2rem)]` e `sm:max-w-md`.
**Where**: `src/components/new-transaction-button.tsx`
**Depends on**: T8
**Reuses**: `Dialog*`, `TransactionForm`
**Requirement**: MODT-06, MODT-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] "Cancelar" fecha o modal sem salvar
- [ ] O modal não passa de `100dvh - 2rem` e o rodapé fica visível com conteúdo longo
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): wire cancel and layout into new-transaction modal`

---

### T10: Remover o `CategoryPicker` órfão

**What**: Apagar o componente que nenhum arquivo importa mais.
**Where**: `src/components/category-picker.tsx` (delete)
**Depends on**: T9
**Reuses**: busca por imports antes de apagar
**Requirement**: MODT-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `grep -rn "category-picker" src e2e` não encontra nenhum import
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `refactor(transactions): remove unused CategoryPicker`

---

### T11: Conferir a feature de ponta a ponta e a altura do modal

**What**: Rodar a regressão completa e conferir manualmente os critérios de UI em 390×844 e 1280×800, registrando o resultado no pé desta task.
**Where**: `.specs/features/modal-transacao/tasks.md`
**Depends on**: T10
**Reuses**: `npm run dev` com Node 20
**Requirement**: MODT-12

**Tools**:

- MCP: NONE
- Skill: `run`

**Done when**:

- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Em 390×844, gasto simples (sem categoria e sem recorrência) cabe sem rolar o conteúdo do modal
- [ ] Foco inicial cai no campo Valor ao abrir criação e edição (senão aplicar o plano B do design)
- [ ] Criar, editar, cancelar e excluir funcionam no Resumo; resultado anotado abaixo desta task

**Tests**: none
**Gate**: full

**Commit**: `docs(specs): record modal-transacao manual verification`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1    T2    T3
Phase 2:  T4 ------→ T5 ------→ T6 ------→ T7
Phase 3:  T8 ------→ T9 ------→ T10 ------→ T11
```

Execução estritamente sequencial; 11 tasks cabem em dois lotes (~7 + ~4), então vale oferecer sub-agentes ou executar inline.
