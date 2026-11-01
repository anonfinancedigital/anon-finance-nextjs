import { afterEach, describe, expect, it, vi } from "vitest";
import { FRESH_LOGIN_KEY } from "./lock-policy";

function trackStorage(name: "localStorage" | "sessionStorage") {
  const data = new Map<string, string>();
  const access = { count: 0 };
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      access.count += 1;
      return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        removeItem: (key: string) => void data.delete(key),
      };
    },
  });
  return { data, access };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
  Reflect.deleteProperty(globalThis, "sessionStorage");
  vi.resetModules();
});

describe("lock-store.client", () => {
  it("imports in Node without touching any storage", async () => {
    const local = trackStorage("localStorage");
    const session = trackStorage("sessionStorage");
    await import("./lock-store.client");
    expect(local.access.count).toBe(0);
    expect(session.access.count).toBe(0);
  });

  it("lockStore keeps the record under anon-biometric-lock in localStorage", async () => {
    const local = trackStorage("localStorage");
    const { lockStore } = await import("./lock-store.client");
    expect(lockStore.save("user-1", "cred-abc")).toBe(true);
    expect(JSON.parse(local.data.get("anon-biometric-lock") as string)).toEqual({
      userId: "user-1",
      credentialId: "cred-abc",
    });
    expect(lockStore.read("user-1")).toBe("cred-abc");
  });

  it("inviteStore keeps the record under anon-biometric-invite-dismissed in localStorage", async () => {
    const local = trackStorage("localStorage");
    const { inviteStore } = await import("./lock-store.client");
    expect(inviteStore.dismiss("user-1")).toBe(true);
    expect(JSON.parse(local.data.get("anon-biometric-invite-dismissed") as string)).toEqual({ userId: "user-1" });
    expect(inviteStore.isDismissed("user-1")).toBe(true);
    expect(inviteStore.isDismissed("user-2")).toBe(false);
  });

  it("freshLoginStorage reads and writes sessionStorage", async () => {
    const session = trackStorage("sessionStorage");
    const { freshLoginStorage } = await import("./lock-store.client");
    freshLoginStorage.setItem(FRESH_LOGIN_KEY, "42");
    expect(session.data.get(FRESH_LOGIN_KEY)).toBe("42");
    expect(freshLoginStorage.getItem(FRESH_LOGIN_KEY)).toBe("42");
    freshLoginStorage.removeItem(FRESH_LOGIN_KEY);
    expect(session.data.has(FRESH_LOGIN_KEY)).toBe(false);
  });
});
