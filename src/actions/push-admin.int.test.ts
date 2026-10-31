import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_FAILED } from "@/lib/action-result";
import { db } from "@/lib/db/client";
import { pushDispatchRepo } from "@/lib/db/repos/push-dispatch";
import { pushBroadcast } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { broadcastPushAction } from "./push-admin";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

setupTestDb();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const LENGTH_ERROR = "A mensagem deve ter de 1 a 140 caracteres";
const UNAUTHORIZED = { ok: false, error: "UNAUTHORIZED" };

const broadcasts = () => db.select().from(pushBroadcast);

beforeEach(async () => {
  const admin = await createSignedInUser(ADMIN_EMAIL);
  request.headers = new Headers({ cookie: admin.cookie });
});

afterEach(() => vi.restoreAllMocks());

describe("broadcastPushAction", () => {
  it("stores the trimmed message unsent and answers ok for the admin (PUSH-37)", async () => {
    expect(await broadcastPushAction("  Manutenção hoje às 22h  ")).toEqual({ ok: true });

    expect(await broadcasts()).toEqual([
      expect.objectContaining({ text: "Manutenção hoje às 22h", sentAt: null }),
    ]);
  });

  it("accepts a message of exactly 140 characters (PUSH-38)", async () => {
    expect(await broadcastPushAction("a".repeat(140))).toEqual({ ok: true });

    expect((await broadcasts()).map((b) => b.text)).toEqual(["a".repeat(140)]);
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["141 characters", "a".repeat(141)],
  ])("refuses a %s message with the length error and stores nothing (PUSH-38)", async (_label, text) => {
    expect(await broadcastPushAction(text)).toMatchObject({ ok: false, error: LENGTH_ERROR });

    expect(await broadcasts()).toEqual([]);
  });

  it("refuses a regular user with UNAUTHORIZED and stores nothing (PUSH-39)", async () => {
    const regular = await createSignedInUser();
    request.headers = new Headers({ cookie: regular.cookie });

    expect(await broadcastPushAction("Aviso")).toEqual(UNAUTHORIZED);

    expect(await broadcasts()).toEqual([]);
  });

  it("refuses an anonymous caller with UNAUTHORIZED and stores nothing (PUSH-39)", async () => {
    request.headers = new Headers();

    expect(await broadcastPushAction("Aviso")).toEqual(UNAUTHORIZED);

    expect(await broadcasts()).toEqual([]);
  });

  it("answers SAVE_FAILED and logs only the code on a database failure", async () => {
    vi.spyOn(pushDispatchRepo, "enqueueBroadcast").mockRejectedValue(
      Object.assign(new Error("segredo"), { code: "08006" }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await broadcastPushAction("Aviso")).toEqual({ ok: false, error: SAVE_FAILED });

    expect(log.mock.calls).toEqual([["broadcastPushAction", "08006"]]);
  });
});
