# Convite para o Bloqueio por Biometria Specification

## Problem Statement

O bloqueio por biometria (feature `pwa-splash-biometria`) só liga quando o usuário vai a `/conta` e toca em "Ativar". Quem não sabe que ele existe segue sem proteção, e dados financeiros pedem proteção por padrão. O bloqueio não pode ligar sozinho: criar a credencial exige um toque do usuário e o prompt do sistema, nem todo aparelho tem biometria e o registro vale por aparelho. A solução é um convite único, mostrado dentro do app, em aparelhos que oferecem biometria, com "Ativar" e "Agora não".

## Goals

- [ ] Em aparelho com biometria, sem bloqueio ativo e sem recusa anterior, o app desbloqueado mostra o convite acima do conteúdo.
- [ ] Tocar em "Ativar" liga o bloqueio com a mesma credencial e as mesmas opções do card de `/conta`.
- [ ] "Agora não" é lembrado neste aparelho: o convite não volta para esse usuário.
- [ ] Nenhum prompt do sistema aparece sem o toque em "Ativar".
- [ ] Nada do convite chega ao servidor.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Ativar o bloqueio sem toque do usuário | A credencial WebAuthn exige gesto e prompt do sistema |
| Convite repetido ("lembrar mais tarde") | Opção 1 escolhida: convite único; quem recusar ativa em `/conta` |
| Convite como modal bloqueante | Banner no topo do conteúdo é menos invasivo e não prende o foco |
| Sincronizar a recusa entre aparelhos | O registro é por aparelho, como o do bloqueio |
| Convite na tela de login ou antes do cofre abrir | O convite só aparece com o app desbloqueado |
| Mudar o comportamento do bloqueio já existente | Fora do pedido (AD-017 segue valendo) |
| Teste e2e | Suspenso (AD-005) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Forma do convite | Banner no topo do conteúdo de `(app)`, dentro do `BiometricGate`, com título, texto e dois botões | Não bloqueia o uso; só renderiza com o app desbloqueado | n |
| Onde não aparece | Em `/conta`, que já tem o card de bloqueio | Evita duas ofertas na mesma tela | n |
| Memória da recusa | Registro `{ userId }` em `localStorage` do aparelho (`anon-biometric-invite-dismissed`); registro de outro usuário conta como "não recusou" | Preferência sem segredo; um aparelho de dois usuários convida cada um uma vez | n |
| Sair da conta | Mantém a recusa; excluir a conta a remove | A recusa não é dado sensível; o fim da sessão não deve reabrir o convite a cada login | n |
| Desativar em `/conta` | Grava a recusa | Quem desliga de propósito não deve receber convite de volta | n |
| Armazenamento indisponível | Leitura que lança: sem convite; escrita da recusa que lança: o convite some só nesta carga | Sem como lembrar, insistir seria incomodar a cada carga | n |
| Ativação | Reaproveita `enrollBiometric` e `lockStore.save` num único `activateBiometric`, usado também pelo card | Sem duas implementações da mesma chamada WebAuthn | n |
| Efeito imediato | O bloqueio passa a valer na próxima abertura ou volta após mais de 60 s, como ao ativar em `/conta` | LOCK-17 e LOCK-18 já definem os gatilhos | n |
| Verificação | Funções puras e o `activateBiometric` em unit; UI por inspeção de código | AD-005 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Convite para ativar o bloqueio ⭐ MVP

**User Story**: As a usuário, I want the app to offer the biometric lock the first time I use it on a capable device so that my financial data is protected without me hunting for the setting.

**Why P1**: É o pedido do usuário (opção 1): tornar a proteção visível por padrão, sem ligá-la às escuras.

**Acceptance Criteria**:

1. WHILE the app is unlocked and the page is not `/conta`, WHERE `biometricSupport` resolves `true`, the session user has no lock record and no dismissal, the system SHALL show above the page content an invite with the title "Proteger com biometria?", the text "Peça a biometria do aparelho ao abrir o app. Você pode mudar isso depois em Privacidade e conta." and the buttons "Ativar" and "Agora não".  <!-- complex -->
2. IF `biometricSupport` resolves `false` THEN the system SHALL NOT show the invite.  <!-- unwanted-behavior -->
3. IF the session user has a lock record THEN the system SHALL NOT show the invite.  <!-- unwanted-behavior -->
4. IF the session user has a saved dismissal THEN the system SHALL NOT show the invite.  <!-- unwanted-behavior -->
5. IF the page is `/conta` THEN the system SHALL NOT show the invite.  <!-- unwanted-behavior -->
6. The system SHALL NOT call `navigator.credentials` before the user taps "Ativar".  <!-- ubiquitous -->
7. WHEN the user taps "Ativar" THEN the system SHALL enroll with the options of LOCK-03 of `pwa-splash-biometria`, save `{ userId, credentialId }` on the device and remove the invite.  <!-- event-driven -->
8. IF the enrollment is cancelled, times out or rejects, or the record cannot be saved, THEN the system SHALL keep the invite, show "Não foi possível ativar a biometria. Tente novamente." and save no dismissal.  <!-- unwanted-behavior -->
9. WHEN the user taps "Agora não" THEN the system SHALL save `{ userId }` as the dismissal on the device and remove the invite.  <!-- event-driven -->
10. IF the device storage cannot be read THEN the system SHALL NOT show the invite.  <!-- unwanted-behavior -->
11. IF the device storage refuses to write the dismissal THEN the system SHALL remove the invite for the current page load.  <!-- unwanted-behavior -->
12. IF the saved dismissal belongs to a `userId` other than the session user's THEN the system SHALL treat the session user as not dismissed.  <!-- unwanted-behavior -->
13. WHEN the user taps "Desativar" in the lock card of `/conta` THEN the system SHALL save the dismissal for the session user.  <!-- event-driven -->
14. WHEN the user deletes the account THEN the system SHALL remove the saved dismissal from the device.  <!-- event-driven -->
15. The system SHALL keep the dismissal on the device only: no Server Action, API route, database column, cookie or Sentry event carries it.  <!-- ubiquitous -->

**Independent Test**: Testes unit da política de exibição, do registro da recusa e do `activateBiometric`; inspeção do banner e do wiring no layout.

---

## Edge Cases

- WHEN the invite is shown and the app locks again (return after more than 60 000 ms) THEN the system SHALL NOT render the invite while the lock screen is shown, because the gate unmounts the page content.
- IF the user enables the lock in `/conta` and returns to another page THEN the system SHALL NOT show the invite (lock record exists).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| INVITE-01 | P1: Convite | - | Pending |
| INVITE-02 | P1: Convite | - | Pending |
| INVITE-03 | P1: Convite | - | Pending |
| INVITE-04 | P1: Convite | - | Pending |
| INVITE-05 | P1: Convite | - | Pending |
| INVITE-06 | P1: Convite | - | Pending |
| INVITE-07 | P1: Convite | - | Pending |
| INVITE-08 | P1: Convite | - | Pending |
| INVITE-09 | P1: Convite | - | Pending |
| INVITE-10 | P1: Convite | - | Pending |
| INVITE-11 | P1: Convite | - | Pending |
| INVITE-12 | P1: Convite | - | Pending |
| INVITE-13 | P1: Convite | - | Pending |
| INVITE-14 | P1: Convite | - | Pending |
| INVITE-15 | P1: Convite | - | Pending |

**ID format:** `INVITE-NN`, na ordem dos ACs da história.

**Coverage:** 15 total, 0 mapped to tasks, 15 unmapped ⚠️ (tasks em `tasks.md`)

---

## Success Criteria

- [ ] Em iPhone real com biometria, o primeiro acesso depois de entrar mostra o convite; "Ativar" abre o prompt do Face ID; confirmado, o convite some e o bloqueio passa a valer.
- [ ] "Agora não" some com o convite e ele não volta ao recarregar nem ao sair e entrar de novo.
- [ ] Desativar o bloqueio em `/conta` não traz o convite de volta.
- [ ] Em aparelho sem biometria, o convite nunca aparece.
