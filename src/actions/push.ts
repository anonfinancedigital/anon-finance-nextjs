"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { pushRepo } from "@/lib/db/repos/push";
import { logActionError } from "@/lib/log";
import { resolvePushConfig } from "@/lib/push/config";
import { preferencesSchema, subscriptionSchema } from "@/lib/validation/push";

const LIMIT = "Limite de 5 dispositivos atingido";
const NO_PREFS = "Ative as notificações primeiro";
// The spec only says the action refuses without VAPID (the section is hidden then); this text is ours.
const NOT_CONFIGURED = "Notificações indisponíveis";

/** What `PushSubscription.toJSON()` gives in the browser. */
export type BrowserSubscription = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

/**
 * Stores this browser's subscription for the session user (PUSH-03) and creates the default preferences.
 * The endpoint must be a known push service (PUSH-05) and the keys well formed (PUSH-06); a sixth device
 * is refused (PUSH-07). Without the VAPID configuration nothing is stored.
 */
export async function subscribePushAction(sub: BrowserSubscription): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;
  if (!resolvePushConfig(process.env)) return { ok: false, error: NOT_CONFIGURED };

  const parsed = subscriptionSchema.safeParse({
    endpoint: sub?.endpoint,
    p256dh: sub?.keys?.p256dh,
    auth: sub?.keys?.auth,
  });
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    if ((await pushRepo.subscribe(session.userId, parsed.data)) === "limit") return { ok: false, error: LIMIT };
  } catch (error) {
    logActionError("subscribePushAction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/conta");
  return { ok: true };
}

/** Deletes the session user's subscription with this endpoint (PUSH-09); another user's is left alone. */
export async function unsubscribePushAction(endpoint: string): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  try {
    await pushRepo.unsubscribe(session.userId, String(endpoint));
  } catch (error) {
    logActionError("unsubscribePushAction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/conta");
  return { ok: true };
}

/** Saves the session user's notification preferences (PUSH-16 to 19); never another user's row. */
export async function updatePushPreferencesAction(prefs: {
  reminder: boolean;
  due: boolean;
  security: boolean;
  admin: boolean;
  hour: number;
}): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = preferencesSchema.safeParse(prefs);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    if ((await pushRepo.updatePrefs(session.userId, parsed.data)) === "no_prefs") {
      return { ok: false, error: NO_PREFS };
    }
  } catch (error) {
    logActionError("updatePushPreferencesAction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/conta");
  return { ok: true };
}
