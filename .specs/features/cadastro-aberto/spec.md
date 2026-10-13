# Cadastro Aberto sem Aprovação Manual Specification

## Problem Statement

Hoje todo cadastro nasce `pending` e só entra no app depois que o administrador aprova. A aprovação manual vira gargalo para um app que o dono quer aberto. A feature faz o cadastro nascer `approved`, remove as ações Aprovar e Rejeitar do administrador e mantém Revogar, Reativar e Excluir. Como o cadastro deixa de depender de uma pessoa, entra um limite de cadastros por IP no lugar do filtro humano.

## Goals

- [ ] Quem conclui o cadastro entra no app com e-mail e senha, sem nenhuma ação do administrador.
- [ ] O administrador continua podendo revogar, reativar e excluir qualquer usuário (exceto ele mesmo) pela tela `/admin/cadastros`.
- [ ] Um mesmo IP cria no máximo 5 contas por hora.
- [ ] Nenhuma tela do cadastro ou do login promete aprovação.
- [ ] O login com Google cria conta `approved` e leva a `/criar-cofre`, sem nunca vincular a uma conta que já tem senha.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| CAPTCHA, verificação de e-mail, limite por e-mail ou por dispositivo | Pedido cobre só o limite por IP |
| Mudar usuários `pending` e `rejected` já existentes | Decidido: ninguém muda na migração |
| Aprovar ou rejeitar usuário em qualquer status | É exatamente o que a feature remove |
| Vincular o Google a uma conta com senha | Decidido: recusar (OPEN-05). Conta com senha só entra com e-mail e senha |
| Notificar o administrador de novos cadastros | Sem serviço de e-mail no projeto |
| Mudar bloqueio de login por tentativas, exclusão e revogação | Seguem `cadastro-aprovacao` sem alteração |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Estado de quem já é `pending` ou `rejected` | Nenhuma migração de dados; continuam com o status atual, sem sessão, e o administrador só pode Excluir | Escolha do usuário | y |
| Revogado volta? | Sim: botão "Reativar" leva `revoked` → `approved` | Escolha do usuário; revogar continua reversível | y |
| Proteção contra cadastro em massa | Limite por IP nesta feature | Escolha do usuário | y |
| Valor do limite | 5 cadastros criados por IP em 60 minutos | Cobre uma casa com várias pessoas e trava script simples | n |
| O que conta no limite | Só cadastro que criou usuário; validação reprovada e e-mail duplicado não contam | Erro de digitação não pode travar uma pessoa honesta | n |
| Onde o limite é conferido | Depois de a validação passar e antes de criar o usuário | Evita gravar contador para entrada inválida | n |
| Como se obtém o IP | Primeiro valor de `x-forwarded-for`; na ausência, `x-real-ip` | Padrão da hospedagem na Vercel | n |
| IP indisponível | O limite não se aplica e o cadastro segue | Falhar fechado travaria todos em dev e teste | n |
| Armazenamento do IP | Só o HMAC-SHA-256 em hex (chave `BETTER_AUTH_SECRET`), nunca o IP em claro | SHA-256 puro de IPv4 se reverte por força bruta; o HMAC com segredo do servidor não. Alinhado a AD-013 | n |
| Corrida no limite | Conferir e criar não são atômicos; cadastros simultâneos podem passar do limite em até o número de requisições concorrentes | Custo de travar a tabela não compensa; o limite é anti-abuso, não garantia financeira | n |
| Retenção dos registros do limite | Ao gravar um novo registro, apaga os com mais de 60 minutos | Sem job; a tabela fica do tamanho da janela | n |
| Sessão após o cadastro | Não há; a pessoa vai ao `/login` | Cadastro selado (AD-011) não usa o segredo de login para abrir sessão; preserva o fluxo atual | n |
| Status padrão da coluna `user.status` | Continua `pending` no banco | Caminho que esquecer de informar o status falha fechado (AD-009); o cadastro passa `approved` explicitamente | n |
| Texto de login do `pending` legado | "Sua conta não está liberada. Fale com o administrador" substitui "aguardando aprovação" | Não existe mais aprovação; o texto antigo promete algo impossível | n |
| AD-009 | Passa a valer só em parte: o acesso exige `status = approved`, mas o cadastro nasce `approved`. Registrar nova decisão (AD-014) no Design | O guard e a revogação continuam; muda a origem do status | n |
| `login-google` (já implementada) | Esta feature substitui o que ela fez com `pending`: o Google cria o usuário `approved` com sessão e a trava até a senha do cofre fica no guard (`needsVault` → `/criar-cofre`, que já existe). Mudam GOOGLE-05 (criação `pending`, mensagem de pendente) e GOOGLE-08 (vínculo com conta de senha). Vira ajuste no código e nos testes dela, listado no Design | Cofre só é gravado com sessão, que `pending` não tem; reusar `pending` confundiria o Google novo com o legado | y |
| Pré-sequestro do vínculo | Sem aprovação do admin, qualquer pessoa cadastra o e-mail alheio; por isso o Google nunca vincula a conta que já tem login por senha. Substitui o risco aceito de `login-google` (`requireLocalEmailVerified: false`) | Escolha do usuário; fecha a tomada de conta | y |
| Usuários Google já `pending` | Ninguém muda, vale a regra geral: só Excluir; a pessoa entra de novo com Google depois de excluída | Escolha do usuário | y |
| Limite por IP e o Google | O limite não vale para o Google | O Google já autentica uma identidade real; o limite é para o cadastro por formulário | n |
| Observabilidade | N/A: sem log, métrica ou tracing novos | O projeto não tem camada de observabilidade | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Cadastro libera o acesso na hora ⭐ MVP

**User Story**: Como visitante, quero me cadastrar e entrar logo depois para não depender de aprovação.

**Why P1**: É o pedido central.

**Acceptance Criteria**:

1. WHEN o visitante conclui o cadastro com dados válidos THEN the system SHALL criar o usuário com `status = approved`, não criar sessão e exibir "Cadastro concluído. Você já pode entrar" com um link "Ir para o login" para `/login`.  <!-- event-driven -->
2. WHEN um usuário criado por esse cadastro envia e-mail e senha corretos no login THEN the system SHALL criar a sessão e redirecionar para `/`.  <!-- event-driven -->
3. The system SHALL manter as validações do cadastro, as mensagens e o bloqueio de e-mail duplicado definidos nos AC 2 a 8 de SIGNUP-01 em `cadastro-aprovacao`.  <!-- ubiquitous -->
4. The system SHALL NOT exibir em `/cadastro` nem em `/login` texto que cite aprovação do administrador.  <!-- ubiquitous -->

**Independent Test**: Cadastrar "Ana", `ana@x.com`, senha de 8 caracteres; ver "Cadastro concluído. Você já pode entrar"; entrar no `/login` e chegar em `/`.

---

### P1: Limite de cadastros por IP ⭐ MVP

**User Story**: Como dono do app, quero limitar cadastros por IP para que o cadastro aberto não vire porta de abuso.

**Why P1**: Sem o filtro humano, o limite é a única barreira contra cadastro em massa.

**Acceptance Criteria**:

1. IF o IP do cadastro já criou 5 contas nos últimos 60 minutos THEN the system SHALL rejeitar o cadastro com "Muitos cadastros a partir deste endereço. Tente novamente em {n} minutos" (singular "minuto" quando n = 1), sem criar usuário, onde n é o tempo, arredondado para cima em minutos, até a mais antiga das 5 contas sair da janela de 60 minutos.  <!-- unwanted-behavior -->
2. WHEN o IP do cadastro criou menos de 5 contas nos últimos 60 minutos e os dados são válidos THEN the system SHALL criar o usuário e registrar o HMAC-SHA-256 do IP (chave `BETTER_AUTH_SECRET`) com o instante da criação.  <!-- event-driven -->
3. IF o cadastro falhar na validação ou no e-mail duplicado THEN the system SHALL NOT registrar o IP nem contar a tentativa no limite.  <!-- unwanted-behavior -->
4. WHEN o sistema registra um novo cadastro de IP THEN the system SHALL apagar os registros com mais de 60 minutos.  <!-- event-driven -->
5. IF o IP não puder ser obtido dos cabeçalhos da requisição THEN the system SHALL criar o usuário sem aplicar o limite.  <!-- unwanted-behavior -->
6. The system SHALL guardar apenas o hash do IP, nunca o IP em claro.  <!-- ubiquitous -->
7. IF o banco falhar ao conferir o limite ou ao registrar o IP THEN the system SHALL não criar o usuário e retornar "Não foi possível salvar. Tente novamente".  <!-- unwanted-behavior -->

**Independent Test**: Com o mesmo IP, criar 5 contas válidas; a 6ª recebe a mensagem de limite; após 60 minutos simulados da mais antiga, a 6ª passa.

---

### P1: Administrador só revoga, reativa e exclui ⭐ MVP

**User Story**: Como administrador, quero revogar, reativar ou excluir usuários para controlar quem usa o app depois de já estar dentro.

**Why P1**: Mantém o controle do administrador sem a aprovação prévia.

**Acceptance Criteria**:

1. WHERE o usuário listado está `approved`, the system SHALL mostrar as ações Revogar e Excluir; WHERE está `revoked`, Reativar e Excluir; WHERE está `pending` ou `rejected`, só Excluir.  <!-- optional-feature -->
2. WHEN o administrador reativa um usuário `revoked` THEN the system SHALL mudar o status para `approved`, gravar `decided_at` e permitir que ele entre com e-mail e senha.  <!-- event-driven -->
3. IF o administrador reativar um usuário `approved` THEN the system SHALL manter o status e `decided_at` sem erro.  <!-- unwanted-behavior -->
4. IF o administrador reativar um usuário `pending` ou `rejected` THEN the system SHALL manter o status e retornar "Este usuário não está revogado".  <!-- unwanted-behavior -->
5. The system SHALL NOT oferecer, na tela nem como Server Action, a ação de aprovar um `pending` nem a de rejeitar qualquer usuário.  <!-- ubiquitous -->
6. The system SHALL manter, sem alteração, revogar e excluir definidos nos AC 7 a 9, 11 a 19 de "Administrador decide os cadastros" em `cadastro-aprovacao`.  <!-- ubiquitous -->

**Independent Test**: Revogar um usuário e vê-lo perder acesso; Reativar e vê-lo entrar de novo; um `pending` antigo mostra só Excluir.

---

### P1: Google cria conta sem aprovação ⭐ MVP

**User Story**: Como visitante, quero entrar com Google e criar minha senha de cofre sem esperar o administrador.

**Why P1**: Sem isso o Google continuaria criando `pending` sem saída, já que a aprovação deixa de existir.

**Acceptance Criteria**:

1. WHEN um login com Google traz e-mail verificado sem usuário existente THEN the system SHALL criar o usuário com `status = approved`, vincular a conta Google, criar a sessão e levar a pessoa a `/criar-cofre`.  <!-- event-driven -->
2. IF o e-mail verificado do Google já pertence a um usuário que tem conta com senha THEN the system SHALL NOT vincular o Google nem criar sessão, e SHALL redirecionar a `/login` exibindo "Este e-mail já tem cadastro com senha. Entre com e-mail e senha".  <!-- unwanted-behavior -->
3. WHEN um usuário com Google vinculado e sem conta com senha, `approved`, entra de novo com Google THEN the system SHALL criar a sessão.  <!-- event-driven -->
4. IF esse usuário com Google vinculado estiver `pending`, `rejected` ou `revoked` THEN the system SHALL NOT criar sessão e SHALL exibir a mensagem do status em `/login` (a de `pending` é a de OPEN-04).  <!-- unwanted-behavior -->
5. The system SHALL NOT permitir que um login com Google crie usuário com status diferente de `approved`.  <!-- ubiquitous -->
6. WHERE o usuário é `approved`, sem `user_vault` e sem conta com senha, the system SHALL bloquear as páginas de dados e redirecioná-lo a `/criar-cofre` (já implementado em `login-google`).  <!-- optional-feature -->

**Independent Test**: Callback com e-mail novo cria `approved` com sessão e vai a `/criar-cofre`; callback com e-mail que tem senha não cria sessão e mostra a mensagem.

---

### P2: Mensagem de login do `pending` legado

**User Story**: Como usuário `pending` antigo, quero uma mensagem que não prometa aprovação que não virá.

**Why P2**: Evita instrução enganosa; só afeta contas legadas.

**Acceptance Criteria**:

1. WHEN um usuário `pending` envia e-mail e senha corretos no login THEN the system SHALL não criar sessão, não registrar falha de login e exibir "Sua conta não está liberada. Fale com o administrador".  <!-- event-driven -->
2. WHEN um usuário `rejected` ou `revoked` envia e-mail e senha corretos no login THEN the system SHALL manter as mensagens atuais "Seu cadastro não foi aprovado" e "Seu acesso foi revogado".  <!-- event-driven -->

**Independent Test**: Login de um `pending` com a senha certa mostra a nova mensagem.

---

## Edge Cases

- WHEN dois cadastros com o mesmo e-mail chegam ao mesmo tempo THEN the system SHALL criar exatamente um usuário (já coberto por SIGNUP-01, AC 8).
- IF o administrador tentar revogar ou excluir a própria conta THEN the system SHALL manter a conta (já coberto por SIGNUP-06, AC 18).
- WHEN o seed do administrador roda THEN the system SHALL gravar o usuário como `approved` (já coberto por SIGNUP-04, sem alteração).

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | AC 3 do cadastro (validações mantidas); IP ausente: AC 5 do limite |
| Failure / partial-failure states | AC 7 do limite; falha ao criar o usuário segue SIGNUP-01 |
| Idempotency / retry / duplicate handling | AC 3 do limite (duplicado não conta); AC 3 da reativação (já aprovado) |
| Auth boundaries & rate limits | AC 1 a 6 do limite; ações do administrador seguem SIGNUP-06 (AC 6 do admin) |
| Concurrency / ordering | Corrida no limite aceita e registrada nas premissas; duplicado simultâneo em SIGNUP-01 |
| Data lifecycle / expiry | AC 4 do limite (registros apagados após 60 minutos) |
| Observability | N/A because sem camada de observabilidade no projeto (premissas) |
| External-dependency failure | N/A because não há chamada externa nova |
| State-transition integrity | AC 1 a 5 do administrador: só `revoked` → `approved`, `approved` → `revoked`; premissas |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| OPEN-01 | P1: Cadastro libera o acesso (AC 1-4) | Specify | Pending |
| OPEN-02 | P1: Limite por IP (AC 1-7) | Specify | Pending |
| OPEN-03 | P1: Administrador revoga, reativa e exclui (AC 1-6) | Specify | Pending |
| OPEN-04 | P2: Mensagem do `pending` legado (AC 1-2) | Specify | Pending |
| OPEN-05 | P1: Google cria conta sem aprovação (AC 1-6) | Specify | Pending |

**Coverage:** 5 total, 0 mapped to tasks, 5 unmapped ⚠️

---

## Success Criteria

- [ ] Um visitante se cadastra e entra sem nenhuma ação do administrador, verificado por teste de integração.
- [ ] A 6ª tentativa de cadastro válido do mesmo IP em 60 minutos é recusada, verificado por teste de integração.
- [ ] Não existe caminho (tela ou Server Action) que aprove um `pending` ou rejeite alguém.
- [ ] Um login com Google nunca cria usuário `pending` nem vincula conta com senha, verificado por teste de integração.
- [ ] Revogar, Reativar e Excluir continuam funcionando, verificado pelos testes existentes ajustados.
