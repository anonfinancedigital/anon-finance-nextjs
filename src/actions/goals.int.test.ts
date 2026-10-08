import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { ageOn } from "@/lib/domain/freedom";
import { today } from "@/lib/validation/goal";
import { user } from "@/lib/db/auth-schema";
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
  retirementAge: "90",
  annualRate: "8",
  withdrawalRate: "6",
};

const SAVED = {
  monthlyIncomeCents: 1_000_000,
  savedCents: 15_000_000,
  birthDate: "1990-06-15",
  retirementAge: 90,
  annualRateBp: 800,
  withdrawalRateBp: 600,
};

let userId: string;

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  await db.update(user).set({ birthDate: "1990-06-15" }).where(eq(user.id, userId));
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

  it("stores the chosen rates and leaves the birth date in the user as AAAA-MM-DD", async () => {
    expect(await saveGoal({ ...INPUT, annualRate: "6", withdrawalRate: "4" })).toEqual({ ok: true });

    const [row] = await db.select().from(financialGoal);
    expect(row).toMatchObject({ userId, annualRateBp: 600, withdrawalRateBp: 400 });
    expect(await goalsRepo.get(userId)).toMatchObject({ birthDate: "1990-06-15" });
  });

  it("stores a custom pair 6,5 / 4,5 as 650 and 450", async () => {
    expect(await saveGoal({ ...INPUT, annualRate: "6,5", withdrawalRate: "4,5" })).toEqual({ ok: true });

    expect(await goalsRepo.get(userId)).toEqual({ ...SAVED, annualRateBp: 650, withdrawalRateBp: 450 });
  });

  it.each([
    ["annualRate", { annualRate: "15,01" }, "A rentabilidade deve estar entre 1% e 15% ao ano"],
    ["withdrawalRate", { withdrawalRate: "0,99" }, "A taxa de retirada deve estar entre 1% e 15% ao ano"],
    ["withdrawalRate", { withdrawalRate: "6,555" }, "Informe a taxa com até 2 casas decimais, ex.: 6,5"],
    ["withdrawalRate", { withdrawalRate: "9" }, "A taxa de retirada não pode ser maior que a rentabilidade"],
  ])("rejects an invalid %s with the exact message and writes nothing", async (field, override, message) => {
    const result = await saveGoal({ ...INPUT, ...override });

    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: message } });
    expect(await goalsRepo.get(userId)).toBeNull();
  });

  it("ignores a forged birthDate in the input and validates with the stored one (NASC-13)", async () => {
    // 31/02/1990 would be rejected as invalid, and a 2020 date would make age 90 impossible: neither matters.
    for (const forged of ["31/02/1990", "1990-06-15", "15/06/2020", ""]) {
      expect(await saveGoal({ ...INPUT, birthDate: forged })).toEqual({ ok: true });
      expect(await goalsRepo.get(userId)).toEqual(SAVED);
    }
    const [row] = await db.select().from(user).where(eq(user.id, userId));
    expect(row.birthDate).toBe("1990-06-15");
  });

  it("does not write the birth date in the goal row", async () => {
    expect(await saveGoal({ ...INPUT, birthDate: "01/01/2000" })).toEqual({ ok: true });

    const [row] = await db.select().from(financialGoal);
    expect(row).not.toHaveProperty("birthDate");
    expect(await goalsRepo.get(userId)).toMatchObject({ birthDate: "1990-06-15" });
  });

  it("refuses a user without a birth date and writes nothing (NASC-13)", async () => {
    await db.update(user).set({ birthDate: null }).where(eq(user.id, userId));
    const upsert = vi.spyOn(goalsRepo, "upsert");

    expect(await saveGoal(INPUT)).toEqual({
      ok: false,
      error: "Informe sua data de nascimento antes de salvar o objetivo",
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(await db.$count(financialGoal)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["equal to", 0],
    ["below", -1],
  ])("rejects an independence age %s the current age with the exact message (NASC-14)", async (_label, delta) => {
    const age = ageOn("1990-06-15", today(new Date()));
    const result = await saveGoal({ ...INPUT, retirementAge: String(age + delta) });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { retirementAge: `A idade da independência deve ser maior que a idade atual (${age})` },
    });
    expect(await goalsRepo.get(userId)).toBeNull();
  });

  it("accepts an independence age one above the current age", async () => {
    const age = ageOn("1990-06-15", today(new Date()));
    expect(await saveGoal({ ...INPUT, retirementAge: String(age + 1) })).toEqual({ ok: true });
  });

  it("accepts a zero saved amount", async () => {
    expect(await saveGoal({ ...INPUT, saved: "0" })).toEqual({ ok: true });
    expect((await goalsRepo.get(userId))?.savedCents).toBe(0);
  });

  it.each([
    ["monthlyIncome", "0,00"],
    ["saved", "-1"],
    ["annualRate", "abc"],
    ["withdrawalRate", ""],
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
