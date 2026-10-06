# Cadastro com Aprovação do Administrador Specification

## Problem Statement

Hoje o cadastro público está desligado e a única conta nasce de seed (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), então outras pessoas não conseguem usar o app. A feature adiciona uma tela de cadastro mínima (nome, e-mail, senha) e uma tela de administração em que o administrador aprova ou rejeita cada cadastro. Até a aprovação, a pessoa não entra no app nem acessa dado algum.

## Goals

- [ ] Qualquer visitante cria um cadastro informando só nome, e-mail e senha.
- [ ] Nenhuma conta com status diferente de `approved` obtém sessão ou acessa página ou ação protegida.
- [ ] O administrador aprova ou rejeita cadastros pendentes em uma tela do app, sem usar script ou banco.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Notificação por e-mail ao administrador ou ao cadastrado | Sem serviço de e-mail no projeto; o administrador vê os pendentes ao abrir a tela |
| Verificação de e-mail e recuperação de senha | Fora do mínimo pedido |
| Reativar usuário revogado em um clique de desfazer, histórico de decisões | Revogado volta por Aprovar; sem log de quem decidiu |
| Mais de um administrador, papéis ou permissões | Decidido: o administrador é a conta do `ADMIN_EMAIL` |
| Limite de cadastros por IP ou CAPTCHA | Risco aceito para app familiar; registrado nas premissas |
| Compartilhar dados entre usuários | Cada usuário continua vendo só os próprios dados (já isolados por `user_id`) |
| Badge de pendentes no menu | Nice-to-have; a tela de cadastros basta |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Quem é administrador | Usuário cujo e-mail normalizado (minúsculas, sem espaços nas pontas) é igual ao `ADMIN_EMAIL`; verificado a cada requisição; sem `ADMIN_EMAIL` ninguém é administrador | Escolha do usuário; evita coluna de papel e escalada pelo app | y |
| Como o administrador decide | Tela `/admin/cadastros` com Aprovar e Rejeitar | Escolha do usuário | y |
| Campos do cadastro | Nome, e-mail, senha | Escolha do usuário | y |
| Contas existentes na migração | Todas viram `approved` | Quem já usa o app não pode ser bloqueado | n |
| Seed do administrador | `seedUser` grava o usuário como `approved`, inclusive ao redefinir senha de conta existente | Impede que um cadastro pendente feito antes do seed com o `ADMIN_EMAIL` bloqueie o administrador | n |
| Estados de cadastro | `pending`, `approved`, `rejected`, `revoked`; transições: `pending`→`approved`, `pending`→`rejected`, `rejected`→`approved`, `approved`→`revoked`, `revoked`→`approved` | Pedido do usuário: revogar aprovados; `revoked` separado de `rejected` para mostrar a mensagem certa | n |
| Revogar versus excluir | Revogar bloqueia o acesso e mantém os dados e o e-mail ocupado; Excluir apaga o usuário e todos os dados dele em cascata (já configurada no schema) e libera o e-mail | Pedido do usuário: "excluir ou revogar"; revogar é reversível, excluir não | y |
| Excluir exige confirmação | Diálogo "Excluir X? Isso apaga todas as categorias, transações e o objetivo dessa pessoa. Não dá para desfazer" com botões Cancelar e Excluir | Ação irreversível sobre dados financeiros | n |
| Administrador age sobre si mesmo | Não pode revogar nem excluir a própria conta; a linha dele não aparece na lista | Evita ficar sem administrador | n |
| Excluir usuário que já saiu do estado visto na lista | Excluir vale em qualquer status e, se o usuário não existir mais, responde "Cadastro não encontrado" | Evita erro em duas abas abertas | n |
| Cadastro rejeitado tenta se cadastrar de novo | Bloqueado como e-mail já cadastrado; o administrador pode aprovar o rejeitado | Evita reenvio em loop sem criar fluxo extra | n |
| Tamanho da senha | 8 a 128 caracteres | Padrão do Better Auth usado na conta existente | n |
| Tamanho do nome | 1 a 80 caracteres após remover espaços nas pontas | Limite simples contra entrada absurda | n |
| E-mail duplicado revela existência | Sim, mensagem "Este e-mail já está cadastrado" | App privado e fechado; clareza vale mais que ocultar | n |
| Senha errada de conta pendente ou rejeitada | Mensagem genérica "E-mail ou senha inválidos"; o aviso de pendente ou rejeitado só aparece com a senha correta | Não revela o status a quem não sabe a senha | n |
| Bloqueio por tentativas de login | Segue a regra existente (5 falhas em 15 minutos, `login_attempt`); login de conta pendente ou rejeitado com senha correta não conta como falha | Reaproveita AUTH-03 e não pune quem só aguarda | n |
| Sessão de usuário rejeitado ou revogado | Rejeitar e revogar apagam as sessões do usuário | Garante efeito imediato mesmo com sessão aberta; o custo é uma exclusão | n |
| Rastro da decisão | Guarda quando o cadastro foi criado e quando foi decidido ou revogado (`decided_at`) | Mínimo de auditoria; sem log de quem decidiu, pois há um só administrador | n |
| Observabilidade | N/A: sem log, métrica ou tracing novos | O projeto não tem camada de observabilidade | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Cadastro e bloqueio até aprovação ⭐ MVP

**User Story**: As a visitante, I want me cadastrar informando só nome, e-mail e senha so that o administrador possa liberar meu acesso.

**Why P1**: Sem o cadastro e sem o bloqueio não existe a feature; o bloqueio é a garantia que o usuário pediu.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o visitante envia o formulário de `/cadastro` com nome, e-mail e senha válidos THEN the system SHALL criar o usuário com status `pending`, não criar sessão e exibir a mensagem "Cadastro enviado. Você poderá entrar quando o administrador aprová-lo".  <!-- event-driven -->
2. IF o nome estiver vazio após remover espaços das pontas THEN the system SHALL rejeitar o cadastro com a mensagem "Informe seu nome" no campo nome e não criar usuário.  <!-- unwanted -->
3. IF o nome tiver mais de 80 caracteres THEN the system SHALL rejeitar o cadastro com a mensagem "O nome deve ter no máximo 80 caracteres" e não criar usuário.  <!-- unwanted -->
4. IF o e-mail não tiver formato válido THEN the system SHALL rejeitar o cadastro com a mensagem "Informe um e-mail válido" e não criar usuário.  <!-- unwanted -->
5. IF a senha tiver menos de 8 caracteres THEN the system SHALL rejeitar o cadastro com a mensagem "A senha deve ter pelo menos 8 caracteres" e não criar usuário.  <!-- unwanted -->
6. IF a senha tiver mais de 128 caracteres THEN the system SHALL rejeitar o cadastro com a mensagem "A senha deve ter no máximo 128 caracteres" e não criar usuário.  <!-- unwanted -->
7. IF o e-mail normalizado já existir como usuário em qualquer status THEN the system SHALL rejeitar o cadastro com a mensagem "Este e-mail já está cadastrado" e não alterar o usuário existente.  <!-- unwanted -->
8. WHEN dois cadastros com o mesmo e-mail normalizado chegam ao mesmo tempo THEN the system SHALL criar exatamente um usuário e responder ao outro com "Este e-mail já está cadastrado".  <!-- event-driven, concurrency -->
9. WHEN um usuário `pending` envia e-mail e senha corretos no login THEN the system SHALL não criar sessão, não registrar falha de login e exibir "Sua conta está aguardando aprovação do administrador".  <!-- event-driven -->
10. WHEN um usuário `rejected` envia e-mail e senha corretos no login THEN the system SHALL não criar sessão, não registrar falha de login e exibir "Seu cadastro não foi aprovado".  <!-- event-driven -->
11. WHEN um usuário `pending`, `rejected` ou `revoked` envia senha incorreta no login THEN the system SHALL registrar a falha e exibir "E-mail ou senha inválidos".  <!-- event-driven -->
12. WHEN um usuário `revoked` envia e-mail e senha corretos no login THEN the system SHALL não criar sessão, não registrar falha de login e exibir "Seu acesso foi revogado".  <!-- event-driven -->
13. WHILE o usuário autenticado tiver status diferente de `approved`, the system SHALL tratar qualquer página ou Server Action protegida como sem sessão (redirecionar para `/login` ou retornar `UNAUTHORIZED`) sem ler nem gravar dados.  <!-- state-driven -->
14. WHEN o usuário for rejeitado ou revogado THEN the system SHALL apagar todas as sessões desse usuário.  <!-- event-driven -->
15. The system SHALL permitir acessar `/cadastro` sem sessão, com link "Já tenho conta" para `/login`, e `/login` SHALL ter link "Criar conta" para `/cadastro`.  <!-- ubiquitous -->
16. The system SHALL guardar a senha do cadastro apenas como hash salgado do Better Auth, no mesmo formato da conta existente.  <!-- ubiquitous -->
17. WHEN a migração é aplicada THEN the system SHALL marcar todos os usuários já existentes como `approved`.  <!-- event-driven -->
18. WHEN o seed do administrador roda THEN the system SHALL gravar o usuário como `approved`, mesmo que ele já exista em outro status.  <!-- event-driven -->

**Independent Test**: Cadastrar "Ana", `ana@x.com`, senha de 8 caracteres; ver a mensagem de envio; tentar entrar e ver "Sua conta está aguardando aprovação do administrador"; abrir `/` e ser levado para `/login`.

---

### P1: Administrador decide os cadastros ⭐ MVP

**User Story**: As a administrador, I want aprovar, rejeitar, revogar ou excluir usuários em uma tela do app so that só quem eu autorizo use a aplicação.

**Why P1**: Sem a decisão ninguém novo consegue entrar; é a outra metade do MVP.

**Acceptance Criteria**:

1. WHEN o administrador abre `/admin/cadastros` THEN the system SHALL listar todos os usuários, exceto o próprio administrador, com nome, e-mail, status e data do cadastro, com `pending` primeiro e depois os demais, cada grupo do mais antigo ao mais novo.  <!-- event-driven -->
2. WHEN não há nenhum usuário além do administrador THEN the system SHALL exibir "Nenhum cadastro".  <!-- event-driven -->
3. WHEN o administrador aprova um usuário `pending`, `rejected` ou `revoked` THEN the system SHALL mudar o status para `approved`, gravar `decided_at` e permitir que ele entre com e-mail e senha.  <!-- event-driven -->
4. WHEN o administrador rejeita um usuário `pending` THEN the system SHALL mudar o status para `rejected` e gravar `decided_at`.  <!-- event-driven -->
5. IF o administrador rejeitar um usuário que não está `pending` THEN the system SHALL manter o status e retornar "Este cadastro não está pendente".  <!-- unwanted -->
6. IF o administrador aprovar um usuário já `approved` THEN the system SHALL manter o status e `decided_at` sem erro.  <!-- unwanted, idempotency -->
7. IF a decisão apontar para um usuário inexistente THEN the system SHALL retornar "Cadastro não encontrado" sem alterar dados.  <!-- unwanted -->
8. WHEN o administrador visita `/admin/cadastros` sem ser administrador (sessão aprovada de outro usuário) THEN the system SHALL redirecionar para `/`.  <!-- event-driven -->
9. IF um usuário que não é administrador (ou sem sessão) chamar a ação de aprovar, rejeitar, revogar ou excluir THEN the system SHALL retornar `UNAUTHORIZED` sem alterar dados.  <!-- unwanted, auth -->
10. WHERE o usuário logado é o administrador, the system SHALL mostrar o item "Cadastros" no menu lateral; para os demais usuários o item SHALL não aparecer.  <!-- optional-feature -->
11. IF o banco falhar ao gravar a decisão THEN the system SHALL manter o status anterior e retornar "Não foi possível salvar. Tente novamente".  <!-- unwanted, failure -->
12. WHEN o administrador decide, revoga ou exclui um cadastro THEN the system SHALL atualizar a lista sem recarregar a página manualmente, mostrando o novo status ou removendo a linha excluída.  <!-- event-driven -->
13. WHEN o administrador revoga um usuário `approved` THEN the system SHALL mudar o status para `revoked`, gravar `decided_at`, apagar as sessões dele e manter os dados dele intactos.  <!-- event-driven -->
14. IF o administrador revogar um usuário que não está `approved` THEN the system SHALL manter o status e retornar "Este usuário não está aprovado".  <!-- unwanted -->
15. WHEN o administrador clica em Excluir THEN the system SHALL exibir o diálogo "Excluir {nome}? Isso apaga todas as categorias, transações e o objetivo dessa pessoa. Não dá para desfazer" com os botões Cancelar e Excluir, e não alterar dados até confirmar.  <!-- event-driven -->
16. WHEN o administrador confirma a exclusão THEN the system SHALL apagar o usuário, as sessões, as contas e todas as categorias, transações e objetivos dele, e liberar o e-mail para novo cadastro.  <!-- event-driven -->
17. IF a exclusão falhar no banco THEN the system SHALL não apagar nada (operação única) e retornar "Não foi possível salvar. Tente novamente".  <!-- unwanted, failure -->
18. IF o administrador tentar revogar ou excluir a própria conta (chamada direta da ação) THEN the system SHALL manter a conta e retornar "Não é possível revogar ou excluir o administrador".  <!-- unwanted -->
19. WHEN o usuário revogado ou excluído tinha sessão aberta e faz uma nova requisição THEN the system SHALL tratá-lo como sem sessão (redirecionar para `/login` ou retornar `UNAUTHORIZED`).  <!-- event-driven -->
20. WHERE o usuário listado está `approved`, the system SHALL mostrar as ações Revogar e Excluir; WHERE está `pending`, Aprovar, Rejeitar e Excluir; WHERE está `rejected` ou `revoked`, Aprovar e Excluir.  <!-- optional-feature -->

**Independent Test**: Com um cadastro pendente, entrar como administrador, abrir Cadastros, aprovar; o cadastrado consegue entrar. Depois revogar: ele perde o acesso e vê "Seu acesso foi revogado". Depois excluir: o e-mail pode se cadastrar de novo.

---

### P2: Isolamento do novo usuário

**User Story**: As a usuário aprovado, I want ver só os meus dados so that ninguém veja as finanças de outro.

**Why P2**: Já garantido pelo `user_id` nas tabelas; vira requisito verificado porque agora existem vários usuários.

**Acceptance Criteria**:

1. WHEN um usuário aprovado abre qualquer página do app THEN the system SHALL exibir apenas categorias, transações e objetivo com o `user_id` dele.  <!-- event-driven -->
2. WHEN um usuário aprovado recém-criado abre o app THEN the system SHALL mostrar o estado vazio, sem dados do administrador.  <!-- event-driven -->

**Independent Test**: Criar dados como administrador; entrar como o novo usuário e ver tudo vazio.

---

## Edge Cases

- IF o e-mail do cadastro difere do existente só por maiúsculas ou espaços nas pontas THEN the system SHALL tratá-lo como o mesmo e-mail (já coberto por SIGNUP-01, AC 7 do cadastro).
- IF o `ADMIN_EMAIL` não estiver definido THEN the system SHALL tratar todos como não administradores e negar `/admin/cadastros`.
- WHEN a sessão de um usuário aprovado ainda é válida e ele é o administrador THEN the system SHALL manter acesso a `/admin/cadastros` sem novo login.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | AC 2-7 do cadastro (nome 1-80, e-mail válido, senha 8-128) |
| Failure / partial-failure states | AC 11 e 17 da decisão; cadastro sem parcial: usuário e conta de senha criados juntos ou nenhum (design) |
| Idempotency / retry / duplicate handling | AC 7-8 do cadastro; AC 5-6 da decisão |
| Auth boundaries & rate limits | AC 9, 13 do cadastro; AC 8-9 e 18 da decisão; rate limit de cadastro N/A porque é risco aceito (premissas); login segue AUTH-03 |
| Concurrency / ordering | AC 8 do cadastro (cadastros simultâneos); decisões simultâneas: última vence dentro das transições válidas (AC 5-6, 14); exclusão concorrente: premissa de usuário inexistente |
| Data lifecycle / expiry | Exclusão apaga o usuário e seus dados (AC 16 da decisão); pendentes e rejeitados não expiram (N/A) |
| Observability | N/A because sem camada de observabilidade no projeto (premissas) |
| External-dependency failure | N/A because não há chamada externa nova; falha de banco coberta no AC 11 da decisão |
| State-transition integrity | Estados e transições nas premissas; AC 3-6, 13-14 da decisão; AC 13-14 do cadastro |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SIGNUP-01 | P1: Cadastro e bloqueio (AC 1-8, 14-15) | Specify | Pending |
| SIGNUP-02 | P1: Cadastro e bloqueio (AC 9-12) | Execute | In Progress |
| SIGNUP-03 | P1: Cadastro e bloqueio (AC 13-14) | Specify | Pending |
| SIGNUP-04 | P1: Cadastro e bloqueio (AC 17-18) | Specify | Pending |
| SIGNUP-05 | P1: Administrador decide (AC 1-7, 11-12) | Specify | Pending |
| SIGNUP-06 | P1: Administrador decide (AC 8-10, 18) | Specify | Pending |
| SIGNUP-08 | P1: Administrador decide (AC 13-14, 19) | Specify | Pending |
| SIGNUP-09 | P1: Administrador decide (AC 15-17, 20) | Execute | In Progress |
| SIGNUP-07 | P2: Isolamento (AC 1-2) | Specify | Pending |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️

---

## Success Criteria

- [ ] Um visitante conclui o cadastro em menos de 1 minuto preenchendo 3 campos.
- [ ] Zero acessos a página ou ação protegida por usuário `pending`, `rejected` ou `revoked`, verificado por teste de integração.
- [ ] O administrador aprova um cadastro em 2 cliques a partir do menu (Cadastros, Aprovar).
- [ ] Usuários existentes continuam entrando sem nenhuma ação após a migração.
