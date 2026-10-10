# Importar dados Specification

## Problem Statement

A página `/conta` exporta os dados do usuário em `orcamento-dados-AAAA-MM-DD.json` (SIGILO-36), mas não há caminho de volta: quem quer levar seus dados para outra conta precisa digitar tudo de novo. A feature adiciona "Importar dados" em `/conta`, que lê esse mesmo arquivo no navegador, valida, recifra com a chave da conta de destino e grava tudo de uma vez. O servidor continua recebendo só texto cifrado (AD-011).

## Goals

- [ ] Um arquivo gerado pela exportação, importado em uma conta vazia, reproduz transações (inclusive séries recorrentes), categorias, subcategorias, percentuais por vigência e meta, com o mesmo resumo mensal da conta de origem.
- [ ] A importação é tudo ou nada: arquivo inválido ou falha na gravação deixa a conta de destino exatamente como estava.
- [ ] Nenhum dado em claro do arquivo chega ao servidor: só `v1:<base64url>` e a estrutura em claro já aceita (datas, tipo, ids, recorrência).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Importar em conta que já tem transações ou categorias (mesclar ou substituir) | Decisão do usuário: só conta vazia; evita duplicar dados e conflito de nomes de categoria |
| Importar CSV, planilhas ou arquivos de outros apps | O formato aceito é só o JSON da exportação do app |
| Sobrescrever meta ou data de nascimento já existentes na conta | Decisão do usuário: a conta de destino prevalece |
| Importar no cadastro ou no onboarding da conta nova | Decisão do usuário: só em `/conta` |
| Importar contas legadas (sem cofre) | Contas legadas são redirecionadas a `/proteger-dados` antes de qualquer página do app (AD-012) |
| Mudar o formato do arquivo de exportação | A importação lê o formato atual sem alterá-lo |
| Desfazer uma importação | Sem versão anterior a restaurar; a conta de destino estava vazia |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Conta "vazia" | Zero linhas em `transaction` e zero em `category` (inclusive categorias excluídas logicamente); meta e data de nascimento não contam | Subcategorias e percentuais dependem de categoria; conta nova não tem categorias semeadas | y |
| Meta e data de nascimento do arquivo | Meta entra só se a conta não tem meta; data de nascimento entra só se a conta não tem | Decisão do usuário: manter os da conta | y |
| Ids do arquivo | Todos os ids (transação, categoria, subcategoria, série) são trocados por UUIDs novos gerados no navegador, com as referências remapeadas | O AAD da cifra liga cada campo ao `userId` e ao id da linha, e reusar o id colidiria com a chave primária se a conta de origem ainda existir | n |
| Meta incompatível com a data de nascimento da conta de destino | A meta não é importada e o resultado informa; o restante é importado | A regra `birthDateGoalConflict` é por conta; um conflito não deve barrar transações válidas | n |
| Tamanho máximo do arquivo | 20 MB | Cobre com folga 15.000 transações em JSON indentado (cerca de 5 MB) | n |
| Limites de quantidade | 15.000 transações, 1.000 categorias, 100 vigências por categoria, 30 subcategorias por categoria, e o corpo cifrado da requisição com no máximo 7.000.000 de caracteres | O limite de corpo de Server Action é 8 MB (`next.config.ts`); 15.000 transações cifradas ficam em torno de 6 MB. 30 subcategorias é `MAX_SUBCATEGORIES` da gravação normal. Fatiar em várias requisições quebraria o tudo ou nada | n |
| Soma dos percentuais | Não é validada na importação | O estado exportado é autoritativo: categorias excluídas ou vigências antigas podem fazer o conjunto atual não somar 100%, e recusar um arquivo legítimo seria pior | n |
| Validação do conteúdo | Cada campo segue as regras de gravação normal: valor 1 a 99.999.999.999 centavos, descrição até 120 caracteres, nome até 40, cor 1 a 8, percentual 1 a 100.000.000 micro, datas de calendário válidas | Importar não pode criar linha que a UI não criaria | n |
| Nomes de categoria ativa duplicados no arquivo (sem diferenciar maiúsculas) | Arquivo inválido | Regra de unicidade do app; um arquivo exportado nunca tem isso | n |
| Importar duas vezes | A segunda tentativa é recusada porque a conta deixou de estar vazia | Consequência do modo "só conta vazia" | y |
| Confirmação antes de gravar | Resumo com contagens e botão "Importar" explícito; sem digitar senha | A conta está vazia, então não há dado a perder; a DEK já está na sessão do cofre | n |
| Observabilidade | Falhas de servidor registradas com `logActionError`, sem conteúdo do arquivo | Padrão das actions existentes | n |
| Limite de tentativas (rate limit) | N/A because a ação exige sessão aprovada e só grava em conta vazia, uma vez | Sem superfície de abuso nova | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Importar o arquivo exportado em uma conta vazia ⭐ MVP

**User Story**: As a usuário com uma conta nova, I want importar o arquivo que exportei de outra conta so that eu não precise digitar meus dados de novo.

**Why P1**: É a feature inteira; sem ela o arquivo exportado só serve de backup ilegível pelo app.

**Acceptance Criteria**:

1. The página `/conta` SHALL exibir um cartão "Importar dados" com seletor de arquivo `.json`, ao lado do cartão "Exportar meus dados". <!-- IMPORT-01, ubiquitous -->
2. WHEN o usuário escolhe um arquivo válido THEN o navegador SHALL exibir o resumo "N transações, N categorias, N subcategorias" e o botão "Importar", sem enviar nada ao servidor. <!-- IMPORT-02, event-driven -->
3. WHEN o usuário aciona "Importar" em conta vazia THEN o navegador SHALL cifrar cada campo com a DEK da conta e o `userId` da sessão e SHALL enviar ao servidor somente texto cifrado mais a estrutura em claro (datas, tipo, ids novos, recorrência, cor, flag de investimento, mês de vigência). <!-- IMPORT-03, event-driven -->
4. WHEN a gravação conclui THEN o sistema SHALL ter criado todas as transações, categorias, subcategorias, vigências de percentual e, quando aplicável, a meta, em uma única transação de banco, e SHALL exibir "Importação concluída: N transações, N categorias". <!-- IMPORT-04, event-driven -->
5. The importação SHALL preservar `kind`, `date`, `amountCents`, `description`, `recurring`, `recurrenceDay`, `recurrenceEnd`, `color`, `isInvestment`, `deletedFrom`, cada `fromMonth` com seu `percentMicro` e os nomes de categoria e subcategoria exatamente como no arquivo. <!-- IMPORT-05, ubiquitous -->
6. The importação SHALL trocar todos os ids por UUIDs novos e SHALL remapear `categoryId`, `subcategoryId` e `seriesId` de modo que os segmentos de uma mesma série continuem compartilhando um único `seriesId` e cada transação aponte para a categoria e a subcategoria equivalentes. <!-- IMPORT-06, ubiquitous -->
7. WHEN a importação conclui THEN o sistema SHALL mostrar, na visão do mês, o mesmo total de ganhos, de gastos e as mesmas metas por categoria que a conta de origem mostrava para o mesmo mês. <!-- IMPORT-07, event-driven -->

**Independent Test**: Exportar de uma conta populada, criar conta nova, importar o arquivo em `/conta` e comparar o resumo de um mês e a lista de transações com os da origem.

---

### P1: Recusar arquivo inválido sem alterar a conta

**User Story**: As a usuário, I want que um arquivo errado ou adulterado seja recusado por inteiro so that minha conta não fique com dados pela metade.

**Why P1**: Sem validação, a importação criaria linhas que a UI não consegue editar nem excluir.

**Acceptance Criteria**:

1. IF o arquivo escolhido excede 20 MB THEN o sistema SHALL recusá-lo no navegador com a mensagem "Arquivo muito grande (máximo 20 MB)" e SHALL NOT enviar nada ao servidor. <!-- IMPORT-08, unwanted-behavior -->
2. IF o arquivo não é JSON válido, ou lhe falta qualquer uma das chaves `transactions`, `categories`, `goal`, `birthDate`, ou uma chave tem tipo errado THEN o sistema SHALL exibir "Arquivo inválido. Use o arquivo exportado pelo Orçamento." e SHALL NOT habilitar o botão "Importar". <!-- IMPORT-09, unwanted-behavior -->
3. IF alguma transação, categoria, subcategoria, vigência ou a meta viola uma regra de validação da Assumption "Validação do conteúdo" THEN o sistema SHALL exibir "Arquivo inválido. Use o arquivo exportado pelo Orçamento." e SHALL NOT habilitar o botão "Importar". <!-- IMPORT-10, unwanted-behavior -->
4. IF uma transação de gasto referencia categoria ou subcategoria ausente do arquivo, ou uma subcategoria que não pertence à categoria da transação, ou um ganho traz categoria ou subcategoria THEN o sistema SHALL exibir "Arquivo inválido. Use o arquivo exportado pelo Orçamento.". <!-- IMPORT-11, unwanted-behavior -->
5. IF o arquivo tem duas categorias ativas (`deletedFrom` nulo) com o mesmo nome, sem diferenciar maiúsculas, ou duas subcategorias de mesmo nome na mesma categoria THEN o sistema SHALL exibir "Arquivo inválido. Use o arquivo exportado pelo Orçamento.". <!-- IMPORT-12, unwanted-behavior -->
6. IF o arquivo excede 15.000 transações, 1.000 categorias, 100 vigências por categoria ou 30 subcategorias por categoria, ou o corpo cifrado passa de 7.000.000 de caracteres THEN o sistema SHALL exibir "Arquivo inválido. Use o arquivo exportado pelo Orçamento.". <!-- IMPORT-13, unwanted-behavior -->
7. IF a gravação falha no servidor THEN o sistema SHALL desfazer tudo, SHALL manter a conta como estava e SHALL exibir "Não foi possível salvar. Tente novamente". <!-- IMPORT-14, unwanted-behavior -->

**Independent Test**: Importar um arquivo com uma transação de valor 0 e conferir a mensagem, o botão desabilitado e zero linhas novas no banco.

---

### P1: Só importar em conta vazia

**User Story**: As a usuário, I want que a importação nunca misture nem apague o que já tenho so that eu não perca nem duplique dados.

**Why P1**: É a regra de segurança escolhida no lugar de mesclar ou substituir.

**Acceptance Criteria**:

1. IF a conta tem ao menos uma transação ou uma categoria (ativa ou excluída) THEN o servidor SHALL recusar a importação com "Só é possível importar em uma conta sem transações nem categorias" e SHALL NOT gravar nada. <!-- IMPORT-15, unwanted-behavior -->
2. The servidor SHALL conferir que a conta está vazia dentro da mesma transação de banco que grava a importação. <!-- IMPORT-16, ubiquitous -->
3. WHEN duas importações da mesma conta chegam ao mesmo tempo THEN o servidor SHALL gravar no máximo uma e SHALL recusar a outra com a mensagem do IMPORT-15. <!-- IMPORT-17, event-driven -->
4. WHEN a página `/conta` carrega para uma conta com dados THEN o cartão "Importar dados" SHALL exibir "Disponível apenas em conta sem transações nem categorias" e SHALL NOT oferecer o seletor de arquivo. <!-- IMPORT-18, event-driven -->
5. The servidor SHALL aceitar a importação somente de sessão aprovada e SHALL gravar apenas linhas com o `userId` da sessão. <!-- IMPORT-19, ubiquitous -->

**Independent Test**: Importar o mesmo arquivo duas vezes na mesma conta; a segunda é recusada e a contagem de linhas não muda.

---

### P2: Meta e data de nascimento

**User Story**: As a usuário, I want que minha meta de liberdade venha junto so that eu não precise refazer a simulação.

**Why P2**: Completa os dados da exportação, mas as transações já entregam o valor central.

**Acceptance Criteria**:

1. WHEN o arquivo traz `goal` e a conta não tem meta, e a meta não conflita com a data de nascimento da conta THEN o sistema SHALL importar a meta cifrada. <!-- IMPORT-20, event-driven -->
2. IF a conta já tem meta THEN o sistema SHALL manter a meta existente e SHALL NOT sobrescrevê-la. <!-- IMPORT-21, unwanted-behavior -->
3. IF a meta do arquivo conflita com a data de nascimento da conta de destino (`birthDateGoalConflict`) THEN o sistema SHALL importar o restante, SHALL NOT importar a meta e SHALL exibir "Meta não importada: a idade de aposentadoria é incompatível com a data de nascimento da conta". <!-- IMPORT-22, unwanted-behavior -->
4. WHEN o arquivo traz `birthDate` e a conta não tem data de nascimento THEN o sistema SHALL importar a data cifrada. <!-- IMPORT-23, event-driven -->
5. IF a conta já tem data de nascimento THEN o sistema SHALL mantê-la e SHALL NOT sobrescrevê-la. <!-- IMPORT-24, unwanted-behavior -->

**Independent Test**: Importar em conta nova com data de nascimento diferente da do arquivo; a data da conta permanece e a meta entra.

---

### P2: Sem vazamento e sem regressão da exportação

**User Story**: As a usuário preocupado com sigilo, I want que importar não exponha meus dados so that a promessa da política de privacidade continue valendo.

**Why P2**: A promessa central do app é o servidor nunca ver dados em claro (SIGILO-26).

**Acceptance Criteria**:

1. The requisição de importação SHALL NOT conter valor, descrição, nome de categoria ou de subcategoria, meta nem data de nascimento em claro. <!-- IMPORT-25, ubiquitous -->
2. IF algum campo falha ao ser cifrado no navegador THEN o sistema SHALL abortar antes de qualquer requisição e SHALL exibir "Não foi possível salvar. Tente novamente". <!-- IMPORT-26, unwanted-behavior -->
3. WHEN um arquivo gerado pela exportação é importado e a conta de destino é exportada em seguida THEN o JSON SHALL ter as mesmas listas e valores do arquivo original, exceto ids e a ordem de ids. <!-- IMPORT-27, event-driven -->
4. WHILE a importação roda, o botão "Importar" SHALL permanecer desabilitado e exibir "Importando...". <!-- IMPORT-28, state-driven -->

**Independent Test**: Round-trip export → import → export e comparar o conteúdo sem ids; inspecionar o corpo da requisição.

---

## Edge Cases

- WHEN o arquivo exportado de conta sem dados (listas vazias) é importado THEN o sistema SHALL concluir sem criar linhas e SHALL exibir "Importação concluída: 0 transações, 0 categorias". <!-- IMPORT-29 -->
- WHEN o arquivo tem categoria excluída (`deletedFrom` preenchido) com transações antigas THEN o sistema SHALL importá-la excluída, com as mesmas transações e vigências. <!-- IMPORT-30 -->
- WHEN o arquivo tem duas categorias de mesmo nome, uma excluída e uma ativa THEN o sistema SHALL aceitá-las. <!-- IMPORT-31 -->
- WHEN uma série recorrente tem vários segmentos no arquivo THEN o sistema SHALL importar todos com o mesmo `seriesId` novo e as datas, `recurrenceDay` e `recurrenceEnd` originais. <!-- IMPORT-32 -->
- IF o usuário escolhe um segundo arquivo antes de importar THEN o sistema SHALL descartar o primeiro e refazer a validação e o resumo. <!-- IMPORT-33 -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| IMPORT-01 | P1: Importar em conta vazia | - | Pending |
| IMPORT-02 | P1: Importar em conta vazia | - | Pending |
| IMPORT-03 | P1: Importar em conta vazia | - | Pending |
| IMPORT-04 | P1: Importar em conta vazia | - | Pending |
| IMPORT-05 | P1: Importar em conta vazia | - | Pending |
| IMPORT-06 | P1: Importar em conta vazia | - | Pending |
| IMPORT-07 | P1: Importar em conta vazia | - | Pending |
| IMPORT-08 | P1: Recusar arquivo inválido | - | Pending |
| IMPORT-09 | P1: Recusar arquivo inválido | - | Pending |
| IMPORT-10 | P1: Recusar arquivo inválido | - | Pending |
| IMPORT-11 | P1: Recusar arquivo inválido | - | Pending |
| IMPORT-12 | P1: Recusar arquivo inválido | - | Pending |
| IMPORT-13 | P1: Recusar arquivo inválido | - | Pending |
| IMPORT-14 | P1: Recusar arquivo inválido | - | Pending |
| IMPORT-15 | P1: Só importar em conta vazia | - | Pending |
| IMPORT-16 | P1: Só importar em conta vazia | - | Pending |
| IMPORT-17 | P1: Só importar em conta vazia | - | Pending |
| IMPORT-18 | P1: Só importar em conta vazia | - | Pending |
| IMPORT-19 | P1: Só importar em conta vazia | - | Pending |
| IMPORT-20 | P2: Meta e data de nascimento | - | Pending |
| IMPORT-21 | P2: Meta e data de nascimento | - | Pending |
| IMPORT-22 | P2: Meta e data de nascimento | - | Pending |
| IMPORT-23 | P2: Meta e data de nascimento | - | Pending |
| IMPORT-24 | P2: Meta e data de nascimento | - | Pending |
| IMPORT-25 | P2: Sem vazamento e round-trip | - | Pending |
| IMPORT-26 | P2: Sem vazamento e round-trip | - | Pending |
| IMPORT-27 | P2: Sem vazamento e round-trip | - | Pending |
| IMPORT-28 | P2: Sem vazamento e round-trip | - | Pending |
| IMPORT-29 | Edge cases | - | Pending |
| IMPORT-30 | Edge cases | - | Pending |
| IMPORT-31 | Edge cases | - | Pending |
| IMPORT-32 | Edge cases | - | Pending |
| IMPORT-33 | Edge cases | - | Pending |

**ID format:** `IMPORT-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 33 total, 0 mapped to tasks, 33 unmapped ⚠️

---

## Success Criteria

- [ ] Round-trip: exportar a conta A, importar em conta B vazia e exportar B produz as mesmas listas e valores de A, sem contar ids.
- [ ] O resumo do mês da conta B é igual ao da conta A para todos os meses com transações.
- [ ] Um `SELECT *` nas tabelas da conta B depois da importação não devolve valor, nome, meta nem data de nascimento legíveis.
- [ ] Qualquer arquivo recusado deixa zero linhas novas na conta de destino.
