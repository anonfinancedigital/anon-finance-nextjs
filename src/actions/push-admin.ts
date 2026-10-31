"use server";

import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireAdminForAction } from "@/lib/auth-guard";
import { pushDispatchRepo } from "@/lib/db/repos/push-dispatch";
import { logActionError } from "@/lib/log";
import { broadcastSchema } from "@/lib/validation/push";

/**
 * Queues an administrator message (1 to 140 characters after trim) for the next dispatch run, which
 * delivers it once to every subscribed approved user with admin messages on (PUSH-37 to 39).
 */
export async function broadcastPushAction(text: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin.ok) return admin;

  const parsed = broadcastSchema.safeParse(text);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    await pushDispatchRepo.enqueueBroadcast(parsed.data);
  } catch (error) {
    logActionError("broadcastPushAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true };
}
