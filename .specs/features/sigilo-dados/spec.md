# Sigilo dos Dados Specification

## Problem Statement

Todos os dados financeiros e pessoais do app ficam em texto puro no Postgres, e o administrador, que opera o servidor, os lê. Conhecidos do dono do app recusam usá-lo por esse receio. Esta feature (SIGILO-01 a SIGILO-40) passa a cifrar esses campos no navegador do usuário (AES-256-GCM), com uma chave de dados protegida pela senha do usuário e por uma chave de recuperação, de modo que o servidor, o banco, os backups e o administrador só enxergam texto cifrado. Inclui senha única (login e cifra derivados dela no navegador), migração das contas existentes, política de privacidade pública, exportação e exclusão da conta pelo usuário.

## Goals

- [ ] Nenhum valor, descrição, nome de categoria/subcategoria, percentual, dado de meta ou data de nascimento chega ao servidor ou fica no banco em texto puro; uma leitura direta de toda coluna dessas tabelas não devolve nenhum dado do usuário legível.
- [ ] O servidor nunca recebe a senha do usuário, a chave de dados, a chave de recuperação nem texto puro dos campos cifrados.
- [ ] O usuário continua entrando com e-mail e senha, sem segunda credencial, e vê os mesmos totais, resumo, busca, filtros e meta de antes.
- [ ] Esquecer a senha não perde dados para quem guardou a chave de recuperação.
- [ ] As contas existentes passam ao novo modelo sem perda de dados.
- [ ] Um visitante lê, sem login, o que o app guarda, o que está cifrado e os limites da garantia.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Impedir que o operador do servidor publique código malicioso que capture a senha no navegador | Nenhum app web garante isso; a política de privacidade declara o limite (SIGILO-34) |
| OPAQUE / aPAKE (nem a senha derivada vai ao servidor) | Exige trocar o login do Better Auth por protocolo próprio; fica como evolução |
| Passkey com WebAuthn PRF como fonte da chave | Suporte irregular entre dispositivos; fica como evolução |
| Cifrar `user.email`, `user.name`, tokens de sessão | O login consulta por e-mail; sem eles o app não autentica |
| Cifrar `date`, `kind`, ids, `recurring`, `recurrence_day`, `recurrence_end`, `series_id`, `created_at`, `updated_at`, `deleted_from`, `from_month`, `is_investment`, `color` | Estrutura que as consultas por mês (AD-004) e a vigência (AD-007) leem no SQL; o administrador vê datas, tipo (receita/despesa) e agrupamento, mas nenhum valor nem rótulo. Ver Assumptions |
| Trocar a senha dentro do app (logado) | Hoje não existe; a troca ocorre pelo fluxo de redefinição |
| Cifrar `session.ip_address`, `session.user_agent`, `login_attempt.email` | Não são dados financeiros |
| Apagar cópias antigas em texto puro de backups e do histórico do provedor (Neon) | Fora do controle do app; a política declara a limitação |
| Autenticação em dois fatores, bloqueio de conta, alertas de login | Pedido é sigilo dos dados armazenados |
| Testes e2e novos | Suspensos pela AD-005; unit e integration continuam obrigatórios |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Modelo de ameaça | Zero-knowledge no sentido de que o servidor, o banco, os backups e o administrador sem alterar o código não obtêm os dados; não cobre operador que publique código malicioso | Escolha do usuário ("nem o admin"); limite inerente a apps web | y |
| Fonte da chave | Senha única: do mesmo texto digitado, o navegador deriva (Argon2id, depois HKDF com rótulos distintos) um *segredo de login* e uma *chave de cifra* (KEK); só o segredo de login vai ao servidor | Escolha do usuário (usabilidade sem segunda credencial) | y |
| Parâmetros do KDF | Argon2id com salt aleatório de 16 bytes por usuário, memória 64 MiB, 3 iterações, paralelismo 1; parâmetros guardados por usuário e versionados; a biblioteca é decisão do Design | Custo alto contra força bruta offline com o hash vazado | n |
| Chave de dados (DEK) | 256 bits aleatórios gerados no navegador; guardada no servidor embrulhada (AES-GCM) pela KEK e, separadamente, pela chave de recuperação; trocar a senha só reembrulha | Troca de senha sem recifrar dados | n |
| Chave de recuperação | 128 bits aleatórios, exibidos uma vez em grupos de 4 caracteres, com confirmação "Guardei minha chave de recuperação"; o servidor guarda só a DEK embrulhada por ela | Escolha do usuário | y |
| Segredo de login no Better Auth | O segredo derivado é enviado no campo de senha do Better Auth, que o guarda com seu hash scrypt; o servidor nunca vê a senha real | Mantém o Better Auth, a sessão e o AD-009 | n |
| Enumeração de contas | O endpoint de parâmetros do KDF para um e-mail inexistente devolve salt e parâmetros falsos determinísticos (HMAC do e-mail com segredo do servidor), com o mesmo formato dos reais | Não revelar quais e-mails têm conta | n |
| Desbloqueio por dispositivo | Após o login o navegador guarda a DEK como `CryptoKey` não extraível no IndexedDB; "Sair" a remove; sem ela, a tela "Desbloquear" pede a senha | Escolha do usuário (desbloqueio lembrado) | y |
| Campos cifrados | `transaction.amount_cents`, `transaction.description`; `category.name`; `subcategory.name`; `category_percent.percent_micro`; `financial_goal.monthly_income_cents`, `saved_cents`, `retirement_age`, `annual_rate_bp`, `withdrawal_rate_bp`; `user.birth_date` | Escolha do usuário: financeiros + pessoais | y |
| Metadados em texto puro | Datas, tipo, ids, recorrência e agrupamento ficam legíveis ao servidor | Preservam a consulta por mês em SQL; cifrá-los obrigaria baixar e projetar todo o histórico no navegador. **Decisão pendente do usuário** | n |
| Formato do valor cifrado | Texto `v1:<base64url(iv ‖ ciphertext ‖ tag)>`, IV aleatório de 12 bytes por valor; números serializados como texto decimal antes de cifrar | Prefixo habilita novas versões do formato | n |
| Contexto autenticado (AAD) | `tabela.coluna.userId.idDaLinha` entra como AAD de cada valor (`idDaLinha` é o id da transação, categoria etc.; `financial_goal` e `user` usam o `userId`) | Copiar valor para outra linha ou usuário falha na decifra | n |
| Valor nulo | `NULL` continua `NULL` (descrição vazia, data de nascimento ausente) | Preserva as regras de nulidade | n |
| Validação | As faixas (valor 1 a 99.999.999.999 centavos, percentual 1 a 100.000.000, limites da meta) passam a ser validadas no navegador antes de cifrar, com as mesmas mensagens de hoje; o servidor valida só formato, tamanho (máx. 2048 caracteres), ids e estrutura em texto puro; `CHECK` sobre colunas cifradas saem do banco | O servidor não vê o valor | n |
| Unicidade de nome | Índices únicos de nome de categoria e subcategoria saem; a regra continua na validação de domínio (`budget.ts`) rodando no navegador, com as mensagens atuais | Índice sobre texto cifrado não compara nomes | n |
| Cálculo | Resumo mensal, totais por categoria e subcategoria, busca, filtros, gráficos e prévia da meta rodam no navegador sobre dados decifrados; o servidor só devolve linhas cifradas filtradas por mês e usuário | Único lugar onde o dado existe em claro; revisa AD-001 (leitura em Server Component) e AD-008 | n |
| Mensagem de falha de leitura | "Não foi possível carregar seus dados. Tente novamente" | Fixa, sem detalhe técnico | n |
| Mensagem de falha de gravação | `SAVE_FAILED`: "Não foi possível salvar. Tente novamente" | Convenção das actions | n |
| Mensagem de login inválido | `INVALID_CREDENTIALS`: "E-mail ou senha inválidos", inalterada | Convenção existente | y |
| Redefinição de senha (AD-010) | O fluxo por e-mail continua, mas só troca a senha com a chave de recuperação; sem ela, o usuário pode apagar os dados e recomeçar | O servidor não consegue reembrulhar a DEK sem uma das duas chaves | n |
| Frase de confirmação do reinício | O usuário digita exatamente `APAGAR MEUS DADOS` | Barreira contra apagar por engano | n |
| Contas existentes | Entram como *legadas* (sem DEK embrulhada); no próximo login usam o fluxo atual de senha e são levadas a `/proteger-dados`, onde o navegador cifra tudo, mostra a chave de recuperação e envia o pacote numa transação; nessa última passagem o servidor ainda vê a senha e os dados em claro, e a política informa | Única forma de migrar sem a senha derivada de antemão | n |
| Seed do administrador | `db:seed` continua criando conta legada; o administrador migra no primeiro login | Mantém o script simples | n |
| Fim do legado | Script do operador `finalizar-cifra` remove as colunas em texto puro só quando nenhuma conta legada resta; exige backup prévio feito pelo operador | Perda de dado financeiro é inaceitável | n |
| Logs | `console.error` de actions registra só nome da ação e `code` do erro, nunca o objeto de erro | Erros do `pg` carregam `detail` com valores da linha | n |
| Cabeçalhos | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains` (só em produção) e CSP restrita a scripts da própria origem; os valores exatos de `script-src` (nonce) são decisão do Design | Reduz injeção de script que roubaria a senha | n |
| Testes | Módulo de cifra roda em Node (WebCrypto) nos testes unit; integration usa Postgres de teste e lê colunas cruas; UI por inspeção de código (AD-005) | Gate verificável | n |
| Observabilidade | N/A além dos logs sanitizados | O projeto não tem camada de observabilidade | n |
| Concorrência | N/A além de: a migração da conta e a redefinição são transações únicas; última gravação vence nas edições de dados | Sem recurso compartilhado novo | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Dados cifrados no navegador ⭐ MVP

**User Story**: As a usuário do app, I want que meus valores, descrições, categorias, metas e data de nascimento sejam cifrados no meu navegador so that nem o banco, nem um backup, nem o administrador consigam lê-los.

**Why P1**: É a objeção que impede os conhecidos de usar o app.

**Acceptance Criteria** (each line is one EARS pattern):

1. The sistema SHALL gravar cada campo listado em "Campos cifrados" apenas como texto `v1:<base64url>` produzido com AES-256-GCM, sem nenhuma coluna dessas tabelas conter o valor original de uma conta migrada. <!-- SIGILO-01, ubiquitous -->
2. The servidor SHALL nunca receber a senha do usuário, a KEK, a DEK, a chave de recuperação nem o texto puro de campo cifrado; toda requisição de dados carrega apenas texto cifrado e o segredo de login. <!-- SIGILO-02, ubiquitous -->
3. WHEN o navegador lê um valor cifrado THEN o sistema SHALL devolver exatamente o valor original gravado (mesmo número, mesma string, mesma data). <!-- SIGILO-03, event-driven -->
4. WHEN o mesmo texto é cifrado duas vezes THEN o sistema SHALL produzir dois textos cifrados diferentes. <!-- SIGILO-04, event-driven -->
5. IF um texto cifrado é copiado para outra linha, outra coluna ou outro usuário THEN o sistema SHALL recusar a decifra com erro. <!-- SIGILO-05, unwanted-behavior -->
6. IF a verificação de integridade (tag GCM) de um valor falha THEN o sistema SHALL não exibir dado parcial e exibir "Não foi possível carregar seus dados. Tente novamente". <!-- SIGILO-06, unwanted-behavior -->
7. WHEN o resumo mensal e os totais por categoria e subcategoria de um mês são calculados no navegador THEN o sistema SHALL devolver os mesmos valores, em centavos, que o cálculo anterior sobre dados em texto puro. <!-- SIGILO-07, event-driven -->
8. WHEN o usuário busca por descrição ou filtra por categoria e subcategoria THEN o sistema SHALL devolver as mesmas transações que devolvia antes da cifra. <!-- SIGILO-08, event-driven -->
9. IF o usuário informa valor, percentual ou dado de meta fora das faixas atuais THEN o sistema SHALL recusar no navegador, antes de cifrar, com a mesma mensagem de validação de hoje, e nada é enviado. <!-- SIGILO-09, unwanted-behavior -->
10. IF o servidor recebe, em campo cifrado, valor que não segue `v1:` + base64url ou passa de 2048 caracteres THEN o sistema SHALL recusar com "Não foi possível salvar. Tente novamente" e gravar nada. <!-- SIGILO-10, unwanted-behavior -->

**Independent Test**: Criar uma transação, ler as colunas cruas no Postgres e ver apenas `v1:...`; inspecionar o corpo da requisição e ver só texto cifrado; abrir o app e ver valor e descrição originais.

---

### P1: Senha única, chave de recuperação e desbloqueio

**User Story**: As a usuário, I want entrar com e-mail e senha como hoje e ter meus dados abertos so that eu não gerencie uma segunda credencial.

**Why P1**: Sem usabilidade equivalente à atual, o modelo não é adotado.

**Acceptance Criteria**:

1. WHEN o usuário envia o cadastro THEN o navegador SHALL gerar a DEK e a chave de recuperação, derivar o segredo de login e a KEK da senha, cifrar a data de nascimento e enviar ao servidor apenas o segredo de login, o salt, os parâmetros do KDF, a DEK embrulhada pela KEK, a DEK embrulhada pela chave de recuperação e a data de nascimento cifrada. <!-- SIGILO-11, event-driven -->
2. The servidor SHALL guardar o segredo de login apenas como o hash do Better Auth, nunca a senha real. <!-- SIGILO-12, ubiquitous -->
3. WHEN o usuário entra com a senha correta THEN o navegador SHALL derivar o segredo de login, abrir a sessão, desembrulhar a DEK e abrir o app sem pedir mais nenhum dado. <!-- SIGILO-13, event-driven -->
4. IF a senha está incorreta ou o e-mail não existe THEN o sistema SHALL exibir "E-mail ou senha inválidos" sem indicar qual dos dois falhou. <!-- SIGILO-14, unwanted-behavior -->
5. WHEN os parâmetros do KDF são pedidos para um e-mail sem conta THEN o servidor SHALL devolver salt e parâmetros falsos determinísticos com o mesmo formato dos reais. <!-- SIGILO-15, event-driven -->
6. WHEN o login conclui THEN o navegador SHALL guardar a DEK como `CryptoKey` não extraível no IndexedDB, e WHEN o usuário sai THEN SHALL removê-la. <!-- SIGILO-16, event-driven -->
7. WHILE a sessão é válida e o dispositivo não tem a DEK guardada, o sistema SHALL exibir a tela "Desbloquear" pedindo a senha e não renderizar nenhuma tela com dados. <!-- SIGILO-17, state-driven -->
8. WHEN o cadastro conclui THEN o sistema SHALL exibir a chave de recuperação uma única vez e só liberar "Continuar" após o usuário marcar "Guardei minha chave de recuperação"; a chave nunca é exibida de novo. <!-- SIGILO-18, event-driven -->

**Independent Test**: Cadastrar, anotar a chave, entrar em outro navegador com a mesma senha e ver os mesmos dados; conferir no Postgres que só existem hash, salt, parâmetros e DEKs embrulhadas.

---

### P1: Redefinir a senha sem perder dados

**User Story**: As a usuário que esqueceu a senha, I want redefini-la usando a chave de recuperação so that eu não perca meus dados.

**Why P1**: O fluxo atual de e-mail não consegue reembrulhar a DEK; sem esta história, esquecer a senha apagaria tudo.

**Acceptance Criteria**:

1. WHEN o usuário abre um link de redefinição válido e informa a nova senha e a chave de recuperação correta THEN o navegador SHALL desembrulhar a DEK com a chave de recuperação, reembrulhá-la com a KEK da nova senha e o servidor SHALL trocar, numa transação, o segredo de login, a DEK embrulhada pela KEK e o consumo do token, e encerrar as sessões. <!-- SIGILO-19, event-driven -->
2. IF a chave de recuperação informada é inválida THEN o sistema SHALL exibir "Chave de recuperação inválida" e não alterar senha, DEK nem token. <!-- SIGILO-20, unwanted-behavior -->
3. WHEN o usuário escolhe "Não tenho a chave de recuperação" e digita exatamente `APAGAR MEUS DADOS` THEN o sistema SHALL apagar todos os dados financeiros do usuário, gerar nova DEK e nova chave de recuperação exibida uma vez, e definir a nova senha numa transação. <!-- SIGILO-21, event-driven -->

**Independent Test**: Redefinir com a chave e ver os dados intactos; redefinir sem ela, confirmar a frase e ver o app vazio com novas chaves.

---

### P1: Migração das contas existentes

**User Story**: As a usuário já cadastrado, I want que meus dados passem ao modelo cifrado so that eu ganhe a mesma proteção sem perdê-los.

**Why P1**: Cifrar só contas novas deixaria o histórico exposto.

**Acceptance Criteria**:

1. WHILE a conta é legada, o sistema SHALL permitir o login com o fluxo atual de senha e redirecionar toda página do app para `/proteger-dados`. <!-- SIGILO-22, state-driven -->
2. WHEN `/proteger-dados` conclui THEN o navegador SHALL ter gerado DEK e chave de recuperação, cifrado todos os campos listados da conta, exibido a chave de recuperação uma vez e enviado o pacote numa transação que troca o hash da senha pelo do segredo de login, grava os valores cifrados e remove o texto puro da conta. <!-- SIGILO-23, event-driven -->
3. IF o envio da migração falha THEN o sistema SHALL desfazer a transação e manter a conta legada com o texto puro e o hash da senha inalterados. <!-- SIGILO-24, unwanted-behavior -->
4. WHEN o operador executa `finalizar-cifra` sem nenhuma conta legada THEN o sistema SHALL remover as colunas em texto puro, e IF resta conta legada THEN SHALL recusar e não remover nada. <!-- SIGILO-25, event-driven -->

**Independent Test**: Com banco de teste em texto puro, migrar a conta pela rotina e comparar a leitura decifrada com o snapshot anterior; rodar `finalizar-cifra` com e sem conta legada.

---

### P1: Sem vazamento operacional

**User Story**: As a usuário do app, I want que logs, cache e navegador não exponham meus dados nem minha senha so that a cifra não seja contornada por outro caminho.

**Why P1**: Erros do `pg`, páginas em cache e injeção de script contornam a cifra.

**Acceptance Criteria**:

1. WHEN uma Server Action falha THEN o sistema SHALL registrar em log apenas o nome da ação e o `code` do erro, sem objeto de erro, texto cifrado ou dado do usuário. <!-- SIGILO-26, event-driven -->
2. The sistema SHALL enviar em toda resposta `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e, quando `NODE_ENV` é `production`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`. <!-- SIGILO-27, ubiquitous -->
3. The sistema SHALL enviar em toda resposta uma `Content-Security-Policy` com `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` e `script-src` sem nenhuma origem externa. <!-- SIGILO-28, ubiquitous -->
4. The sistema SHALL enviar `Cache-Control: no-store` em toda página da área logada. <!-- SIGILO-29, ubiquitous -->

**Independent Test**: Forçar erro de constraint e ler o log sem valores; requisitar páginas e conferir os cabeçalhos.

---

### P1: Política de privacidade pública

**User Story**: As a visitante que avalia se usa o app, I want ler o que é guardado e os limites da proteção so that eu decida me cadastrar com informação real.

**Why P1**: Responde direto à objeção dos conhecidos; sem ela a cifra não é comunicada.

**Acceptance Criteria**:

1. WHEN um visitante sem sessão abre `/privacidade` THEN o sistema SHALL exibir a página sem redirecionar para `/login`. <!-- SIGILO-30, event-driven -->
2. The página `/privacidade` SHALL listar os dados guardados, quais estão cifrados e quais não (e-mail, nome, datas e tipo das transações), o direito de exportar e de excluir a conta e o que acontece com os dados na exclusão. <!-- SIGILO-31, ubiquitous -->
3. The página `/privacidade` SHALL conter a frase "Seus dados financeiros são cifrados no seu navegador com uma chave protegida pela sua senha; o servidor guarda só texto cifrado e não tem a chave." <!-- SIGILO-32, ubiquitous -->
4. The página `/privacidade` SHALL conter a frase "Se você perder a senha e a chave de recuperação, ninguém, nem o administrador, consegue recuperar seus dados." <!-- SIGILO-33, ubiquitous -->
5. The página `/privacidade` SHALL conter a frase "Limite: quem opera o servidor controla o código que o seu navegador executa e, em tese, poderia publicar uma versão que capture a sua senha." <!-- SIGILO-34, ubiquitous -->
6. The sistema SHALL exibir um link "Privacidade" em `/login`, `/cadastro` e no menu da área logada, apontando para `/privacidade`. <!-- SIGILO-35, ubiquitous -->

**Independent Test**: Abrir `/privacidade` em janela anônima e ler as três frases; ver o link nas três telas.

---

### P2: Exportar os próprios dados

**User Story**: As a usuário, I want baixar todos os meus dados so that eu os leve comigo ou confira o que está guardado.

**Why P2**: Portabilidade e confiança, mas o app já protege os dados sem ela.

**Acceptance Criteria**:

1. WHEN o usuário solicita a exportação THEN o navegador SHALL decifrar e baixar `orcamento-dados-AAAA-MM-DD.json` (data de hoje em America/Sao_Paulo) com todas as suas transações (inclusive séries recorrentes), categorias, subcategorias, percentuais por vigência, meta e data de nascimento. <!-- SIGILO-36, event-driven -->
2. IF os dados são pedidos sem sessão aprovada THEN o servidor SHALL recusar sem devolver linha alguma, e WHEN há sessão aprovada SHALL devolver somente as linhas do usuário da sessão. <!-- SIGILO-37, unwanted-behavior -->

**Independent Test**: Exportar com dois usuários populados e conferir que o arquivo traz só os do usuário logado, em claro.

---

### P2: Excluir a própria conta

**User Story**: As a usuário, I want excluir minha conta e meus dados so that eu possa sair do app quando quiser.

**Why P2**: Direito de eliminação; reforça a confiança de quem hesita.

**Acceptance Criteria**:

1. WHEN o usuário informa a senha correta e confirma THEN o sistema SHALL apagar o usuário, todos os seus dados, a DEK embrulhada e todas as suas sessões, remover a DEK do dispositivo e redirecionar para `/login`. <!-- SIGILO-38, event-driven -->
2. IF a senha informada está incorreta THEN o sistema SHALL recusar com "Senha incorreta" e não apagar nada. <!-- SIGILO-39, unwanted-behavior -->
3. IF a conta é a do administrador (`ADMIN_EMAIL`) THEN o sistema SHALL recusar com "Não é possível revogar ou excluir o administrador" e não apagar nada. <!-- SIGILO-40, unwanted-behavior -->

**Independent Test**: Criar usuário com dados, excluir com a senha e ver nenhuma linha dele em nenhuma tabela; tentar com senha errada e ver tudo intacto.

---

## Edge Cases

- WHEN a descrição da transação é `NULL` THEN o sistema SHALL mantê-la `NULL` na coluna, sem valor cifrado.
- WHEN a data de nascimento do usuário é `NULL` THEN o sistema SHALL mantê-la `NULL`.
- IF o usuário limpa os dados do navegador com sessão ativa THEN o sistema SHALL tratar como SIGILO-17 (tela "Desbloquear").
- IF o usuário perde a senha e a chave de recuperação THEN o sistema SHALL oferecer apenas o reinício de SIGILO-21; nenhum caminho recupera os dados.
- WHEN a migração de uma conta legada roda para usuário sem dados THEN o sistema SHALL concluir e gerar as chaves normalmente.
- WHEN a exportação é pedida por usuário sem dados THEN o sistema SHALL baixar o JSON com listas vazias e a data de nascimento.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SIGILO-01 | P1: Dados cifrados no navegador | T1, T2, T7, T8, T12, T13, T14, T15, T16, T17, T23, T24, T61, T64, T67, T76, T77, T78, T79, T80, T83, T84, T85, T86 | In Tasks |
| SIGILO-02 | P1: Dados cifrados no navegador | T4, T7, T23, T29, T35, T36, T37, T38, T39 | In Tasks |
| SIGILO-03 | P1: Dados cifrados no navegador | T2, T3, T26 | In Tasks |
| SIGILO-04 | P1: Dados cifrados no navegador | T2 | In Tasks |
| SIGILO-05 | P1: Dados cifrados no navegador | T2, T14, T23, T26 | In Tasks |
| SIGILO-06 | P1: Dados cifrados no navegador | T2, T26, T50, T60, T63, T66 | In Tasks |
| SIGILO-07 | P1: Dados cifrados no navegador | T13, T15, T25, T60, T61, T63, T83 | In Tasks |
| SIGILO-08 | P1: Dados cifrados no navegador | T13, T26, T60 | In Tasks |
| SIGILO-09 | P1: Dados cifrados no navegador | T16, T24, T62, T65, T68, T69, T71 | In Tasks |
| SIGILO-10 | P1: Dados cifrados no navegador | T9, T35, T36, T37, T38, T62, T65, T68, T69, T71 | In Tasks |
| SIGILO-11 | P1: Senha única e desbloqueio | T4, T5, T10, T19, T29, T39, T54 | In Tasks |
| SIGILO-12 | P1: Senha única e desbloqueio | T8, T10, T19, T39, T86 | In Tasks |
| SIGILO-13 | P1: Senha única e desbloqueio | T4, T30, T34, T48, T53 | In Tasks |
| SIGILO-14 | P1: Senha única e desbloqueio | T8, T53, T88 | In Tasks |
| SIGILO-15 | P1: Senha única e desbloqueio | T11, T34 | In Tasks |
| SIGILO-16 | P1: Senha única e desbloqueio | T28, T48, T52, T53 | In Tasks |
| SIGILO-17 | P1: Senha única e desbloqueio | T30, T34, T48, T49, T59, T70 | In Tasks |
| SIGILO-18 | P1: Senha única e desbloqueio | T6, T29, T39, T51, T54 | In Tasks |
| SIGILO-19 | P1: Redefinir senha | T5, T20, T31, T40, T55, T81, T87 | In Tasks |
| SIGILO-20 | P1: Redefinir senha | T6, T31, T40, T55 | In Tasks |
| SIGILO-21 | P1: Redefinir senha | T10, T20, T40, T55 | In Tasks |
| SIGILO-22 | P1: Migração | T21, T44, T53, T56, T57, T59 | In Tasks |
| SIGILO-23 | P1: Migração | T21, T22, T32, T44, T46, T57 | In Tasks |
| SIGILO-24 | P1: Migração | T22, T44, T57 | In Tasks |
| SIGILO-25 | P1: Migração | T88 | In Tasks |
| SIGILO-26 | P1: Sem vazamento | T33, T35, T80, T81, T82 | In Tasks |
| SIGILO-27 | P1: Sem vazamento | T45, T46 | In Tasks |
| SIGILO-28 | P1: Sem vazamento | T45, T47 | In Tasks |
| SIGILO-29 | P1: Sem vazamento | T45, T47 | In Tasks |
| SIGILO-30 | P1: Política pública | T47, T58 | In Tasks |
| SIGILO-31 | P1: Política pública | T58 | In Tasks |
| SIGILO-32 | P1: Política pública | T58 | In Tasks |
| SIGILO-33 | P1: Política pública | T58 | In Tasks |
| SIGILO-34 | P1: Política pública | T58 | In Tasks |
| SIGILO-35 | P1: Política pública | T53, T54, T72, T75 | In Tasks |
| SIGILO-36 | P2: Exportar | T18, T27, T72, T73 | In Tasks |
| SIGILO-37 | P2: Exportar | T18, T41, T73 | In Tasks |
| SIGILO-38 | P2: Excluir conta | T43, T72, T74 | In Tasks |
| SIGILO-39 | P2: Excluir conta | T42, T43, T74 | In Tasks |
| SIGILO-40 | P2: Excluir conta | T43, T74 | In Tasks |

**Coverage:** 40 total, 40 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Um `SELECT *` em `transaction`, `category`, `subcategory`, `category_percent`, `financial_goal` e `user.birth_date` de uma conta migrada não devolve valor, nome nem data de nascimento legível.
- [ ] Nenhuma requisição ao servidor contém a senha real, a DEK ou a chave de recuperação.
- [ ] Totais, resumo mensal, busca e filtros de um conjunto de dados fixo dão o mesmo resultado antes e depois da migração.
- [ ] Redefinir a senha com a chave de recuperação mantém todos os dados legíveis.
- [ ] `/privacidade` abre sem login e contém as três frases dos SIGILO-32 a 34.
- [ ] Excluir a conta deixa zero linhas do usuário em qualquer tabela.
