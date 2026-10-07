# Senha Visível e Confirmação de Senha Specification

## Problem Statement

Os campos de senha do login e do cadastro não permitem conferir o que foi digitado, e o cadastro aceita uma senha com erro de digitação, que a pessoa só descobre ao tentar entrar. A feature adiciona um botão de mostrar/ocultar senha nos dois formulários e um campo "Confirmar senha" no cadastro, que bloqueia a criação da conta quando as senhas diferem.

## Goals

- [ ] Login e cadastro têm botão de mostrar/ocultar em todo campo de senha.
- [ ] Nenhum usuário é criado quando "Senha" e "Confirmar senha" diferem.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Indicador de força da senha | Não pedido |
| Preservar nome e e-mail após erro de envio | Comportamento atual do formulário; não muda nesta feature |
| Campo de confirmação no login | Só o cadastro cria senha |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Onde a confirmação é validada | No `signupSchema` (servidor), com o campo `confirmPassword` | Servidor é a fonte de verdade; o schema já é testado em unidade | n |
| Mensagem de senhas diferentes | "As senhas não coincidem", exibida abaixo de "Confirmar senha" | L-002: texto exato na spec | n |
| Comparação | Igualdade exata, sem trim e sem diferenciar nada além de caracteres idênticos | A senha não é trimada em nenhum ponto hoje | n |
| Confirmação vazia | Também falha com "As senhas não coincidem" | Uma única mensagem para qualquer divergência | n |
| Validação em tempo real | O cliente compara "Senha" e "Confirmar senha" a cada alteração e mostra o mesmo texto "As senhas não coincidem" abaixo de "Confirmar senha"; o servidor continua validando no envio | Pedido do usuário; o servidor segue como fonte de verdade | y |
| Quando o aviso aparece | Só quando "Confirmar senha" não está vazia e difere de "Senha"; some quando passam a coincidir; não aparece enquanto a confirmação está vazia | Não acusar erro antes de a pessoa começar a digitar a confirmação | n |
| Alteração em "Senha" depois de confirmar | A comparação também roda ao alterar "Senha" | Evita deixar o aviso desatualizado | n |
| Envio com divergência | O botão "Cadastrar" fica desabilitado enquanto o aviso estiver visível | O erro está ao lado do campo e o servidor barra qualquer envio forçado | n |
| Estado dos campos de senha | Os dois campos viram controlados; seus valores permanecem após erro de envio do servidor | Necessário para comparar em tempo real | n |
| Visibilidade independente | Cada campo de senha tem seu próprio botão e estado | Evita revelar um campo ao alternar o outro | n |
| Persistência da visibilidade | Estado local; volta a oculto ao recarregar | Sem requisito de lembrar a escolha | n |
| Componente | `PasswordInput` reutilizável em `src/components/`, com ícones `Eye`/`EyeOff` do `lucide-react` | Evita duplicar o botão em três campos | n |
| Teste de UI | O projeto não tem Testing Library; a UI é verificada no navegador, a regra de confirmação por teste de unidade e de integração | Não introduzir dependência nova por uma mudança pequena | n |
| Remaining dimensions | N/A: sem persistência nova, concorrência ou chamada externa nova | Só muda formulário e validação de entrada | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Mostrar e ocultar senha ⭐ MVP

**User Story**: As a visitante, I want ver o que digitei no campo de senha so that eu evite erros de digitação.

**Why P1**: Pedido central; vale para login e cadastro.

**Acceptance Criteria**:

1. Todo campo de senha do login e do cadastro SHALL iniciar com `type="password"`.
2. WHEN a pessoa clica no botão de olho de um campo de senha THEN the system SHALL alternar só esse campo entre `type="password"` e `type="text"`.
3. WHILE a senha de um campo estiver visível the system SHALL exibir o ícone `EyeOff` e `aria-label="Ocultar senha"` no botão desse campo; caso contrário SHALL exibir `Eye` e `aria-label="Mostrar senha"`.
4. WHEN a pessoa alterna a visibilidade THEN the system SHALL manter o valor digitado no campo.
5. O botão SHALL ter `type="button"`, de modo que clicar nele não envie o formulário.
6. O campo de senha do login SHALL manter `name="password"`, `id="password"` e `autoComplete="current-password"`.

**Independent Test**: Abrir `/login`, digitar "abc12345", clicar no olho e ver o texto; clicar de novo e ver pontos.

---

### P1: Confirmar senha no cadastro ⭐ MVP

**User Story**: As a visitante, I want repetir a senha no cadastro so that eu não crie uma conta com senha digitada errado.

**Why P1**: Pedido central; evita conta inacessível.

**Acceptance Criteria**:

1. O formulário de cadastro SHALL ter um campo "Confirmar senha" com `name="confirmPassword"`, `autoComplete="new-password"` e `required`, depois do campo "Senha".
2. IF "Confirmar senha" for diferente de "Senha" THEN the system SHALL rejeitar o envio com o erro "As senhas não coincidem" no campo `confirmPassword` e SHALL NOT criar usuário.
3. IF "Confirmar senha" estiver vazio THEN the system SHALL rejeitar o envio com o erro "As senhas não coincidem" no campo `confirmPassword` e SHALL NOT criar usuário.
4. WHEN "Senha" e "Confirmar senha" são idênticas e os demais campos são válidos THEN the system SHALL criar o cadastro pendente como hoje.
5. IF "Senha" tiver menos de 8 caracteres THEN the system SHALL manter o erro "A senha deve ter pelo menos 8 caracteres" no campo `password`, e SHALL NOT exibir "As senhas não coincidem" quando ambos os campos forem idênticos.
6. IF a ação de cadastro receber `confirmPassword` ausente THEN the system SHALL rejeitar com "As senhas não coincidem" e SHALL NOT criar usuário.

7. WHEN a pessoa altera "Senha" ou "Confirmar senha" e "Confirmar senha" não está vazia e difere de "Senha" THEN the system SHALL exibir "As senhas não coincidem" abaixo de "Confirmar senha" sem enviar o formulário.
8. WHEN "Senha" e "Confirmar senha" passam a ser idênticas THEN the system SHALL remover o aviso "As senhas não coincidem".
9. WHILE "Confirmar senha" estiver vazia the system SHALL NOT exibir o aviso "As senhas não coincidem".
10. WHILE o aviso "As senhas não coincidem" estiver visível the system SHALL manter o botão "Cadastrar" desabilitado.

**Independent Test**: Em `/cadastro`, preencher senhas diferentes e ver o erro sem conta criada; preencher iguais e ver a mensagem de cadastro enviado.

---

## Edge Cases

- IF as duas senhas forem diferentes só por um espaço no fim THEN the system SHALL rejeitar com "As senhas não coincidem".
- WHEN a senha tem 128 caracteres e a confirmação é idêntica THEN the system SHALL aceitar.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PWD-01 | P1: Mostrar e ocultar senha (critérios 1-6) | Execute | Verified |
| PWD-02 | P1: Confirmar senha (critério 1, UI) | Execute | Verified |
| PWD-03 | P1: Confirmar senha (critérios 2-3, 6, edge de espaço) | Execute | Verified |
| PWD-04 | P1: Confirmar senha (critérios 4-5, edge de 128) | Execute | Verified |
| PWD-05 | P1: Confirmar senha (critérios 7-10, validação em tempo real) | Execute | Verified |

**Coverage:** 5 total, 5 verified (Tasks foi pulado: Medium)

---

## Success Criteria

- [ ] Nenhum cadastro é criado com senhas diferentes (teste de integração da `signUpAction`).
- [ ] Os três campos de senha alternam visibilidade no navegador sem enviar o formulário.
- [ ] O aviso de divergência aparece e some enquanto a pessoa digita, sem enviar o formulário.
