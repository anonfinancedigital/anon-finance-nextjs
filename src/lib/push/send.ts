// Sends one notification through the browser vendor's push service (web-push: RFC 8291 + VAPID).
import webpush from "web-push";
import { PUSH_TTL, pushPayload } from "@/lib/domain/push-messages";
import { logActionError } from "@/lib/log";
import { isAllowedPushEndpoint } from "@/lib/validation/push";
import type { StoredSub } from "@/lib/db/repos/push";
import type { PushConfig } from "./config";

export type SendResult = "sent" | "gone" | "failed";

/**
 * `gone` when the service says the subscription no longer exists (404/410), so the caller deletes it;
 * `failed` on any other error, logged only as `push_<status>` (never the endpoint or keys). The endpoint
 * is checked against the allowlist again, so an old or tampered row never becomes a request to another host.
 */
export async function sendPush(config: PushConfig, sub: StoredSub, body: string): Promise<SendResult> {
  if (!isAllowedPushEndpoint(sub.endpoint)) return "failed";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      pushPayload(body),
      {
        TTL: PUSH_TTL,
        vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
      },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: unknown } | null)?.statusCode;
    if (status === 404 || status === 410) return "gone";
    logActionError("sendPush", { code: `push_${typeof status === "number" ? status : "network"}` });
    return "failed";
  }
}
