import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredSub } from "@/lib/db/repos/push";
import type { Candidate } from "@/lib/db/repos/push-dispatch";
import { runDispatch, type DispatchRepo } from "./dispatch";
import type { SendResult } from "./send";

const config = { publicKey: "pub", privateKey: "priv", subject: "mailto:ops@example.com" };
// 2026-10-15 12:00 in São Paulo (UTC-3).
const NOW = new Date("2026-10-15T15:00:00Z");

const sub = (name: string): StoredSub => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${name}`,
  p256dh: "p",
  auth: "a",
});
const candidate = (userId: string, devices = 1): Candidate => ({
  userId,
  subs: Array.from({ length: devices }, (_, i) => sub(`${userId}-${i}`)),
});

/** In-memory repo: claims live in a Set like the push_dispatch primary key. */
function fakeRepo(data: {
  reminder?: Candidate[];
  due?: Candidate[];
  broadcasts?: { broadcast: { id: string; text: string }; targets: Candidate[] }[];
  claimed?: string[];
}) {
  const claims = new Set(data.claimed ?? []);
  const repo = {
    reminderCandidates: vi.fn(async (date: string) =>
      (data.reminder ?? []).filter((c) => !claims.has(`${c.userId}|reminder|${date}`)),
    ),
    dueCandidates: vi.fn(async (date: string) =>
      (data.due ?? []).filter((c) => !claims.has(`${c.userId}|due|${date}`)),
    ),
    broadcastCandidates: vi.fn(async () =>
      (data.broadcasts ?? []).map(({ broadcast, targets }) => ({
        broadcast,
        targets: targets.filter((c) => !claims.has(`${c.userId}|broadcast|${broadcast.id}`)),
      })),
    ),
    claim: vi.fn(async (userId: string, kind: string, ref: string) => {
      const key = `${userId}|${kind}|${ref}`;
      if (claims.has(key)) return false;
      claims.add(key);
      return true;
    }),
    markBroadcastSent: vi.fn(async () => {}),
    prune: vi.fn(async () => {}),
    removeByEndpoint: vi.fn(async () => {}),
  } satisfies DispatchRepo;
  return { repo, claims };
}

const okSend = () =>
  vi.fn<(config: unknown, sub: StoredSub, body: string) => Promise<SendResult>>(async () => "sent");

afterEach(() => vi.useRealTimers());

describe("runDispatch", () => {
  it("sends the reminder text to every subscription and answers {sent, removed, failed} only (PUSH-24, PUSH-31)", async () => {
    const { repo } = fakeRepo({ reminder: [candidate("u1", 2)] });
    const send = okSend();

    const result = await runDispatch({ now: NOW, config, repo, send });

    expect(result).toEqual({ sent: 2, removed: 0, failed: 0 });
    expect(Object.keys(result).sort()).toEqual(["failed", "removed", "sent"]);
    expect(repo.reminderCandidates).toHaveBeenCalledWith("2026-10-15", 12);
    expect(repo.claim).toHaveBeenCalledWith("u1", "reminder", "2026-10-15");
    expect(send.mock.calls).toEqual([
      [config, sub("u1-0"), "Que tal registrar seus gastos de hoje?"],
      [config, sub("u1-1"), "Que tal registrar seus gastos de hoje?"],
    ]);
  });

  it("sends the exact due text with the local date (PUSH-25, PUSH-29)", async () => {
    const { repo } = fakeRepo({ due: [candidate("u1")] });
    const send = okSend();

    await runDispatch({ now: NOW, config, repo, send });

    expect(repo.dueCandidates).toHaveBeenCalledWith("2026-10-15", 12);
    expect(repo.claim).toHaveBeenCalledWith("u1", "due", "2026-10-15");
    expect(send.mock.calls).toEqual([[config, sub("u1-0"), "Você tem lançamentos recorrentes para hoje."]]);
  });

  it("claims before sending (PUSH-26)", async () => {
    const order: string[] = [];
    const { repo } = fakeRepo({ reminder: [candidate("u1")] });
    const claim = repo.claim.getMockImplementation()!;
    repo.claim.mockImplementation(async (...args) => {
      order.push("claim");
      return claim(...args);
    });
    const send = vi.fn(async (): Promise<SendResult> => {
      order.push("send");
      return "sent";
    });

    await runDispatch({ now: NOW, config, repo, send });

    expect(order).toEqual(["claim", "send"]);
  });

  it("does not send again on a second run the same day (PUSH-26)", async () => {
    const { repo } = fakeRepo({ reminder: [candidate("u1")], due: [candidate("u1")] });
    const send = okSend();

    expect(await runDispatch({ now: NOW, config, repo, send })).toEqual({ sent: 2, removed: 0, failed: 0 });
    expect(await runDispatch({ now: NOW, config, repo, send })).toEqual({ sent: 0, removed: 0, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not send when the claim conflicts (PUSH-26)", async () => {
    const { repo } = fakeRepo({ reminder: [candidate("u1")] });
    repo.claim.mockResolvedValue(false);
    const send = okSend();

    expect(await runDispatch({ now: NOW, config, repo, send })).toEqual({ sent: 0, removed: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("removes gone subscriptions and keeps going after a failure (PUSH-27, PUSH-28)", async () => {
    const { repo } = fakeRepo({ reminder: [candidate("u1", 3), candidate("u2")] });
    const results: Record<string, SendResult> = { "u1-0": "gone", "u1-1": "failed", "u1-2": "sent", "u2-0": "sent" };
    const send = vi.fn(async (_c: unknown, s: StoredSub): Promise<SendResult> => results[s.endpoint.split("/").pop()!]);

    expect(await runDispatch({ now: NOW, config, repo, send })).toEqual({ sent: 2, removed: 1, failed: 1 });
    expect(repo.removeByEndpoint.mock.calls).toEqual([[sub("u1-0").endpoint]]);
    expect(send).toHaveBeenCalledTimes(4);
  });

  it("sends at most 1000 pushes, never more than 20 at once, and leaves the rest unclaimed (PUSH-30)", async () => {
    const users = Array.from({ length: 1005 }, (_, i) => candidate(`u${i}`));
    const { repo, claims } = fakeRepo({ reminder: users });
    let inFlight = 0;
    let maxInFlight = 0;
    const send = vi.fn(async (): Promise<SendResult> => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight--;
      return "sent";
    });

    const result = await runDispatch({ now: NOW, config, repo, send });

    expect(result).toEqual({ sent: 1000, removed: 0, failed: 0 });
    expect(send).toHaveBeenCalledTimes(1000);
    expect(maxInFlight).toBeLessThanOrEqual(20);
    expect(claims.size).toBe(1000);

    // The next run picks up the 5 left over.
    expect(await runDispatch({ now: NOW, config, repo, send })).toEqual({ sent: 5, removed: 0, failed: 0 });
  });

  it("stops claiming once the deadline has passed (PUSH-30)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T15:00:00Z"));
    const start = Date.now();
    const { repo } = fakeRepo({ reminder: Array.from({ length: 10 }, (_, i) => candidate(`u${i}`)) });
    const claimTimes: number[] = [];
    const claim = repo.claim.getMockImplementation()!;
    repo.claim.mockImplementation(async (...args) => {
      claimTimes.push(Date.now());
      vi.setSystemTime(Date.now() + 15_000);
      return claim(...args);
    });

    await runDispatch({ now: NOW, config, repo, send: okSend(), deadlineMs: 40_000 });

    expect(claimTimes.length).toBeGreaterThan(0);
    expect(claimTimes.length).toBeLessThan(10);
    expect(claimTimes.every((t) => t - start < 40_000)).toBe(true);
  });

  it("claims nothing when the deadline is already over", async () => {
    const { repo } = fakeRepo({ reminder: [candidate("u1")] });
    const send = okSend();

    expect(await runDispatch({ now: NOW, config, repo, send, deadlineMs: 0 })).toEqual({
      sent: 0,
      removed: 0,
      failed: 0,
    });
    expect(repo.claim).not.toHaveBeenCalled();
  });

  it("sends the broadcast text once per target with kind broadcast and ref the id (PUSH-40)", async () => {
    const broadcast = { id: "b-1", text: "Manutenção às 22h" };
    const { repo } = fakeRepo({ broadcasts: [{ broadcast, targets: [candidate("u1"), candidate("u2")] }] });
    const send = okSend();

    await runDispatch({ now: NOW, config, repo, send });

    expect(repo.claim.mock.calls.sort()).toEqual([
      ["u1", "broadcast", "b-1"],
      ["u2", "broadcast", "b-1"],
    ]);
    expect(send.mock.calls.map((c) => c[2])).toEqual(["Manutenção às 22h", "Manutenção às 22h"]);
  });

  it("marks a broadcast sent when every target was claimed, or when none is left (PUSH-41)", async () => {
    const { repo } = fakeRepo({
      broadcasts: [
        { broadcast: { id: "b-1", text: "A" }, targets: [candidate("u1")] },
        { broadcast: { id: "b-2", text: "B" }, targets: [] },
      ],
    });

    await runDispatch({ now: NOW, config, repo, send: okSend() });

    expect(repo.markBroadcastSent.mock.calls.sort()).toEqual([["b-1"], ["b-2"]]);
  });

  it("does not mark a broadcast sent while a target is left without a claim (PUSH-41)", async () => {
    const targets = Array.from({ length: 1001 }, (_, i) => candidate(`u${i}`));
    const { repo } = fakeRepo({ broadcasts: [{ broadcast: { id: "b-1", text: "A" }, targets }] });

    await runDispatch({ now: NOW, config, repo, send: okSend() });

    expect(repo.markBroadcastSent).not.toHaveBeenCalled();
  });

  it("prunes dispatch rows older than 7 days (PUSH-31)", async () => {
    const { repo } = fakeRepo({});

    await runDispatch({ now: NOW, config, repo, send: okSend() });

    expect(repo.prune).toHaveBeenCalledWith(new Date("2026-10-08T15:00:00Z"));
  });
});
