# Importar dados Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/importar-dados/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (exige ler `node_modules/next/dist/docs/` antes de código Next; e2e suspenso, AD-005), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura). Sem guideline de cobertura: strong defaults, sem ficar abaixo das features `sigilo-dados` e `subcategorias`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Vault puro (`src/lib/vault/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste; round-trip com `buildExport`/`openExport` | `src/lib/vault/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Estrutura válida, cada regra de rejeição e cada limite de quantidade | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) | integration | Caminhos principais, escopo por `userId`, rollback, concorrência e caminhos de erro | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso + cada erro (sessão, estrutura, conta com dados, falha de banco) + `revalidatePath` | `src/actions/*.int.test.ts` | `npm run test:int` |
| Tipos / config | none | - (build gate only) | - | build gate only |
| UI / páginas (`src/app/*`, `src/components/*`) | none | - (e2e suspenso, AD-005; evidência por inspeção de código) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (`export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`). Integração exige `npm run db:up` e um banco privado `*_test` via `DATABASE_URL` (sessões paralelas colidem em `orcamento_test`).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tasks também. Mudanças de tipo são aditivas para o `typecheck` passar ao fim de cada task. São 8 tasks, cabem em um único lote: execução inline, sem sub-agentes.

### Phase 1: Importação ponta a ponta

Uma só cadeia de dependência: contrato e leitura do arquivo no navegador (T1-T3), validação e gravação no servidor (T4-T6), interface (T7-T8).

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Definir o tipo do payload de importação

**What**: Adicionar `ImportPayload` (categorias com vigências e subcategorias, transações, meta, nascimento cifrado) ao módulo de tipos compartilhados.
**Where**: `src/lib/vault/types.ts` (modify)
**Depends on**: None
**Reuses**: `ExportPayload`, `GoalDto`, `Ct`, `TransactionKind` do mesmo arquivo
**Requirement**: IMPORT-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `ImportPayload` exportado com a forma do design (`Data Models`)
- [x] Nenhum import de servidor no arquivo (isomórfico)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: igual ao anterior (nenhum teste removido)

**Status**: ✅ Done
**Tests**: none
**Gate**: quick
**Commit**: `feat(import): define the sealed import payload type`

---

### T2: Validar o arquivo exportado no navegador

**What**: Criar `parseImportFile` (texto → `OpenedExport` + resumo, ou erro) e `checkImportFileSize`, com as mensagens exatas da spec; exportar `MAX_INCOME_CENTS`, `MIN_RATE_BP` e `MAX_RATE_BP` de `goal.ts` para reutilizar os limites da meta.
**Where**: `src/lib/vault/import-file.ts`
**Depends on**: T1
**Reuses**: `OpenedExport`/`buildExport` (`src/lib/vault/export.ts`), `isValidCalendarDate`, `isCategoryColor`, `MAX_CENTS`, `MAX_SUBCATEGORIES`
**Requirement**: IMPORT-08, IMPORT-09, IMPORT-10, IMPORT-11, IMPORT-12, IMPORT-13, IMPORT-29, IMPORT-30, IMPORT-31, IMPORT-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Arquivo acima de 20 MB devolve "Arquivo muito grande (máximo 20 MB)" (IMPORT-08), no limite exato de 20 MB passa
- [x] JSON inválido, chave ausente ou de tipo errado devolve "Arquivo inválido. Use o arquivo exportado pelo Orçamento." (IMPORT-09)
- [x] Rejeita valor 0, valor acima de 99.999.999.999, descrição acima de 120, nome acima de 40, cor fora de 1..8, percentual fora de 1..100.000.000, data inexistente e meta fora dos limites (IMPORT-10); aceita cada valor de fronteira
- [x] Rejeita gasto com categoria/subcategoria ausente, subcategoria de outra categoria e ganho com categoria (IMPORT-11)
- [x] Rejeita categorias ativas de mesmo nome sem diferenciar maiúsculas e subcategorias repetidas na categoria; aceita ativa e excluída com o mesmo nome (IMPORT-12, IMPORT-31)
- [x] Rejeita 15.001 transações, 1.001 categorias, 101 vigências e 31 subcategorias; aceita o limite exato (IMPORT-13)
- [x] Soma de percentuais diferente de 100% não rejeita
- [x] Arquivo com listas vazias passa com resumo 0/0/0 (IMPORT-29); categoria excluída e série com vários segmentos passam intactas (IMPORT-30, IMPORT-32)
- [x] Round-trip: `parseImportFile(buildExport(x))` devolve `x` para um conjunto com todos os recursos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos em `src/lib/vault/import-file.test.ts`, nenhum removido

**Status**: ✅ Done
**Tests**: unit
**Gate**: quick
**Commit**: `feat(import): validate the exported file in the browser`

---

### T3: Montar o payload cifrado da importação

**What**: Criar `buildImportPayload`: ids novos com referências remapeadas, série única remapeada, cifra de todos os campos com a DEK e o `userId`, descarte da meta em conflito com o nascimento e teto de 7.000.000 de caracteres.
**Where**: `src/lib/vault/import-payload.ts`
**Depends on**: T2
**Reuses**: `sealTransaction`, `sealGoal`, `sealBirthDate`, `fieldAad` (`seal.ts`), padrão de `legacy-package.ts`, `birthDateGoalConflict`, `ageOn`, `openExport` nos testes
**Requirement**: IMPORT-03, IMPORT-05, IMPORT-06, IMPORT-13, IMPORT-22, IMPORT-25, IMPORT-26, IMPORT-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Todos os ids do payload são UUIDs diferentes dos do arquivo; `categoryId`, `subcategoryId` e `seriesId` apontam para os equivalentes e os segmentos de uma série compartilham um só `seriesId` novo (IMPORT-06)
- [x] Decifrar o payload com `openExport` (usando o `userId` de destino) devolve os mesmos valores do arquivo, exceto ids (IMPORT-05, IMPORT-27)
- [x] Nenhum valor, descrição, nome, meta ou nascimento em claro aparece no JSON do payload (IMPORT-25)
- [x] Meta em conflito com o nascimento da conta (ou do arquivo, se a conta não tem) sai `null` com `goalSkipped = true` (IMPORT-22); sem conflito segue cifrada
- [x] Falha de cifra rejeita a promessa antes de devolver payload (IMPORT-26)
- [x] Corpo serializado acima de 7.000.000 de caracteres rejeita com "Arquivo inválido. Use o arquivo exportado pelo Orçamento." (IMPORT-13)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos em `src/lib/vault/import-payload.test.ts`, nenhum removido

**Status**: ✅ Done
**Tests**: unit
**Gate**: quick
**Commit**: `feat(import): seal the file for the destination account`

---

### T4: Validar a estrutura do payload no servidor

**What**: Criar `sealedImportSchema` (Zod): UUIDs, datas, cor, formato das cifras, regras de gasto/ganho, trio de recorrência, `recurrenceEnd`, referências internas e limites de quantidade.
**Where**: `src/lib/validation/import-sealed.ts`
**Depends on**: T3
**Reuses**: `ciphertextSchema`, `nullableCiphertextSchema`, `isValidCalendarDate`, `isCategoryColor`, `MAX_SUBCATEGORIES`, `sealedTransactionSchema` como modelo
**Requirement**: IMPORT-03, IMPORT-11, IMPORT-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Payload produzido por `buildImportPayload` passa
- [x] Rejeita id que não é UUID, cifra fora de `v1:<base64url>` ou acima de 2048, data inexistente e cor fora de 1..8
- [x] Rejeita gasto sem categoria, ganho com categoria, subcategoria fora da categoria, `categoryId`/`subcategoryId`/`seriesId` que não existem no payload (IMPORT-11)
- [x] Rejeita `recurring` sem `recurrenceDay`/`seriesId` e o inverso, `recurrenceDay` fora de 1..31 e `recurrenceEnd` anterior ao mês da data
- [x] Rejeita 15.001 transações, 1.001 categorias, 101 vigências e 31 subcategorias; aceita o limite exato (IMPORT-13)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos em `src/lib/validation/import-sealed.test.ts`, nenhum removido

**Status**: ✅ Done
**Tests**: unit
**Gate**: quick
**Commit**: `feat(import): validate the sealed import structure`

---

### T5: Gravar a importação em uma transação

**What**: Criar `importRepo` com `isEmpty` e `importSealed`: trava o usuário, confere conta vazia, insere categorias, vigências, subcategorias e transações em lotes, meta e nascimento só se ausentes.
**Where**: `src/lib/db/repos/import.ts`
**Depends on**: T4
**Reuses**: padrão `FOR UPDATE` de `legacyRepo.commitMigration`, `goalsRepo.upsertSealed`, `vaultRepo.setBirthDateSealed`, `exportRowsSealed` e `insertTestUser`/`setupTestDb` nos testes
**Requirement**: IMPORT-04, IMPORT-14, IMPORT-15, IMPORT-16, IMPORT-17, IMPORT-19, IMPORT-20, IMPORT-21, IMPORT-23, IMPORT-24, IMPORT-27, IMPORT-30, IMPORT-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Em conta vazia grava todas as linhas, com colunas em claro `NULL`, e devolve as contagens (IMPORT-04)
- [x] `exportRowsSealed` da conta de destino traz as mesmas listas e `kind`, datas, recorrência, cor, `isInvestment`, `deletedFrom` e `fromMonth` do payload (IMPORT-27, IMPORT-30, IMPORT-32)
- [x] Conta com uma transação, ou com só uma categoria excluída, devolve `not_empty` e não grava nada (IMPORT-15, IMPORT-16)
- [x] Duas chamadas simultâneas na mesma conta gravam no máximo uma; a outra devolve `not_empty` (IMPORT-17)
- [x] Erro no meio da inserção (ex.: violação de FK forçada) deixa zero linhas novas (IMPORT-14)
- [x] Linhas de outro usuário não são lidas nem alteradas; toda linha nova tem o `userId` passado (IMPORT-19)
- [x] Meta entra só sem meta prévia; a existente fica intacta (IMPORT-20, IMPORT-21)
- [x] Nascimento entra só se `user_vault.birth_date_ct` é `NULL`; o existente fica intacto (IMPORT-23, IMPORT-24)
- [x] `isEmpty` é verdadeiro para conta nova e falso com transação ou categoria
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes novos em `src/lib/db/repos/import.int.test.ts`, nenhum removido

**Status**: ✅ Done
**Tests**: integration
**Gate**: full
**Commit**: `feat(import): write the sealed import atomically`

---

### T6: Expor a importação como Server Action

**What**: Criar `importDataAction`: sessão aprovada, `sealedImportSchema`, `importRepo.importSealed`, mensagem "Só é possível importar em uma conta sem transações nem categorias", `SAVE_FAILED` e `revalidatePath`.
**Where**: `src/actions/import-data.ts`
**Depends on**: T5
**Reuses**: esqueleto de `exportDataAction` e `commitLegacyMigrationAction` (`src/actions/account.ts`, `src/actions/legacy.ts`), `logActionError`
**Requirement**: IMPORT-04, IMPORT-14, IMPORT-15, IMPORT-17, IMPORT-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem sessão devolve UNAUTHORIZED e não toca o banco (IMPORT-19)
- [x] Payload válido em conta vazia devolve `ok` com as contagens e grava para o `userId` da sessão (IMPORT-04, IMPORT-19)
- [x] Payload estruturalmente inválido devolve `SAVE_FAILED` e não grava
- [x] Conta com dados devolve exatamente "Só é possível importar em uma conta sem transações nem categorias" (IMPORT-15); duas ações concorrentes: uma `ok`, outra com essa mensagem (IMPORT-17)
- [x] Falha de banco devolve `SAVE_FAILED` ("Não foi possível salvar. Tente novamente") e não grava (IMPORT-14)
- [x] `revalidatePath` é chamado só no sucesso
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Test count: testes novos em `src/actions/import-data.int.test.ts`, nenhum removido

**Status**: ✅ Done
**Tests**: integration
**Gate**: full
**Commit**: `feat(import): add the import server action`

---

### T7: Criar o cartão de importação

**What**: Criar `ImportCard` (client): seletor `.json`, limite de 20 MB, resumo, botão "Importar"/"Importando...", resultado com aviso de meta, erros e estado "Disponível apenas em conta sem transações nem categorias".
**Where**: `src/components/import-card.tsx`
**Depends on**: T6
**Reuses**: `ExportButton` (estado `pending`/`error`, `useVault`), `Button`, `Input`, `Alert`, `openBirthDate`, `parseImportFile`, `buildImportPayload`, `importDataAction`
**Requirement**: IMPORT-02, IMPORT-08, IMPORT-09, IMPORT-18, IMPORT-26, IMPORT-28, IMPORT-33

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Arquivo válido mostra "N transações, N categorias, N subcategorias" e habilita "Importar" sem chamar a action (IMPORT-02)
- [ ] Arquivo grande ou inválido mostra a mensagem exata da spec e mantém o botão desabilitado (IMPORT-08, IMPORT-09)
- [ ] Durante a ação o botão fica desabilitado com o texto "Importando..." (IMPORT-28)
- [ ] Sucesso mostra "Importação concluída: N transações, N categorias" e, com `goalSkipped`, "Meta não importada: a idade de aposentadoria é incompatível com a data de nascimento da conta" (IMPORT-22)
- [ ] Erro da action e falha de cifra mostram a mensagem recebida / "Não foi possível salvar. Tente novamente", sem envio no caso de cifra (IMPORT-26)
- [ ] `canImport = false` mostra "Disponível apenas em conta sem transações nem categorias" e nenhum seletor (IMPORT-18)
- [ ] Escolher outro arquivo descarta resumo, erro e resultado anteriores (IMPORT-33)
- [ ] Evidência de UI registrada por inspeção de código (`file:line`), sem e2e (AD-005)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: igual ao anterior (nenhum teste removido)

**Tests**: none
**Gate**: build
**Commit**: `feat(import): add the import card component`

---

### T8: Ligar o cartão na página da conta

**What**: Em `/conta`, ler `importRepo.isEmpty` e `vaultRepo.getBirthDateSealed` no servidor e renderizar `ImportCard` em um `ContentCard` "Importar dados" ao lado de "Exportar meus dados".
**Where**: `src/app/(app)/conta/page.tsx` (modify)
**Depends on**: T7
**Reuses**: `ContentCard`, `ExportButton` já presente na página, `getBirthDateSealed`
**Requirement**: IMPORT-01, IMPORT-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cartão "Importar dados" aparece junto do "Exportar meus dados" (IMPORT-01)
- [ ] `canImport` vem de `importRepo.isEmpty(userId)` calculado no servidor (IMPORT-18)
- [ ] A página continua guardada pelo layout `(app)` e a página de conta de conta legada segue redirecionada (sem mudança de guard)
- [ ] Evidência de UI registrada por inspeção de código (`file:line`), sem e2e (AD-005)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: igual ao anterior (nenhum teste removido)

**Tests**: none
**Gate**: build
**Commit**: `feat(import): offer the import on the account page`

---

## Phase Execution Map

```
Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

Execução estritamente sequencial; as 8 tasks cabem em um lote, então rodam inline. Ao fim da T8 o Verifier roda automaticamente.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: tipo do payload | 1 tipo | ✅ Granular |
| T2: parser do arquivo | 1 módulo puro (+ 3 `export` em `goal.ts`) | ✅ Granular |
| T3: montar o payload | 1 função | ✅ Granular |
| T4: schema de estrutura | 1 schema | ✅ Granular |
| T5: repo de gravação | 1 repo, 2 funções | ✅ Granular |
| T6: Server Action | 1 endpoint | ✅ Granular |
| T7: cartão | 1 componente | ✅ Granular |
| T8: ligação na página | 1 arquivo | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: tipo do payload | Tipos / config | none | none | ✅ OK |
| T2: parser | Vault puro (+ validação: só `export` de constantes) | unit | unit | ✅ OK |
| T3: payload cifrado | Vault puro | unit | unit | ✅ OK |
| T4: schema do servidor | Validação | unit | unit | ✅ OK |
| T5: repo | Repositórios | integration | integration | ✅ OK |
| T6: Server Action | Server Actions | integration | integration | ✅ OK |
| T7: cartão | UI | none | none | ✅ OK |
| T8: página | UI | none | none | ✅ OK |
