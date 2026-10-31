// Hourly push dispatch, called by the GitHub Actions workflow with `Authorization: Bearer <CRON_SECRET>`.
// Only POST: other methods get Next's 405. Error answers carry no body.
import { createHash, timingSafeEqual } from "node:crypto";
import { pushRepo } from "@/lib/db/repos/push";
import { pushDispatchRepo } from "@/lib/db/repos/push-dispatch";
import { resolveCronSecret, resolvePushConfig } from "@/lib/push/config";
import { runDispatch } from "@/lib/push/dispatch";
import { sendPush } from "@/lib/push/send";

/** The runner stops claiming at 40 s, inside this limit. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time check: both sides are hashed first, so the lengths always match. */
function authorized(header: string | null, secret: string): boolean {
  return timingSafeEqual(sha256(header ?? ""), sha256(`Bearer ${secret}`));
}

export async function POST(request: Request) {
  // Configuration first: without CRON_SECRET there is nothing to authenticate against (PUSH-21).
  const secret = resolveCronSecret(process.env);
  const config = resolvePushConfig(process.env);
  if (!secret || !config) return new Response(null, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) return new Response(null, { status: 401 });

  const { sent, removed, failed } = await runDispatch({
    now: new Date(),
    config,
    repo: { ...pushDispatchRepo, removeByEndpoint: pushRepo.removeByEndpoint },
    send: sendPush,
  });
  return Response.json({ sent, removed, failed }, { headers: { "Cache-Control": "no-store" } });
}
