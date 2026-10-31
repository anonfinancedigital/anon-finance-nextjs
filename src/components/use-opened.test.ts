import { describe, expect, it } from "vitest";
import { resolveOpened } from "@/components/use-opened";

const dek = {} as CryptoKey;
const settled = (key: unknown[], stale: unknown[], data: string | null = "old", error = false) => ({
  key,
  stale,
  data,
  error,
});

describe("resolveOpened", () => {
  it("returns the result when its deps are the current ones", () => {
    const key = [dek, "u", "v1"];
    expect(resolveOpened(settled(key, [dek, "u", "2026-10"]), [dek, "u", "v1"], [dek, "u", "2026-10"])).toEqual({
      data: "old",
      error: false,
      loading: false,
    });
  });

  it("keeps the previous data while reloading the same month", () => {
    const stale = [dek, "u", "2026-10"];
    expect(resolveOpened(settled([dek, "u", "v1"], stale), [dek, "u", "v2"], stale)).toEqual({
      data: "old",
      error: false,
      loading: true,
    });
  });

  it("drops the previous data when the month changes", () => {
    expect(
      resolveOpened(settled([dek, "u", "v1"], [dek, "u", "2026-10"]), [dek, "u", "v2"], [dek, "u", "2026-11"]),
    ).toEqual({ data: null, error: false, loading: true });
  });

  it("drops the previous data when the user changes", () => {
    expect(
      resolveOpened(settled([dek, "u", "v1"], [dek, "u", "2026-10"]), [dek, "other", "v2"], [dek, "other", "2026-10"]),
    ).toEqual({ data: null, error: false, loading: true });
  });

  it("never keeps a failed result", () => {
    const stale = [dek, "u", "2026-10"];
    expect(resolveOpened(settled([dek, "u", "v1"], stale, null, true), [dek, "u", "v2"], stale)).toEqual({
      data: null,
      error: false,
      loading: true,
    });
  });

  it("shows nothing before the first result", () => {
    expect(resolveOpened(null, [dek, "u"], [dek, "u"])).toEqual({ data: null, error: false, loading: true });
  });
});
