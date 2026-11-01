import { describe, expect, it } from "vitest";
import type { SimpleStorage } from "./lock-policy";
import { createInviteStore, INVITE_KEY } from "./invite-store";

function memoryStorage(overrides: Partial<SimpleStorage> = {}): SimpleStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    ...overrides,
  };
}

describe("createInviteStore", () => {
  it("uses the key anon-biometric-invite-dismissed", () => {
    expect(INVITE_KEY).toBe("anon-biometric-invite-dismissed");
  });

  it("dismiss writes { userId } and returns true (INVITE-09)", () => {
    const storage = memoryStorage();
    expect(createInviteStore(storage).dismiss("user-1")).toBe(true);
    expect(JSON.parse(storage.data.get(INVITE_KEY) as string)).toEqual({ userId: "user-1" });
  });

  it("the record holds only userId (INVITE-15)", () => {
    const storage = memoryStorage();
    createInviteStore(storage).dismiss("user-1");
    expect(Object.keys(JSON.parse(storage.data.get(INVITE_KEY) as string))).toEqual(["userId"]);
  });

  it("dismiss returns false when setItem throws (INVITE-11)", () => {
    const storage = memoryStorage({
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(createInviteStore(storage).dismiss("user-1")).toBe(false);
    expect(storage.data.has(INVITE_KEY)).toBe(false);
  });

  it("isDismissed is true for the same user (INVITE-04)", () => {
    const store = createInviteStore(memoryStorage());
    store.dismiss("user-1");
    expect(store.isDismissed("user-1")).toBe(true);
  });

  it("isDismissed is false when nothing was saved", () => {
    expect(createInviteStore(memoryStorage()).isDismissed("user-1")).toBe(false);
  });

  it("isDismissed is false for another user (INVITE-12)", () => {
    const store = createInviteStore(memoryStorage());
    store.dismiss("user-1");
    expect(store.isDismissed("user-2")).toBe(false);
  });

  it("isDismissed is true (no invite) when getItem throws (INVITE-10)", () => {
    const storage = memoryStorage({
      getItem: () => {
        throw new Error("denied");
      },
    });
    expect(createInviteStore(storage).isDismissed("user-1")).toBe(true);
  });

  it("isDismissed is true (no invite) when the JSON is invalid (INVITE-10)", () => {
    const storage = memoryStorage();
    storage.data.set(INVITE_KEY, "{not json");
    expect(createInviteStore(storage).isDismissed("user-1")).toBe(true);
  });

  it("clear removes the record (INVITE-14)", () => {
    const storage = memoryStorage();
    const store = createInviteStore(storage);
    store.dismiss("user-1");
    store.clear();
    expect(storage.data.has(INVITE_KEY)).toBe(false);
    expect(store.isDismissed("user-1")).toBe(false);
  });
});
