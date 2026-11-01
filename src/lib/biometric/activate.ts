import { enrollBiometric } from "./webauthn";

/** Enrolls the platform authenticator and saves the record; true only when both worked, so a failure leaves no record. */
export async function activateBiometric({
  credentials,
  userId,
  hostname,
  randomBytes,
  store,
}: {
  credentials: Parameters<typeof enrollBiometric>[0]["credentials"];
  userId: string;
  hostname: string;
  randomBytes: (length: number) => Uint8Array;
  store: { save(userId: string, credentialId: string): boolean };
}): Promise<boolean> {
  const result = await enrollBiometric({ credentials, userId, hostname, randomBytes });
  return result.ok && store.save(userId, result.credentialId);
}
