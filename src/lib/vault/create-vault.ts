import { toBase64Url } from "@/lib/crypto/base64url";
import { deriveKeys, type KdfParams } from "@/lib/crypto/kdf";
import { generateRecoveryKey, recoveryKek } from "@/lib/crypto/recovery";
import { wrapDek } from "@/lib/crypto/wrap";
import { sealBirthDate } from "./seal";
import type { Ct, VaultMaterial } from "./types";

const DEK_BYTES = 32;
const SALT_BYTES = 16;

export interface CreatedVault {
  /** Everything the server receives: the login secret and sealed values only (SIGILO-02, SIGILO-11). */
  server: { authSecret: string; material: VaultMaterial; birthDateCt: Ct | null };
  /** Shown once to the user (SIGILO-18); never sent. */
  recoveryKey: string;
  /** Non-extractable DEK for this session. */
  dek: CryptoKey;
}

/**
 * Sign-up in the browser: a random DEK and recovery key, `authSecret` and KEK from the password, the
 * DEK wrapped by both, and the birth date sealed with the DEK.
 */
export async function createVaultMaterial(input: {
  password: string;
  userId: string;
  birthDateIso?: string;
  params: KdfParams;
}): Promise<CreatedVault> {
  const { password, userId, birthDateIso, params } = input;
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const dekRaw = crypto.getRandomValues(new Uint8Array(DEK_BYTES));
  const recovery = generateRecoveryKey();

  try {
    const [{ authSecret, kek }, recoveryWrapKey, dek] = await Promise.all([
      deriveKeys(password, salt, params),
      recoveryKek(recovery.bytes),
      crypto.subtle.importKey("raw", dekRaw, "AES-GCM", false, ["encrypt", "decrypt"]),
    ]);
    const [dekWrappedPw, dekWrappedRecovery, birthDateCt] = await Promise.all([
      wrapDek(kek, dekRaw, userId),
      wrapDek(recoveryWrapKey, dekRaw, userId),
      birthDateIso === undefined ? null : sealBirthDate(dek, userId, birthDateIso),
    ]);
    return {
      server: {
        authSecret,
        material: {
          kdfVersion: 1,
          salt: toBase64Url(salt),
          memKib: params.m,
          iterations: params.t,
          parallelism: params.p,
          dekWrappedPw,
          dekWrappedRecovery,
        },
        birthDateCt,
      },
      recoveryKey: recovery.display,
      dek,
    };
  } finally {
    dekRaw.fill(0);
    recovery.bytes.fill(0);
  }
}
