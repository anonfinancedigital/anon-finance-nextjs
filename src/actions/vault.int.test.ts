import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { vaultRepo } from "@/lib/db/repos/vault";
import { userVault } from "@/lib/db/schema";
import { createSignedInUser, insertCredentialUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { getKdfParamsAction, getVaultAction } from "./vault";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));

setupTestDb();

const material = (tag: string) => ({
  userId: "",
  kdfVersion: 1 as const,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 19456,
  iterations: 2,
  parallelism: 1,
  dekWrappedPw: `v1:pw${tag}`,
  dekWrappedRecovery: `v1:rec${tag}`,
});

async function insertVault(userId: string, tag: string) {
  await db.insert(userVault).values({ ...material(tag), userId });
}

beforeEach(() => {
  request.headers = new Headers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getKdfParamsAction", () => {
  it("answers with the same shape for an unknown and an existing e-mail", async () => {
    const { userId, email } = await createSignedInUser();
    await insertVault(userId, "a");

    const existing = await getKdfParamsAction(email);
    const unknown = await getKdfParamsAction("ninguem@example.com");

    expect(existing).toEqual({ mode: "v1", salt: "AAAAAAAAAAAAAAAAAAAAAA", m: 19456, t: 2, p: 1 });
    expect(unknown).toMatchObject({ mode: "v1", m: 65536, t: 3, p: 1 });
    expect(Object.keys(unknown).sort()).toEqual(Object.keys(existing).sort());
  });

  it("answers mode legacy for an account without a vault", async () => {
    const email = "legado@example.com";
    await insertCredentialUser(email);

    expect(await getKdfParamsAction(email)).toEqual({ mode: "legacy" });
  });

  it("normalizes the e-mail (trim, lower case) and is stable for an unknown e-mail", async () => {
    const { userId, email } = await createSignedInUser("maiuscula@example.com");
    await insertVault(userId, "a");

    expect(await getKdfParamsAction(`  ${email.toUpperCase()} `)).toMatchObject({ mode: "v1", m: 19456 });
    expect(await getKdfParamsAction(" Fantasma@Example.com")).toEqual(
      await getKdfParamsAction("fantasma@example.com  "),
    );
  });

  it("rejects an invalid e-mail without touching the repository", async () => {
    const spy = vi.spyOn(vaultRepo, "kdfParamsFor");

    expect(await getKdfParamsAction("nao-e-email")).toEqual({
      ok: false,
      error: "Informe um e-mail válido",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns the generic message and logs only the code when the database fails", async () => {
    vi.spyOn(vaultRepo, "kdfParamsFor").mockRejectedValueOnce(
      Object.assign(new Error("segredo@example.com"), { code: "08006" }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getKdfParamsAction("a@example.com")).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError).toHaveBeenCalledWith("getKdfParamsAction", "08006");
  });
});

describe("getVaultAction", () => {
  it("returns UNAUTHORIZED without a session and does not read the vault", async () => {
    const spy = vi.spyOn(vaultRepo, "get");

    expect(await getVaultAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns only the vault of the session user", async () => {
    const other = await createSignedInUser();
    await insertVault(other.userId, "outro");
    const me = await createSignedInUser();
    await insertVault(me.userId, "meu");
    request.headers = new Headers({ cookie: me.cookie });

    expect(await getVaultAction()).toEqual({
      ok: true,
      vault: {
        kdfVersion: 1,
        salt: "AAAAAAAAAAAAAAAAAAAAAA",
        memKib: 19456,
        iterations: 2,
        parallelism: 1,
        dekWrappedPw: "v1:pwmeu",
        dekWrappedRecovery: "v1:recmeu",
      },
    });
  });

  it("answers a fixed error for a legacy account", async () => {
    const me = await createSignedInUser();
    request.headers = new Headers({ cookie: me.cookie });

    expect(await getVaultAction()).toEqual({ ok: false, error: "Conta sem cofre" });
  });

  it("returns the generic message when the database fails", async () => {
    const me = await createSignedInUser();
    request.headers = new Headers({ cookie: me.cookie });
    vi.spyOn(vaultRepo, "get").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getVaultAction()).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
  });
});
