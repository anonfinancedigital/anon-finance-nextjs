import { fromBase64Url, toBase64Url } from "../crypto/base64url";

type Credentials = Pick<CredentialsContainer, "create" | "get">;

const TIMEOUT_MS = 60_000;
const CHALLENGE_BYTES = 32;

/** Asks the platform authenticator for a new credential; any failure is `{ ok: false }`, never a throw. */
export async function enrollBiometric({
  credentials,
  userId,
  hostname,
  randomBytes,
}: {
  credentials: Credentials;
  userId: string;
  hostname: string;
  randomBytes: (length: number) => Uint8Array;
}): Promise<{ ok: true; credentialId: string } | { ok: false }> {
  try {
    const credential = (await credentials.create({
      publicKey: {
        rp: { name: "ANON", id: hostname },
        user: { id: new TextEncoder().encode(userId), name: "ANON", displayName: "ANON" },
        challenge: randomBytes(CHALLENGE_BYTES) as BufferSource,
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "discouraged",
        },
        timeout: TIMEOUT_MS,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return { ok: false };
    return { ok: true, credentialId: toBase64Url(new Uint8Array(credential.rawId)) };
  } catch {
    return { ok: false };
  }
}

/** Asks the user to confirm with the saved credential; false on cancel, timeout or any error. */
export async function verifyBiometric({
  credentials,
  credentialId,
  randomBytes,
}: {
  credentials: Credentials;
  credentialId: string;
  randomBytes: (length: number) => Uint8Array;
}): Promise<boolean> {
  try {
    const credential = await credentials.get({
      publicKey: {
        allowCredentials: [{ type: "public-key", id: fromBase64Url(credentialId) as BufferSource }],
        userVerification: "required",
        challenge: randomBytes(CHALLENGE_BYTES) as BufferSource,
        timeout: TIMEOUT_MS,
      },
    });
    return credential !== null;
  } catch {
    return false;
  }
}
