import { describe, expect, it } from "vitest";
import {
  consumeFreshLogin,
  FRESH_LOGIN_KEY,
  FRESH_LOGIN_WINDOW_MS,
  markFreshLogin,
  RELOCK_AFTER_MS,
  shouldRelock,
  type SimpleStorage,
} from "./lock-policy";

function memoryStorage(initial: Record<string, string> = {}): SimpleStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("shouldRelock (LOCK-17, LOCK-18)", () => {
  it("uses 60 000 ms", () => {
    expect(RELOCK_AFTER_MS).toBe(60_000);
  });

  it.each([
    [59_999, false],
    [60_000, false],
    [60_001, true],
  ])("hidden for %i ms -> %s", (elapsed, expected) => {
    expect(shouldRelock(1_000, 1_000 + elapsed)).toBe(expected);
  });

  it("never relocks when the page was not hidden", () => {
    expect(shouldRelock(null, 10_000_000)).toBe(false);
  });
});

describe("markFreshLogin / consumeFreshLogin (LOCK-19)", () => {
  it("window is 300 000 ms", () => {
    expect(FRESH_LOGIN_WINDOW_MS).toBe(300_000);
  });

  it("markFreshLogin stores the instant", () => {
    const storage = memoryStorage();
    markFreshLogin(storage, 123_456);
    expect(storage.getItem(FRESH_LOGIN_KEY)).toBe("123456");
  });

  it("markFreshLogin does not throw when the storage throws", () => {
    const storage: SimpleStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    expect(() => markFreshLogin(storage, 1)).not.toThrow();
  });

  it("returns false without a mark", () => {
    expect(consumeFreshLogin(memoryStorage(), 5_000)).toBe(false);
  });

  it.each([
    [0, true],
    [299_999, true],
    [300_000, true],
    [300_001, false],
  ])("mark %i ms old -> %s", (age, expected) => {
    const storage = memoryStorage();
    markFreshLogin(storage, 1_000);
    expect(consumeFreshLogin(storage, 1_000 + age)).toBe(expected);
  });

  it("always erases the mark, so a second consume is false", () => {
    const storage = memoryStorage();
    markFreshLogin(storage, 1_000);
    expect(consumeFreshLogin(storage, 1_500)).toBe(true);
    expect(storage.getItem(FRESH_LOGIN_KEY)).toBeNull();
    expect(consumeFreshLogin(storage, 1_600)).toBe(false);
  });

  it("erases an expired mark too", () => {
    const storage = memoryStorage();
    markFreshLogin(storage, 1_000);
    consumeFreshLogin(storage, 1_000 + 400_000);
    expect(storage.getItem(FRESH_LOGIN_KEY)).toBeNull();
  });
});
