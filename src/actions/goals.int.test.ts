import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { goalsRepo } from "@/lib/db/repos/goals";
import { financialGoal } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { saveGoal } from "./goals";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const INPUT = {
  monthlyIncome: "10.000,00",
  saved: "150.000,00",
  birthDate: "15/06/1990",
  retirementAge: "90",
  annualRate: "8",
};

const SAVED = {
  monthlyIncomeCents: 1_000_000,
  savedCents: 15_000_000,
  birthDate: "1990-06-15",
  retirementAge: 90,
  annualRateBp: 800,
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

describe("saveGoal", () => {
  it("saves a valid goal and revalidates /liberdade", async () => {
    expect(await saveGoal(INPUT)).toEqual({ ok: true });

    expect(await goalsRepo.get(userId)).toEqual(SAVED);
    expect(revalidatePath).toHaveBeenCalledWith("/liberdade");
  });

  it("replaces the goal on a second submit", async () => {
    await saveGoal(INPUT);
    expect(await saveGoal({ ...INPUT, saved: "0,00", retirementAge: "95" })).toEqual({ ok: true });

    expect(await goalsRepo.get(userId)).toEqual({ ...SAVED, savedCents: 0, retirementAge: 95 });
  });

  it("stores the chosen rate and the birth date as AAAA-MM-DD", async () => {
    expect(await saveGoal({ ...INPUT, annualRate: "6" })).toEqual({ ok: true });

    const [row] = await db.select().from(financialGoal);
    expect(row).toMatchObject({ userId, annualRateBp: 600, birthDate: "1990-06-15" });
  });

  it("rejects a birth date in AAAA-MM-DD and writes nothing", async () => {
    const result = await saveGoal({ ...INPUT, birthDate: "1990-06-15" });

    expect(result).toMatchObject({ ok: false, fieldErrors: { birthDate: "Data de nascimento inválida" } });
    expect(await goalsRepo.get(userId)).toBeNull();
  });

  it("accepts a zero saved amount", async () => {
    expect(await saveGoal({ ...INPUT, saved: "0" })).toEqual({ ok: true });
    expect((await goalsRepo.get(userId))?.savedCents).toBe(0);
  });

  it.each([
    ["monthlyIncome", "0,00"],
    ["saved", "-1"],
    ["birthDate", "31/02/1990"],
    ["annualRate", "7"],
    ["retirementAge", "10"],
  ])("rejects invalid %s with a field error and writes nothing", async (field, value) => {
    const result = await saveGoal({ ...INPUT, [field]: value });

    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: expect.any(String) } });
    expect(await goalsRepo.get(userId)).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps the existing goal when a later submit is invalid", async () => {
    await saveGoal(INPUT);

    const result = await saveGoal({ ...INPUT, saved: "abc", retirementAge: "10" });

    expect(result).toMatchObject({ ok: false, fieldErrors: { saved: expect.any(String), retirementAge: expect.any(String) } });
    expect(await goalsRepo.get(userId)).toEqual(SAVED);
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    request.headers = new Headers();
    const upsert = vi.spyOn(goalsRepo, "upsert");

    expect(await saveGoal(INPUT)).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(upsert).not.toHaveBeenCalled();
    expect(await goalsRepo.get(userId)).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED on a database failure and keeps the previous goal", async () => {
    await saveGoal(INPUT);
    vi.mocked(revalidatePath).mockClear();
    vi.spyOn(goalsRepo, "upsert").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveGoal({ ...INPUT, saved: "1,00" })).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(await goalsRepo.get(userId)).toEqual(SAVED);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("writes only for the session user", async () => {
    const other = await createSignedInUser();
    await saveGoal(INPUT);

    expect(await goalsRepo.get(userId)).toEqual(SAVED);
    expect(await goalsRepo.get(other.userId)).toBeNull();
  });
});
