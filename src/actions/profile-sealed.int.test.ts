import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { vaultRepo } from "@/lib/db/repos/vault";
import { userVault } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { saveBirthDateSealed } from "./profile-sealed";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const GENERIC = "Não foi possível salvar. Tente novamente";

let userId: string;

async function insertVault(owner: string) {
  await db.insert(userVault).values({
    userId: owner,
    kdfVersion: 1,
    salt: "AAAAAAAAAAAAAAAAAAAAAA",
    memKib: 19456,
    iterations: 2,
    parallelism: 1,
    dekWrappedPw: "v1:pw",
    dekWrappedRecovery: "v1:rec",
  });
}

const rawBirth = async (owner: string) =>
  (await db.select().from(userVault).where(eq(userVault.userId, owner)))[0]?.birthDateCt;

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
  await insertVault(userId);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveBirthDateSealed", () => {
  it("stores the ciphertext as v1: for the session user and revalidates /liberdade", async () => {
    expect(await saveBirthDateSealed("v1:nascimento")).toEqual({ ok: true });

    const raw = await rawBirth(userId);
    expect(raw).toBe("v1:nascimento");
    expect(raw!.startsWith("v1:")).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/liberdade");
  });

  it("replaces the previous date and never touches another user's vault", async () => {
    const other = await createSignedInUser();
    await insertVault(other.userId);
    await vaultRepo.setBirthDateSealed(other.userId, "v1:dooutro");
    await saveBirthDateSealed("v1:primeira");

    expect(await saveBirthDateSealed("v1:segunda")).toEqual({ ok: true });

    expect(await rawBirth(userId)).toBe("v1:segunda");
    expect(await rawBirth(other.userId)).toBe("v1:dooutro");
  });

  it.each([
    ["without the v1: prefix", "1990-06-15"],
    ["with the v2: prefix", "v2:abc"],
    ["longer than 2048 characters", `v1:${"a".repeat(2046)}`],
    ["empty after the prefix", "v1:"],
    ["not a string", 19900615],
  ])("answers SAVE_FAILED and keeps the saved date for a ciphertext %s", async (_, value) => {
    await saveBirthDateSealed("v1:salva");
    vi.mocked(revalidatePath).mockClear();
    const set = vi.spyOn(vaultRepo, "setBirthDateSealed");

    expect(await saveBirthDateSealed(value as string)).toEqual({ ok: false, error: GENERIC });
    expect(set).not.toHaveBeenCalled();
    expect(await rawBirth(userId)).toBe("v1:salva");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers SAVE_FAILED and writes nothing for an account without a vault", async () => {
    await db.delete(userVault).where(eq(userVault.userId, userId));
    const set = vi.spyOn(vaultRepo, "setBirthDateSealed");

    expect(await saveBirthDateSealed("v1:nascimento")).toEqual({ ok: false, error: GENERIC });
    expect(set).not.toHaveBeenCalled();
    expect(await rawBirth(userId)).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    request.headers = new Headers();
    const set = vi.spyOn(vaultRepo, "setBirthDateSealed");

    expect(await saveBirthDateSealed("v1:nascimento")).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(set).not.toHaveBeenCalled();
    expect(await rawBirth(userId)).toBeNull();
  });

  it("returns the generic message and logs only the code when the database fails", async () => {
    vi.spyOn(vaultRepo, "setBirthDateSealed").mockRejectedValueOnce(
      Object.assign(new Error("1990-06-15"), { code: "08006" }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveBirthDateSealed("v1:nascimento")).toEqual({ ok: false, error: GENERIC });
    expect(consoleError).toHaveBeenCalledWith("saveBirthDateSealed", "08006");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
