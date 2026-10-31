# PWA Splash e Bloqueio por Biometria Validation

## Validation: pwa-splash-biometria - PASS ✅

**Date**: 2026-10-31
**Spec**: `.specs/features/pwa-splash-biometria/spec.md`
**Diff range**: `622cc28..HEAD` (HEAD = 6d74ff8: 25 task commits T1-T25 + fix commit 6d74ff8, which only touches `src/lib/biometric/lock-store.test.ts` and `src/lib/pwa/splash-images.test.ts`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: PASS ✅ (iteration 2 of 3; M14 now killed, SPLASH-04 "centered" asserted by value; 35 distinct mutants over both iterations, all killed)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T25 | ✅ Done | `tasks.md` has 0 unchecked `[ ]`; 25 commits in the range, one per task |

---

## Spec-Anchored Acceptance Criteria

Layers marked "none" in the Test Coverage Matrix (components, pages) are evidenced by code inspection (AD-005). Test paths are under `src/`.

### P1: Splash nativa (SPLASH-01..05)

| ID | Spec-defined outcome | `file:line` + assertion / code | Result |
| -- | -------------------- | ------------------------------ | ------ |
| SPLASH-01 | `background_color` "#0D111A", `name` "Anon Finance", icon `/icon-512.png` 512x512 `image/png` purpose any | `app/manifest.test.ts:20` `expect(m.background_color).toBe("#0D111A")`; `:8` `expect(m.name).toBe("Anon Finance")`; `:25-27` `toMatchObject({ sizes: "512x512", type: "image/png" })` + `purpose` in `[undefined, "any"]` | ✅ PASS |
| SPLASH-02 | one `appleWebApp.startupImage` per iPhone, `url` under `/splash/`, media of the exact form | `lib/pwa/splash-list.test.ts:22-24` (exact media string), `:32-38` (`startsWith("/splash/")` + `toEqual({url, media})`), `lib/pwa/metadata.test.ts:13` `expect(pwaMetadata.appleWebApp.startupImage).toEqual(startupImages())`, `:14-16` each file exists; wiring `lib/pwa/metadata.ts:7` | ✅ PASS |
| SPLASH-03 | PNG pixel size = `W*R` x `H*R` per entry | `lib/pwa/splash-images.test.ts:39` `expect(pngSize(path)).toEqual({ width: device.width * device.ratio, height: device.height * device.ratio })` (IHDR read, 11 devices via `describe.each`); file name `splash-list.test.ts:28-29` (`/splash/1170x2532.png`, `/splash/750x1334.png`) | ✅ PASS |
| SPLASH-04 | four corners `#0D111A`, mark centered, script `npm run pwa:splash` | `splash-images.test.ts:50` `expect(pixel(x, y)).toEqual(BACKGROUND)` on the 4 corners; `:64` `expect(differs).toBe(true)` in the central square; `:67-86` bounding box of all non-background pixels, `expect(Math.abs((minX + maxX) / 2 - (width - 1) / 2)).toBeLessThanOrEqual(width * 0.01)` (same for Y, line 85), guarded by `expect(maxX).toBeGreaterThanOrEqual(0)` (line 82); script `scripts/generate-pwa-splash.ts:24-26` (composite `gravity: "center"`), `package.json` `pwa:splash` | ✅ PASS (P-1 closed: tolerance 1% asserted by value) |
| SPLASH-05 | no two entries with the same `media` | `splash-list.test.ts:43` `expect(new Set(images.map((i) => i.media)).size).toBe(images.length)` (and same for `url` at `:44`) | ✅ PASS |

### P1: Nome do app (APPNAME-01..03)

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| APPNAME-01 | manifest `name` and `short_name` "Anon Finance" | `app/manifest.test.ts:8-9` `toBe("Anon Finance")` x2; code `app/manifest.ts:8-9` | ✅ PASS |
| APPNAME-02 | `appleWebApp.title` "Anon Finance" | `lib/pwa/metadata.test.ts:9` `toMatchObject({ capable: true, title: "Anon Finance" })`; code `lib/pwa/metadata.ts:7` | ✅ PASS |
| APPNAME-03 | `BRAND_NAME` stays "ANON" | `lib/brand.test.ts:18-19` `expect(APP_NAME).toBe("Anon Finance")`, `expect(BRAND_NAME).toBe("ANON")`; `Logo.tsx:24` still uses `BRAND_NAME` | ✅ PASS |

### P1: Ativar e desativar (LOCK-01..09)

| ID | Spec-defined outcome | `file:line` + assertion / code | Result |
| -- | -------------------- | ------------------------------ | ------ |
| LOCK-01 | supported (secure + API + platform `true`) shows card, text, "Ativar" | `lib/biometric/support.test.ts:10-12` `toBe(true)`; texts `lib/biometric/text.test.ts:6-9,16` (exact title/description/"Ativar"); UI `components/biometric-card.tsx:60-63` (title, description), `:66-73` (off state, button "Ativar"), `:30` support gate | ✅ PASS |
| LOCK-02 | missing API / insecure / `false` shows unsupported text, no "Ativar" | `support.test.ts:15-41` four `toBe(false)` cases (insecure, no `PublicKeyCredential`, missing fn, `false`, rejection); text `text.test.ts:10`; UI `biometric-card.tsx:62` (`description` undefined), `:65` unsupported `<p>`, button only inside `status === "off"` (`:66`) | ✅ PASS |
| LOCK-03 | `create` with platform, `required`, `discouraged`, 32-byte challenge, `rp.id`=hostname, `user.name`/`displayName` "ANON", `timeout` 60000 | `lib/biometric/webauthn.test.ts:29-38` (`authenticatorAttachment` "platform", `userVerification` "required", `residentKey` "discouraged", `challenge` toEqual the 32-byte value, `rp.id`, `user.name`, `user.displayName`, `user.id`, `timeout` `toBe(60000)`), `:8` `expect(length).toBe(32)`; random source `components/biometric-card.tsx:13-15` `crypto.getRandomValues`; hostname `:43` `location.hostname` | ✅ PASS |
| LOCK-04 | on credential save `{ userId, credentialId }` on device only; card "Bloqueio ativado" + "Desativar" | `webauthn.test.ts:48` `toEqual({ ok: true, credentialId: toBase64Url(RAW_ID) })`; `lock-store.test.ts:24` `toEqual({ userId: "user-1", credentialId: "cred-abc" })`, `:30` keys exactly `["credentialId","userId"]`; `lock-store.client.test.ts:40-43` stored in `localStorage` key `anon-biometric-lock`; UI `biometric-card.tsx:46` save then `setStatus("on")`, `:74-79` text/button; strings `text.test.ts:17-18` | ✅ PASS |
| LOCK-05 | cancel/timeout/reject: lock off, nothing saved, "Não foi possível ativar a biometria. Tente novamente." | `webauthn.test.ts:53` null -> `{ ok: false }`, `:62-67` rejection / NotAllowedError / sync throw -> `{ ok: false }`; `lock-store.test.ts:39-40` `save` `toBe(false)` and no record, plus `:43-51` (pre-saved "old" record, `setItem` throws, `save` `toBe(false)`, `read` `toBeNull()`); text `text.test.ts:11`; UI `biometric-card.tsx:46-47` (`else setFailed(true)`, no save when `!result.ok`), `:82-86` message | ✅ PASS (G-1 closed: M14 now killed) |
| LOCK-06 | "Desativar" removes the record; card shows "Ativar" | `lock-store.test.ts:95-96` `storage.data.has(LOCK_KEY)` false, `store.read` null; UI `biometric-card.tsx:51-55` (`lockStore.clear()` then `setStatus("off")`) | ✅ PASS |
| LOCK-07 | sign-out and account deletion remove the record | UI `components/sign-out-button.tsx:12` `lockStore.clear()`; `components/delete-account-dialog.tsx:57` `lockStore.clear()` (after `deviceKey.clear()`, only on server success); store `lock-store.test.ts:95-96` | ✅ PASS |
| LOCK-08 | other user's record ignored and removed | `lock-store.test.ts:68-69` `expect(store.read("user-2")).toBeNull()`; `expect(storage.data.has(LOCK_KEY)).toBe(false)`; code `lock-store.ts:25-28`; gate reads via `lockStore.read(userId)` at `biometric-gate.tsx:23,48` | ✅ PASS (mutant M3 killed) |
| LOCK-09 | nothing reaches server: no Server Action, route, column, cookie, Sentry | Inspection: `credentialId`/`lockStore`/`anon-biometric` appear only in `src/lib/biometric/{webauthn,lock-store,lock-store.client}.ts` and client components (`biometric-gate`, `biometric-card`, `lock-screen`, `sign-out-button`, `delete-account-dialog`); no hit in `src/actions`, `src/app/api`, `src/proxy.ts`, `src/db`. `signOutAction()` called without args (`sign-out-button.tsx:14`). Sentry events are scrubbed to an allowlist (`lib/sentry/options.ts:11-22`, no Replay: `instrumentation-client.ts:4`). Record shape `lock-store.test.ts:30`. `BiometricCard` receives only `userId` from the server page (`conta/page.tsx:56`) | ✅ PASS (inspection) |

### P1: Bloquear e desbloquear (LOCK-10..20)

| ID | Spec-defined outcome | `file:line` + assertion / code | Result |
| -- | -------------------- | ------------------------------ | ------ |
| LOCK-10 | lock active + document load: no `(app)` content, title "ANON bloqueado" | `components/biometric-gate.tsx:35` initial state from `decideInitial`, `:55-64` returns only `<LockScreen>` (children not rendered), `:22-26` locked when record present and no fresh login; layout wiring `app/(app)/layout.tsx:44-47` gate inside `VaultProvider`; title `components/lock-screen.tsx:56` + `text.test.ts:22` `toBe("ANON bloqueado")`; no SSR read: `VaultProvider` renders `BrandSplash` while `loading` (`vault-provider.tsx:93`), so the gate's `localStorage` read is client-only (and `lock-store.client.test.ts:28-34` proves import is storage-free, reads guarded by try/catch `lock-store.ts:30`) | ✅ PASS |
| LOCK-11 | one `get` on mount: `allowCredentials` with saved id, `required`, 32-byte challenge, `timeout` 60000 | `webauthn.test.ts:79-82` `allowCredentials` `toEqual([{ type: "public-key", id: RAW_ID }])`, `userVerification` "required", `challenge`, `timeout` `toBe(60000)`; one call `:77`; UI once: `lock-screen.tsx:31,41-47` (`useRef` guard, mount effect) | ✅ PASS |
| LOCK-12 | `get` resolves: lock screen removed, content rendered | `webauthn.test.ts:87` `toBe(true)`; UI `lock-screen.tsx:36` `if (ok) onUnlocked()`, `biometric-gate.tsx:61` `remember(userId, null)` -> children at `:65` | ✅ PASS |
| LOCK-13 | failure: stay locked, "Não foi possível confirmar sua identidade.", 3 buttons, no automatic re-call | `webauthn.test.ts:92,98-100,105-106` false for null/rejection/NotAllowedError/corrupted id; text `text.test.ts:23-26`; UI `lock-screen.tsx:38` -> `failed`, `:57-61` message, `:64-68` "Tentar de novo", `:69-71` "Usar a senha", `:72` `SignOutButton` ("Sair", `sign-out-button.tsx:21`); no other `verify()` caller (`:45`, `:65`) | ✅ PASS |
| LOCK-14 | "Tentar de novo" calls `get` again, same options | UI `lock-screen.tsx:65` `onClick={() => void verify()}` -> same `verifyBiometric({ credentialId })` at `:35`; options `webauthn.test.ts:79-82` | ✅ PASS |
| LOCK-15 | "Usar a senha" + password unlock: lock screen removed | UI `lock-screen.tsx:69` `setMode("password")`, `:49` `<UnlockScreen userId onUnlocked={() => onUnlocked()}>`, `:37-38` keeps password mode if prompt later fails; `unlock-screen.tsx:50-52` calls `onUnlocked` after `deviceKey.save` | ✅ PASS |
| LOCK-16 | "Sair" signs out as today | UI `lock-screen.tsx:72` reuses `SignOutButton` (`sign-out-button.tsx:11-14`: `deviceKey.clear()`, `lockStore.clear()`, `signOutAction()`) | ✅ PASS |
| LOCK-17 | hidden > 60 000 ms then visible: lock screen | `lock-policy.test.ts:24` `RELOCK_AFTER_MS` `toBe(60_000)`, `:30` `[60_001, true]`, `:32` `shouldRelock(1_000, 1_000 + elapsed)`; UI `biometric-gate.tsx:39-50` (`hidden` stores `Date.now()`, `visible` -> `shouldRelock`, then `lockStore.read`, `setLockedWith`); content unmounted at `:55-64` | ✅ PASS (mutants M1, M17 killed) |
| LOCK-18 | hidden <= 60 000 ms: stays unlocked | `lock-policy.test.ts:28-29` `[59_999, false]`, `[60_000, false]`; `:36` `shouldRelock(null, ...)` false; UI `biometric-gate.tsx:46` early return | ✅ PASS |
| LOCK-19 | sign-in in this tab: first load skips lock | `lock-policy.test.ts:45-49` mark stores instant, `:66-74` ages 0 / 299_999 / 300_000 true, 300_001 false, `:80-82` consume erases, `:42` window 300 000; mark set by `app/login/login-form.tsx:69` (password, after KEK derive, before `formAction`) and `app/login/google-button.tsx:42` (Google, before `signInGoogleAction`); consumed in `biometric-gate.tsx:25-26`, memoized at module level `:13-18,22` for Strict Mode | ✅ PASS |
| LOCK-20 | no lock: render as before, no `navigator.credentials` call | UI `biometric-gate.tsx:23-26` (null when no record), `:65` renders children; `navigator.credentials` is referenced only in `lock-screen.tsx:35` (mounted only when locked) and `biometric-card.tsx:41` (user tap); `lock-store.test.ts:50` `read` null without record | ✅ PASS |

### P2: Splash no app (SPLASH-06..10)

| ID | Spec-defined outcome | `file:line` (inspection, layer "none") | Result |
| -- | -------------------- | -------------------------------------- | ------ |
| SPLASH-06 | `loading`: full-viewport splash `#0D111A` + mark centered, replacing the gray skeleton | `components/vault-provider.tsx:93` `if (state.status === "loading") return <BrandSplash />`; `components/brand-splash.tsx:11` `fixed inset-0 z-50 flex items-center justify-center bg-[#0D111A]`; `VaultSkeleton` removed (diff) | ✅ PASS |
| SPLASH-07 | leaving `loading` removes it in the same render, no minimum time | `vault-provider.tsx:93` is a pure function of `state.status`; `brand-splash.tsx` has no timer/state | ✅ PASS |
| SPLASH-08 | reduced motion: no animation | `brand-splash.tsx:17` `motion-safe:animate-pulse` (only applies without `prefers-reduced-motion: reduce`) | ✅ PASS |
| SPLASH-09 | `role="status"`, name "Carregando" | `brand-splash.tsx:9-10` `role="status"` `aria-label="Carregando"` | ✅ PASS |
| SPLASH-10 | no user data | `brand-splash.tsx:6-53` takes no props, static SVG only | ✅ PASS |

### P2: Transparência (LOCK-21..22)

| ID | Spec-defined outcome | `file:line` | Result |
| -- | -------------------- | ----------- | ------ |
| LOCK-21 | privacy page states the exact sentence | `lib/biometric/text.test.ts:30-32` `toBe("A biometria é conferida ... nada disso vai para o servidor.")`; rendered `components/privacy/privacy-content.tsx:61` (`LOCK_TEXT.privacy` in `PROCESSED`, mapped at `:149`) | ✅ PASS |
| LOCK-22 | below the description, while off: "Digital, rosto ou o PIN do aparelho, conforme o que o seu aparelho oferecer." | `text.test.ts:12` `toBe(...)`; UI `biometric-card.tsx:66-68` inside `status === "off"` only, after the card description (`:62`) | ✅ PASS |

### Edge cases

| Edge case | `file:line` | Result |
| --------- | ----------- | ------ |
| Second device without record renders `(app)` without lock | `biometric-gate.tsx:23-26`; `lock-store.test.ts:50` | ✅ |
| Credential removed from device: `get` rejects, failure state keeps "Usar a senha" | `webauthn.test.ts:98-100`; `lock-screen.tsx:38,69` | ✅ |
| Lock screen mounts no child of `(app)` | `biometric-gate.tsx:55-65` (conditional return, no `display:none`) | ✅ |
| Storage refuses to write: lock off + enroll message | `lock-store.test.ts:39-40`, `:43-51`; `biometric-card.tsx:46-47` | ✅ |

**Status**: 35/35 ACs match the spec outcome; 4/4 edge cases handled; no surviving mutant; no open spec-precision gap.

### Payload / conjunction rule

- `create` options: each field of LOCK-03 is asserted by value in one test (`webauthn.test.ts:29-38`), including `user.id` bytes and `pubKeyCredParams` (`:39-42`). `challenge` length 32 is asserted through the `randomBytes` argument (`:8`) and mutant M8 (16 bytes) is killed.
- `get` options: `allowCredentials`, `userVerification`, `challenge`, `timeout` asserted by value (`:79-82`).
- Record `{ userId, credentialId }`: both fields and the exact key set asserted (`lock-store.test.ts:24,30`).

### Spec-precision gaps

- **P-1 (SPLASH-04 "brand mark centered") closed.** The spec still gives no tolerance, but the test now fixes one by value: the center of the bounding box of every non-background pixel must be within 1% of the image center on both axes (`splash-images.test.ts:84-85`, 11 devices via `describe.each`). Sensor evidence below (S1-S4): a 5% or 2% shift of the mark (horizontal or vertical) fails 11 tests; a 0.8% shift (inside tolerance) passes, as designed. The 1% tolerance is a test decision, not a spec text: acceptable, no residual gap.
- Note (not a gap): the "Sair" label lives as the literal `Sair` in `sign-out-button.tsx:21`, equal to the spec text.

---

## Discrimination Sensor

Depth: P0-style (authentication-adjacent lock), manual fault injection in an isolated `git worktree` of HEAD (6d74ff8, `node_modules` symlinked), command `vitest run --project unit src/lib/biometric src/lib/pwa src/app/manifest.test.ts src/lib/brand.test.ts`. Control (unmutated scratch): 17 files / 207 passed. Scratch removed (`git worktree remove --force` + `prune`); `git status --porcelain` of the real tree equals the baseline recorded before the sensor (` M .specs/LESSONS.md`, ` M .specs/lessons.json`, `?? .specs/features/pwa-splash-biometria/validation.md`).

**Iteration 1 (previous report, 21 mutants, 20 killed, M14 survived)**: `>`->`>=` in `shouldRelock`, dropped `hiddenAt` guard, `userVerification` "preferred" (get and create), other user's record kept, fresh-login window never expires, `consumeFreshLogin` without erase, timeout 30 000, `residentKey`, 16-byte challenge, `displayName`, `rp.id`, attachment, `get` true for null, secure-context check removed, extra record field, splash list ratio, manifest color, PNG corner, PNG without mark. M14 was the survivor.

**Iteration 2 (independent, 15 mutants, different from the above except the M14 re-check)**:

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M14 (re-check) | `lock-store.ts:39` | removed `remove()` in the `catch` of `save` | ✅ Killed (1 fail: the new test `lock-store.test.ts:43`) |
| N1 | `webauthn.ts:58` | `allowCredentials` id built with `toBase64Url` instead of `fromBase64Url` | ✅ Killed (2 fails) |
| N2 | `support.ts:11` | `biometricSupport` returns `true` when the platform promise rejects | ✅ Killed (1 fail) |
| N3 | `lock-policy.ts:9` | `FRESH_LOGIN_WINDOW_MS` 300 000 -> 3 000 000 | ✅ Killed (2 fails) |
| N4 | `lock-policy.ts:8` | `RELOCK_AFTER_MS` 60 000 -> 61 000 | ✅ Killed (2 fails) |
| N5 | `text.ts:12` | `lockedTitle` "ANON bloqueado" -> "ANON travado" | ✅ Killed (1 fail) |
| N6 | `metadata.ts:7` | `appleWebApp.title` -> "ANON" | ✅ Killed (1 fail) |
| N7 | `manifest.ts:9` | `short_name` -> "ANON" | ✅ Killed (1 fail) |
| N7b | `manifest.ts:8` | `name` -> "ANON" | ✅ Killed (1 fail) |
| N8 | `splash-list.ts:19` | `media` without `(orientation: portrait)` | ✅ Killed (1 fail) |
| N9 | `splash-list.ts:28` | `startupImages` omits the first device (`slice(1)`) | ✅ Killed (1 fail) |
| N10 | `text.ts:6` | `unsupported` text shortened | ✅ Killed (1 fail) |
| S1 | `scripts/generate-pwa-splash.ts:23` | mark shifted 5% of width horizontally, PNGs regenerated (`tsx`) | ✅ Killed (11 fails, all devices) |
| S2 | same | mark shifted 2% horizontally | ✅ Killed (11 fails) |
| S3 | same | mark shifted 5% vertically | ✅ Killed (11 fails) |
| S4 (boundary) | same | mark shifted 0.8% horizontally (inside the 1% tolerance) | Survives by design (44 passed): confirms the assertion is a 1% window, not just presence |

**Sensor depth**: P0-full manual. **Result**: 15/15 intended mutants killed (S4 is a control for the tolerance, not a fault). Combined with iteration 1: 35/35 distinct faulty mutants killed.

Not mutated by design: UI components (`biometric-gate`, `lock-screen`, `biometric-card`, `brand-splash`, login wiring); the Test Coverage Matrix assigns them layer "none" (AD-005).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (diff limited to feature files, docs, `package.json` script) |
| No scope creep | ✅ |
| Matches patterns (injected adapters, `LOCK_TEXT` literal constants per L-002, `useRef` guard like `vault-provider`) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ (one precision gap P-1) |
| Per-layer Coverage Expectation (domain logic 1:1 with ACs; boundaries 59 999 / 60 000 / 60 001) | ✅ |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md` (AD-005 no e2e), `.specs/STATE.md` AD-005/AD-017, `tasks.md` Test Coverage Matrix | ✅ |

Adversarial UI review, no defects found: no `children` is mounted while locked (`biometric-gate.tsx:55-65`); the module-level decision (`:13-27`) survives Strict Mode and is keyed by `userId`; `localStorage` is only touched on the client and every access is guarded; re-lock reads the record on each event (`:48`); `LockScreen` is keyed by credential id and the automatic `get` is guarded by a ref (`lock-screen.tsx:31,43`). Accepted risks recorded in `design.md` (failed login leaves a 5-minute mark; local lock bypassable; unmount loses unsaved drafts).

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run test:unit && npx eslint <changed files>` (the full `npm run lint` is excepted, see observation)
- **typecheck**: exit 0 (`next typegen && tsc --noEmit`)
- **test:unit**: 103 files, **1774 passed, 0 failed, 0 skipped**
- **eslint** on the 34 changed `.ts/.tsx` files of the range (`git diff --name-only 622cc28..HEAD`, incl. `scripts/generate-pwa-splash.ts`): exit 0, no output
- **Test count before feature** (`622cc28`): 95 files / 1667 tests; **after**: 103 files / 1774 tests; **delta**: +8 files, +107 tests (+12 vs iteration 1: 1 `lock-store` test and 11 centering tests); no test removed or skipped
- **Observation (out of scope)**: full `npm run lint` fails on a pre-feature error, `src/app/layout.tsx:70` (`no-sync-scripts`, impeccable-live block, commit d29a27d). Not counted against this feature.
- No e2e run (AD-005); no integration tests (the feature does not touch the DB).

---

## Fix Plans

None open. Iteration 1 Fix 1 (G-1, M14) and P-1 (SPLASH-04 centered) were delivered by commit 6d74ff8 and re-verified here.

---

## Requirement Traceability Update

SPLASH-01..10, APPNAME-01..03, LOCK-01..22 are all Verified against the spec outcome.

---

## Summary

**Overall**: ✅ Ready (automated scope; manual device checks remain by design)

**Spec-anchored check**: 35/35 ACs matched spec outcome | 0 open spec-precision gaps
**Sensor**: 15/15 intended mutants killed this iteration (35/35 distinct across both); M14 killed; 5%/2% mark shifts killed
**Gate**: 1774 passed, 0 failed; typecheck ok; eslint ok on the changed files

**What works**: pure lock logic with exact boundaries, WebAuthn option payloads, record lifecycle (save/clear/other user/failed overwrite), splash list/PNGs (size, corners, centered within 1%)/manifest/metadata, and all UI wiring verified by inspection with the lock decision made client-only and no children mounted while locked; nothing biometric reaches server code or Sentry.

**Issues found**: none.

**Next steps**: manual verification on real iOS and Android devices (Success Criteria; `docs/hospedagem-gratuita.md` section 8.2) remains pending by design.
