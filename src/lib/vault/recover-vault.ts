import { toBase64Url } from "@/lib/crypto/base64url";
import { deriveKeys, type KdfParams } from "@/lib/crypto/kdf";
import { InvalidRecoveryKey, parseRecoveryKey, recoveryKek } from "@/lib/crypto/recovery";
import { unwrapDek, wrapDek } from "@/lib/crypto/wrap";
import type { Ct, VaultMaterial } from "./types";

const SALT_BYTES = 16;

/**
 * Password reset with the recovery key (SIGILO-19): opens the DEK with the key, then wraps it under the
 * KEK of the new password with a new salt. Throws `InvalidRecoveryKey` for a malformed or wrong key,
 * before anything is derived for the server (SIGILO-20).
 */
export async function rewrapWithRecovery(input: {
  recoveryKeyText: string;
  dekWrappedRecovery: Ct;
  newPassword: string;
  userId: string;
  params: KdfParams;
}): Promise<{ authSecret: string; material: VaultMaterial }> {
  const { dekWrappedRecovery, newPassword, userId, params } = input;
  let dekRaw: Uint8Array;
  try {
    const recoveryBytes = parseRecoveryKey(input.recoveryKeyText);
    dekRaw = await unwrapDek(await recoveryKek(recoveryBytes), dekWrappedRecovery, userId);
    recoveryBytes.fill(0);
  } catch {
    throw new InvalidRecoveryKey();
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const { authSecret, kek } = await deriveKeys(newPassword, salt, params);
    return {
      authSecret,
      material: {
        kdfVersion: 1,
        salt: toBase64Url(salt),
        memKib: params.m,
        iterations: params.t,
        parallelism: params.p,
        dekWrappedPw: await wrapDek(kek, dekRaw, userId),
        dekWrappedRecovery,
      },
    };
  } finally {
    dekRaw.fill(0);
  }
}
