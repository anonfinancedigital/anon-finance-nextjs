# Esqueci Minha Senha Specification

## Problem Statement

Quem esquece a senha não consegue entrar, e hoje só o administrador, mexendo no banco ou no seed, resolve. A feature adiciona um link "Esqueci minha senha" no formulário de login que leva a um pedido de redefinição: a pessoa informa o e-mail, recebe por e-mail um link de uso único e define uma nova senha. O projeto ainda não tem serviço de e-mail; a feature introduz o envio por SMTP.

## Goals

- [ ] A partir do login, uma pessoa aprovada recupera o acesso sem ajuda do administrador, só com acesso à própria caixa de e-mail.
- [ ] A tela de pedido responde da mesma forma para qualquer e-mail, de modo que não revela quais e-mails existem nem o status da conta.
- [ ] Nenhum link de redefinição funciona depois de usado, expirado ou substituído, e a troca de senha encerra todas as sessões da pessoa.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Troca de senha estando logado (tela de perfil) | Fluxo diferente; não pedido |
| Verificação de e-mail no cadastro | Fora do pedido; `emailVerified` continua como está |
| E-mail de aviso "sua senha foi alterada" | Nice-to-have; segundo e-mail sem pedido |
| Limite de pedidos por IP ou CAPTCHA | Risco aceito para app familiar, como no cadastro |
| Redefinir senha de conta pendente, rejeitada ou revogada | Decidido: só contas aprovadas recebem o e-mail |
| Provedores de e-mail por API (Resend, SendGrid) | Decidido: SMTP via nodemailer |
| Fila, retentativa ou painel de entregas de e-mail | Envio síncrono e uma tentativa bastam para este volume |
| Notificação ao administrador | Sem necessidade; a pessoa se recupera sozinha |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Como o e-mail é enviado | SMTP via nodemailer, configurado por `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` em `.env` e `.env.example` | Escolha do usuário; sem dependência de fornecedor | y |
| Quem recebe o e-mail | Só conta com status `approved`; as demais não recebem nada | Escolha do usuário; mantém a regra de acesso do cadastro-aprovacao | y |
| Resposta ao pedido | Sempre a mesma mensagem de sucesso, exista ou não a conta, qualquer que seja o status, e mesmo se o envio falhar | Não revelar existência nem status; difere do cadastro, que revela duplicidade por ser decisão consciente do cadastro | n |
| Validade do link | 30 minutos a partir do pedido | Escolha do usuário | y |
| Uso do link | Uso único; novo pedido da mesma pessoa invalida o link anterior | Reduz a janela de ataque com e-mails antigos | n |
| Efeito sobre sessões | Ao trocar a senha, todas as sessões da pessoa são apagadas, e a pessoa vai ao login sem sessão aberta | Escolha do usuário; quem perdeu a senha pode ter perdido o dispositivo | y |
| Mecanismo do token | Repo próprio (AD-010): token aleatório guardado como hash na tabela `verification`, sem migração; o fluxo nativo do Better Auth não é usado | O nativo não confere status, não invalida links anteriores e não é atômico | n |
| Tamanho da nova senha | 8 a 128 caracteres, igual ao cadastro | Mesma regra da conta existente | n |
| Confirmação da nova senha | Campo "Confirmar senha" igual à nova senha, como no cadastro | Reaproveita o padrão de `senha-visivel-confirmacao` | n |
| Status mudou entre o pedido e o uso do link | Se a conta deixou de ser `approved`, a troca é recusada com "Link inválido ou expirado" | Revogação tem efeito imediato; não abre brecha de contornar bloqueio | n |
| Bloqueio por tentativas de login | Pedido de redefinição e troca de senha não contam como falha de login e não limpam as falhas registradas | Mantém AUTH-03 isolado | n |
| Falha de SMTP | O erro é registrado no log do servidor e a pessoa vê a mesma mensagem de sucesso; nada é revelado | Resposta uniforme; evita enumeração por erro | n |
| Nome do remetente e do assunto | Assunto "Redefinir sua senha"; corpo com link e a validade de 30 minutos, em português | Texto simples e fixo | n |
| URL do link | `BETTER_AUTH_URL` + `/redefinir-senha?token=...` | Base pública já configurada | n |
| Observabilidade | Só o log de erro do envio; sem métrica ou tracing | O projeto não tem camada de observabilidade | n |
| Idempotência | Pedidos repetidos são aceitos; cada um invalida o anterior e envia um novo e-mail | Reenviar é o caso de uso quando o e-mail não chega | n |
| Dado do link na URL | Token na query string; a página redefinir-senha não carrega scripts de terceiros | Padrão do Better Auth; risco aceito no app privado | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Pedir o link pelo login ⭐ MVP

**User Story**: As a pessoa com conta aprovada que esqueceu a senha, I want pedir um link de redefinição a partir do login so that eu receba por e-mail o caminho para recuperar o acesso.

**Why P1**: Sem o pedido e o envio, não há recuperação.

**Acceptance Criteria**:

1. The login form SHALL show a link with the text "Esqueci minha senha" that leads to `/esqueci-senha`.
2. WHEN a person submits an e-mail of an `approved` account on `/esqueci-senha` THEN the system SHALL send one e-mail to that address with subject "Redefinir sua senha" and a link to `/redefinir-senha` carrying a single-use token.
3. WHEN a person submits an e-mail on `/esqueci-senha` THEN the system SHALL compare the e-mail after trimming spaces at the ends and lowercasing.
4. WHEN a person submits an e-mail that has no account, or whose account is `pending`, `rejected` or `revoked` THEN the system SHALL send no e-mail.
5. WHEN a person submits any well-formed e-mail on `/esqueci-senha` THEN the system SHALL show the message "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes" regardless of whether an e-mail was sent.
6. IF the submitted e-mail is empty or not a valid e-mail format THEN the system SHALL show the message "Informe um e-mail válido" and send no e-mail.
7. IF sending the e-mail fails THEN the system SHALL write the error to the server log and show the same message as AC 5.
8. WHEN a person requests a new link for the same account THEN the system SHALL invalidate every link issued before it.
9. The link in the e-mail SHALL expire 30 minutes after the request.
10. The e-mail body SHALL state that the link is valid for 30 minutes.

**Independent Test**: Com um SMTP de teste (captura local), pedir o link de um e-mail aprovado e ver o e-mail chegar com o link; pedir o de um e-mail inexistente e ver a mesma mensagem na tela sem e-mail enviado.

---

### P1: Definir a nova senha ⭐ MVP

**User Story**: As a pessoa que recebeu o link, I want definir uma nova senha so that eu volte a entrar.

**Why P1**: Fecha o fluxo; sem ele o e-mail não serve para nada.

**Acceptance Criteria**:

1. WHEN a person opens `/redefinir-senha?token=<token válido>` THEN the system SHALL show the fields "Nova senha" and "Confirmar senha".
2. WHEN a person submits a new password of 8 to 128 characters equal to its confirmation with a valid token THEN the system SHALL replace the account password so that the new password logs in and the old one does not.
3. WHEN the password is replaced THEN the system SHALL delete every session of that user.
4. WHEN the password is replaced THEN the system SHALL consume the token so that it cannot be used again.
5. WHEN the password is replaced THEN the system SHALL redirect the person to `/login` and SHALL NOT open a session.
6. IF the new password has fewer than 8 or more than 128 characters THEN the system SHALL show the message "A senha deve ter entre 8 e 128 caracteres" and keep the token valid.
7. IF the confirmation differs from the new password THEN the system SHALL show the message "As senhas não coincidem" and keep the token valid.
8. IF the token is missing, unknown, expired, already used or replaced by a newer request THEN the system SHALL show the message "Link inválido ou expirado" with a link to `/esqueci-senha`, and SHALL NOT change any password.
9. IF the account of the token is no longer `approved` at submission THEN the system SHALL show the message "Link inválido ou expirado" and SHALL NOT change the password.
10. WHILE a token is valid, WHEN two submissions with that token happen at the same time THEN the system SHALL accept at most one of them.

**Independent Test**: Abrir o link recebido, definir a nova senha, ver o redirecionamento ao login, entrar com a nova senha, e confirmar que o mesmo link agora mostra "Link inválido ou expirado".

---

### P2: Entrada de e-mail simples e retorno ao login

**User Story**: As a pessoa na tela de pedido, I want voltar ao login e ver que o pedido foi aceito so that eu não fique perdida.

**Why P2**: Melhora o uso, mas o fluxo funciona sem isso.

**Acceptance Criteria**:

1. The `/esqueci-senha` and `/redefinir-senha` pages SHALL each show a link "Voltar ao login" that leads to `/login`.
2. WHEN the person submits the request THEN the system SHALL disable the submit button until the response arrives.
3. WHERE the person is already logged in, WHEN they open `/esqueci-senha` or `/redefinir-senha` THEN the system SHALL redirect them to `/`.

**Independent Test**: Abrir `/esqueci-senha` logado e ver o redirecionamento; deslogado, ver o link de volta ao login.

---

## Edge Cases

- IF the SMTP variables are missing at the moment of sending THEN the system SHALL write the error to the server log and show the AC 5 message.
- IF the person submits the request form with an e-mail in uppercase or with spaces at the ends THEN the system SHALL still match the account.
- WHEN a link is opened after the account was deleted THEN the system SHALL show "Link inválido ou expirado".
- WHEN two tabs hold links from two successive requests and the person uses the older one THEN the system SHALL show "Link inválido ou expirado".

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SENHA-01 | P1: Pedir o link pelo login (AC 1) | Design | Pending |
| SENHA-02 | P1: Pedir o link pelo login (AC 2, 3, 10) | Execute | Implemented |
| SENHA-03 | P1: Pedir o link pelo login (AC 4, 5, 7) | Design | Pending |
| SENHA-04 | P1: Pedir o link pelo login (AC 6) | Design | Pending |
| SENHA-05 | P1: Pedir o link pelo login (AC 8, 9) | Execute | Implemented |
| SENHA-06 | P1: Definir a nova senha (AC 1, 2, 5) | Design | Pending |
| SENHA-07 | P1: Definir a nova senha (AC 3, 4) | Execute | Implemented |
| SENHA-08 | P1: Definir a nova senha (AC 6, 7) | Design | Pending |
| SENHA-09 | P1: Definir a nova senha (AC 8, 9, 10) | Design | Pending |
| SENHA-10 | P2: Entrada de e-mail simples e retorno ao login | - | Pending |

**Coverage:** 10 total, 0 mapped to tasks, 10 unmapped ⚠️

---

## Success Criteria

- [ ] Uma pessoa aprovada que esqueceu a senha volta a entrar em menos de 2 minutos, sem ajuda do administrador.
- [ ] Zero diferença observável na tela de pedido entre e-mail existente, inexistente e de conta não aprovada.
- [ ] Zero links reutilizáveis: usado, expirado ou substituído sempre mostra "Link inválido ou expirado".
