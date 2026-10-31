# Plano de hospedagem gratuita (custo zero)

Objetivo: colocar o AnonFinance no ar sem gastar nada, suportando a simulação de **~1000 usuários ativos por dia**, e saber o momento exato de começar a pagar.

> Os limites dos planos gratuitos mudam sem aviso. Antes de cada fase, confirme nas páginas oficiais de preço/termos de cada serviço. Os números abaixo são ordens de grandeza, não garantias.

## 1. Arquitetura alvo

| Peça | Serviço | Plano | Papel |
|---|---|---|---|
| App Next.js | Vercel | Hobby | Páginas, Server Actions e rotas de API. Uso não comercial, o que vale enquanto não houver cobrança. |
| Banco | Neon | Free | PostgreSQL gerenciado. Evitamos o Supabase free porque ele pausa por inatividade. |
| E-mail | Brevo (ou Gmail SMTP) | Free | Recuperação de senha e avisos, via o `nodemailer` que já existe. |
| Backup | GitHub Actions (artifact) | Free | `pg_dump` diário, criptografado, fora do Neon. |
| DNS/WAF | Cloudflare | Free | Só quando houver domínio próprio. |
| Monitoramento | UptimeRobot + Sentry | Free | Alerta de queda e de erros. |

Premissas da simulação: 2 a 3 sessões por usuário/dia, 10 a 20 requisições por sessão, ou seja, 30 a 60 mil requisições/dia (média abaixo de 1 req/s, pico de algumas dezenas). Banco abaixo de 1 GB no primeiro ano.

## 2. Estado atual do código (o que já ajuda e o que muda)

Já compatível:
- O bloqueio de tentativas de login fica no banco (`src/lib/login-lock.ts`, `login-attempts`), então funciona em serverless sem estado em memória.
- O e-mail usa SMTP genérico (`src/lib/mailer.ts`), portanto qualquer provedor SMTP serve sem mudar código.
- Os cabeçalhos de segurança e a CSP estão prontos (`src/lib/security-headers.ts`, `src/proxy.ts`), com HSTS só em produção.
- O cadastro público está desabilitado (`disableSignUp: true`), o que reduz abuso.
- O dashboard do Better Auth só liga com `BETTER_AUTH_API_KEY`. Em produção gratuita, deixe a variável vazia.

Já feito no código:
1. O pool do `pg` tem teto de conexões: 3 na Vercel e 10 fora dela, com `idleTimeoutMillis` de 10 s (`src/lib/db/pool-options.ts`, usado por `src/lib/db/client.ts`; passo 5.1).
2. Existe o endpoint `GET /api/health`, público e sem consulta ao banco (`src/app/api/health/route.ts`; passo 5.2).
3. Em produção, a recuperação de senha só envia o e-mail se `BETTER_AUTH_URL` for uma URL `https://` válida (`src/lib/base-url.ts`; passo 5.3).
4. O workflow de backup diário existe em `.github/workflows/backup.yml` (passo 7.3).

Ainda manual: não há workflow de migration. Rode `npm run db:migrate` na sua máquina contra a conexão direct do Neon.

Antes de escrever qualquer código de deploy, leia o guia de deploy do Next.js em `node_modules/next/dist/docs/` (regra do AGENTS.md: esta versão do Next tem mudanças em relação ao que se conhece).

## 3. Contas a criar (checklist, em ordem)

Para todas: ative **MFA** e use um e-mail dedicado ao projeto. Guarde as credenciais em um gerenciador de senhas.

- [x] GitHub: repositório **privado** com o projeto.
- [x] Neon (neon.tech): projeto em região próxima aos usuários (ex.: `sa-east-1`, se disponível no plano free).
- [x] Vercel: importar o repositório do GitHub (plano Hobby). Escolher a região das functions o mais perto possível do Neon.
- [x] Brevo: conta, verificar remetente (ver seção 6).
- [x] Cloudflare: conta, criar bucket R2 para backups (precisa de um cartão cadastrado para habilitar o R2 em alguns planos. Se isso for um problema, veja a alternativa na seção 7.4).
- [x] UptimeRobot e Sentry (opcional no início).

## 4. Banco de dados no Neon

1. Criar o projeto e o banco `orcamento`.
2. Copiar **duas** connection strings:
   - **Pooled** (host com `-pooler`): usada pelo app na Vercel.
   - **Direct** (sem `-pooler`): usada por migrations, seed e `pg_dump`.
3. Ambas já trazem `sslmode=require`. Mantenha.
4. Rodar as migrations contra a conexão direct, do seu computador:

   ```sh
   DATABASE_URL='<direct-url>' npm run db:migrate
   ```

5. Criar a conta admin (uma vez):

   ```sh
   DATABASE_URL='<direct-url>' ADMIN_EMAIL='...' ADMIN_PASSWORD='...' npm run db:seed
   ```

   Se a conta precisar do vault, rode também `npm run db:finalize-vault` com a mesma `DATABASE_URL`.
6. Observação: o Neon free desliga a computação quando ocioso. A primeira requisição depois de um tempo parado fica mais lenta (cold start). Isso é aceitável. **Não** tente manter o banco sempre acordado com pings, porque isso consome as horas de computação do mês.

## 5. Mudanças de código

### 5.1 Limitar o pool de conexões

Em `src/lib/db/client.ts`, trocar a criação do pool por algo como:

```ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Serverless: many instances, each with its own pool. Keep it small and let Neon's pooler fan in.
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 10_000,
});
```

Critério de aceite: `npm run typecheck`, `npm run test:unit` e `npm run test:int` continuam passando (use um banco de teste privado, conforme a nota de isolamento de banco de teste).

### 5.2 Endpoint de health check

Criar uma rota simples (por exemplo `src/app/api/health/route.ts`) que responde `200` sem consultar o banco. Ela serve ao UptimeRobot. Confirme que ela fica fora da autenticação e que o matcher de `src/proxy.ts` e as regras de `security-headers.ts` continuam corretos para esse caminho.

### 5.3 Verificar `BETTER_AUTH_URL`

Em produção deve ser a URL pública com `https://`. O código usa essa variável em `src/actions/password-reset.ts` para montar o link de recuperação. Se a URL estiver errada, o link do e-mail quebra.

## 6. E-mail gratuito

O app só precisa de SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. A porta 465 usa TLS implícito e a 587 usa STARTTLS (`src/lib/mailer.ts` decide pelo número da porta).

| Opção | Prós | Contras |
|---|---|---|
| **Brevo** (`smtp-relay.brevo.com`, porta 587) | Cota diária no plano free, aceita remetente único verificado | Sem domínio próprio a entregabilidade é pior, e pode cair em spam |
| **Gmail SMTP** (`smtp.gmail.com`, 465, senha de app) | Zero configuração de domínio | Limite diário baixo, envia do seu Gmail, depende de verificação em duas etapas |
| **Resend** | API ótima | O plano free só envia para terceiros **com domínio verificado**. Sem domínio, só chega no seu próprio e-mail |

Recomendação para começar: Brevo com remetente verificado, ou Gmail para testes. Quando tiver domínio, configure SPF/DKIM/DMARC.

Atenção: confira a cota diária do provedor escolhido. Como o cadastro público está desligado, o volume de e-mail tende a ser baixo (recuperação de senha e avisos).

## 7. Backup (o que torna o banco gratuito aceitável)

O histórico de restauração do Neon free é curto. Sem um backup próprio, um erro de migration ou uma exclusão acidental pode perder os dados de todos.

### 7.1 Cofre de chaves

Gere um par de chaves com [age](https://github.com/FiloSottile/age):

```sh
age-keygen -o backup-key.txt
```

- A chave **pública** (`age1...`) vai como secret no GitHub.
- A chave **privada** (`backup-key.txt`) fica no gerenciador de senhas e em um segundo local offline. Sem ela, os backups são inúteis.

### 7.2 Secrets do repositório (GitHub, Settings, Secrets and variables, Actions)

- `NEON_DIRECT_URL`: connection string direct do Neon (idealmente de um *role* somente leitura).
- `BACKUP_AGE_PUBLIC_KEY`: chave pública do age.

### 7.3 Workflow `.github/workflows/backup.yml`

O workflow já está no repositório. Ele roda todo dia às 05:00 UTC (`cron: "0 5 * * *"`) e também sob demanda (`workflow_dispatch`).

1. Instala o `postgresql-client-18` do repositório oficial PGDG (o projeto Neon roda Postgres 18) e o `age`. A versão fica na variável `PG_VERSION`, no topo do arquivo.
2. Roda `pg_dump --format=custom --no-owner` contra `NEON_DIRECT_URL` e envia a saída direto para `age -r`, então nenhum dump em texto claro chega ao disco.
3. Falha o job se o `pg_dump`, o `age` ou o upload falharem, ou se o arquivo criptografado estiver vazio.
4. Envia `orcamento-<UTC yyyymmddThhmmssZ>.dump.age` com `actions/upload-artifact@v4` e `retention-days: 30`.

Um teste automático (`src/lib/backup-workflow.test.ts`) confere essas regras lendo o arquivo.

Pontos de atenção:
- Se o Neon subir de versão major, aumente `PG_VERSION`: o `pg_dump` precisa ser **igual ou superior** ao servidor.
- Se o job falhar, o GitHub avisa por e-mail quem criou o workflow.
- Um workflow agendado do GitHub é pausado depois de 60 dias sem atividade no repositório. Confira de vez em quando se ele ainda roda (ver rotina mensal).
- Pelo código (`vault`, `dekWrappedPw`), os dados sensíveis parecem ser selados no cliente, o que reduz o dano de um vazamento. Mesmo assim, o dump contém e-mails e metadados, então a criptografia do backup continua obrigatória.
- A primeira execução real é manual: Actions, `backup`, Run workflow. Baixe o artifact e confirme que `age -d` abre com a chave privada (seção 7.5).

### 7.4 Destino do backup: artifact do GitHub Actions

O dump criptografado fica como artifact do próprio GitHub Actions, com retenção de 30 dias. É grátis e não pede cartão. Fica menos durável que um bucket externo (R2), e os artifacts contam na cota de armazenamento do GitHub (500 MB no plano gratuito), o que a retenção de 30 dias ajuda a respeitar. Se a cota apertar, reduza `retention-days`.

### 7.5 Teste de restauração (obrigatório antes de abrir ao público)

1. Baixar o backup mais recente e descriptografar:

   ```sh
   age -d -i backup-key.txt orcamento-XXXX.dump.age > restore.dump
   ```

2. Subir o Postgres local (`npm run db:up`) e restaurar em um banco descartável:

   ```sh
   createdb -h localhost -p 5433 -U postgres restore_check
   pg_restore -h localhost -p 5433 -U postgres -d restore_check --no-owner restore.dump
   ```

3. Conferir contagens de linhas nas tabelas principais e fazer login com o app apontado para esse banco.
4. Registrar a data do teste neste arquivo (seção 12).

## 8. Deploy na Vercel

1. Importar o repositório e manter o preset Next.js.
2. Variáveis de ambiente (Production):

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | Connection string **pooled** do Neon |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32`. **Guarde cópia**: o segredo também deriva o salt falso do vault (`src/lib/db/repos/vault.ts`), então trocá-lo depois afeta as contas existentes |
   | `BETTER_AUTH_URL` | URL pública `https://...` |
   | `ADMIN_EMAIL` | E-mail do administrador |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Do provedor escolhido na seção 6 |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Chaves do push, ver seção 8.1. Deixe as três vazias para manter o push desligado |
   | `CRON_SECRET` | Segredo do disparo horário do push, ver seção 8.1. Igual ao secret do GitHub |

   `ADMIN_PASSWORD` **não** vai para a Vercel: só é usada pelo `db:seed`, rodado localmente.
3. Não configure `BETTER_AUTH_API_KEY` (mantém o dashboard pago desligado).
4. Fazer o deploy e abrir `https://<projeto>.vercel.app`.
5. Teste de fumaça manual: login do admin, criar um lançamento, recarregar a página, pedir recuperação de senha e conferir que o e-mail chega com o link correto.
6. Hobby não tem cartão cadastrado, então ao bater o limite o projeto é bloqueado em vez de gerar cobrança. É o comportamento desejado para custo zero.

### 8.1 Push e PWA

O push usa Web Push com chaves VAPID e um disparo horário feito pelo GitHub Actions (`.github/workflows/push-dispatch.yml`). O push passa pelo serviço do fabricante do navegador (AD-016); o texto enviado é genérico e nunca leva valores ou nomes.

1. Gerar o par de chaves VAPID, uma vez:

   ```sh
   npx web-push generate-vapid-keys
   ```

   A saída traz a chave pública e a privada. Guarde a privada no gerenciador de senhas: trocar o par depois invalida todas as inscrições existentes.
2. Gerar o segredo do disparo:

   ```sh
   openssl rand -base64 32
   ```

3. Na Vercel (Production), criar as variáveis:
   - `VAPID_PUBLIC_KEY`: chave pública do passo 1.
   - `VAPID_PRIVATE_KEY`: chave privada do passo 1.
   - `VAPID_SUBJECT`: contato do operador, `mailto:voce@example.com` ou uma URL `https://`.
   - `CRON_SECRET`: valor do passo 2.

   Faça um novo deploy para as variáveis valerem. Sem as três `VAPID_*` o push fica desligado.
4. No GitHub (Settings, Secrets and variables, Actions), criar dois secrets:
   - `APP_URL`: URL pública do app, `https://...`, sem barra final.
   - `CRON_SECRET`: o mesmo valor da Vercel.

   O workflow `push-dispatch` roda a cada hora, no minuto 7 (`cron: "7 * * * *"`), e também sob demanda (`workflow_dispatch`). Ele chama `POST ${APP_URL}/api/push/dispatch` com `Authorization: Bearer` e falha o job se a resposta não for 2xx. Nada do segredo, da URL ou da resposta vai para o log. Um teste automático (`src/lib/push-dispatch-workflow.test.ts`) confere essas regras.
5. Atenção: o GitHub desativa workflows agendados depois de 60 dias sem atividade em repositório público. Se o repositório ficar parado, o disparo para sem aviso. Confira de vez em quando na aba Actions e reative o workflow se preciso (ver rotina mensal).
6. A primeira execução real é manual: Actions, `push-dispatch`, Run workflow.

Como testar o push:
- O service worker não registra em `next dev`. Teste com `npm run build` e `npm run start` (com as variáveis `VAPID_*` e `CRON_SECRET` no `.env`), abrindo `http://localhost:3000`.
- Ative as notificações em Conta, aceite a permissão do navegador e envie um aviso pelo painel do administrador. Para o disparo horário, chame o endpoint à mão: `curl -X POST -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/push/dispatch`.
- No iOS o push só funciona com o app instalado na tela inicial (Compartilhar, Adicionar à Tela de Início), e a permissão é pedida depois da instalação.

### 8.2 Splash do iOS e bloqueio por biometria

**Gerar a splash.** As imagens de abertura do iOS ficam em `public/splash/` (PNG retrato, fundo `#0D111A`, marca centralizada) e são geradas a partir da arte da marca por `npm run pwa:splash`. Rode o comando e versione os PNGs sempre que mudar a lista ou a arte.

**Incluir um iPhone novo.** Adicione uma linha em `SPLASH_DEVICES` em `src/lib/pwa/splash-list.ts` (`width` e `height` em pixels CSS, `ratio` = razão de pixels do aparelho), rode `npm run pwa:splash` e confira que o PNG `<W*R>x<H*R>.png` apareceu em `public/splash/`. Os testes de `src/lib/pwa/` conferem media única, dimensões e cores do PNG.

**Atenção: casamento exato.** O iOS só usa a imagem de abertura cuja `media` casa exatamente com o aparelho (`device-width`, `device-height`, `-webkit-device-pixel-ratio` e retrato). Aparelho fora da lista recebe o comportamento padrão do iOS (tela em branco ou cor de fundo). Um iPhone novo, como o iPhone Air (420×912@3, não confirmado), precisa da linha acima.

**Aviso sobre o bloqueio.** O bloqueio por biometria é uma trava de tela local (AD-017): WebAuthn de plataforma, sem servidor e sem proteção criptográfica da chave de dados. Quem controla o aparelho desbloqueado e as ferramentas do navegador o contorna. O funcionamento do WebAuthn no PWA instalado (iOS e Android) **não foi verificado em aparelho real**; o checklist abaixo é obrigatório.

**Checklist manual em aparelho real** (instalar o app na tela inicial antes):

- [ ] O ícone instalado no Android e no iOS mostra o rótulo "Anon Finance" sem corte.
- [ ] No iPhone, a abertura mostra a splash da marca sobre `#0D111A`, sem tela branca.
- [ ] No Android, a abertura mostra o ícone sobre `#0D111A`, seguido da splash do app.
- [ ] Com o bloqueio ativo (iOS e Android), abrir o app pede a biometria; confirmar abre o app; cancelar mostra "Tentar de novo", "Usar a senha" e "Sair".
- [ ] Voltar ao app em até 60 s não pede a biometria; depois de mais de 60 s pede.
- [ ] Na aba Network, nenhuma requisição do bloqueio contém credencial ou resultado biométrico.

## 9. Cloudflare e domínio (opcional, depois)

- Comece no subdomínio `.vercel.app`. Domínio próprio custa dinheiro, então fica para quando houver verba.
- Com domínio: apontar o DNS para a Vercel pelo Cloudflare, ativar proxy e regras básicas de WAF, e então configurar SPF/DKIM/DMARC do e-mail.

## 10. Monitoramento

- UptimeRobot: monitor HTTP em `/api/health` a cada 5 minutos, aviso por e-mail.
- Sentry free (opcional): só depois de revisar o que será enviado. **Nunca** envie dados financeiros nos eventos de erro.
- GitHub Actions: ative notificação de falha do workflow de backup.
- Acompanhe o uso nos painéis da Vercel e do Neon uma vez por semana no início.

## 11. Checklist antes de abrir para outras pessoas

- [ ] MFA ativo em GitHub, Vercel, Neon, Cloudflare, e-mail e provedor SMTP.
- [ ] Segredos só nos painéis dos serviços, nada commitado.
- [ ] Backup diário rodando e **teste de restauração feito** (seção 7.5).
- [ ] `BETTER_AUTH_SECRET` e a chave privada do age guardados em dois lugares.
- [ ] Texto claro (termos/aviso) dizendo que é um serviço gratuito, sem garantia de disponibilidade.
- [ ] Avaliação mínima de LGPD: quais dados são guardados, por quê, e como o usuário pede exclusão. Mesmo sem cobrança, você responde pelos dados de terceiros.
- [ ] Push configurado: `VAPID_*` e `CRON_SECRET` na Vercel, secrets `APP_URL` e `CRON_SECRET` no GitHub, e o workflow `push-dispatch` rodado uma vez à mão (seção 8.1).
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:unit` e `npm run test:int` passando antes do primeiro deploy.

Observação: os testes e2e (Playwright) estão suspensos neste projeto (AD-005). Não os use como critério de aceite.

## 12. Rotina e registro

Rotina mensal (15 minutos):
- Conferir que o backup mais recente existe e tem tamanho coerente.
- Olhar uso de banda/requisições (Vercel), armazenamento e horas de computação (Neon) e cota de e-mail.
- Confirmar que os workflows agendados (`backup` e `push-dispatch`) continuam ativos.
- Atualizar dependências com correção de segurança.

Registro:

| Data | Evento |
|---|---|
| _preencher_ | Primeiro deploy |
| _preencher_ | Primeiro teste de restauração |

## 13. Gatilhos para começar a pagar

Quando qualquer item abaixo ocorrer, é hora de planejar. Ordem sugerida de prioridade:

1. **Banco** (primeiro a pagar): armazenamento perto do limite de 0,5 GB, horas de computação acabando, ou qualquer perda de dado. Próximo passo: Neon pago, ou Railway/Render com Postgres, na faixa de US$ 5 a 20/mês, com PITR.
2. **Uso comercial**: no momento em que houver cobrança ou monetização, o Vercel Hobby deixa de ser permitido. Migrar para Vercel Pro (~US$ 20/mês) ou para Railway/Render (~US$ 7 a 20/mês).
3. **E-mail**: cota diária estourando. Plano pago do provedor e domínio próprio.
4. **App**: banda ou execução da Vercel bloqueando o projeto.

Antes de migrar, rode o backup manual, faça um restore em ambiente novo e só então troque a `DATABASE_URL`.

## 14. Ordem de execução resumida

1. Criar contas e ativar MFA (seção 3).
2. Criar banco no Neon, migrar e criar o admin (seção 4).
3. Aplicar as mudanças de código 5.1 a 5.3 e rodar os testes.
4. Configurar SMTP e testar o envio (seção 6).
5. Configurar o backup e fazer o primeiro teste de restauração (seção 7).
6. Deploy na Vercel, teste de fumaça e configuração do push (seção 8 e 8.1).
7. Monitoramento (seção 10).
8. Checklist da seção 11 e só então convidar outras pessoas.
