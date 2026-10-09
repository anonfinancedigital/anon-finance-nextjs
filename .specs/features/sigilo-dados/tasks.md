# Sigilo dos Dados Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/sigilo-dados/design.md`
**Spec**: `.specs/features/sigilo-dados/spec.md`
**Status**: Draft

**Ordem e estratégia:** tudo é aditivo até o cutover. As fases 1 a 6 criam o núcleo de cripto, o esquema, repositórios, lógica de cliente e Server Actions *ao lado* do código antigo (sufixo `Sealed`), então cada commit compila e passa o gate. As fases 7 a 11 ligam a UI ao novo caminho. A fase 12 e a 13 removem o caminho em texto puro e entregam o script de finalização. Nada deve ser publicado em produção antes do fim da fase 11: até lá, contas legadas não conseguem usar as telas já trocadas.

**Desvios do design:** (1) `birth_date_ct` mora em `user_vault`, não em `user`, para não mexer em `auth-schema.ts` (gerado pelo Better Auth); (2) o legado só sai do `schema.ts` num follow-up, depois que o operador rodar `db:finalize-vault` com todas as contas migradas. Esse follow-up está fora desta feature; `finalize-vault` (T88) cobre SIGILO-25.

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de código de framework. Tarefas de `proxy`, `next.config.ts` e Server Actions devem conferir ali o nome exato das opções (`proxy.ts`, `experimental.serverActions.bodySizeLimit`, CSP com nonce em `01-app/02-guides/content-security-policy.md`).

**Ambiente:** Node 20 no `PATH` (`export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`). Testes de integração rodam em banco privado terminado em `_test` via `DATABASE_URL` (outra sessão pode usar `orcamento_test`). Há alterações não relacionadas na árvore (`.specs/LESSONS.md`, `.specs/lessons.json`, `.specs/features/apice-folga-meta/validation.md`); cada commit inclui só os arquivos da task.

**Testes de integração e a chave:** nenhuma variável de ambiente de cifra existe (a chave vive no navegador). O chamariz de `kdfParamsFor` usa `BETTER_AUTH_SECRET`, já exigido.

**E2E suspenso (AD-005):** nenhuma task cria ou roda e2e. Evidência de UI é inspeção de código (`file:line`) mais `npm run build`. O Verifier fecha com conferência manual no app (skill `run`): cadastro, login em outro navegador, redefinição com e depois sem chave, migração de uma conta legada, exportar, excluir, inspeção do corpo das requisições e das colunas cruas.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` em `src/**/*.test.ts` e `integration` em `*.int.test.ts`), AD-005 (e2e suspenso), AD-008 (domínio isomórfico). Lição L-002: os textos dos AC já estão literais na spec e entram literais nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Núcleo de cripto e cofre no cliente (`src/lib/crypto/*`, `src/lib/vault/*`, `src/lib/log.ts`, `src/lib/security-headers.ts`) | unit | Todos os ramos; 1:1 com os AC; casos negativos (tag adulterada, AAD errado, chave errada); nenhum valor em claro nas saídas | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Domínio e validação (`src/lib/domain/*`, `src/lib/validation/*`) | unit | Todos os ramos; cada borda listada na spec tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) | integration | Caminhos principais, erros e rollback; leitura da coluna crua provando que não há texto puro; paridade com os casos dos testes antigos | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`, `src/lib/login-lock.ts`) | integration | Feliz + cada borda e erro listado; guard sem sessão; entrada malformada não grava | `src/actions/*.int.test.ts` | `npm run test:int` |
| Scripts do operador (`scripts/*`) | integration | Recusa com conta legada, sucesso sem ela, atomicidade | `scripts/*.int.test.ts` (incluído em `src/**` via helper) | `npm run test:int` |
| UI, páginas, config e proxy (`src/components/*`, `src/app/**`, `src/proxy.ts`, `next.config.ts`) | none | - (e2e suspenso, AD-005; sem teste de componente; build gate only) | - | build gate only |
| Schema e migração (`src/lib/db/schema.ts`, `src/lib/vault/types.ts`, `drizzle/*`) | none | - (build gate only; constraints exercitadas pelos testes dos repositórios) | - | build gate only |

## Gate Check Commands

> Generated from `package.json` - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks com testes unit | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração ou que mexem em schema | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI, config e proxy | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Dependências entre fases apontam sempre para trás.

### Phase 1: Núcleo de cripto

```
T1 → T2 → T3 → T4 → T5 → T6
T1 → T4
T2 → T5
T1 → T6
```

### Phase 2: Esquema e cofre no servidor

```
T7 → T8 → T9 → T10 → T11 → T12
T7 → T10
T8 → T10
```

### Phase 3: Repositórios cifrados

```
T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22
```

### Phase 4: Cofre no cliente

```
T23 → T24 → T25 → T26 → T27 → T28 → T29 → T30 → T31 → T32
T23 → T26
T23 → T29
T23 → T32
T24 → T32
```

### Phase 5: Ações de dados

```
T33 → T34 → T35 → T36 → T37 → T38
T33 → T35
T33 → T36
T33 → T37
T33 → T38
```

### Phase 6: Ações de conta e infraestrutura

```
T39 → T40 → T41 → T42 → T43 → T44 → T45 → T46 → T47
T41 → T43
T45 → T47
```

### Phase 7: Runtime do cofre na UI

```
T48 → T49 → T50 → T51 → T52
T48 → T50
```

### Phase 8: Telas de conta

```
T53 → T54 → T55 → T56 → T57 → T58
```

### Phase 9: Cutover: layout e visão geral

```
T59 → T60 → T61 → T62
```

### Phase 10: Cutover: categorias, meta e nascimento

```
T63 → T64 → T65 → T66 → T67 → T68 → T69 → T70 → T71
```

### Phase 11: Conta: exportar e excluir

```
T72 → T73 → T74 → T75
T72 → T75
```

### Phase 12: Remoção do legado nas ações

```
T76 → T77 → T78 → T79 → T80 → T81 → T82
```

### Phase 13: Remoção do legado nos repositórios e finalização

```
T83 → T84 → T85 → T86 → T87 → T88
T86 → T88
```

---

## Task Breakdown

### Phase 1: Núcleo de cripto

### T1: Codificar base64url

**What**: Funções `toBase64Url(bytes)` e `fromBase64Url(text)` sem padding, que lançam em caractere fora do alfabeto.
**Where**: `src/lib/crypto/base64url.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ida e volta devolve os mesmos bytes (vazio, 1, 2, 3 e 32 bytes)
- [x] Saída usa só `A-Za-z0-9_-` e nunca termina em `=`
- [x] `fromBase64Url` lança em `+`, `/`, `=` e espaço
- [x] ≥ 5 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): codificar base64url`

---

### T2: Cifrar e decifrar campo (AES-256-GCM)

**What**: `encryptField(dek, plaintext, aad)`, `decryptField(dek, ct, aad)` e `aad(table, column, userId, rowId?)`; formato `v1:<base64url(iv12‖ct‖tag)>`, IV aleatório por chamada, `DecryptError` em qualquer falha.
**Where**: `src/lib/crypto/aead.ts`
**Depends on**: T1
**Reuses**: -
**Requirement**: SIGILO-01, SIGILO-03, SIGILO-04, SIGILO-05, SIGILO-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ida e volta devolve o texto original (vazio, ASCII, acentos, 2 KB)
- [x] Duas cifragens do mesmo texto e AAD diferem
- [x] AAD de outra linha, outra coluna ou outro usuário lança `DecryptError`
- [x] Byte alterado, prefixo `v2:`, base64 inválido e payload curto lançam `DecryptError`
- [x] ≥ 8 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): cifrar e decifrar campo (AES-256-GCM)`

---

### T3: Codecs de campo

**What**: Codecs `centsCodec`, `microCodec`, `intCodec`, `textCodec`, `dateCodec` entre valor e texto decimal canônico, e `sealNullable`/`openNullable` que preservam `null`.
**Where**: `src/lib/crypto/fields.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: SIGILO-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ida e volta de cada codec nos limites (1 e 99.999.999.999 centavos; 1 e 100.000.000 micro; data `AAAA-MM-DD`)
- [x] `decode` lança em texto não canônico (`007`, `1e3`, ` 5`, `-0`, vazio)
- [x] `null` ↔ `null` em `sealNullable`/`openNullable`
- [x] ≥ 8 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): codecs de campo`

---

### T4: Derivar segredo de login e KEK

**What**: `deriveKeys(password, salt, params)` com Argon2id (`@noble/hashes`, `asyncTick`) seguido de HKDF-SHA256 com `info` `orcamento/auth/v1` e `orcamento/kek/v1`; devolve `authSecret` (base64url, 43 caracteres) e `kek` (`CryptoKey` AES-GCM não extraível); adiciona `@noble/hashes` às dependências diretas.
**Where**: `src/lib/crypto/kdf.ts`
**Depends on**: T3, T1
**Reuses**: -
**Requirement**: SIGILO-02, SIGILO-11, SIGILO-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Mesmos senha, salt e parâmetros dão o mesmo `authSecret`; salt ou senha diferente dá outro
- [x] `authSecret` tem 43 caracteres do alfabeto base64url
- [x] Dados cifrados com a KEK de uma senha não decifram com a KEK de outra
- [x] Teste usa parâmetros baixos (m=64 KiB, t=1); parâmetros de produção ficam em `DEFAULT_KDF_PARAMS` (m=65536, t=3, p=1)
- [x] ≥ 5 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): derivar segredo de login e KEK`

---

### T5: Embrulhar e desembrulhar a DEK

**What**: `wrapDek(kek, dekRaw, userId)` e `unwrapDek(kek, wrapped, userId)` com AES-GCM e AAD `vault.dek.<userId>`.
**Where**: `src/lib/crypto/wrap.ts`
**Depends on**: T4, T2
**Reuses**: -
**Requirement**: SIGILO-11, SIGILO-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ida e volta devolve os 32 bytes da DEK
- [x] KEK errada ou `userId` errado lança `DecryptError`
- [x] Saída começa com `v1:`
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): embrulhar e desembrulhar a DEK`

---

### T6: Chave de recuperação

**What**: `generateRecoveryKey()` (128 bits em Crockford base32, 26 caracteres exibidos em 7 grupos separados por `-`), `parseRecoveryKey(text)` (ignora caixa, espaços e `-`; `I`/`L`→`1`, `O`→`0`) e `recoveryKek(bytes)` (HKDF, `info` `orcamento/recovery/v1`).
**Where**: `src/lib/crypto/recovery.ts`
**Depends on**: T5, T1
**Reuses**: -
**Requirement**: SIGILO-18, SIGILO-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Chave gerada tem 16 bytes e `parse(display)` devolve os mesmos bytes
- [x] `parse` aceita minúsculas, espaços e sem `-`
- [x] `parse` lança `InvalidRecoveryKey` com caractere inválido ou tamanho errado
- [x] Duas chaves geradas diferem
- [x] ≥ 5 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): chave de recuperação`

---

### Phase 2: Esquema e cofre no servidor

### T7: Tipos do cofre

**What**: Tipos compartilhados cliente/servidor: `Ct`, `VaultMaterial`, `TransactionDto`, `UpdateTransactionDto`, `CategorySetDto`, `GoalDto`, `MonthPayload`, `ExportPayload`, `LegacyPlain`, `LegacyPackage` (conforme o design).
**Where**: `src/lib/vault/types.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: SIGILO-01, SIGILO-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Todos os tipos do design exportados, sem `any`
- [x] Nenhum import de servidor (arquivo isomórfico)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): tipos do cofre`

---

### T8: Colunas cifradas e tabela do cofre

**What**: Adicionar `user_vault` (salt, parâmetros do KDF, DEK embrulhada pela KEK e pela recuperação, `birth_date_ct`), colunas `*_ct` em `transaction`, `category`, `subcategory`, `category_percent` e `financial_goal`, tornar nullable as colunas em texto puro e criar `CHECK` de exclusão mútua (texto puro XOR cifrado) por campo; gerar a migração `drizzle/0010_*.sql`. Desvio do design: `birth_date_ct` mora em `user_vault`, não em `user`.
**Where**: `src/lib/db/schema.ts`
**Depends on**: T7
**Reuses**: `src/lib/db/schema.ts` (padrão de `check`/`pgTable`)
**Requirement**: SIGILO-01, SIGILO-12, SIGILO-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run db:generate` produz a `0010` e ela é commitada
- [x] Migração aplica no banco de teste privado e os testes de integração existentes seguem verdes
- [x] `CHECK` aceita linha só em texto puro e linha só cifrada, e recusa as duas ou nenhuma (conferido por SQL manual no banco de teste)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: full
**Commit**: `feat(sigilo): colunas cifradas e tabela do cofre`

---

### T9: Validar texto cifrado

**What**: `ciphertextSchema` e `nullableCiphertextSchema` (Zod): `^v1:[A-Za-z0-9_-]+$`, máximo 2048 caracteres.
**Where**: `src/lib/validation/ciphertext.ts`
**Depends on**: T8
**Reuses**: `src/lib/validation/category.ts` (estilo Zod)
**Requirement**: SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Aceita `v1:abc_-` e 2048 caracteres exatos
- [x] Recusa sem prefixo, `v2:`, payload vazio, `+`, `/`, `=` e 2049 caracteres
- [x] `nullable` aceita `null` e recusa `undefined`
- [x] ≥ 7 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): validar texto cifrado`

---

### T10: Repositório do cofre: criar, ler, reembrulhar, apagar dados

**What**: `vaultRepo.get(userId)`, `create(tx, userId, material)`, `rewrap(tx, userId, {salt, params, dekWrappedPw})` e `wipeFinancialData(tx, userId)` (apaga transações, categorias, metas do usuário e zera `birth_date_ct`).
**Where**: `src/lib/db/repos/vault.ts`
**Depends on**: T9, T7, T8
**Reuses**: `src/lib/db/repos/goals.ts` (padrão de repo), `src/test/db.ts`
**Requirement**: SIGILO-11, SIGILO-12, SIGILO-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `create` grava a linha e `get` devolve o mesmo material; segunda `create` do mesmo usuário falha
- [x] `rewrap` troca só salt/parâmetros/`dekWrappedPw`; `dekWrappedRecovery` fica igual
- [x] `wipeFinancialData` apaga todas as linhas financeiras do usuário e nenhuma de outro
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): repositório do cofre: criar, ler, reembrulhar, apagar dados`

---

### T11: Repositório do cofre: parâmetros do KDF com chamariz

**What**: `vaultRepo.kdfParamsFor(email)`: parâmetros reais do usuário; `{mode:"legacy"}` para conta sem cofre; para e-mail inexistente, salt e parâmetros falsos determinísticos derivados por HMAC-SHA256 do e-mail normalizado com `BETTER_AUTH_SECRET`.
**Where**: `src/lib/db/repos/vault.ts`
**Depends on**: T10
**Reuses**: `usersRepo.findByEmail` (normalização)
**Requirement**: SIGILO-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Conta com cofre devolve seu salt e parâmetros reais
- [x] E-mail inexistente devolve o mesmo resultado em duas chamadas e com o mesmo formato (mesmas chaves, salt de 16 bytes em base64url)
- [x] Resultado do chamariz difere entre e-mails diferentes
- [x] Conta sem cofre devolve `{mode:"legacy"}`; e-mail com outra caixa/espaços equivale ao normalizado
- [x] ≥ 5 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): repositório do cofre: parâmetros do KDF com chamariz`

---

### T12: Repositório do cofre: data de nascimento cifrada

**What**: `vaultRepo.getBirthDateSealed(userId)` e `setBirthDateSealed(userId, ct)`.
**Where**: `src/lib/db/repos/vault.ts`
**Depends on**: T11
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `set` grava só em `birth_date_ct` do usuário e `get` devolve o mesmo texto
- [x] `get` devolve `null` sem cofre ou sem data
- [x] Coluna crua nunca contém data legível
- [x] ≥ 3 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): repositório do cofre: data de nascimento cifrada`

---

### Phase 3: Repositórios cifrados

### T13: Transações cifradas: criar e listar por mês

**What**: `transactionsRepo.createSealed(userId, dto)` (idempotente por id) e `listByMonthSealed(userId, range)` com as mesmas ocorrências, projeção de data, parcela e ordenação de `listByMonth`, devolvendo `amountCt`/`descriptionCt`.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T8, T7
**Reuses**: `applicableInMonth`, `recurrenceFields`, `occurrenceDate`, `installmentOf`
**Requirement**: SIGILO-01, SIGILO-07, SIGILO-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Coluna crua `amount_ct`/`description_ct` guarda o texto e `amount_cents`/`description` ficam `NULL`
- [x] Id repetido é ignorado; descrição `NULL` continua `NULL`
- [x] Porta de `transactions.int.test.ts` todos os casos de criação e listagem por mês (recorrentes, fronteira de mês, outro usuário, ordenação)
- [x] ≥ 10 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): transações cifradas: criar e listar por mês`

---

### T14: Transações cifradas: editar a partir de um mês

**What**: `transactionsRepo.updateFromSealed(userId, id, month, dto)`: aplica `planEdit` sobre as colunas em claro; linha editada recebe `amountCt`/`descriptionCt`, o segmento novo usa `newRowId` e `insertedCt` do cliente.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T13
**Reuses**: `lockSeries`, `planEdit`, `segmentFields`
**Requirement**: SIGILO-01, SIGILO-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Porta todos os casos de `updateFrom` de `transactions.int.test.ts` (série dividida, truncada, editada no primeiro mês, fora do mês)
- [x] O segmento novo é gravado com o id `newRowId`; `newRowId` já existente falha sem alterar nada
- [x] Série truncada mantém o texto cifrado antigo
- [x] ≥ 8 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): transações cifradas: editar a partir de um mês`

---

### T15: Categorias cifradas: leitura

**What**: `categoriesRepo.listForMonthSealed(userId, month, now)`: categorias em vigor no mês (regra de `deleted_from`), com `nameCt`, todas as versões de percentual `{fromMonth, percentCt}` e subcategorias `{id, nameCt}` em ordem de criação.
**Where**: `src/lib/db/repos/categories.ts`
**Depends on**: T14, T8, T7
**Reuses**: `listForMonth` (filtro de vigência)
**Requirement**: SIGILO-01, SIGILO-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Porta os casos de `listForMonth` (excluída depois do mês, ordem de criação, subcategorias, versões)
- [x] Nenhum campo de nome ou percentual em texto puro no resultado
- [x] ≥ 6 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): categorias cifradas: leitura`

---

### T16: Categorias cifradas: gravar o conjunto

**What**: `categoriesRepo.replaceSetSealed(userId, dto, now)`: ids novos vêm do cliente, `percentChange` grava versão em `monthStartOf(currentMonth(now))` com upsert, exclusão lógica, posse, bloqueio de exclusão com gastos e mensagens atuais.
**Where**: `src/lib/db/repos/categories.ts`
**Depends on**: T15
**Reuses**: `expensesMessage`, `subcategoryExpensesMessage`, `monthStartOf`
**Requirement**: SIGILO-01, SIGILO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Porta os casos de `replaceSet` (criar, renomear, excluir, bloqueio com gastos, subcategoria de outra categoria, atomicidade)
- [x] Sem `percentChange` não grava versão; com ele faz upsert no mês corrente de America/Sao_Paulo
- [x] Mensagens `Esta categoria tem N gasto(s) e não pode ser excluída` e `Categoria não encontrada` preservadas
- [x] ≥ 10 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): categorias cifradas: gravar o conjunto`

---

### T17: Meta cifrada

**What**: `goalsRepo.getSealed(userId)` e `upsertSealed(userId, dto)` com as cinco colunas `*_ct`.
**Where**: `src/lib/db/repos/goals.ts`
**Depends on**: T16, T8, T7
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `upsertSealed` cria e depois substitui a linha única; colunas em texto puro ficam `NULL`
- [x] `getSealed` devolve `null` sem meta
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): meta cifrada`

---

### T18: Linhas cifradas para exportar

**What**: `exportRowsSealed(userId)`: todas as linhas do usuário (transações cruas com recorrência, categorias inclusive excluídas, subcategorias, versões de percentual, meta, `birth_date_ct`).
**Where**: `src/lib/db/repos/export.ts`
**Depends on**: T17, T8, T7
**Reuses**: -
**Requirement**: SIGILO-36, SIGILO-37

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Devolve só linhas do usuário pedido, com dois usuários populados
- [x] Inclui categoria excluída e todas as versões de percentual
- [x] Usuário sem dados devolve listas vazias e `birthDateCt` `null`
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): linhas cifradas para exportar`

---

### T19: Usuário: criar cadastro cifrado

**What**: `usersRepo.createPendingSealed({id, name, email, authSecret, vault})`: numa transação, cria `user` com o id do cliente, conta credencial com `hashPassword(authSecret)` e a linha do cofre com `birth_date_ct`; e-mail repetido devolve `duplicate`.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: T18, T10
**Reuses**: `usersRepo.createPending`
**Requirement**: SIGILO-11, SIGILO-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Linha do cofre e conta criadas juntas; hash guardado não é o `authSecret` em claro
- [x] E-mail repetido (qualquer caixa) devolve `duplicate` e nada é gravado
- [x] Id já existente falha com rollback
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): usuário: criar cadastro cifrado`

---

### T20: Redefinição: consumir token com cofre

**What**: `passwordResetsRepo.recoveryMaterialFor(token)` (devolve `dekWrappedRecovery` se o token vale e o dono tem cofre) e `consumeSealed(token, input)` com `input` `rewrap` (novo `authSecret`, salt, parâmetros e `dekWrappedPw`) ou `wipe` (novo cofre completo e dados financeiros apagados), tudo numa transação que encerra as sessões.
**Where**: `src/lib/db/repos/password-resets.ts`
**Depends on**: T19, T10
**Reuses**: `passwordResetsRepo.consume`, `identifierOf`
**Requirement**: SIGILO-19, SIGILO-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `rewrap` troca hash e `dekWrappedPw`, consome o token e apaga sessões; dados financeiros intactos
- [x] `wipe` apaga os dados, troca o cofre inteiro e o hash
- [x] Token inválido/expirado/usado devolve `invalid` sem alterar nada; erro no meio faz rollback e o token segue válido
- [x] ≥ 7 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): redefinição: consumir token com cofre`

---

### T21: Legado: detectar e ler texto puro

**What**: `legacyRepo.isLegacy(userId)` (sem linha em `user_vault`) e `readPlain(userId)`: devolve `LegacyPlain` com transações, categorias (inclusive excluídas), subcategorias, versões de percentual, meta e data de nascimento em texto puro; recusa conta que não é legada.
**Where**: `src/lib/db/repos/legacy.ts`
**Depends on**: T20, T10
**Reuses**: -
**Requirement**: SIGILO-22, SIGILO-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Conta com dados em texto puro devolve todas as tabelas, inclusive recorrentes e categoria excluída
- [x] Conta com cofre devolve erro `not_legacy`
- [x] Só lê linhas do usuário pedido
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): legado: detectar e ler texto puro`

---

### T22: Legado: confirmar migração

**What**: `legacyRepo.commitMigration(userId, oldPassword, pkg)`: confere a senha antiga contra o hash, exige que o pacote cubra exatamente o conjunto de ids do banco, grava os `*_ct`, anula o texto puro, cria o cofre e troca o hash por `hashPassword(authSecret)`, tudo em uma transação.
**Where**: `src/lib/db/repos/legacy.ts`
**Depends on**: T21
**Reuses**: `verifyPassword`/`hashPassword` do Better Auth
**Requirement**: SIGILO-23, SIGILO-24

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sucesso: nenhuma coluna em texto puro resta para o usuário, cofre criado, hash novo verifica `authSecret`
- [x] Senha antiga errada devolve `wrong_password` e nada muda
- [x] Pacote sem uma linha existente devolve `mismatch` e rollback total (texto puro e hash intactos)
- [x] Conta já com cofre devolve `not_legacy`
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): legado: confirmar migração`

---

### Phase 4: Cofre no cliente

### T23: Selar transação, meta e data de nascimento

**What**: `sealTransaction(dek, userId, rowId, tx)`, `sealGoal(dek, userId, goal)` e `sealBirthDate(dek, userId, iso)` com os codecs e AAD certos.
**Where**: `src/lib/vault/seal.ts`
**Depends on**: T2, T3, T7
**Reuses**: -
**Requirement**: SIGILO-01, SIGILO-02, SIGILO-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Saída decifra com o AAD da linha e falha com AAD de outra linha ou coluna
- [x] Descrição vazia/`null` vira `null`; valor e descrição nunca aparecem na saída
- [x] Cada campo da meta usa coluna e codec próprios
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): selar transação, meta e data de nascimento`

---

### T24: Selar o conjunto de categorias

**What**: `sealCategorySet(dek, userId, items, current, now)`: cifra nomes, gera ids novos com `crypto.randomUUID`, inclui `percentChange {fromMonth, percentCt}` só para categoria nova com percentual ou com percentual diferente do vigente.
**Where**: `src/lib/vault/seal-categories.ts`
**Depends on**: T23
**Reuses**: `resolvePercent`, `monthStartOf`, `currentMonth`
**Requirement**: SIGILO-01, SIGILO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Percentual igual ao vigente não gera `percentChange`; diferente gera, com `fromMonth` do mês corrente de America/Sao_Paulo
- [x] Categoria e subcategoria novas recebem id e nome cifrado com AAD da própria linha
- [x] Subcategorias omitidas não aparecem no DTO
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): selar o conjunto de categorias`

---

### T25: Totais do mês no cliente

**What**: `computeMonthTotals(occurrences): MonthTotals` com a mesma forma do antigo `monthTotals` (receita, gasto por categoria, gasto por subcategoria com chave `null`).
**Where**: `src/lib/vault/month-totals.ts`
**Depends on**: T24, T7
**Reuses**: `buildMonthlySummary`, tipo `MonthTotals`
**Requirement**: SIGILO-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Conjunto fixo (receitas, despesas por categoria e subcategoria, despesa sem subcategoria, recorrente contada uma vez) dá os valores esperados em centavos escritos no teste
- [x] Mês vazio dá zeros e mapas vazios
- [x] `buildMonthlySummary` com esses totais devolve linhas, saldo e gasto esperados
- [x] ≥ 5 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): totais do mês no cliente`

---

### T26: Abrir mês, meta e data de nascimento

**What**: `openMonth(dek, userId, payload, month, now)` devolve `Category[]` (percentual vigente via `resolvePercent`, regra de meses futuros) e `Occurrence[]`; `openGoal` e `openBirthDate` devolvem `Goal` e ISO.
**Where**: `src/lib/vault/open.ts`
**Depends on**: T25, T2, T3, T7, T23
**Reuses**: `searchTransactions`, `filterTransactions`, `resolvePercent`
**Requirement**: SIGILO-03, SIGILO-05, SIGILO-06, SIGILO-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ida e volta com `seal*` reproduz tipos e valores originais
- [x] Tag adulterada em qualquer campo faz a função lançar `DecryptError` sem devolver resultado parcial
- [x] Busca por descrição e filtro por categoria/subcategoria sobre o resultado dão as mesmas transações do conjunto fixo
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): abrir mês, meta e data de nascimento`

---

### T27: Montar o arquivo de exportação

**What**: `buildExport(opened)` e `exportFileName(now)`: JSON com transações (séries), categorias, subcategorias, percentuais por vigência, meta e data de nascimento, decifrados.
**Where**: `src/lib/vault/export.ts`
**Depends on**: T26
**Reuses**: -
**Requirement**: SIGILO-36

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Arquivo contém todas as seções com os valores em claro de um conjunto fixo
- [x] Usuário sem dados gera listas vazias e a data de nascimento
- [x] `exportFileName` usa a data de America/Sao_Paulo (23h30 de 31/12 UTC-3 resulta no dia local)
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): montar o arquivo de exportação`

---

### T28: Guardar a chave no dispositivo

**What**: `createDeviceKeyStore(adapter)` com `load(userId)`, `save(userId, dek)`, `clear()`, `pendingKek.save/take/clear`, e o adaptador IndexedDB; `CryptoKey` não extraível.
**Where**: `src/lib/vault/device-key.ts`
**Depends on**: T27
**Reuses**: -
**Requirement**: SIGILO-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com adaptador em memória: `save` seguido de `load` devolve a chave; `clear` apaga
- [x] `load` de outro `userId` devolve `null`; `pendingKek.take` devolve e remove
- [x] Falha do adaptador em `save` não lança (SIGILO-16 degrada para memória)
- [x] Chaves importadas pelo store são não extraíveis (`extractable === false`)
- [x] ≥ 5 testes (o adaptador IndexedDB em si fica por inspeção, AD-005)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): guardar a chave no dispositivo`

---

### T29: Criar material do cofre

**What**: `createVaultMaterial({password, userId, birthDateIso?, params})`: gera DEK e chave de recuperação, deriva `authSecret` e KEK, embrulha a DEK duas vezes e cifra a data de nascimento; devolve o que vai ao servidor, a chave de recuperação para exibir e a DEK.
**Where**: `src/lib/vault/create-vault.ts`
**Depends on**: T28, T4, T5, T6, T23
**Reuses**: -
**Requirement**: SIGILO-02, SIGILO-11, SIGILO-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O objeto enviado ao servidor não contém a senha, a DEK crua, a KEK nem a chave de recuperação (busca por valor serializado)
- [x] `unwrapDek` com a KEK da mesma senha recupera a DEK; com a chave de recuperação também
- [x] Duas chamadas geram DEK, salt e chave de recuperação diferentes
- [x] ≥ 5 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): criar material do cofre`

---

### T30: Desbloquear o cofre

**What**: `unlockVault({password, params, salt, dekWrappedPw, userId})`: deriva a KEK, desembrulha e devolve a DEK como `CryptoKey` não extraível; `deriveLoginSecret(password, params, salt)` para o login.
**Where**: `src/lib/vault/unlock-vault.ts`
**Depends on**: T29, T4, T5
**Reuses**: -
**Requirement**: SIGILO-13, SIGILO-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Senha correta devolve DEK que decifra um campo selado antes
- [x] Senha errada lança `WrongPasswordError`
- [x] DEK devolvida é não extraível
- [x] `deriveLoginSecret` coincide com o `authSecret` de `createVaultMaterial` para a mesma senha e salt
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): desbloquear o cofre`

---

### T31: Reembrulhar com a chave de recuperação

**What**: `rewrapWithRecovery({recoveryKeyText, dekWrappedRecovery, newPassword, userId, params})`: desembrulha a DEK com a chave de recuperação, deriva `authSecret`/KEK novos com salt novo e reembrulha; `InvalidRecoveryKey` se falhar.
**Where**: `src/lib/vault/recover-vault.ts`
**Depends on**: T30, T6, T5, T4
**Reuses**: -
**Requirement**: SIGILO-19, SIGILO-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Chave correta: o novo `dekWrappedPw` abre com a KEK da nova senha e a DEK é a original
- [x] Chave inválida (formato ou errada) lança `InvalidRecoveryKey` e não devolve material
- [x] Salt novo difere do antigo
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): reembrulhar com a chave de recuperação`

---

### T32: Montar o pacote de migração

**What**: `buildLegacyPackage({plain, userId, dek})`: cifra todas as linhas de `LegacyPlain` com AAD de cada linha e devolve `LegacyPackage` com o mesmo conjunto de ids.
**Where**: `src/lib/vault/legacy-package.ts`
**Depends on**: T31, T23, T24, T7
**Reuses**: -
**Requirement**: SIGILO-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Conjunto de ids do pacote é igual ao de `plain` (transações, categorias, subcategorias, versões, meta)
- [x] Abrir o pacote com `open*` reproduz `plain`
- [x] Nenhum valor em texto puro na saída serializada
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): montar o pacote de migração`

---

### Phase 5: Ações de dados

### T33: Log sem dados

**What**: `logActionError(action, error)` registra só o nome da ação e `error.code` (string) ou `unknown`.
**Where**: `src/lib/log.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: SIGILO-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Erro do `pg` com `detail` contendo valores registra só ação e `code`
- [x] Entrada não-`Error` registra `unknown`
- [x] Nenhuma propriedade do erro além de `code` chega a `console.error` (espiado)
- [x] ≥ 3 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): log sem dados`

---

### T34: Ações do cofre

**What**: `getKdfParamsAction(email)` (público) e `getVaultAction()` (sessão) devolvendo parâmetros e DEK embrulhada.
**Where**: `src/actions/vault.ts`
**Depends on**: T33, T10, T11
**Reuses**: `requireSessionForAction`
**Requirement**: SIGILO-13, SIGILO-15, SIGILO-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] E-mail inexistente e existente devolvem formas iguais; conta legada devolve `mode: "legacy"`
- [x] `getVaultAction` sem sessão devolve `UNAUTHORIZED` sem tocar nos dados
- [x] `getVaultAction` devolve só o cofre do usuário da sessão
- [x] ≥ 5 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ações do cofre`

---

### T35: Ações de transação cifradas

**What**: `createTransactionSealed` e `updateTransactionSealed` com schema Zod de estrutura + `ciphertextSchema`, posse da categoria/subcategoria, mensagens atuais e `logActionError`.
**Where**: `src/actions/transactions-sealed.ts`
**Depends on**: T34, T13, T14, T9, T33
**Reuses**: `checkOwnership`, `isMonthKey`, mensagens de `transactions.ts`
**Requirement**: SIGILO-02, SIGILO-10, SIGILO-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Porta os casos de criação e edição de `transactions.int.test.ts` (posse, subcategoria fora da categoria, mês da ocorrência, mês final)
- [x] Texto cifrado malformado ou > 2048 devolve `SAVE_FAILED` e não grava
- [x] Coluna crua guarda só `v1:`
- [x] Sem sessão devolve `UNAUTHORIZED`
- [x] ≥ 10 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ações de transação cifradas`

---

### T36: Ação de categorias cifradas

**What**: `saveCategoriesSealed(dto)` com schema (uuid, cor 1..8, `ciphertextSchema`, até 30 subcategorias) e `revalidatePath("/")`.
**Where**: `src/actions/categories-sealed.ts`
**Depends on**: T35, T16, T9, T33
**Reuses**: `categorySetSchema` (estrutura), `invalidInput`
**Requirement**: SIGILO-02, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Porta os casos de `categories.int.test.ts` que dependem da ação (sessão, entrada inválida, atomicidade)
- [x] Cor fora de 1..8 e id não-uuid devolvem erro de campo
- [x] Texto cifrado malformado devolve erro e não grava
- [x] ≥ 6 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ação de categorias cifradas`

---

### T37: Ação de meta cifrada

**What**: `saveGoalSealed(dto)` com os cinco campos `ciphertextSchema` e `revalidatePath("/liberdade")`.
**Where**: `src/actions/goals-sealed.ts`
**Depends on**: T36, T17, T9, T33
**Reuses**: -
**Requirement**: SIGILO-02, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem sessão devolve `UNAUTHORIZED`
- [x] Grava e substitui; colunas cruas só `v1:`
- [x] Campo malformado devolve `SAVE_FAILED`
- [x] ≥ 4 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ação de meta cifrada`

---

### T38: Ação de data de nascimento cifrada

**What**: `saveBirthDateSealed(ct)` grava `birth_date_ct` do usuário da sessão; a regra de idade versus meta passa a ser do cliente.
**Where**: `src/actions/profile-sealed.ts`
**Depends on**: T37, T12, T9, T33
**Reuses**: -
**Requirement**: SIGILO-02, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Grava só para o usuário da sessão e `revalidatePath("/liberdade")`
- [x] Texto cifrado malformado devolve `SAVE_FAILED`
- [x] Sem sessão devolve `UNAUTHORIZED`
- [x] ≥ 3 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ação de data de nascimento cifrada`

---

### Phase 6: Ações de conta e infraestrutura

### T39: Ação de cadastro cifrado

**What**: `signUpSealedAction(payload)`: valida uuid do cliente, e-mail, nome, `authSecret` (43 caracteres base64url), material do cofre e `birthDateCt`; cria pendente via `createPendingSealed`.
**Where**: `src/actions/auth.ts`
**Depends on**: T19, T33
**Reuses**: `signupSchema` (nome/e-mail), `DUPLICATE_EMAIL`
**Requirement**: SIGILO-02, SIGILO-11, SIGILO-12, SIGILO-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cadastro grava usuário pendente, cofre e `birth_date_ct`; o hash guardado verifica o `authSecret`
- [x] E-mail repetido devolve `Este e-mail já está cadastrado`
- [x] `authSecret` com tamanho errado ou campo malformado devolve erro e não grava
- [x] Login com o `authSecret` pelo `signInAction` existente funciona após aprovação
- [x] ≥ 6 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ação de cadastro cifrado`

---

### T40: Ações de redefinição com cofre

**What**: `getResetVaultAction(token)` e `resetPasswordSealedAction(payload)` nos modos `rewrap` e `wipe`; mensagens `Link inválido ou expirado` e `SAVE_FAILED`.
**Where**: `src/actions/password-reset.ts`
**Depends on**: T39, T20, T33
**Reuses**: `INVALID_LINK_MESSAGE`, `invalidInput`
**Requirement**: SIGILO-19, SIGILO-20, SIGILO-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `getResetVaultAction` com token válido devolve só `dekWrappedRecovery`; inválido devolve erro
- [x] `rewrap` troca senha e mantém dados; `wipe` apaga dados e troca cofre
- [x] Payload malformado devolve erro e o token segue válido
- [x] ≥ 6 testes novos
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ações de redefinição com cofre`

---

### T41: Ação de exportação

**What**: `exportDataAction()` devolve `ExportPayload` cifrado só do usuário da sessão.
**Where**: `src/actions/account.ts`
**Depends on**: T40, T18, T33
**Reuses**: -
**Requirement**: SIGILO-37

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem sessão devolve `UNAUTHORIZED` sem linhas
- [x] Com dois usuários populados devolve só as linhas do usuário da sessão
- [x] Nada em texto puro no payload
- [x] ≥ 3 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ação de exportação`

---

### T42: Extrair o bloqueio de tentativas

**What**: Mover `lockedMinutes` e as constantes de bloqueio de `auth.ts` para um módulo comum, sem mudar comportamento.
**Where**: `src/lib/login-lock.ts`
**Depends on**: T41
**Reuses**: `loginAttemptsRepo`
**Requirement**: SIGILO-39

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `signInAction` usa o novo módulo e os testes existentes de bloqueio de `auth.int.test.ts` passam sem alteração
- [x] Módulo não está em arquivo `"use server"`
- [x] Nenhum teste removido nem enfraquecido
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): extrair o bloqueio de tentativas`

---

### T43: Ação de exclusão da conta

**What**: `deleteAccountAction(authSecret)`: respeita o bloqueio de tentativas, recusa o administrador, confere o `authSecret` com `verifyPassword`, remove o usuário e suas sessões.
**Where**: `src/actions/account.ts`
**Depends on**: T42, T41
**Reuses**: `usersRepo.remove`, `loginAttemptsRepo`, `ADMIN_TARGET`
**Requirement**: SIGILO-38, SIGILO-39, SIGILO-40

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Senha correta apaga o usuário e nenhuma linha dele resta em nenhuma tabela
- [x] Senha errada devolve `Senha incorreta`, registra falha e não apaga
- [x] Administrador devolve `Não é possível revogar ou excluir o administrador`
- [x] 5 falhas bloqueiam a próxima tentativa como no login
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ação de exclusão da conta`

---

### T44: Ações da migração de conta legada

**What**: `loadLegacyDataAction()` (devolve `LegacyPlain` só se a conta é legada) e `commitLegacyMigrationAction({oldPassword, authSecret, vault, pkg})`.
**Where**: `src/actions/legacy.ts`
**Depends on**: T43, T21, T22, T33
**Reuses**: -
**Requirement**: SIGILO-22, SIGILO-23, SIGILO-24

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Conta com cofre recebe erro em ambas e nada é lido ou gravado
- [x] Sucesso migra e a conta passa a logar com `authSecret`
- [x] Senha antiga errada devolve `Senha incorreta`; pacote incompleto devolve `SAVE_FAILED` com tudo intacto
- [x] Sem sessão devolve `UNAUTHORIZED`
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): ações da migração de conta legada`

---

### T45: Cabeçalhos e CSP

**What**: `securityHeaders(env)` e `buildCsp(nonce, isDev)` puros, com os valores exatos da spec.
**Where**: `src/lib/security-headers.ts`
**Depends on**: T44
**Reuses**: -
**Requirement**: SIGILO-27, SIGILO-28, SIGILO-29

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `X-Content-Type-Options`, `X-Frame-Options: DENY` e `Referrer-Policy` sempre presentes
- [x] `Strict-Transport-Security: max-age=63072000; includeSubDomains` só quando `NODE_ENV` é `production`
- [x] CSP contém `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` e `script-src 'self' 'nonce-…' 'strict-dynamic'` sem origem externa; `unsafe-eval` só em desenvolvimento; `style-src 'self' 'unsafe-inline'`
- [x] ≥ 6 testes
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sigilo): cabeçalhos e CSP`

---

### T46: Cabeçalhos estáticos e limite de corpo

**What**: `headers()` do `next.config.ts` aplicando `securityHeaders` a todas as rotas e `experimental.serverActions.bodySizeLimit: "8mb"` (conferir o nome da opção em `node_modules/next/dist/docs/`).
**Where**: `next.config.ts`
**Depends on**: T45
**Reuses**: `src/lib/security-headers.ts`
**Requirement**: SIGILO-23, SIGILO-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Opção de limite confirmada na documentação do Next instalado antes de escrever
- [x] `npm run build` passa
- [x] Headers vêm de `securityHeaders`, sem valores duplicados no arquivo
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): cabeçalhos estáticos e limite de corpo`

---

### T47: Nonce, CSP e cache no proxy

**What**: `src/proxy.ts` gera o nonce, define `Content-Security-Policy` e `x-nonce` em toda rota, aplica `Cache-Control: no-store` nas rotas protegidas e inclui `privacidade` entre as rotas públicas sem redirecionar para `/login`.
**Where**: `src/proxy.ts`
**Depends on**: T46, T45
**Reuses**: `getSessionCookie`, matcher atual
**Requirement**: SIGILO-28, SIGILO-29, SIGILO-30

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Rotas protegidas sem cookie seguem redirecionando para `/login`
- [x] `/privacidade`, `/login`, `/cadastro`, `/esqueci-senha` e `/redefinir-senha` não redirecionam
- [x] Resposta de rota protegida leva `Cache-Control: no-store` e CSP com o mesmo nonce de `x-nonce`
- [x] `npm run build` passa
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): nonce, CSP e cache no proxy`

---

### T47a: Nonce da CSP no layout raiz

**What**: `RootLayout` lê `x-nonce` via `headers()` (o que torna todas as páginas dinâmicas, requisito do nonce) e o aplica ao script inline do tema, mantendo o comportamento do tema.
**Where**: `src/app/layout.tsx`
**Depends on**: T47
**Reuses**: `x-nonce` definido em `src/proxy.ts`
**Requirement**: SIGILO-28

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Layout raiz dinâmico: `/login` deixa de ser pré-renderizada/cacheada estaticamente
- [x] Todos os `<script>` do HTML (tema e `<script src>` do Next) levam o mesmo nonce do header CSP
- [x] `/liberdade` sem cookie segue com 307 para `/login`; `/privacidade` não redireciona para `/login`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `fix(sigilo): nonce da CSP no layout raiz`

---

### Phase 7: Runtime do cofre na UI

### T48: Provedor do cofre

**What**: `VaultProvider` e `useVault()`: estados `loading|locked|ready|error`; consome a KEK pendente (via `getVaultAction`), carrega a DEK do dispositivo e expõe `{dek, userId}`; `locked` renderiza `UnlockScreen` no lugar dos filhos.
**Where**: `src/components/vault-provider.tsx`
**Depends on**: T28, T30, T34
**Reuses**: -
**Requirement**: SIGILO-13, SIGILO-16, SIGILO-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem DEK e sem KEK pendente os filhos não renderizam (inspeção de código com `file:line`)
- [x] KEK pendente é removida após uso, com sucesso ou falha
- [x] `useVault` fora do provedor lança erro claro
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): provedor do cofre`

---

### T49: Tela Desbloquear

**What**: `UnlockScreen`: pede a senha, busca o cofre, chama `unlockVault`, guarda a DEK e mostra `Senha incorreta` em erro.
**Where**: `src/components/unlock-screen.tsx`
**Depends on**: T48, T30
**Reuses**: `PasswordInput`, `Button`, `Logo`
**Requirement**: SIGILO-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Fluxo usa `getVaultAction` e `unlockVault`, sem enviar a senha ao servidor (inspeção)
- [x] Mensagem `Senha incorreta` em erro
- [x] Usa `PasswordInput` e o visual das telas públicas
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): tela Desbloquear`

---

### T50: Hook de leitura decifrada

**What**: `useOpened(open, deps)`: executa a função com a DEK, devolve `{data, error}` e mapeia qualquer falha para a mensagem `Não foi possível carregar seus dados. Tente novamente`.
**Where**: `src/components/use-opened.ts`
**Depends on**: T49, T48
**Reuses**: -
**Requirement**: SIGILO-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Em erro `data` é `null` e nenhum dado parcial é exposto
- [x] Cancela o resultado de efeito obsoleto ao trocar `deps`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): hook de leitura decifrada`

---

### T51: Diálogo da chave de recuperação

**What**: `RecoveryKeyDialog`: exibe a chave uma vez, oferece copiar e baixar, e só habilita `Continuar` após marcar `Guardei minha chave de recuperação`.
**Where**: `src/components/recovery-key-dialog.tsx`
**Depends on**: T50
**Reuses**: `Dialog`, `Checkbox`, `Button`
**Requirement**: SIGILO-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `Continuar` desabilitado até marcar a caixa
- [x] Texto da caixa exatamente `Guardei minha chave de recuperação`
- [x] Fechar sem confirmar não é possível
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): diálogo da chave de recuperação`

---

### T52: Botão Sair que limpa a chave

**What**: `SignOutButton`: remove a DEK do dispositivo antes de enviar `signOutAction`.
**Where**: `src/components/sign-out-button.tsx`
**Depends on**: T51, T28
**Reuses**: `signOutAction`, `Button`
**Requirement**: SIGILO-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `deviceKey.clear()` roda antes do envio do formulário
- [x] Mantém o visual do botão atual do layout
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): botão Sair que limpa a chave`

---

### Phase 8: Telas de conta

### T53: Login com derivação no navegador

**What**: Formulário deriva `authSecret` e KEK, guarda a KEK como pendente e envia `authSecret` no campo de senha ao `signInAction`; conta legada envia a senha como hoje; limpa a DEK do dispositivo ao abrir; link `Privacidade`.
**Where**: `src/app/login/login-form.tsx`
**Depends on**: T30, T28, T34
**Reuses**: `signInAction`, `PasswordInput`
**Requirement**: SIGILO-13, SIGILO-14, SIGILO-16, SIGILO-22, SIGILO-35

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Senha real nunca vai em `FormData` para conta com cofre (inspeção `file:line`)
- [ ] Erro exibe `E-mail ou senha inválidos`
- [ ] Indicador `Protegendo seus dados` durante a derivação; `@noble/hashes` por import dinâmico
- [ ] Link `Privacidade` para `/privacidade`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): login com derivação no navegador`

---

### T54: Cadastro com cofre

**What**: Formulário valida com `signupSchema`, gera `userId`, chama `createVaultMaterial`, envia `signUpSealedAction` e abre o `RecoveryKeyDialog` antes de concluir; link `Privacidade`.
**Where**: `src/app/cadastro/signup-form.tsx`
**Depends on**: T53, T29, T39, T51, T28
**Reuses**: `signupSchema`, `PasswordInput`
**Requirement**: SIGILO-11, SIGILO-18, SIGILO-35

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Payload enviado contém só os campos do SIGILO-11 (inspeção)
- [ ] Dialogo da chave aparece antes da mensagem de cadastro concluído
- [ ] Mensagens de validação atuais preservadas
- [ ] Link `Privacidade`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): cadastro com cofre`

---

### T55: Redefinição com chave de recuperação

**What**: Formulário pede nova senha e chave de recuperação, busca `getResetVaultAction`, roda `rewrapWithRecovery`, envia `resetPasswordSealedAction`; opção `Não tenho a chave de recuperação` exige digitar `APAGAR MEUS DADOS`, gera cofre novo e exibe a nova chave no diálogo.
**Where**: `src/app/redefinir-senha/reset-form.tsx`
**Depends on**: T54, T31, T40, T51, T29
**Reuses**: `resetPasswordSchema` (confirmação), `PasswordInput`
**Requirement**: SIGILO-19, SIGILO-20, SIGILO-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `Chave de recuperação inválida` aparece sem enviar nada ao servidor
- [ ] Botão do modo `wipe` só habilita com a frase exata
- [ ] Nova chave de recuperação exibida no modo `wipe`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): redefinição com chave de recuperação`

---

### T56: Página /proteger-dados

**What**: Página (servidor) que exige sessão e conta legada (senão redireciona para `/`) e renderiza o formulário de proteção.
**Where**: `src/app/proteger-dados/page.tsx`
**Depends on**: T55, T21
**Reuses**: `requireSessionForPage`, layout de `data-nascimento/page.tsx`
**Requirement**: SIGILO-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Conta com cofre é redirecionada para `/`
- [ ] Conta sem sessão vai para `/login`
- [ ] Fora do grupo `(app)` para não entrar em laço de redirecionamento
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): página /proteger-dados`

---

### T57: Formulário de proteção

**What**: `ProtectForm`: pede a senha atual, carrega `loadLegacyDataAction`, monta o pacote, exibe a chave de recuperação e envia `commitLegacyMigrationAction`; informa que, nesta única passagem, o servidor vê senha e dados.
**Where**: `src/app/proteger-dados/protect-form.tsx`
**Depends on**: T56, T32, T29, T44, T51, T28
**Reuses**: `PasswordInput`
**Requirement**: SIGILO-22, SIGILO-23, SIGILO-24

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Fluxo: senha → carregar → montar pacote → diálogo da chave → enviar (inspeção)
- [ ] Erro do servidor mostra a mensagem e mantém a conta legada
- [ ] Texto de aviso sobre a última passagem em texto puro
- [ ] Sucesso guarda a DEK no dispositivo e vai para `/`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): formulário de proteção`

---

### T58: Página /privacidade

**What**: Página pública estática com os dados guardados, o que está cifrado ou não, exportar e excluir, o que acontece na exclusão e as três frases exatas dos SIGILO-32 a 34, mais o aviso sobre a migração única das contas existentes.
**Where**: `src/app/privacidade/page.tsx`
**Depends on**: T57, T47
**Reuses**: `Logo`, layout das páginas públicas
**Requirement**: SIGILO-30, SIGILO-31, SIGILO-32, SIGILO-33, SIGILO-34

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] As três frases aparecem literalmente como na spec (inspeção `file:line`)
- [ ] Lista distingue cifrado (valores, descrições, nomes de categoria, percentuais, meta, data de nascimento) de não cifrado (e-mail, nome, datas e tipo das transações)
- [ ] Acessível sem sessão (rota pública no proxy)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): página /privacidade`

---

### Phase 9: Cutover: layout e visão geral

### T59: Layout da área logada com cofre

**What**: `(app)/layout.tsx`: redireciona conta legada para `/proteger-dados`, conta sem `birth_date_ct` para `/data-nascimento`, envolve `children` em `VaultProvider` e troca o botão Sair por `SignOutButton`.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T48, T52, T12, T21
**Reuses**: layout atual
**Requirement**: SIGILO-17, SIGILO-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ordem dos redirecionamentos sem laço (inspeção)
- [x] Nenhuma tela com dados renderiza fora do provedor
- [x] `SignOutButton` no lugar do formulário atual
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): layout da área logada com cofre`

---

### T60: Visão geral no cliente

**What**: `OverviewClient`: corpo atual de `(app)/page.tsx` como componente cliente que abre o `MonthPayload` com `useOpened`, calcula totais, resumo, ritmo, filtros e busca com o domínio existente e mostra esqueleto enquanto decifra.
**Where**: `src/components/overview-client.tsx`
**Depends on**: T59, T48, T50, T26, T25
**Reuses**: corpo de `src/app/(app)/page.tsx`, componentes de resumo/lista/gráficos
**Requirement**: SIGILO-06, SIGILO-07, SIGILO-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Usa `computeMonthTotals`, `buildMonthlySummary`, `buildSpendingPaceViews`, `filterTransactions` e `searchTransactions` sem reimplementar regras
- [x] Erro mostra `Não foi possível carregar seus dados. Tente novamente`
- [x] Props de `searchParams` recebidas como strings do servidor
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): visão geral no cliente`

---

### T61: Página da visão geral entrega linhas cifradas

**What**: `(app)/page.tsx` passa a buscar `listByMonthSealed`, `listForMonthSealed`, `countAll` e renderizar `OverviewClient` com o `MonthPayload`.
**Where**: `src/app/(app)/page.tsx`
**Depends on**: T60, T13, T15
**Reuses**: `parseMonth`, `monthRange`
**Requirement**: SIGILO-01, SIGILO-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhum valor em claro é lido ou calculado no servidor
- [x] `mes`, `categoria`, `subcategoria` e `busca` repassados ao cliente
- [x] `npm run build` passa
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): página da visão geral entrega linhas cifradas`

---

### T62: Formulário de transação cifra no navegador

**What**: `transaction-form.tsx` valida com as regras atuais, gera `newRowId` ao editar, sela com `sealTransaction` e chama `createTransactionSealed`/`updateTransactionSealed`.
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T61, T23, T35, T48
**Reuses**: `transactionSchema` (validação), `useVault`
**Requirement**: SIGILO-09, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Valor fora da faixa mostra a mensagem atual e nada é enviado (inspeção)
- [x] Edição envia `newRowId` e `insertedCt`
- [x] Nenhum campo em claro de valor ou descrição vai à action
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): formulário de transação cifra no navegador`

---

### Phase 10: Cutover: categorias, meta e nascimento

### T63: Alocação no cliente

**What**: `CategoriesClient`: abre categorias e a receita de referência do mês corrente e renderiza o `CategoryEditor`.
**Where**: `src/components/categories-client.tsx`
**Depends on**: T26, T48, T50, T25
**Reuses**: corpo de `categorias/page.tsx`, `referenceIncomeText`
**Requirement**: SIGILO-06, SIGILO-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Receita de referência vem de `computeMonthTotals` sobre as ocorrências do mês corrente
- [ ] Erro mostra a mensagem fixa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): alocação no cliente`

---

### T64: Página de alocação entrega linhas cifradas

**What**: `categorias/page.tsx` busca `listForMonthSealed` e `listByMonthSealed` do mês corrente e renderiza `CategoriesClient`.
**Where**: `src/app/(app)/categorias/page.tsx`
**Depends on**: T63, T13, T15
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem cálculo de valor no servidor
- [ ] `npm run build` passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): página de alocação entrega linhas cifradas`

---

### T65: Editor de categorias cifra no navegador

**What**: `category-editor.tsx` valida com `validateCategorySet` no cliente, sela com `sealCategorySet` e chama `saveCategoriesSealed`.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T64, T24, T36, T48
**Reuses**: `validateCategorySet`, mensagens atuais
**Requirement**: SIGILO-09, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Soma ≠ 100% e nomes duplicados mostram as mensagens atuais antes de qualquer envio (inspeção)
- [ ] Percentual inalterado não envia `percentChange`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): editor de categorias cifra no navegador`

---

### T66: Carregador da meta no cliente

**What**: `GoalLoader`: abre meta e data de nascimento com `useOpened` e renderiza `GoalExperience` com as props atuais.
**Where**: `src/components/goal-loader.tsx`
**Depends on**: T65, T26, T48, T50
**Reuses**: corpo de `liberdade/page.tsx`, `isoToBR`
**Requirement**: SIGILO-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Props de `GoalExperience` idênticas às de hoje
- [ ] Sem data de nascimento aberta, redireciona para `/data-nascimento`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): carregador da meta no cliente`

---

### T67: Página de liberdade entrega dados cifrados

**What**: `liberdade/page.tsx` busca `getSealed` e `getBirthDateSealed` e renderiza `GoalLoader`.
**Where**: `src/app/(app)/liberdade/page.tsx`
**Depends on**: T66, T17, T12
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem formatação de valor no servidor
- [ ] `npm run build` passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): página de liberdade entrega dados cifrados`

---

### T68: Formulário da meta cifra no navegador

**What**: `goal-form.tsx` valida com `goalSchema` e envia `saveGoalSealed` com `sealGoal`.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T67, T23, T37, T48
**Reuses**: `goalSchema`
**Requirement**: SIGILO-09, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Validação e mensagens atuais antes do envio
- [ ] Nenhum campo em claro enviado
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): formulário da meta cifra no navegador`

---

### T69: Estado vazio da meta cifra no navegador

**What**: `goal-empty-state.tsx` envia `saveGoalSealed` com `sealGoal`.
**Where**: `src/components/goal-empty-state.tsx`
**Depends on**: T68, T23, T37, T48
**Reuses**: -
**Requirement**: SIGILO-09, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Mesma validação e selagem do formulário principal
- [ ] Nenhum campo em claro enviado
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): estado vazio da meta cifra no navegador`

---

### T70: Página de data de nascimento no cofre

**What**: `data-nascimento/page.tsx` envolve o formulário em `VaultProvider`, sem ler texto puro.
**Where**: `src/app/data-nascimento/page.tsx`
**Depends on**: T69, T48, T21, T12
**Reuses**: página atual
**Requirement**: SIGILO-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Conta legada é redirecionada para `/proteger-dados`
- [ ] Sem leitura de `birth_date` em claro
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): página de data de nascimento no cofre`

---

### T71: Formulário de data de nascimento cifra no navegador

**What**: `birth-date-form.tsx` abre a data atual, valida com `parseBirthDate`, confere a regra da idade contra a meta aberta e envia `saveBirthDateSealed`.
**Where**: `src/app/data-nascimento/birth-date-form.tsx`
**Depends on**: T70, T23, T38, T26, T48
**Reuses**: `parseBirthDate`, `saveBirthDateAction` (regra)
**Requirement**: SIGILO-09, SIGILO-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Mensagem `A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (N)` preservada
- [ ] Primeira data redireciona para `/`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): formulário de data de nascimento cifra no navegador`

---

### Phase 11: Conta: exportar e excluir

### T72: Página de conta e privacidade

**What**: `(app)/conta/page.tsx` com resumo do que é cifrado, link para `/privacidade`, e os blocos de exportação e exclusão.
**Where**: `src/app/(app)/conta/page.tsx`
**Depends on**: T48
**Reuses**: -
**Requirement**: SIGILO-35, SIGILO-36, SIGILO-38

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Link para `/privacidade`
- [ ] Renderiza `ExportButton` e `DeleteAccountDialog`
- [ ] Rota protegida pelo layout
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): página de conta e privacidade`

---

### T73: Botão de exportação

**What**: `ExportButton`: chama `exportDataAction`, abre com `open*`, `buildExport` e baixa `orcamento-dados-AAAA-MM-DD.json`.
**Where**: `src/components/export-button.tsx`
**Depends on**: T72, T41, T27, T26, T48
**Reuses**: -
**Requirement**: SIGILO-36, SIGILO-37

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Download no navegador com o nome de `exportFileName`
- [ ] Erro mostra a mensagem fixa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): botão de exportação`

---

### T74: Diálogo de excluir conta

**What**: `DeleteAccountDialog`: pede a senha, deriva `authSecret` com o cofre do usuário, chama `deleteAccountAction`, limpa a DEK e vai para `/login`.
**Where**: `src/components/delete-account-dialog.tsx`
**Depends on**: T73, T43, T30, T28, T34
**Reuses**: `Dialog`, `PasswordInput`
**Requirement**: SIGILO-38, SIGILO-39, SIGILO-40

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `Senha incorreta` e a mensagem do administrador exibidas sem sair da tela
- [ ] Sucesso limpa a DEK do dispositivo antes do redirecionamento
- [ ] Senha real nunca enviada
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): diálogo de excluir conta`

---

### T75: Link Privacidade e conta no menu

**What**: `app-nav.tsx` ganha o item `Privacidade` apontando para `/conta`.
**Where**: `src/components/app-nav.tsx`
**Depends on**: T74, T72
**Reuses**: itens atuais de `app-nav.tsx`
**Requirement**: SIGILO-35

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Item visível no menu lateral e no topo mobile
- [ ] Estado ativo igual aos demais itens
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build
**Commit**: `feat(sigilo): link Privacidade e conta no menu`

---

### Phase 12: Remoção do legado nas ações

### T76: Remover ações antigas de transação

**What**: Remover `createTransaction` e `updateTransaction` de `transactions.ts` (mantém `deleteTransaction`) e os testes delas, já portados em `transactions-sealed`.
**Where**: `src/actions/transactions.ts`
**Depends on**: T35, T62
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum import das funções removidas
- [ ] Casos de `deleteTransaction` mantidos e verdes
- [ ] Contagem de testes: removidos = os portados na T `acttx` (sem perda de caso)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover ações antigas de transação`

---

### T77: Remover ação antiga de categorias

**What**: Apagar `src/actions/categories.ts` e `categories.int.test.ts`, portados em `categories-sealed`.
**Where**: `src/actions/categories.ts`
**Depends on**: T76, T36, T65
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum import restante de `@/actions/categories`
- [ ] Todos os casos do teste antigo têm equivalente em `categories-sealed`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover ação antiga de categorias`

---

### T78: Remover ação antiga de meta

**What**: Apagar `src/actions/goals.ts` e `goals.int.test.ts`.
**Where**: `src/actions/goals.ts`
**Depends on**: T77, T37, T68, T69
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum import restante de `@/actions/goals`
- [ ] Casos do teste antigo cobertos em `goals-sealed`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover ação antiga de meta`

---

### T79: Remover ação antiga de nascimento

**What**: Apagar `src/actions/profile.ts` e `profile.int.test.ts`.
**Where**: `src/actions/profile.ts`
**Depends on**: T78, T38, T71
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum import restante de `@/actions/profile`
- [ ] Regras de idade cobertas no cliente (T `birthform`) e gravação em `profile-sealed`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover ação antiga de nascimento`

---

### T80: Remover cadastro antigo e aplicar log

**What**: Remover `signUpAction` antigo, usar `lock` e `logActionError` em `auth.ts`, ajustando `auth.int.test.ts`.
**Where**: `src/actions/auth.ts`
**Depends on**: T79, T39, T54, T42, T33
**Reuses**: -
**Requirement**: SIGILO-01, SIGILO-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum `console.error` com objeto de erro em `auth.ts`
- [ ] Testes de login/bloqueio verdes e casos de cadastro portados para `signUpSealedAction`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover cadastro antigo e aplicar log`

---

### T81: Remover redefinição antiga

**What**: Remover `resetPasswordAction` antigo de `password-reset.ts`, usar `logActionError` e ajustar `password-reset.int.test.ts`.
**Where**: `src/actions/password-reset.ts`
**Depends on**: T80, T40, T55, T33
**Reuses**: -
**Requirement**: SIGILO-19, SIGILO-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Pedido de redefinição por e-mail segue igual e verde
- [ ] Casos da ação antiga cobertos pelas ações com cofre
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover redefinição antiga`

---

### T82: Log sanitizado nas ações de administração

**What**: Trocar `console.error` por `logActionError` em `admin-users.ts`.
**Where**: `src/actions/admin-users.ts`
**Depends on**: T81, T33
**Reuses**: -
**Requirement**: SIGILO-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum `console.error` com objeto de erro restante em `src/actions` (busca no repositório)
- [ ] `admin-users.int.test.ts` verde
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): log sanitizado nas ações de administração`

---

### Phase 13: Remoção do legado nos repositórios e finalização

### T83: Remover funções antigas de transações

**What**: Remover `create`, `update`, `updateFrom`, `listByMonth` e `monthTotals` de `transactionsRepo` e seus testes antigos.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T76, T61
**Reuses**: -
**Requirement**: SIGILO-01, SIGILO-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck prova que nada usa as funções removidas
- [ ] Todo caso de teste removido tem equivalente nas versões `Sealed`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover funções antigas de transações`

---

### T84: Remover funções antigas de categorias

**What**: Remover `list`, `listForMonth` e `replaceSet` de `categoriesRepo` e seus testes antigos.
**Where**: `src/lib/db/repos/categories.ts`
**Depends on**: T83, T77, T64
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck prova que nada usa as funções removidas
- [ ] Casos de `categories.int.test.ts` e `categories-summary.int.test.ts` com equivalente sealed
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover funções antigas de categorias`

---

### T85: Remover funções antigas de meta

**What**: Remover `get` e `upsert` de `goalsRepo` e seus testes antigos.
**Where**: `src/lib/db/repos/goals.ts`
**Depends on**: T84, T78, T67
**Reuses**: -
**Requirement**: SIGILO-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck prova que nada usa as funções removidas
- [ ] Casos de `goals.int.test.ts` com equivalente sealed
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover funções antigas de meta`

---

### T86: Remover funções antigas de usuários

**What**: Remover `createPending`, `getBirthDate` e `setBirthDate` de `usersRepo` e seus testes antigos.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: T85, T79, T80, T59
**Reuses**: -
**Requirement**: SIGILO-01, SIGILO-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck prova que nada usa as funções removidas
- [ ] `seedUser` e demais testes de `users.int.test.ts` seguem verdes
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover funções antigas de usuários`

---

### T87: Remover consumo antigo de redefinição

**What**: Remover `consume` de `passwordResetsRepo` e seus testes antigos.
**Where**: `src/lib/db/repos/password-resets.ts`
**Depends on**: T86, T81
**Reuses**: -
**Requirement**: SIGILO-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck prova que nada usa `consume`
- [ ] `issue` e `isValid` seguem cobertos
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `refactor(sigilo): remover consumo antigo de redefinição`

---

### T88: Script de finalização do legado

**What**: `scripts/finalize-vault.ts`: recusa e não altera nada se existir conta sem `user_vault`; senão, em uma transação, remove as colunas em texto puro, os `CHECK` de faixa e os índices únicos de nome, e torna `NOT NULL` as colunas `*_ct` obrigatórias; expõe `finalizeVault(tx)` e o script `db:finalize-vault` no `package.json`.
**Where**: `scripts/finalize-vault.ts`
**Depends on**: T87, T86, T22
**Reuses**: `scripts/seed-user.ts` (carregamento de env)
**Requirement**: SIGILO-14, SIGILO-25

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com uma conta legada, `finalizeVault` lança e o esquema permanece idêntico
- [ ] Sem contas legadas, remove as colunas (testado dentro de transação com rollback no fim, sem afetar outros testes)
- [ ] Documenta no cabeçalho do script o backup prévio obrigatório do operador
- [ ] ≥ 3 testes
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Contagem de testes conferida (sem remoções silenciosas)

**Tests**: integration
**Gate**: full
**Commit**: `feat(sigilo): script de finalização do legado`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 12 → Phase 13

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5 ------→ T6
          T1 ------→ T4
          T2 ------→ T5
          T1 ------→ T6
Phase 2:  T7 ------→ T8 ------→ T9 ------→ T10 ------→ T11 ------→ T12
          T7 ------→ T10
          T8 ------→ T10
Phase 3:  T13 ------→ T14 ------→ T15 ------→ T16 ------→ T17 ------→ T18 ------→ T19 ------→ T20 ------→ T21 ------→ T22
Phase 4:  T23 ------→ T24 ------→ T25 ------→ T26 ------→ T27 ------→ T28 ------→ T29 ------→ T30 ------→ T31 ------→ T32
          T23 ------→ T26
          T23 ------→ T29
          T23 ------→ T32
          T24 ------→ T32
Phase 5:  T33 ------→ T34 ------→ T35 ------→ T36 ------→ T37 ------→ T38
          T33 ------→ T35
          T33 ------→ T36
          T33 ------→ T37
          T33 ------→ T38
Phase 6:  T39 ------→ T40 ------→ T41 ------→ T42 ------→ T43 ------→ T44 ------→ T45 ------→ T46 ------→ T47
          T41 ------→ T43
          T45 ------→ T47
Phase 7:  T48 ------→ T49 ------→ T50 ------→ T51 ------→ T52
          T48 ------→ T50
Phase 8:  T53 ------→ T54 ------→ T55 ------→ T56 ------→ T57 ------→ T58
Phase 9:  T59 ------→ T60 ------→ T61 ------→ T62
Phase 10:  T63 ------→ T64 ------→ T65 ------→ T66 ------→ T67 ------→ T68 ------→ T69 ------→ T70 ------→ T71
Phase 11:  T72 ------→ T73 ------→ T74 ------→ T75
          T72 ------→ T75
Phase 12:  T76 ------→ T77 ------→ T78 ------→ T79 ------→ T80 ------→ T81 ------→ T82
Phase 13:  T83 ------→ T84 ------→ T85 ------→ T86 ------→ T87 ------→ T88
          T86 ------→ T88
```

Execution is strictly sequential - there is no intra-phase parallelism. Total: 88 tasks em 13 fases; packing em lotes de ~7 tasks de fases inteiras produz cerca de 13 lotes.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Codificar base64url | 1 arquivo (`src/lib/crypto/base64url.ts`) | ✅ Granular |
| T2: Cifrar e decifrar campo (AES-256-GCM) | 1 arquivo (`src/lib/crypto/aead.ts`) | ✅ Granular |
| T3: Codecs de campo | 1 arquivo (`src/lib/crypto/fields.ts`) | ✅ Granular |
| T4: Derivar segredo de login e KEK | 1 arquivo (`src/lib/crypto/kdf.ts`) | ✅ Granular |
| T5: Embrulhar e desembrulhar a DEK | 1 arquivo (`src/lib/crypto/wrap.ts`) | ✅ Granular |
| T6: Chave de recuperação | 1 arquivo (`src/lib/crypto/recovery.ts`) | ✅ Granular |
| T7: Tipos do cofre | 1 arquivo (`src/lib/vault/types.ts`) | ✅ Granular |
| T8: Colunas cifradas e tabela do cofre | 1 arquivo (`src/lib/db/schema.ts`) | ✅ Granular |
| T9: Validar texto cifrado | 1 arquivo (`src/lib/validation/ciphertext.ts`) | ✅ Granular |
| T10: Repositório do cofre: criar, ler, reembrulhar, apagar dados | 1 arquivo (`src/lib/db/repos/vault.ts`) | ✅ Granular |
| T11: Repositório do cofre: parâmetros do KDF com chamariz | 1 arquivo (`src/lib/db/repos/vault.ts`) | ✅ Granular |
| T12: Repositório do cofre: data de nascimento cifrada | 1 arquivo (`src/lib/db/repos/vault.ts`) | ✅ Granular |
| T13: Transações cifradas: criar e listar por mês | 1 arquivo (`src/lib/db/repos/transactions.ts`) | ✅ Granular |
| T14: Transações cifradas: editar a partir de um mês | 1 arquivo (`src/lib/db/repos/transactions.ts`) | ✅ Granular |
| T15: Categorias cifradas: leitura | 1 arquivo (`src/lib/db/repos/categories.ts`) | ✅ Granular |
| T16: Categorias cifradas: gravar o conjunto | 1 arquivo (`src/lib/db/repos/categories.ts`) | ✅ Granular |
| T17: Meta cifrada | 1 arquivo (`src/lib/db/repos/goals.ts`) | ✅ Granular |
| T18: Linhas cifradas para exportar | 1 arquivo (`src/lib/db/repos/export.ts`) | ✅ Granular |
| T19: Usuário: criar cadastro cifrado | 1 arquivo (`src/lib/db/repos/users.ts`) | ✅ Granular |
| T20: Redefinição: consumir token com cofre | 1 arquivo (`src/lib/db/repos/password-resets.ts`) | ✅ Granular |
| T21: Legado: detectar e ler texto puro | 1 arquivo (`src/lib/db/repos/legacy.ts`) | ✅ Granular |
| T22: Legado: confirmar migração | 1 arquivo (`src/lib/db/repos/legacy.ts`) | ✅ Granular |
| T23: Selar transação, meta e data de nascimento | 1 arquivo (`src/lib/vault/seal.ts`) | ✅ Granular |
| T24: Selar o conjunto de categorias | 1 arquivo (`src/lib/vault/seal-categories.ts`) | ✅ Granular |
| T25: Totais do mês no cliente | 1 arquivo (`src/lib/vault/month-totals.ts`) | ✅ Granular |
| T26: Abrir mês, meta e data de nascimento | 1 arquivo (`src/lib/vault/open.ts`) | ✅ Granular |
| T27: Montar o arquivo de exportação | 1 arquivo (`src/lib/vault/export.ts`) | ✅ Granular |
| T28: Guardar a chave no dispositivo | 1 arquivo (`src/lib/vault/device-key.ts`) | ✅ Granular |
| T29: Criar material do cofre | 1 arquivo (`src/lib/vault/create-vault.ts`) | ✅ Granular |
| T30: Desbloquear o cofre | 1 arquivo (`src/lib/vault/unlock-vault.ts`) | ✅ Granular |
| T31: Reembrulhar com a chave de recuperação | 1 arquivo (`src/lib/vault/recover-vault.ts`) | ✅ Granular |
| T32: Montar o pacote de migração | 1 arquivo (`src/lib/vault/legacy-package.ts`) | ✅ Granular |
| T33: Log sem dados | 1 arquivo (`src/lib/log.ts`) | ✅ Granular |
| T34: Ações do cofre | 1 arquivo (`src/actions/vault.ts`) | ✅ Granular |
| T35: Ações de transação cifradas | 1 arquivo (`src/actions/transactions-sealed.ts`) | ✅ Granular |
| T36: Ação de categorias cifradas | 1 arquivo (`src/actions/categories-sealed.ts`) | ✅ Granular |
| T37: Ação de meta cifrada | 1 arquivo (`src/actions/goals-sealed.ts`) | ✅ Granular |
| T38: Ação de data de nascimento cifrada | 1 arquivo (`src/actions/profile-sealed.ts`) | ✅ Granular |
| T39: Ação de cadastro cifrado | 1 arquivo (`src/actions/auth.ts`) | ✅ Granular |
| T40: Ações de redefinição com cofre | 1 arquivo (`src/actions/password-reset.ts`) | ✅ Granular |
| T41: Ação de exportação | 1 arquivo (`src/actions/account.ts`) | ✅ Granular |
| T42: Extrair o bloqueio de tentativas | 1 arquivo (`src/lib/login-lock.ts`) | ✅ Granular |
| T43: Ação de exclusão da conta | 1 arquivo (`src/actions/account.ts`) | ✅ Granular |
| T44: Ações da migração de conta legada | 1 arquivo (`src/actions/legacy.ts`) | ✅ Granular |
| T45: Cabeçalhos e CSP | 1 arquivo (`src/lib/security-headers.ts`) | ✅ Granular |
| T46: Cabeçalhos estáticos e limite de corpo | 1 arquivo (`next.config.ts`) | ✅ Granular |
| T47: Nonce, CSP e cache no proxy | 1 arquivo (`src/proxy.ts`) | ✅ Granular |
| T48: Provedor do cofre | 1 arquivo (`src/components/vault-provider.tsx`) | ✅ Granular |
| T49: Tela Desbloquear | 1 arquivo (`src/components/unlock-screen.tsx`) | ✅ Granular |
| T50: Hook de leitura decifrada | 1 arquivo (`src/components/use-opened.ts`) | ✅ Granular |
| T51: Diálogo da chave de recuperação | 1 arquivo (`src/components/recovery-key-dialog.tsx`) | ✅ Granular |
| T52: Botão Sair que limpa a chave | 1 arquivo (`src/components/sign-out-button.tsx`) | ✅ Granular |
| T53: Login com derivação no navegador | 1 arquivo (`src/app/login/login-form.tsx`) | ✅ Granular |
| T54: Cadastro com cofre | 1 arquivo (`src/app/cadastro/signup-form.tsx`) | ✅ Granular |
| T55: Redefinição com chave de recuperação | 1 arquivo (`src/app/redefinir-senha/reset-form.tsx`) | ✅ Granular |
| T56: Página /proteger-dados | 1 arquivo (`src/app/proteger-dados/page.tsx`) | ✅ Granular |
| T57: Formulário de proteção | 1 arquivo (`src/app/proteger-dados/protect-form.tsx`) | ✅ Granular |
| T58: Página /privacidade | 1 arquivo (`src/app/privacidade/page.tsx`) | ✅ Granular |
| T59: Layout da área logada com cofre | 1 arquivo (`src/app/(app)/layout.tsx`) | ✅ Granular |
| T60: Visão geral no cliente | 1 arquivo (`src/components/overview-client.tsx`) | ✅ Granular |
| T61: Página da visão geral entrega linhas cifradas | 1 arquivo (`src/app/(app)/page.tsx`) | ✅ Granular |
| T62: Formulário de transação cifra no navegador | 1 arquivo (`src/components/transaction-form.tsx`) | ✅ Granular |
| T63: Alocação no cliente | 1 arquivo (`src/components/categories-client.tsx`) | ✅ Granular |
| T64: Página de alocação entrega linhas cifradas | 1 arquivo (`src/app/(app)/categorias/page.tsx`) | ✅ Granular |
| T65: Editor de categorias cifra no navegador | 1 arquivo (`src/components/category-editor.tsx`) | ✅ Granular |
| T66: Carregador da meta no cliente | 1 arquivo (`src/components/goal-loader.tsx`) | ✅ Granular |
| T67: Página de liberdade entrega dados cifrados | 1 arquivo (`src/app/(app)/liberdade/page.tsx`) | ✅ Granular |
| T68: Formulário da meta cifra no navegador | 1 arquivo (`src/components/goal-form.tsx`) | ✅ Granular |
| T69: Estado vazio da meta cifra no navegador | 1 arquivo (`src/components/goal-empty-state.tsx`) | ✅ Granular |
| T70: Página de data de nascimento no cofre | 1 arquivo (`src/app/data-nascimento/page.tsx`) | ✅ Granular |
| T71: Formulário de data de nascimento cifra no navegador | 1 arquivo (`src/app/data-nascimento/birth-date-form.tsx`) | ✅ Granular |
| T72: Página de conta e privacidade | 1 arquivo (`src/app/(app)/conta/page.tsx`) | ✅ Granular |
| T73: Botão de exportação | 1 arquivo (`src/components/export-button.tsx`) | ✅ Granular |
| T74: Diálogo de excluir conta | 1 arquivo (`src/components/delete-account-dialog.tsx`) | ✅ Granular |
| T75: Link Privacidade e conta no menu | 1 arquivo (`src/components/app-nav.tsx`) | ✅ Granular |
| T76: Remover ações antigas de transação | 1 arquivo (`src/actions/transactions.ts`) | ✅ Granular |
| T77: Remover ação antiga de categorias | 1 arquivo (`src/actions/categories.ts`) | ✅ Granular |
| T78: Remover ação antiga de meta | 1 arquivo (`src/actions/goals.ts`) | ✅ Granular |
| T79: Remover ação antiga de nascimento | 1 arquivo (`src/actions/profile.ts`) | ✅ Granular |
| T80: Remover cadastro antigo e aplicar log | 1 arquivo (`src/actions/auth.ts`) | ✅ Granular |
| T81: Remover redefinição antiga | 1 arquivo (`src/actions/password-reset.ts`) | ✅ Granular |
| T82: Log sanitizado nas ações de administração | 1 arquivo (`src/actions/admin-users.ts`) | ✅ Granular |
| T83: Remover funções antigas de transações | 1 arquivo (`src/lib/db/repos/transactions.ts`) | ✅ Granular |
| T84: Remover funções antigas de categorias | 1 arquivo (`src/lib/db/repos/categories.ts`) | ✅ Granular |
| T85: Remover funções antigas de meta | 1 arquivo (`src/lib/db/repos/goals.ts`) | ✅ Granular |
| T86: Remover funções antigas de usuários | 1 arquivo (`src/lib/db/repos/users.ts`) | ✅ Granular |
| T87: Remover consumo antigo de redefinição | 1 arquivo (`src/lib/db/repos/password-resets.ts`) | ✅ Granular |
| T88: Script de finalização do legado | 1 arquivo (`scripts/finalize-vault.ts`) | ✅ Granular |

## Diagram-Definition Cross-Check

Dentro de cada fase o diagrama é a cadeia sequencial; toda dependência de fase anterior aparece só em `Depends on` (permitido: aponta para trás).

| Task | Depends On (task body) | Diagram Shows (within phase) | Status |
| ---- | ---------------------- | ---------------------------- | ------ |
| T1 | None | (início da fase) | ✅ Match |
| T2 | T1 | T1 | ✅ Match |
| T3 | T2 | T2 | ✅ Match |
| T4 | T3, T1 | T3, T1 | ✅ Match |
| T5 | T4, T2 | T4, T2 | ✅ Match |
| T6 | T5, T1 | T5, T1 | ✅ Match |
| T7 | None | (início da fase) | ✅ Match |
| T8 | T7 | T7 | ✅ Match |
| T9 | T8 | T8 | ✅ Match |
| T10 | T9, T7, T8 | T9, T7, T8 | ✅ Match |
| T11 | T10 | T10 | ✅ Match |
| T12 | T11 | T11 | ✅ Match |
| T13 | T8, T7 | (início da fase) | ✅ Match |
| T14 | T13 | T13 | ✅ Match |
| T15 | T14, T8, T7 | T14 | ✅ Match |
| T16 | T15 | T15 | ✅ Match |
| T17 | T16, T8, T7 | T16 | ✅ Match |
| T18 | T17, T8, T7 | T17 | ✅ Match |
| T19 | T18, T10 | T18 | ✅ Match |
| T20 | T19, T10 | T19 | ✅ Match |
| T21 | T20, T10 | T20 | ✅ Match |
| T22 | T21 | T21 | ✅ Match |
| T23 | T2, T3, T7 | (início da fase) | ✅ Match |
| T24 | T23 | T23 | ✅ Match |
| T25 | T24, T7 | T24 | ✅ Match |
| T26 | T25, T2, T3, T7, T23 | T25, T23 | ✅ Match |
| T27 | T26 | T26 | ✅ Match |
| T28 | T27 | T27 | ✅ Match |
| T29 | T28, T4, T5, T6, T23 | T28, T23 | ✅ Match |
| T30 | T29, T4, T5 | T29 | ✅ Match |
| T31 | T30, T6, T5, T4 | T30 | ✅ Match |
| T32 | T31, T23, T24, T7 | T31, T23, T24 | ✅ Match |
| T33 | None | (início da fase) | ✅ Match |
| T34 | T33, T10, T11 | T33 | ✅ Match |
| T35 | T34, T13, T14, T9, T33 | T34, T33 | ✅ Match |
| T36 | T35, T16, T9, T33 | T35, T33 | ✅ Match |
| T37 | T36, T17, T9, T33 | T36, T33 | ✅ Match |
| T38 | T37, T12, T9, T33 | T37, T33 | ✅ Match |
| T39 | T19, T33 | (início da fase) | ✅ Match |
| T40 | T39, T20, T33 | T39 | ✅ Match |
| T41 | T40, T18, T33 | T40 | ✅ Match |
| T42 | T41 | T41 | ✅ Match |
| T43 | T42, T41 | T42, T41 | ✅ Match |
| T44 | T43, T21, T22, T33 | T43 | ✅ Match |
| T45 | T44 | T44 | ✅ Match |
| T46 | T45 | T45 | ✅ Match |
| T47 | T46, T45 | T46, T45 | ✅ Match |
| T48 | T28, T30, T34 | (início da fase) | ✅ Match |
| T49 | T48, T30 | T48 | ✅ Match |
| T50 | T49, T48 | T49, T48 | ✅ Match |
| T51 | T50 | T50 | ✅ Match |
| T52 | T51, T28 | T51 | ✅ Match |
| T53 | T30, T28, T34 | (início da fase) | ✅ Match |
| T54 | T53, T29, T39, T51, T28 | T53 | ✅ Match |
| T55 | T54, T31, T40, T51, T29 | T54 | ✅ Match |
| T56 | T55, T21 | T55 | ✅ Match |
| T57 | T56, T32, T29, T44, T51, T28 | T56 | ✅ Match |
| T58 | T57, T47 | T57 | ✅ Match |
| T59 | T48, T52, T12, T21 | (início da fase) | ✅ Match |
| T60 | T59, T48, T50, T26, T25 | T59 | ✅ Match |
| T61 | T60, T13, T15 | T60 | ✅ Match |
| T62 | T61, T23, T35, T48 | T61 | ✅ Match |
| T63 | T26, T48, T50, T25 | (início da fase) | ✅ Match |
| T64 | T63, T13, T15 | T63 | ✅ Match |
| T65 | T64, T24, T36, T48 | T64 | ✅ Match |
| T66 | T65, T26, T48, T50 | T65 | ✅ Match |
| T67 | T66, T17, T12 | T66 | ✅ Match |
| T68 | T67, T23, T37, T48 | T67 | ✅ Match |
| T69 | T68, T23, T37, T48 | T68 | ✅ Match |
| T70 | T69, T48, T21, T12 | T69 | ✅ Match |
| T71 | T70, T23, T38, T26, T48 | T70 | ✅ Match |
| T72 | T48 | (início da fase) | ✅ Match |
| T73 | T72, T41, T27, T26, T48 | T72 | ✅ Match |
| T74 | T73, T43, T30, T28, T34 | T73 | ✅ Match |
| T75 | T74, T72 | T74, T72 | ✅ Match |
| T76 | T35, T62 | (início da fase) | ✅ Match |
| T77 | T76, T36, T65 | T76 | ✅ Match |
| T78 | T77, T37, T68, T69 | T77 | ✅ Match |
| T79 | T78, T38, T71 | T78 | ✅ Match |
| T80 | T79, T39, T54, T42, T33 | T79 | ✅ Match |
| T81 | T80, T40, T55, T33 | T80 | ✅ Match |
| T82 | T81, T33 | T81 | ✅ Match |
| T83 | T76, T61 | (início da fase) | ✅ Match |
| T84 | T83, T77, T64 | T83 | ✅ Match |
| T85 | T84, T78, T67 | T84 | ✅ Match |
| T86 | T85, T79, T80, T59 | T85 | ✅ Match |
| T87 | T86, T81 | T86 | ✅ Match |
| T88 | T87, T86, T22 | T87, T86 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Codificar base64url | Núcleo de cripto | unit | unit | ✅ OK |
| T2: Cifrar e decifrar campo (AES-256-GCM) | Núcleo de cripto | unit | unit | ✅ OK |
| T3: Codecs de campo | Núcleo de cripto | unit | unit | ✅ OK |
| T4: Derivar segredo de login e KEK | Núcleo de cripto | unit | unit | ✅ OK |
| T5: Embrulhar e desembrulhar a DEK | Núcleo de cripto | unit | unit | ✅ OK |
| T6: Chave de recuperação | Núcleo de cripto | unit | unit | ✅ OK |
| T7: Tipos do cofre | Schema e migração | none | none | ✅ OK |
| T8: Colunas cifradas e tabela do cofre | Schema e migração | none | none | ✅ OK |
| T9: Validar texto cifrado | Domínio e validação | unit | unit | ✅ OK |
| T10: Repositório do cofre: criar, ler, reembrulhar, apagar dados | Repositórios | integration | integration | ✅ OK |
| T11: Repositório do cofre: parâmetros do KDF com chamariz | Repositórios | integration | integration | ✅ OK |
| T12: Repositório do cofre: data de nascimento cifrada | Repositórios | integration | integration | ✅ OK |
| T13: Transações cifradas: criar e listar por mês | Repositórios | integration | integration | ✅ OK |
| T14: Transações cifradas: editar a partir de um mês | Repositórios | integration | integration | ✅ OK |
| T15: Categorias cifradas: leitura | Repositórios | integration | integration | ✅ OK |
| T16: Categorias cifradas: gravar o conjunto | Repositórios | integration | integration | ✅ OK |
| T17: Meta cifrada | Repositórios | integration | integration | ✅ OK |
| T18: Linhas cifradas para exportar | Repositórios | integration | integration | ✅ OK |
| T19: Usuário: criar cadastro cifrado | Repositórios | integration | integration | ✅ OK |
| T20: Redefinição: consumir token com cofre | Repositórios | integration | integration | ✅ OK |
| T21: Legado: detectar e ler texto puro | Repositórios | integration | integration | ✅ OK |
| T22: Legado: confirmar migração | Repositórios | integration | integration | ✅ OK |
| T23: Selar transação, meta e data de nascimento | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T24: Selar o conjunto de categorias | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T25: Totais do mês no cliente | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T26: Abrir mês, meta e data de nascimento | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T27: Montar o arquivo de exportação | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T28: Guardar a chave no dispositivo | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T29: Criar material do cofre | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T30: Desbloquear o cofre | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T31: Reembrulhar com a chave de recuperação | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T32: Montar o pacote de migração | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T33: Log sem dados | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T34: Ações do cofre | Server Actions | integration | integration | ✅ OK |
| T35: Ações de transação cifradas | Server Actions | integration | integration | ✅ OK |
| T36: Ação de categorias cifradas | Server Actions | integration | integration | ✅ OK |
| T37: Ação de meta cifrada | Server Actions | integration | integration | ✅ OK |
| T38: Ação de data de nascimento cifrada | Server Actions | integration | integration | ✅ OK |
| T39: Ação de cadastro cifrado | Server Actions | integration | integration | ✅ OK |
| T40: Ações de redefinição com cofre | Server Actions | integration | integration | ✅ OK |
| T41: Ação de exportação | Server Actions | integration | integration | ✅ OK |
| T42: Extrair o bloqueio de tentativas | Server Actions | integration | integration | ✅ OK |
| T43: Ação de exclusão da conta | Server Actions | integration | integration | ✅ OK |
| T44: Ações da migração de conta legada | Server Actions | integration | integration | ✅ OK |
| T45: Cabeçalhos e CSP | Núcleo de cripto e cofre no cliente | unit | unit | ✅ OK |
| T46: Cabeçalhos estáticos e limite de corpo | UI, páginas, config e proxy | none | none | ✅ OK |
| T47: Nonce, CSP e cache no proxy | UI, páginas, config e proxy | none | none | ✅ OK |
| T48: Provedor do cofre | UI, páginas, config e proxy | none | none | ✅ OK |
| T49: Tela Desbloquear | UI, páginas, config e proxy | none | none | ✅ OK |
| T50: Hook de leitura decifrada | UI, páginas, config e proxy | none | none | ✅ OK |
| T51: Diálogo da chave de recuperação | UI, páginas, config e proxy | none | none | ✅ OK |
| T52: Botão Sair que limpa a chave | UI, páginas, config e proxy | none | none | ✅ OK |
| T53: Login com derivação no navegador | UI, páginas, config e proxy | none | none | ✅ OK |
| T54: Cadastro com cofre | UI, páginas, config e proxy | none | none | ✅ OK |
| T55: Redefinição com chave de recuperação | UI, páginas, config e proxy | none | none | ✅ OK |
| T56: Página /proteger-dados | UI, páginas, config e proxy | none | none | ✅ OK |
| T57: Formulário de proteção | UI, páginas, config e proxy | none | none | ✅ OK |
| T58: Página /privacidade | UI, páginas, config e proxy | none | none | ✅ OK |
| T59: Layout da área logada com cofre | UI, páginas, config e proxy | none | none | ✅ OK |
| T60: Visão geral no cliente | UI, páginas, config e proxy | none | none | ✅ OK |
| T61: Página da visão geral entrega linhas cifradas | UI, páginas, config e proxy | none | none | ✅ OK |
| T62: Formulário de transação cifra no navegador | UI, páginas, config e proxy | none | none | ✅ OK |
| T63: Alocação no cliente | UI, páginas, config e proxy | none | none | ✅ OK |
| T64: Página de alocação entrega linhas cifradas | UI, páginas, config e proxy | none | none | ✅ OK |
| T65: Editor de categorias cifra no navegador | UI, páginas, config e proxy | none | none | ✅ OK |
| T66: Carregador da meta no cliente | UI, páginas, config e proxy | none | none | ✅ OK |
| T67: Página de liberdade entrega dados cifrados | UI, páginas, config e proxy | none | none | ✅ OK |
| T68: Formulário da meta cifra no navegador | UI, páginas, config e proxy | none | none | ✅ OK |
| T69: Estado vazio da meta cifra no navegador | UI, páginas, config e proxy | none | none | ✅ OK |
| T70: Página de data de nascimento no cofre | UI, páginas, config e proxy | none | none | ✅ OK |
| T71: Formulário de data de nascimento cifra no navegador | UI, páginas, config e proxy | none | none | ✅ OK |
| T72: Página de conta e privacidade | UI, páginas, config e proxy | none | none | ✅ OK |
| T73: Botão de exportação | UI, páginas, config e proxy | none | none | ✅ OK |
| T74: Diálogo de excluir conta | UI, páginas, config e proxy | none | none | ✅ OK |
| T75: Link Privacidade e conta no menu | UI, páginas, config e proxy | none | none | ✅ OK |
| T76: Remover ações antigas de transação | Server Actions | integration | integration | ✅ OK |
| T77: Remover ação antiga de categorias | Server Actions | integration | integration | ✅ OK |
| T78: Remover ação antiga de meta | Server Actions | integration | integration | ✅ OK |
| T79: Remover ação antiga de nascimento | Server Actions | integration | integration | ✅ OK |
| T80: Remover cadastro antigo e aplicar log | Server Actions | integration | integration | ✅ OK |
| T81: Remover redefinição antiga | Server Actions | integration | integration | ✅ OK |
| T82: Log sanitizado nas ações de administração | Server Actions | integration | integration | ✅ OK |
| T83: Remover funções antigas de transações | Repositórios | integration | integration | ✅ OK |
| T84: Remover funções antigas de categorias | Repositórios | integration | integration | ✅ OK |
| T85: Remover funções antigas de meta | Repositórios | integration | integration | ✅ OK |
| T86: Remover funções antigas de usuários | Repositórios | integration | integration | ✅ OK |
| T87: Remover consumo antigo de redefinição | Repositórios | integration | integration | ✅ OK |
| T88: Script de finalização do legado | Scripts do operador | integration | integration | ✅ OK |
