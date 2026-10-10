# Rebrand ANON Specification

## Problem Statement

As marcas "Vértice" (produto) e "Ápice" (nome da meta de independência financeira) já estão ocupadas no mercado. O produto passa a se chamar **ANON**, com o descritor **Finanças Privadas**, e os ativos novos estão em `docs/marca/`. Hoje o nome antigo aparece no logo, nos favicons, nos metadados, nas telas de acesso, na landing, na política de privacidade, na navegação, no arquivo da chave de recuperação e nos docs.

## Goals

- [ ] Nenhuma tela, título de aba, metadado ou arquivo baixado pelo usuário exibe "Vértice" nem "Ápice" (nem "ápice patrimonial").
- [ ] O logo, o favicon e o ícone do app são os SVGs de `docs/marca/`, com variante clara e escura seguindo o tema.
- [ ] A landing e o rodapé usam o descritor "Finanças Privadas" e o slogan "O planejamento do seu patrimônio com privacidade absoluta."
- [ ] `npm run typecheck`, lint e testes unitários passam com os textos novos.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Renomear rotas (`/liberdade`, `/categorias`), âncora de rota, tabelas, colunas, actions, tipos e arquivos de domínio (`freedom.ts`, `freedom-copy.ts`) | Mudança só de apresentação; URLs e dados existentes continuam válidos (mesmo critério da spec `identidade-vertice`). |
| Renomear IDs de requisito `APICE-xx` e identificadores internos em comentários de código | Rastreabilidade histórica; não é interface. |
| Reescrever specs, validações e `STATE.md` antigos | Registro histórico do que foi entregue na época; só a spec nova registra o rebrand. |
| Renomear pacote npm, repositório, pasta do projeto | Não é interface do app. |
| Registrar domínio, trocar URL de produção, configurar e-mail do domínio | Decisão de negócio em aberto (useanon.com, anon.app etc.); sem efeito no código. |
| Slogans das opções 1 e 2 | O usuário escolheu a opção 3. |
| Gerar PNGs, `apple-touch-icon` e `manifest` | Não existiam antes; permanecem no roadmap mobile (`docs/mobile-roadmap.md` só troca o nome e a origem do SVG). |
| Mudar a paleta de tokens OKLCH do app | Os hex da marca ficam dentro dos SVGs. |
| Mudar cálculos, validações ou criptografia | Rebrand não toca regra de negócio; contextos e rótulos de cifra ficam como estão para não invalidar dados existentes. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Nome da funcionalidade "Ápice" | Vira **"Liberdade"** no menu, título da página e da aba, card de primeiros passos e checklist de onboarding. Termos de copy: "Definir Ápice" → "Definir meta"; "seu Ápice" → "sua meta"; "Meta do Ápice" → "Meta de liberdade"; "ápice patrimonial" → "patrimônio-alvo" | O usuário pediu termo neutro; a rota `/liberdade` e as specs `liberdade-*` já usam "Liberdade" | n |
| Descritor | "Finanças Privadas" | Escolhido pelo usuário; já está nos SVGs | y |
| Slogan | "O planejamento do seu patrimônio com privacidade absoluta." (opção 3) | Escolhido pelo usuário | y |
| Subtítulo "Gestão Patrimonial Familiar" (login, cadastro, esqueci-senha, redefinir-senha, `description`) | Troca por "Finanças Privadas" | O descritor substitui a frase antiga | n |
| Logo no app | `Logo.tsx` passa a desenhar o monograma "A" com a fenda, texto HTML "ANON" em Sora e descritor "Finanças Privadas"; gradiente e cores do monograma seguem as variantes dark/light dos SVGs, escolhidas pelo tema | O texto em HTML herda a fonte e o token de cor, igual à decisão da `identidade-vertice`; as duas variantes cobrem os dois temas | n |
| Favicon | `src/app/icon.svg` e `public/favicon.svg` recebem `anon_favicon_dark.svg`; o favicon claro entra como `icon` com `media="(prefers-color-scheme: light)"` via `metadata.icons` | A aba do navegador não segue o tema do app, e sim o do sistema | n |
| Ativos de marca | Os 8 SVGs ficam em `docs/marca/` (fonte); `docs/vertice_logo.svg` e `docs/vertice_favicon.svg` são removidos; `docs/marca/anon_asset_preview.png` permanece | Evita duas marcas no repositório | n |
| Nome do arquivo da chave de recuperação | `chave-de-recuperacao-anon.txt` | Nome visível ao usuário | n |
| Âncora `#apice` da landing | Vira `#liberdade` na navbar, no rodapé e no `id` do artigo | A âncora é interface da landing; link antigo não existe fora do app | n |
| Título da aba | Template `"ANON • %s"`, default "ANON" | Mantém o formato da `identidade-vertice` | y |
| Texto "vértice · cockpit" no mock da landing | Vira "anon · visão geral" | "Cockpit" já foi trocado por "Visão Geral" no app | n |
| Capitalização | "ANON" em caixa alta no logo, no copyright e nos textos de interface | Grafia da marca nos SVGs | y |
| Textos legais ("a equipe do Vértice") | "a equipe da ANON" | Mesmo conteúdo, só o nome | n |
| Specs antigos com "Ápice"/"Vértice" | Não são tocados; busca de verificação exclui `.specs/` e `docs/mobile-roadmap.md` nas partes históricas | Ver Out of Scope | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Identidade visual e nome no app ⭐ MVP

**User Story**: Como usuário, quero ver "ANON" e o novo logo em todas as telas para saber que uso o produto reposicionado.

**Why P1**: Sem isso a marca ocupada continua exposta.

**Acceptance Criteria**:

1. The system SHALL render the `Logo` component with the "A" monogram, the text "ANON" and the descriptor "Finanças Privadas".  <!-- ubiquitous -->
2. WHILE the app theme is dark, the `Logo` SHALL use the dark gradient and surface colors of `docs/marca/anon_logo_dark.svg`.  <!-- state-driven -->
3. WHILE the app theme is light, the `Logo` SHALL use the light gradient and surface colors of `docs/marca/anon_logo_light.svg`.  <!-- state-driven -->
4. The system SHALL set the document title template to "ANON • %s" and the default title to "ANON".  <!-- ubiquitous -->
5. The system SHALL set the metadata description to "ANON – Finanças Privadas".  <!-- ubiquitous -->
6. WHEN a browser tab requests the favicon, the system SHALL serve the dark favicon from `anon_favicon_dark.svg` by default and the light favicon from `anon_favicon_light.svg` for `prefers-color-scheme: light`.  <!-- event-driven -->
7. The system SHALL render the aria-label of the `Logo` as "ANON" and the aria-label of the landing home link as "ANON, página inicial".  <!-- ubiquitous -->
8. The login, cadastro, esqueci-senha and redefinir-senha pages SHALL show "Finanças Privadas" in place of "Gestão Patrimonial Familiar".  <!-- ubiquitous -->

**Independent Test**: Abrir `/login` em dark e light: logo "ANON" com o monograma e a linha "Finanças Privadas"; a aba mostra "ANON • Entrar" (ou o título da tela) com o favicon novo.

---

### P1: Funcionalidade "Ápice" vira "Liberdade" ⭐ MVP

**User Story**: Como usuário, quero que a meta de independência financeira não use uma marca de terceiros para que o vocabulário do app seja próprio.

**Why P1**: "Ápice" é a segunda marca saturada.

**Acceptance Criteria**:

1. The system SHALL label the navigation item for `/liberdade` as "Liberdade".  <!-- ubiquitous -->
2. The system SHALL set the page title and tab title of `/liberdade` to "Liberdade".  <!-- ubiquitous -->
3. The system SHALL label the getting-started goal action "Definir meta" and the onboarding checklist item "Definir sua meta".  <!-- ubiquitous -->
4. WHEN the remaining amount is zero THEN the goal summary sentence SHALL end with "Você já atingiu sua meta." in place of "Você já atingiu seu Ápice."  <!-- event-driven -->
5. The system SHALL list "Meta de liberdade e percentuais das categorias" in the privacy page instead of "Meta do Ápice e percentuais das categorias".  <!-- ubiquitous -->
6. The system SHALL present the chart label, subtitle and card copy of the goal page without the words "Ápice" and "ápice".  <!-- ubiquitous -->

**Independent Test**: Menu lateral mostra "Liberdade"; a página tem título "Liberdade"; a busca textual por "ápice" em `src/` (exceto comentários, nomes de teste e IDs `APICE-xx`) retorna zero.

---

### P1: Landing, rodapé e privacidade com a nova marca ⭐ MVP

**User Story**: Como visitante, quero ler a proposta do ANON na landing.

**Why P1**: A landing é a primeira exposição pública da marca.

**Acceptance Criteria**:

1. The system SHALL show the slogan "O planejamento do seu patrimônio com privacidade absoluta." as the landing page tagline and as the footer line.  <!-- ubiquitous -->
2. The system SHALL replace every occurrence of "Vértice" and "VÉRTICE" in the landing and footer with "ANON".  <!-- ubiquitous -->
3. The system SHALL set the landing section anchor and its navbar and footer links to `#liberdade` and the section title to "A Liberdade: engenharia de juros compostos".  <!-- ubiquitous -->
4. The system SHALL render the footer copyright as "© 2026 ANON. Desenvolvido para quem leva patrimônio a sério."  <!-- ubiquitous -->
5. The system SHALL refer to the operator as "a equipe da ANON" in the landing and in the privacy page.  <!-- ubiquitous -->
6. The system SHALL set the landing metadata title to "ANON – Finanças Privadas" and replace "ápice patrimonial" in landing copy with "patrimônio-alvo".  <!-- ubiquitous -->

**Independent Test**: `/bem-vindo` e `/privacidade` sem "Vértice"/"Ápice"; o clique no item da navbar rola para a seção "A Liberdade".

---

### P2: Arquivos e ativos de marca

**User Story**: Como mantenedor, quero que os ativos e arquivos gerados reflitam ANON.

**Why P2**: Detalhes que o usuário vê só ao baixar ou ao inspecionar o repo.

**Acceptance Criteria**:

1. WHEN the user downloads the recovery key THEN the system SHALL name the file "chave-de-recuperacao-anon.txt".  <!-- event-driven -->
2. The system SHALL keep the 8 SVGs and the preview PNG in `docs/marca/` and SHALL contain no `docs/vertice_logo.svg` or `docs/vertice_favicon.svg`.  <!-- ubiquitous -->
3. The design-system page SHALL describe itself as "Tokens e componentes base do ANON."  <!-- ubiquitous -->
4. The `docs/mobile-roadmap.md` SHALL name the product "ANON" and cite `docs/marca/anon_favicon_dark.svg` as the icon source.  <!-- ubiquitous -->

**Independent Test**: `ls docs` não lista os SVGs vertice; baixar a chave gera o nome novo.

---

## Edge Cases

- IF the browser does not support `prefers-color-scheme` icon media THEN the system SHALL fall back to the dark favicon.
- WHEN the `Logo` renders twice on the same page THEN the system SHALL give each instance a unique gradient id.
- IF an existing unit test asserts the old copy THEN the system SHALL update that assertion to the new expected string from this spec, never delete the test.
- WHEN the theme switches without reload THEN the `Logo` SHALL change variant without a layout shift.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ANON-01 | P1: Identidade visual (AC1, AC7) | - | Pending |
| ANON-02 | P1: Identidade visual (AC2, AC3) | - | Pending |
| ANON-03 | P1: Identidade visual (AC4, AC5) | 1 | Implementing |
| ANON-04 | P1: Identidade visual (AC6) | 1 | Implementing |
| ANON-05 | P1: Identidade visual (AC8) | - | Pending |
| ANON-06 | P1: Liberdade (AC1, AC2) | - | Pending |
| ANON-07 | P1: Liberdade (AC3, AC4, AC6) | - | Pending |
| ANON-08 | P1: Liberdade (AC5) | - | Pending |
| ANON-09 | P1: Landing (AC1, AC4) | 1 | Implementing |
| ANON-10 | P1: Landing (AC2, AC5, AC6) | - | Pending |
| ANON-11 | P1: Landing (AC3) | - | Pending |
| ANON-12 | P2: Arquivos (AC1) | 1 | Implementing |
| ANON-13 | P2: Arquivos (AC2, AC4) | 1 | Implementing |
| ANON-14 | P2: Arquivos (AC3) | - | Pending |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️

---

## Success Criteria

- [ ] `grep -rniE "vértice|vertice|ápice|apice" src public` retorna só comentários, nomes de teste e IDs `APICE-xx` (lista fechada no validation.md).
- [ ] Typecheck, lint e `vitest run` passam.
- [ ] `/login`, `/bem-vindo`, `/liberdade` e `/privacidade` renderizam com a marca ANON nos dois temas.
