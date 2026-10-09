import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { goalsRepo } from "@/lib/db/repos/goals";
import { financialGoal } from "@/lib/db/schema";
import type { GoalDto } from "@/lib/vault/types";
import { createSignedInUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { saveGoalSealed } from "./goals-sealed";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const GENERIC = "Não foi possível salvar. Tente novamente";

const GOAL: GoalDto = {
  monthlyIncomeCt: "v1:renda",
  savedCt: "v1:guardado",
  retirementAgeCt: "v1:idade",
  annualRateCt: "v1:retorno",
  withdrawalRateCt: "v1:retirada",
};

let userId: string;

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const rawRows = () => db.select().from(financialGoal);

describe("saveGoalSealed", () => {
  it("stores the five ciphertexts, leaves every plain-text column NULL and revalidates /liberdade", async () => {
    expect(await saveGoalSealed(GOAL)).toEqual({ ok: true });

    const [row] = await rawRows();
    expect(row).toMatchObject({ userId, ...GOAL });
    for (const ct of [row.monthlyIncomeCt, row.savedCt, row.retirementAgeCt, row.annualRateCt, row.withdrawalRateCt]) {
      expect(ct!.startsWith("v1:")).toBe(true);
    }
    expect(row).toMatchObject({
      monthlyIncomeCents: null,
      savedCents: null,
      retirementAge: null,
      annualRateBp: null,
      withdrawalRateBp: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/liberdade");
  });

  it("replaces the previous goal (one row per user)", async () => {
    await saveGoalSealed(GOAL);
    const next = { ...GOAL, savedCt: "v1:novoguardado", annualRateCt: "v1:novoretorno" };

    expect(await saveGoalSealed(next)).toEqual({ ok: true });

    expect(await rawRows()).toHaveLength(1);
    expect(await goalsRepo.getSealed(userId)).toEqual(next);
  });

  it("does not touch another user's goal", async () => {
    const other = await insertTestUser();
    await goalsRepo.upsertSealed(other, { ...GOAL, savedCt: "v1:dooutro" });

    await saveGoalSealed(GOAL);

    expect((await db.select().from(financialGoal).where(eq(financialGoal.userId, other)))[0].savedCt).toBe(
      "v1:dooutro",
    );
  });

  it.each([
    ["monthlyIncomeCt", "sem prefixo"],
    ["savedCt", "v2:abc"],
    ["retirementAgeCt", `v1:${"a".repeat(2046)}`],
    ["annualRateCt", "v1:"],
    ["withdrawalRateCt", "v1:com espaço"],
  ])("answers SAVE_FAILED and saves nothing when %s is malformed (%s)", async (field, value) => {
    expect(await saveGoalSealed({ ...GOAL, [field]: value })).toEqual({ ok: false, error: GENERIC });
    expect(await rawRows()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers SAVE_FAILED for a missing field or a null value and keeps the saved goal", async () => {
    await saveGoalSealed(GOAL);
    const upsert = vi.spyOn(goalsRepo, "upsertSealed");
    const missing: Partial<GoalDto> = { ...GOAL };
    delete missing.savedCt;

    expect(await saveGoalSealed(missing as GoalDto)).toEqual({ ok: false, error: GENERIC });
    expect(await saveGoalSealed({ ...GOAL, annualRateCt: null } as unknown as GoalDto)).toEqual({
      ok: false,
      error: GENERIC,
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(await goalsRepo.getSealed(userId)).toEqual(GOAL);
  });

  it("never stores plain-text fields sent next to the ciphertexts", async () => {
    const smuggled = { ...GOAL, monthlyIncomeCents: 1_000_000, retirementAge: 60 };

    expect(await saveGoalSealed(smuggled as GoalDto)).toEqual({ ok: true });

    expect((await rawRows())[0]).toMatchObject({ monthlyIncomeCents: null, retirementAge: null });
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    request.headers = new Headers();
    const upsert = vi.spyOn(goalsRepo, "upsertSealed");

    expect(await saveGoalSealed(GOAL)).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(upsert).not.toHaveBeenCalled();
    expect(await rawRows()).toEqual([]);
  });

  it("returns the generic message and logs only the code when the database fails", async () => {
    vi.spyOn(goalsRepo, "upsertSealed").mockRejectedValueOnce(
      Object.assign(new Error("renda 10.000,00"), { code: "08006" }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveGoalSealed(GOAL)).toEqual({ ok: false, error: GENERIC });
    expect(consoleError).toHaveBeenCalledWith("saveGoalSealed", "08006");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
