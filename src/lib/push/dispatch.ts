// One run of the hourly push dispatch: daily reminder, due notice and administrator broadcasts.
import type { StoredSub } from "@/lib/db/repos/push";
import type { Candidate, DispatchKind, pushDispatchRepo } from "@/lib/db/repos/push-dispatch";
import { PUSH_TEXT } from "@/lib/domain/push-messages";
import { localClock } from "@/lib/domain/push-schedule";
import type { PushConfig } from "./config";
import type { SendResult } from "./send";

/** Most pushes per run; the rest go out in the next one, as they stay unclaimed (PUSH-30). */
const MAX_SENDS = 1000;
/** Jobs in flight at once; each job sends to its user's subscriptions one after the other. */
const CONCURRENCY = 20;
/** Stop claiming after this long, so the run answers inside `maxDuration = 60`. */
const DEFAULT_DEADLINE_MS = 40_000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type DispatchRepo = Pick<
  typeof pushDispatchRepo,
  "reminderCandidates" | "dueCandidates" | "broadcastCandidates" | "claim" | "markBroadcastSent" | "prune"
> & { removeByEndpoint: (endpoint: string) => Promise<void> };

export type DispatchResult = { sent: number; removed: number; failed: number };

type Job = { kind: DispatchKind; ref: string; body: string; target: Candidate };

/**
 * Claims each (user, kind, ref) before sending, so a retry or a concurrent run never sends twice
 * (at most once: a run that dies after the claim loses that notice). Subscriptions answered 404/410
 * are deleted; other failures are counted and the run goes on. A broadcast is marked sent once every
 * target of this run got a claim; dispatch rows older than 7 days are pruned at the end.
 */
export async function runDispatch(deps: {
  now: Date;
  config: PushConfig;
  repo: DispatchRepo;
  send: (config: PushConfig, sub: StoredSub, body: string) => Promise<SendResult>;
  deadlineMs?: number;
}): Promise<DispatchResult> {
  const { now, config, repo, send, deadlineMs = DEFAULT_DEADLINE_MS } = deps;
  const startedAt = Date.now();
  const { date, hour } = localClock(now);

  const jobs: Job[] = [];
  for (const target of await repo.reminderCandidates(date, hour)) {
    jobs.push({ kind: "reminder", ref: date, body: PUSH_TEXT.reminder, target });
  }
  for (const target of await repo.dueCandidates(date, hour)) {
    jobs.push({ kind: "due", ref: date, body: PUSH_TEXT.due, target });
  }
  const unclaimed = new Map<string, number>();
  for (const { broadcast, targets } of await repo.broadcastCandidates()) {
    unclaimed.set(broadcast.id, targets.length);
    for (const target of targets) jobs.push({ kind: "broadcast", ref: broadcast.id, body: broadcast.text, target });
  }

  const result: DispatchResult = { sent: 0, removed: 0, failed: 0 };
  let reserved = 0;
  let next = 0;

  async function runJob(job: Job) {
    if (Date.now() - startedAt >= deadlineMs) return;
    const count = job.target.subs.length;
    if (reserved + count > MAX_SENDS) return;
    reserved += count;
    const claimed = await repo.claim(job.target.userId, job.kind, job.ref);
    if (job.kind === "broadcast") unclaimed.set(job.ref, unclaimed.get(job.ref)! - 1);
    if (!claimed) {
      reserved -= count;
      return;
    }
    for (const sub of job.target.subs) {
      const outcome = await send(config, sub, job.body);
      if (outcome === "sent") result.sent++;
      else if (outcome === "failed") result.failed++;
      else {
        await repo.removeByEndpoint(sub.endpoint);
        result.removed++;
      }
    }
  }

  async function worker() {
    while (next < jobs.length) await runJob(jobs[next++]);
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  for (const [id, left] of unclaimed) if (left === 0) await repo.markBroadcastSent(id);
  await repo.prune(new Date(now.getTime() - RETENTION_MS));
  return result;
}
