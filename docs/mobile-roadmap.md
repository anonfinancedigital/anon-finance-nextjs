# Roadmap mobile: do PWA às lojas

Documento de referência para decidir, fase a fase, como levar o Vértice ao celular.
As fases estão em ordem lógica: cada uma reaproveita a anterior e custa mais que ela.
Os prazos são estimativas para uma pessoa só, feitas a partir do tamanho e do acoplamento do código em 2026-10; não foram medidos.

> **Antes de escrever código de Next.js:** este projeto usa uma versão do Next com mudanças incompatíveis (ver `AGENTS.md`).
> Consulte `node_modules/next/dist/docs/` antes de implementar. O guia de PWA fica em `01-app/02-guides/progressive-web-apps.md` e o de manifest em `01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`.

## Visão geral

| Fase | O que entrega | Esforço | Custo | Pré-requisito |
|---|---|---|---|---|
| 0 | Preparação do ambiente (HTTPS, cookies) | 0,5 dia | R$ 0 | Deploy em domínio próprio |
| 1 | PWA instalável | 1 a 2 dias | R$ 0 | Fase 0 |
| 2 | Revisão de layout mobile | 1 a 2 dias | R$ 0 | Fase 1 |
| 3 | Push notifications (opcional) | 2 a 3 dias | R$ 0 | Fase 1 |
| 4 | Offline (opcional, não recomendado) | semanas | R$ 0 | Fase 1 |
| 5 | Google Play via TWA | 1 a 2 dias + revisão | cerca de US$ 25, taxa única | Fases 1 e 2 |
| 6 | Capacitor (Android e iOS) | 1 a 2 semanas | US$ 99/ano para iOS | Fases 1 e 2 |
| 7 | React Native com Expo (reescrita da interface) | 2 a 4 meses | US$ 99/ano para iOS | Decisão de abandonar o web como cliente principal |

Caminho recomendado: 0, 1, 2, depois 5 se quiser a experiência de loja. As fases 3, 4, 6 e 7 são ramificações independentes e opcionais.

## Contexto do projeto (o que afeta as decisões)

- Cerca de 18 mil linhas de TypeScript. Quase 10,5 mil estão em `src/lib` (domínio, validação com zod, repositórios com Drizzle e Postgres) e 2,3 mil em `src/actions`.
- A interface usa shadcn/Radix, Tailwind v4 e Recharts, com 39 arquivos `"use client"`.
- O app depende do servidor (Server Actions e Postgres). Em qualquer fase até a 6, o app **precisa de internet**.
- A autenticação é por cookie de sessão (better-auth), e o [src/proxy.ts](../src/proxy.ts) redireciona para `/login` quem não tem o cookie.

---

## Fase 0: Preparação do ambiente

**Objetivo:** garantir que o app possa ser instalado e que o login sobreviva ao app instalado.

- Hospedar o app em um domínio próprio com **HTTPS**. Sem HTTPS não há instalação nem service worker.
- Para testar localmente: `next dev --experimental-https`.
- Conferir que o cookie de sessão do better-auth tem `Secure` e `SameSite=Lax`, para o login não se perder ao abrir o app instalado.

**Pronto quando:** o site abre em HTTPS em um celular de verdade e o login se mantém entre aberturas.

---

## Fase 1: PWA instalável

**Objetivo:** o usuário adiciona o Vértice à tela inicial e ele abre em tela cheia, sem barra do navegador.

1. Criar `src/app/manifest.ts` com `name: "Vértice"`, `short_name`, `start_url: "/"`, `display: "standalone"`, `background_color` e `theme_color`.
2. Gerar ícones PNG de **192 e 512 px** e uma versão **maskable**, a partir de `docs/vertice_favicon.svg`, e colocar em `public/`.
3. **Ajustar o matcher do proxy.** O [src/proxy.ts](../src/proxy.ts) hoje redireciona qualquer rota fora da lista de exceções para `/login`. O navegador busca o `manifest.webmanifest` sem cookie, então receberia um redirect em vez do JSON e o app não seria instalável. Excluir `manifest.webmanifest` (e `sw.js`, se houver) do matcher. Os `.png` já estão excluídos.
4. No layout raiz ([src/app/layout.tsx](../src/app/layout.tsx)): adicionar `viewport.themeColor` e `appleWebApp` ao metadata, que o iOS usa para o modo standalone.
5. Opcional: um aviso "Adicionar à tela inicial" para iOS, que não mostra prompt de instalação. O `beforeinstallprompt` não funciona no Safari e não é recomendado pelo guia do Next.

**Pronto quando:** o Chrome no Android oferece "Instalar app", o Safari no iOS permite "Adicionar à Tela de Início", e o app instalado abre em tela cheia e já logado.

**Riscos:** o redirect do proxy sobre o manifest é o erro mais provável. O iOS exige ícone `apple-touch-icon`.

---

## Fase 2: Revisão de layout mobile

**Objetivo:** o app ficar confortável em telas de 360 a 430 px.

- Respeitar as safe areas do iOS (`env(safe-area-inset-*)`), principalmente no botão flutuante de lançamento.
- Conferir tabelas, gráficos e modais em telas pequenas. As specs `lancamento-flutuante` e `lista-transacoes-ux` em `.specs/features/` indicam o que já foi pensado.
- Evitar o zoom automático do iOS nos inputs: fonte de pelo menos 16 px.
- Testar no teclado virtual (formulários de lançamento e cadastro).
- Considerar rodar os e2e do Playwright também com viewport de celular.

**Pronto quando:** todas as telas principais são usáveis com uma mão em um celular de verdade, sem rolagem horizontal da página.

---

## Fase 3: Push notifications (opcional)

**Quando fazer:** se quiser avisos como "estourou a meta da categoria" ou lembrete de lançamento.

1. Instalar `web-push` e gerar chaves VAPID (`web-push generate-vapid-keys`). A pública vai em `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e a privada em `VAPID_PRIVATE_KEY`.
2. Criar uma tabela de assinaturas no banco (migração Drizzle) ligada ao usuário. O exemplo do guia guarda a assinatura em memória, o que não serve para produção.
3. Criar o service worker (eventos `push` e `notificationclick`) e registrá-lo.
4. Criar as Server Actions de assinar, cancelar e enviar, e um gatilho que decida *quando* notificar (a parte de regra de negócio, que o guia não cobre).
5. Servir `/sw.js` com `Cache-Control: no-cache` e CSP restrita, como no guia.

**Observações:** no iOS, push só funciona com o app **instalado** na tela inicial (iOS 16.4 ou superior). É a base de uma função nativa que ajuda a passar na revisão da App Store na fase 6.

---

## Fase 4: Offline (opcional, não recomendado agora)

**Por que o custo é alto:** os dados vêm de Server Actions e do Postgres. Offline de verdade exige guardar dados localmente e sincronizar depois, com risco de conflito e de dado desatualizado em um app financeiro.

Opções, da mais simples à mais completa:

- **Estado de conexão e tentativas:** o hook experimental `useOffline` do Next (`experimental.useOffline`) mostra se há conexão e refaz navegações e Server Actions que falharam. Não guarda dados.
- **Cache de shell com Serwist:** deixa a interface abrir sem rede, mas os dados continuam exigindo servidor.
- **Offline completo (IndexedDB + sincronização):** semanas de trabalho, com resolução de conflitos.

Só vale a pena se houver necessidade real de lançar gastos sem sinal.

---

## Fase 5: Google Play via TWA

**Objetivo:** o app aparecer na Google Play, abrindo o PWA em tela cheia. Ideal para aprender o fluxo de publicação por baixo custo.

1. Pré-requisito: PWA instalável (fase 1), revisado (fase 2), em domínio com HTTPS.
2. Criar conta de desenvolvedor na Google Play Console (cerca de US$ 25, taxa única).
3. Gerar o app com **Bubblewrap** (Google) ou **PWABuilder**, que produz o `.aab` assinado.
4. Publicar `/.well-known/assetlinks.json` no domínio, com a impressão digital (SHA-256) da chave de assinatura, para provar que o site é seu. Sem isso, o app mostra uma barra de endereço.
5. Adicionar essa rota às exceções do proxy, para ela não redirecionar para `/login`.
6. Preencher a ficha da loja: descrição, capturas de tela, ícone, **política de privacidade** (obrigatória, ainda mais em app financeiro) e classificação de conteúdo.
7. Subir primeiro no **teste interno** e no teste fechado. Contas pessoais novas costumam precisar de um período de teste fechado com testadores antes da publicação aberta.

**Para não gastar:** instalar o APK direto no seu Android com `adb install` já dispensa a loja.

**Riscos:** esquecer o `assetlinks.json` ou o ajuste do proxy. Mudar o domínio depois invalida o app.

---

## Fase 6: Capacitor (Android e iOS)

**Objetivo:** ter um app nativo que embrulha o site e acessa recursos do aparelho (biometria, push nativo, compartilhamento). É o caminho mais viável para a App Store.

1. Adicionar o Capacitor ao projeto e apontar o app para o site hospedado (`server.url`). Isso mantém Server Actions e auth funcionando como hoje.
2. Instalar plugins conforme a necessidade: biometria, push, compartilhamento, status bar.
3. Gerar os projetos `android/` e `ios/` e abrir no Android Studio e no Xcode.
4. Configurar ícones, splash e assinatura.

**Pré-requisitos do iOS:** conta Apple Developer (US$ 99 por ano) e um **Mac com Xcode**.

**Risco principal:** a Apple pode recusar um app que seja só um site embrulhado (guideline 4.2, funcionalidade mínima). Inclua pelo menos uma função nativa de verdade, como biometria para abrir o app ou push.

**Alternativa sem publicar:** TestFlight e instalação direta pelo Xcode também pedem a conta paga.

---

## Fase 7: React Native com Expo (reescrita da interface)

**Quando fazer:** só se o objetivo for aprender desenvolvimento nativo em si, ou se o web deixar de ser suficiente. Para apenas estar nas lojas, as fases 5 e 6 custam uma fração disso.

### O que se reaproveita e o que não

| Parte | Situação |
|---|---|
| Domínio e validação (`src/lib/domain`, `src/lib/validation`) | Reaproveita quase inteiro (TypeScript puro). Mover para um pacote compartilhado em monorepo. |
| Banco (Drizzle e `pg`) | Não roda no app. Fica atrás de uma API. |
| Server Actions (5 arquivos `"use server"`) | Viram endpoints HTTP, porque o React Native não chama Server Actions. |
| Auth (better-auth) | Mantém, com o cliente Expo, trocando cookie por token e usando armazenamento seguro. |
| Telas e componentes (Radix, Tailwind, `next/*`) | Reescrita total. |
| Gráficos (Recharts) | Troca por Victory Native, react-native-skia ou gifted-charts. |
| E2E (Playwright) | Descartar. Usar Detox ou Maestro. Os testes unitários e de integração do domínio continuam valendo. |

### Etapas

1. **Extrair a API (1 a 2 semanas):** transformar as actions em endpoints (route handlers ou serviço separado) e adaptar a auth para token. O site continua funcionando em paralelo.
2. **Pacote compartilhado (cerca de 1 semana):** mover domínio e validação para um monorepo.
3. **Telas em Expo (6 a 10 semanas):** login e cadastro, resumo, lista e filtro de transações, modal de lançamento, categorias e subcategorias colapsáveis, liberdade financeira, gráficos e a área de admin. As specs em `.specs/` servem de referência de comportamento.
4. **Polimento e testes em dispositivo (2 a 3 semanas):** teclado, formulários, navegação e publicação com EAS Build.

---

## Decisões em aberto

- Domínio e hospedagem definitivos (necessários para as fases 0 e 5).
- Distribuir para outras pessoas ou uso só pessoal e familiar. Para uso pessoal, a fase 1 basta.
- Disponibilidade de um Mac e interesse em iOS (condiciona a fase 6).
- Existe necessidade real de offline ou notificações (fases 3 e 4).

## Referências

- Guia de PWA do Next, na documentação local: `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`
- Bubblewrap: https://github.com/GoogleChromeLabs/bubblewrap
- PWABuilder: https://www.pwabuilder.com
- Capacitor: https://capacitorjs.com
- Expo: https://expo.dev
- Serwist: https://github.com/serwist/serwist
