import { describe, expect, it } from "vitest";
import type { SimpleStorage } from "./lock-policy";
import { createLockStore, LOCK_KEY } from "./lock-store";

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

describe("createLockStore", () => {
  it("uses the key anon-biometric-lock", () => {
    expect(LOCK_KEY).toBe("anon-biometric-lock");
  });

  it("save writes { userId, credentialId } and returns true (LOCK-04)", () => {
    const storage = memoryStorage();
    expect(createLockStore(storage).save("user-1", "cred-abc")).toBe(true);
    expect(JSON.parse(storage.data.get(LOCK_KEY) as string)).toEqual({ userId: "user-1", credentialId: "cred-abc" });
  });

  it("the record holds only userId and credentialId (LOCK-09)", () => {
    const storage = memoryStorage();
    createLockStore(storage).save("user-1", "cred-abc");
    expect(Object.keys(JSON.parse(storage.data.get(LOCK_KEY) as string)).sort()).toEqual(["credentialId", "userId"]);
  });

  it("save returns false and leaves no record when setItem throws (LOCK-05)", () => {
    const storage = memoryStorage({
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(createLockStore(storage).save("user-1", "cred-abc")).toBe(false);
    expect(storage.data.has(LOCK_KEY)).toBe(false);
  });

  it("read returns the credentialId of the same user", () => {
    const store = createLockStore(memoryStorage());
    store.save("user-1", "cred-abc");
    expect(store.read("user-1")).toBe("cred-abc");
  });

  it("read returns null without a record", () => {
    expect(createLockStore(memoryStorage()).read("user-1")).toBeNull();
  });

  it("read of another user's record returns null and removes it (LOCK-08)", () => {
    const storage = memoryStorage();
    const store = createLockStore(storage);
    store.save("user-1", "cred-abc");
    expect(store.read("user-2")).toBeNull();
    expect(storage.data.has(LOCK_KEY)).toBe(false);
  });

  it.each([["not json"], ["null"], ['{"userId":"user-1"}'], ['{"userId":1,"credentialId":2}']])(
    "read of the invalid record %s returns null",
    (raw) => {
      const storage = memoryStorage();
      storage.data.set(LOCK_KEY, raw);
      expect(createLockStore(storage).read("user-1")).toBeNull();
    },
  );

  it("read returns null when getItem throws", () => {
    const storage = memoryStorage({
      getItem: () => {
        throw new Error("denied");
      },
    });
    expect(createLockStore(storage).read("user-1")).toBeNull();
  });

  it("clear removes the record (LOCK-06, LOCK-07)", () => {
    const storage = memoryStorage();
    const store = createLockStore(storage);
    store.save("user-1", "cred-abc");
    store.clear();
    expect(storage.data.has(LOCK_KEY)).toBe(false);
    expect(store.read("user-1")).toBeNull();
  });

  it("clear does not throw when removeItem throws", () => {
    const storage = memoryStorage({
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(() => createLockStore(storage).clear()).not.toThrow();
  });
});
