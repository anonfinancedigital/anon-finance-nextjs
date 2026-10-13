import { describe, expect, it } from "vitest";
import { blockCookieStatus, googleUserCreateDecision } from "./google-hooks";

describe("googleUserCreateDecision", () => {
  it("refuses a user whose e-mail is not verified", () => {
    expect(googleUserCreateDecision({ emailVerified: false })).toBe(false);
  });

  it("creates a user with a verified e-mail as approved", () => {
    expect(googleUserCreateDecision({ emailVerified: true })).toEqual({
      data: { status: "approved" },
    });
  });

  it.each([["pending"], ["rejected"], ["revoked"]])(
    "forces approved even when the data asks for %s",
    (status) => {
      expect(googleUserCreateDecision({ emailVerified: true, status })).toEqual({
        data: { status: "approved" },
      });
    },
  );
});

describe("blockCookieStatus", () => {
  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "returns %s for a refused session of that status",
    (status) => {
      expect(blockCookieStatus(status)).toBe(status);
    },
  );

  it("returns null for an approved user", () => {
    expect(blockCookieStatus("approved")).toBeNull();
  });
});
