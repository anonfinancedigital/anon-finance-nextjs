import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { usersRepo } from "@/lib/db/repos/users";
import { financialGoal } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { saveBirthDateAction } from "./profile";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

const { revalidatePath } = await import("next/cache");
const { redirect } = await import("next/navigation");

setupTestDb();

const save = (birthDate: string) => {
  const data = new FormData();
  data.set("birthDate", birthDate);
  return saveBirthDateAction(undefined, data);
};

const rejected = (message: string) => ({
  ok: false,
  error: message,
  fieldErrors: { birthDate: message },
});

async function insertGoal(userId: string, retirementAge: number) {
  await db.insert(financialGoal).values({
    userId,
    monthlyIncomeCents: 1_000_000,
    savedCents: 15_000_000,
    birthDate: "1993-09-18",
    retirementAge,
    annualRateBp: 800,
    withdrawalRateBp: 600,
  });
}

let userId: string;

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  vi.mocked(redirect).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveBirthDateAction", () => {
  it("answers UNAUTHORIZED and stores nothing without an approved session (guard)", async () => {
    request.headers = new Headers();
    expect(await save("18/09/1993")).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(await usersRepo.getBirthDate(userId)).toBeNull();

    const pending = await createSignedInUser(undefined, "pending");
    request.headers = new Headers({ cookie: pending.cookie });
    expect(await save("18/09/1993")).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(await usersRepo.getBirthDate(pending.userId)).toBeNull();
  });

  it("stores a first date and redirects to / (NASC-09)", async () => {
    await expect(save("18/09/1993")).rejects.toThrow("NEXT_REDIRECT /");

    expect(redirect).toHaveBeenCalledWith("/");
    expect(await usersRepo.getBirthDate(userId)).toBe("1993-09-18");
    expect(revalidatePath).toHaveBeenCalledWith("/liberdade");
  });

  it("updates an existing date and answers { ok: true } without redirecting (NASC-17)", async () => {
    await db.update(user).set({ birthDate: "1993-09-18" }).where(eq(user.id, userId));

    expect(await save("20/01/1990")).toEqual({ ok: true });

    expect(await usersRepo.getBirthDate(userId)).toBe("1990-01-20");
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/liberdade");
  });

  it("accepts today's date", async () => {
    const todayBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date());
    await db.update(user).set({ birthDate: "1993-09-18" }).where(eq(user.id, userId));

    expect(await save(todayBr)).toEqual({ ok: true });
  });

  it.each([
    ["empty", "", "Informe a data de nascimento"],
    ["nonexistent", "31/02/1990", "Data de nascimento inválida"],
    ["wrong format", "1990-01-01", "Data de nascimento inválida"],
    ["future", "01/01/2999", "A data de nascimento não pode ser futura"],
    ["older than 120", "01/01/1800", "A idade atual deve ser de no máximo 120 anos"],
  ])("rejects a %s date in fieldErrors.birthDate and leaves the user untouched (NASC-10)", async (_name, text, message) => {
    await db.update(user).set({ birthDate: "1993-09-18" }).where(eq(user.id, userId));

    expect(await save(text)).toEqual(rejected(message));

    expect(await usersRepo.getBirthDate(userId)).toBe("1993-09-18");
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not store an invalid first date", async () => {
    expect(await save("31/02/1990")).toEqual(rejected("Data de nascimento inválida"));
    expect(await usersRepo.getBirthDate(userId)).toBeNull();
  });

  describe("with a saved goal of independence at 50 (NASC-18)", () => {
    const CONFLICT =
      "A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (50)";

    beforeEach(async () => {
      await db.update(user).set({ birthDate: "1993-09-18" }).where(eq(user.id, userId));
      await insertGoal(userId, 50);
    });

    it("refuses 18/09/1960 (age 66) and keeps the previous date", async () => {
      expect(await save("18/09/1960")).toEqual(rejected(CONFLICT));
      expect(await usersRepo.getBirthDate(userId)).toBe("1993-09-18");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("refuses a date whose age equals the independence age", async () => {
      const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date()));
      // 01/01 of (year - 50) makes the age exactly 50 today.
      expect(await save(`01/01/${year - 50}`)).toEqual(rejected(CONFLICT));
      expect(await usersRepo.getBirthDate(userId)).toBe("1993-09-18");
    });

    it("accepts 18/09/1990", async () => {
      expect(await save("18/09/1990")).toEqual({ ok: true });
      expect(await usersRepo.getBirthDate(userId)).toBe("1990-09-18");
    });
  });
});
