// Immediate account-security notices (password reset, access revoked). Best effort: never throws.
import { pushRepo, type StoredSub } from "@/lib/db/repos/push";
import { PUSH_TEXT } from "@/lib/domain/push-messages";
import { logActionError } from "@/lib/log";
import { type PushConfig, resolvePushConfig } from "./config";
import { type SendResult, sendPush } from "./send";

export type SecurityKind = "password_reset" | "revoked";

const TEXT: Record<SecurityKind, string> = {
  password_reset: PUSH_TEXT.passwordReset,
  revoked: PUSH_TEXT.revoked,
};

/**
 * Sends the notice to every subscription of the user when security notices are on (PUSH-33, PUSH-34,
 * PUSH-36). Nothing without the VAPID configuration. Subscriptions reported gone are deleted. Any error
 * is logged and swallowed, so the reset or revocation that called it is never affected (PUSH-35).
 */
export async function notifySecurity(
  userId: string,
  kind: SecurityKind,
  deps: {
    env?: Record<string, string | undefined>;
    send?: (config: PushConfig, sub: StoredSub, body: string) => Promise<SendResult>;
  } = {},
): Promise<void> {
  const { env = process.env, send = sendPush } = deps;
  try {
    const config = resolvePushConfig(env);
    if (!config) return;
    for (const sub of await pushRepo.securityTargets(userId)) {
      if ((await send(config, sub, TEXT[kind])) === "gone") await pushRepo.removeByEndpoint(sub.endpoint);
    }
  } catch (error) {
    logActionError("notifySecurity", error);
  }
}
