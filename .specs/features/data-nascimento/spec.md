# Data de Nascimento no Cadastro Specification

## Problem Statement

A data de nascimento só existe hoje dentro do objetivo de Liberdade (`financial_goal.birth_date`), então só quem salvou um objetivo a tem, e outras features que dependam de idade não têm de onde lê-la. Esta feature (NASC-01 a NASC-12) passa a pedir a data no cadastro, guarda-a no usuário como fonte única, leva quem ainda não tem data a informá-la no próximo acesso e faz o objetivo de Liberdade ler a data do usuário em vez de pedi-la de novo.

## Goals

- [ ] Todo cadastro novo informa a data de nascimento e a conta nasce com ela gravada.
- [ ] Toda conta aprovada sem data é levada a informá-la antes de usar qualquer outra página do app.
- [ ] A data vive só em `user.birth_date`; o objetivo de Liberdade não a pede nem a guarda.
- [ ] Quem já salvou objetivo não perde a data nem é questionado de novo.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Mostrar a idade ou a data em outras telas, ou novas features que usem a data | A data é só a base; cada feature futura decide seu uso |
| Perfil completo de usuário (foto, nome editável, e-mail editável) | Pedido é só a data de nascimento |
| Administrador ver ou editar a data de outro usuário | Dado pessoal; a tela de cadastros não precisa dele |
| Idade mínima para se cadastrar | Pedido não fixa idade mínima; a única regra é data real e não futura |
| Pedir a data a quem não está `approved` | Esses usuários não entram no app; o cadastro já traz a data |
| Testes e2e novos | Suspensos pela AD-005; unit e integration continuam obrigatórios |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Contas existentes | `user.birth_date` é nullable; contas existentes com objetivo salvo recebem a data do objetivo na migração; as demais ficam `NULL` e são levadas à tela de data no próximo acesso | Escolha do usuário (pedir no próximo acesso); a migração evita pedir de novo a quem já informou | y |
| Objetivo de Liberdade | Fonte única: remove `financial_goal.birth_date`; o formulário do objetivo deixa de ter o campo; o domínio continua recebendo `birthDate` do usuário | Escolha do usuário | y |
| Onde a pergunta aparece para conta sem data | Página `/data-nascimento` dentro da área logada; o layout `(app)` redireciona para ela toda página do app (inclusive `/admin/cadastros`) enquanto `birth_date` for `NULL`; Server Actions de dados não são bloqueadas por isso | Mantém o guard simples; a proteção real de dados continua sendo `status = approved` (AD-009) | n |
| Obrigatoriedade no cadastro | Obrigatória no formulário e na validação de `signUpAction`; a coluna fica nullable só por causa das contas antigas | Pedido: "pedir no cadastro" | n |
| Formato de entrada | Texto `DD/MM/AAAA` com máscara (`maskDateInput`), convertido por `brToIso`; guardado como `date` (`AAAA-MM-DD`) | Mesmo padrão do formulário do objetivo | n |
| Regras de validade | Data existente no calendário, não futura (dia de hoje em America/Sao_Paulo é aceito) e idade atual de no máximo 120 anos | Reaproveita as regras hoje em `goalSchema` | n |
| Mensagens de validação | "Informe a data de nascimento"; "Data de nascimento inválida"; "A data de nascimento não pode ser futura"; "A idade atual deve ser de no máximo 120 anos" | Mesmas mensagens do objetivo, para não mudar o texto que o usuário já conhece | n |
| Alterar a data depois de salva | Permitido em `/data-nascimento` (a mesma página, pré-preenchida), com link "Alterar data de nascimento" no formulário do objetivo; sem histórico | Sem o campo no objetivo, um erro de digitação ficaria sem correção | n |
| Alterar a data com objetivo salvo e idade da independência já atingida | A alteração é recusada com "A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (N)" | Mantém o invariante `retirementAge > idade atual` do objetivo | n |
| Fuso do "hoje" | America/Sao_Paulo, via `today(now)` de `validation/goal.ts` | Convenção do projeto | n |
| Falha ao gravar | Mensagem `SAVE_FAILED` existente, nada gravado | Convenção das actions | n |
| Segurança | `birth_date` não é campo de entrada do Better Auth (`input: false`); só o cadastro e a action de `/data-nascimento` o gravam; cada usuário grava só a própria | Evita cliente definir o campo por endpoint público | n |
| Observabilidade | N/A: sem log, métrica ou tracing novos | O projeto não tem camada de observabilidade | n |
| Concorrência | N/A: última gravação vence na edição da própria data; duplicidade de e-mail no cadastro segue a regra existente | Sem recurso compartilhado novo | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Data de nascimento no cadastro ⭐ MVP

**User Story**: As a visitante, I want informar minha data de nascimento ao me cadastrar so that o app possa usá-la em features que dependem da minha idade.

**Why P1**: Sem o campo no cadastro nenhuma conta nova tem a data.

**Acceptance Criteria** (each line is one EARS pattern):

1. The formulário de `/cadastro` SHALL ter o campo "Data de nascimento" com máscara `DD/MM/AAAA`, entre "E-mail" e "Senha". <!-- NASC-01, ubiquitous -->
2. WHEN o visitante envia nome, e-mail, senha e data de nascimento válidos THEN the system SHALL criar o usuário `pending` com `birth_date` igual à data informada em `AAAA-MM-DD`, na mesma transação que cria a conta de senha. <!-- NASC-02, event-driven -->
3. IF a data de nascimento estiver vazia THEN the system SHALL rejeitar o cadastro com "Informe a data de nascimento" no campo e não criar usuário. <!-- NASC-03, unwanted -->
4. IF a data de nascimento não for uma data existente no formato `DD/MM/AAAA` (ex.: `31/02/1990`, `1990-01-01`) THEN the system SHALL rejeitar o cadastro com "Data de nascimento inválida" e não criar usuário. <!-- NASC-04, unwanted -->
5. IF a data de nascimento for posterior ao dia de hoje em America/Sao_Paulo THEN the system SHALL rejeitar o cadastro com "A data de nascimento não pode ser futura" e não criar usuário. <!-- NASC-05, unwanted -->
6. IF a idade calculada na data de nascimento for maior que 120 anos THEN the system SHALL rejeitar o cadastro com "A idade atual deve ser de no máximo 120 anos" e não criar usuário. <!-- NASC-06, unwanted -->
7. WHEN a data de nascimento é igual ao dia de hoje em America/Sao_Paulo THEN the system SHALL aceitá-la. <!-- NASC-07, event-driven, boundary -->

**Independent Test**: Cadastrar com `18/09/1993` → usuário `pending` com `birth_date = 1993-09-18`; repetir com `31/02/1993`, vazio e data de amanhã → cada uma recusada com a mensagem acima e nenhum usuário criado.

---

### P1: Contas sem data informam no próximo acesso

**User Story**: As a usuário já cadastrado, I want ser avisado e informar minha data de nascimento ao entrar so that minha conta fique completa sem perder acesso aos meus dados.

**Why P1**: Sem isso as contas antigas ficam sem a data para sempre.

**Acceptance Criteria**:

1. WHILE o usuário `approved` tiver `birth_date` `NULL`, the system SHALL redirecionar qualquer página do grupo `(app)`, exceto `/data-nascimento`, para `/data-nascimento`. <!-- NASC-08, state-driven -->
2. WHEN o usuário sem data envia uma data válida em `/data-nascimento` THEN the system SHALL gravar `birth_date` e redirecionar para `/`. <!-- NASC-09, event-driven -->
3. IF a data enviada em `/data-nascimento` violar as regras de NASC-03 a NASC-06 THEN the system SHALL exibir a mesma mensagem no campo e não alterar o usuário. <!-- NASC-10, unwanted -->
4. The migração SHALL copiar `financial_goal.birth_date` para `user.birth_date` de todo usuário com objetivo salvo e deixar `NULL` nos demais. <!-- NASC-11, ubiquitous -->

**Independent Test**: Usuário aprovado sem objetivo e sem data abre `/` → cai em `/data-nascimento`; envia `18/09/1993` → vai para `/` e não é redirecionado de novo. Usuário com objetivo salvo antes da migração entra direto, sem a pergunta.

---

### P1: Objetivo de Liberdade lê a data do usuário

**User Story**: As a usuário, I want não digitar minha data de nascimento de novo no objetivo so that a informação fique em um só lugar.

**Why P1**: Sem remover o campo do objetivo existiriam duas datas que podem divergir.

**Acceptance Criteria**:

1. The formulário do objetivo (gaveta e estado vazio) SHALL não ter o campo "Data de nascimento", e SHALL exibir a data do usuário como texto com o link "Alterar data de nascimento" para `/data-nascimento`. <!-- NASC-12, ubiquitous -->
2. WHEN o usuário salva o objetivo THEN the system SHALL validar a idade da independência contra a idade calculada de `user.birth_date` e SHALL não gravar `birth_date` em `financial_goal`. <!-- NASC-13, event-driven -->
3. IF a idade da independência informada for menor ou igual à idade atual do usuário THEN the system SHALL rejeitar o objetivo com "A idade da independência deve ser maior que a idade atual (N)", onde N é a idade atual. <!-- NASC-14, unwanted -->
4. The cálculos e a prévia do simulador (`summarize`, `monthsUntilRetirement`, `ageOn`) SHALL produzir os mesmos resultados de hoje para a mesma data de nascimento, com a data vinda do usuário. <!-- NASC-15, ubiquitous -->

**Independent Test**: Usuário com `18/09/1993` abre o objetivo → não vê campo de data, vê "18/09/1993" e o link; salva com idade 55 → resumo idêntico ao de um objetivo antigo com a mesma data.

---

### P2: Alterar a data de nascimento

**User Story**: As a usuário, I want corrigir minha data de nascimento so that um erro de digitação não me prenda a cálculos errados.

**Why P2**: O MVP já grava e usa a data; corrigir é importante, mas não bloqueia o resto.

**Acceptance Criteria**:

1. WHEN o usuário que já tem data abre `/data-nascimento` THEN the system SHALL exibir o formulário pré-preenchido com a data atual em `DD/MM/AAAA`. <!-- NASC-16, event-driven -->
2. WHEN o usuário envia uma data válida diferente da atual THEN the system SHALL atualizar `user.birth_date` e exibir "Data de nascimento atualizada". <!-- NASC-17, event-driven -->
3. IF o usuário tem objetivo salvo e a nova data deixa a idade atual igual ou maior que a idade da independência do objetivo THEN the system SHALL recusar a alteração com "A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (N)", onde N é essa idade, e manter a data anterior. <!-- NASC-18, unwanted -->

**Independent Test**: Com data `18/09/1993` e objetivo de independência aos 50, enviar `18/09/1960` (idade 66) → recusada com N = 50; enviar `18/09/1990` → atualizada.

---

## Edge Cases

- IF o usuário não está `approved` THEN `/data-nascimento` SHALL tratá-lo como sem sessão (redireciona para `/login`), pelo mesmo guard das demais páginas.
- IF a Server Action de `/data-nascimento` for chamada sem sessão aprovada THEN the system SHALL responder `UNAUTHORIZED` sem gravar nada.
- IF um cliente tentar enviar `birthDate` por um endpoint público do Better Auth THEN the system SHALL ignorar o campo (`input: false`).
- IF `saveGoal` for chamada por usuário sem `birth_date` THEN the system SHALL responder "Informe sua data de nascimento antes de salvar o objetivo" e não gravar o objetivo.
- WHEN a data é `29/02` de ano bissexto THEN the system SHALL aceitá-la e calcular a idade como em `ageOn` (aniversário em 28/02 nos anos não bissextos).
- WHEN a data escolhida torna a idade exatamente 120 anos hoje THEN the system SHALL aceitá-la (limite inclusivo, como no objetivo).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| NASC-01 | P1: Data no cadastro (AC 1) | Specify | Implemented |
| NASC-02 | P1: Data no cadastro (AC 2) | Specify | Implemented |
| NASC-03 | P1: Data no cadastro (AC 3) | Specify | Implemented |
| NASC-04 | P1: Data no cadastro (AC 4) | Specify | Implemented |
| NASC-05 | P1: Data no cadastro (AC 5) | Specify | Implemented |
| NASC-06 | P1: Data no cadastro (AC 6) | Specify | Implemented |
| NASC-07 | P1: Data no cadastro (AC 7) | Specify | Implemented |
| NASC-08 | P1: Contas sem data (AC 1) | Specify | Pending |
| NASC-09 | P1: Contas sem data (AC 2) | Specify | Implemented |
| NASC-10 | P1: Contas sem data (AC 3) | Specify | Pending |
| NASC-11 | P1: Contas sem data (AC 4) | Specify | Implemented |
| NASC-12 | P1: Objetivo lê a data (AC 1) | Specify | Pending |
| NASC-13 | P1: Objetivo lê a data (AC 2) | Specify | Pending |
| NASC-14 | P1: Objetivo lê a data (AC 3) | Specify | Pending |
| NASC-15 | P1: Objetivo lê a data (AC 4) | Specify | Implemented |
| NASC-16 | P2: Alterar a data (AC 1) | Specify | Pending |
| NASC-17 | P2: Alterar a data (AC 2) | Specify | Pending |
| NASC-18 | P2: Alterar a data (AC 3) | Specify | Pending |

**Coverage:** 18 total, 0 mapped to tasks, 18 unmapped ⚠️

---

## Success Criteria

- [ ] 100% dos cadastros novos têm `birth_date` preenchido.
- [ ] Nenhum usuário `approved` com `birth_date` `NULL` consegue abrir outra página do app sem passar por `/data-nascimento`.
- [ ] `financial_goal` não tem mais a coluna `birth_date` e os resultados do simulador para uma mesma data não mudam.
