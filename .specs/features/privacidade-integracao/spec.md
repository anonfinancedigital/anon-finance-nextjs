# Privacidade integrada à aplicação Specification

## Problem Statement

A página `/privacidade` é standalone: não tem o header da área pública (Navbar da landing) para visitantes nem a sidebar do app para usuários logados. O item "Privacidade" da sidebar tira o usuário do shell e o visitante perde a navegação do site. A página precisa parecer parte da aplicação nos dois contextos, sem mudar a URL que login, cadastro e sidebar já usam.

## Goals

- [ ] Visitante vê `/privacidade` com o header da landing (Navbar) e o rodapé da landing.
- [ ] Usuário logado vê `/privacidade` dentro do shell do app (sidebar, barra inferior no mobile), com "Privacidade" ativo na navegação.
- [ ] A URL `/privacidade` continua a mesma nos dois contextos; nenhum link existente muda.
- [ ] O conteúdo da página existe em um só lugar, usado pelas duas versões.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Header nas telas de login, cadastro, esqueci-senha e redefinir-senha | Pedido cobre só a página de privacidade; essas telas são cartões de autenticação focados |
| Alterar a página `/conta` ("Privacidade e conta") | Tem exportação e exclusão próprias; continua como está |
| Mudar o conteúdo ou o copy da página de privacidade | Só a moldura (header, rodapé, shell) muda |
| Cabeçalho para páginas públicas futuras (ex.: termos) | Fica disponível como componente reutilizável, mas nenhuma outra página é migrada agora |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Como servir duas molduras na mesma URL | O proxy reescreve `/privacidade` para uma rota dentro do grupo `(app)` quando há cookie de sessão; sem cookie, serve a página pública | Mesmo padrão já usado para a landing em `/`; evita duplicar URL e quebrar links de login/cadastro/sidebar | n |
| Rota interna usada pela reescrita | `/seguranca`, protegida (exige sessão como qualquer página do `(app)`) | `/privacidade` já é pública; a rota interna precisa de outro caminho | n |
| Cookie de sessão inválido ou expirado em `/privacidade` | O visitante cai no login (o layout do app redireciona), igual ao comportamento atual da landing em `/` | O proxy só checa o cookie (otimista); validar a sessão ali custaria uma consulta ao banco em toda requisição | n |
| Links do header na página de privacidade | Âncoras apontam para `/#cockpit`, `/#apice`, `/#manifesto`; "Segurança" aponta para `/privacidade`; logo aponta para `/` | Na landing, `/#x` rola até a seção; fora dela, navega até a landing e rola | n |
| Rodapé | A versão pública mostra o mesmo rodapé da landing; a logada não mostra rodapé | O rodapé é parte da identidade pública; o shell do app não tem rodapé | n |
| Botão "Voltar" da página | Some na versão logada (a sidebar já navega); na pública, vira "Voltar ao início" apontando para `/` | O botão atual aponta para `/login`, que não faz sentido dentro de um site navegável | n |
| Item ativo da sidebar | O item "Privacidade" fica ativo em `/privacidade`; depende de `usePathname` devolver a URL do navegador numa reescrita | Verificar no teste manual; se devolver o caminho reescrito, a sidebar passa a tratar `/seguranca` também | n |
| Verificação | Lógica de roteamento do proxy em função pura com teste unitário; UI verificada por inspeção de código (AD-005, sem e2e) | Regra do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Visitante navega pelo site a partir da página de privacidade ⭐ MVP

**User Story**: As a visitante, I want the page de privacidade to keep the site's header so that I can go back to the product without losing my bearings.

**Why P1**: É o contexto do pedido para a área pública e o ponto de entrada de quem vem do login/cadastro/landing.

**Acceptance Criteria**:

1. WHEN a request for `/privacidade` has no session cookie THEN the system SHALL render the privacy content under the landing Navbar and the landing footer.
2. WHEN a visitor activates a Navbar link to a landing section (Cockpit, O Ápice, Manifesto) from `/privacidade` THEN the system SHALL navigate to `/` at that section's anchor (`/#cockpit`, `/#apice`, `/#manifesto`).
3. WHEN a visitor activates "Segurança" in the Navbar on `/privacidade` THEN the system SHALL stay on `/privacidade`.
4. WHEN a visitor activates "Entrar" or "Começar agora" in the Navbar THEN the system SHALL navigate to `/login` or `/cadastro` respectively.
5. WHEN a visitor activates "Voltar ao início" at the bottom of the page THEN the system SHALL navigate to `/`.
6. WHILE the viewport is narrower than the `md` breakpoint, the Navbar on `/privacidade` SHALL show the hamburger menu with the same links as on the landing.

**Independent Test**: Abrir `/privacidade` sem sessão: ver Navbar e rodapé; clicar em "O Ápice" leva à landing na seção do Ápice.

---

### P1: Usuário logado vê a privacidade dentro do app ⭐ MVP

**User Story**: As a usuário logado, I want the page de privacidade inside the app shell so that I can keep using the navigation.

**Why P1**: É o contexto do pedido para a área logada; hoje o item da sidebar leva para fora do shell.

**Acceptance Criteria**:

1. WHEN a request for `/privacidade` carries a session cookie THEN the system SHALL render the privacy content inside the app shell (sidebar on `md` and up, bottom bar below `md`).
2. WHEN the signed-in page renders THEN the system SHALL keep the browser URL as `/privacidade`.
3. WHILE the signed-in user is on `/privacidade`, the app navigation SHALL mark "Privacidade" as the current page.
4. WHEN the signed-in page renders THEN the system SHALL omit the landing Navbar, the landing footer and the "Voltar" button.
5. WHEN a signed-in account is legacy or lacks a birth date THEN the system SHALL redirect to `/proteger-dados` or `/data-nascimento` as every other page of the shell does.
6. IF a request for `/privacidade` carries a session cookie the server rejects THEN the system SHALL redirect to `/login`.

**Independent Test**: Logado, clicar em "Privacidade" na sidebar: a página abre com a sidebar visível e o item destacado; a URL é `/privacidade`.

---

### P2: Conteúdo único e rota interna protegida

**User Story**: As a mantenedor, I want one source for the content and a protected internal route so that the two frames never drift apart.

**Why P2**: Evita duplicar a página e fecha a rota interna para visitantes.

**Acceptance Criteria**:

1. The system SHALL render both versions from one shared content component, so a text change appears in both.
2. WHEN a request for `/seguranca` has no session cookie THEN the system SHALL redirect to `/login`.
3. The routing decision of the proxy for `/`, `/privacidade`, `/seguranca` and any other protected path SHALL live in a pure function covered by unit tests.

**Independent Test**: Teste unitário da função de roteamento cobre as combinações caminho × sessão.

---

## Edge Cases

- IF a visitor opens `/seguranca` directly THEN the system SHALL redirect to `/login`.
- WHEN a signed-in user opens `/privacidade/qualquer-coisa` THEN the system SHALL keep the current behavior of unknown paths (no rewrite).
- WHEN a request reaches `/` without a session cookie THEN the system SHALL keep serving the landing page (behavior unchanged).
- WHEN a request reaches any other public path (`/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha`, `/bem-vindo`) THEN the system SHALL keep its current routing.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PRIV-01 | P1: Visitante navega pelo site | Task 2 | Implementing |
| PRIV-02 | P1: Visitante navega pelo site | Task 2 | Implementing |
| PRIV-03 | P1: Visitante navega pelo site | Task 2 | Implementing |
| PRIV-04 | P1: Visitante navega pelo site | Task 2 | Implementing |
| PRIV-05 | P1: Visitante navega pelo site | Task 2 | Implementing |
| PRIV-06 | P1: Visitante navega pelo site | Task 2 | Implementing |
| PRIV-07 | P1: Usuário logado vê a privacidade dentro do app | Task 2 | Implementing |
| PRIV-08 | P1: Usuário logado vê a privacidade dentro do app | Task 2 | Implementing |
| PRIV-09 | P1: Usuário logado vê a privacidade dentro do app | Task 2 | Implementing |
| PRIV-10 | P1: Usuário logado vê a privacidade dentro do app | Task 2 | Implementing |
| PRIV-11 | P1: Usuário logado vê a privacidade dentro do app | Task 2 | Implementing |
| PRIV-12 | P1: Usuário logado vê a privacidade dentro do app | Task 2 | Implementing |
| PRIV-13 | P2: Conteúdo único e rota interna protegida | Task 2 | Implementing |
| PRIV-14 | P2: Conteúdo único e rota interna protegida | Task 1 | Implementing |
| PRIV-15 | P2: Conteúdo único e rota interna protegida | Task 1 | Implementing |

**Coverage:** 15 total, 0 mapped to tasks, 15 unmapped ⚠️

---

## Success Criteria

- [ ] Nenhuma tela de privacidade fica sem navegação: visitante tem Navbar, logado tem sidebar.
- [ ] Todos os links existentes para `/privacidade` (login, cadastro, sidebar, conta, landing) continuam funcionando sem alteração.
- [ ] A função de roteamento do proxy tem testes passando para todas as combinações do spec.
